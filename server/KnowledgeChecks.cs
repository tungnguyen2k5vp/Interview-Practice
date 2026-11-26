using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

internal sealed record CheckDefinition(string Slug, int Version, string Prompt, string EnglishPrompt,
    string[] Choices, string[] EnglishChoices, int CorrectIndex, string Explanation, string EnglishExplanation);
internal sealed record CheckAnswer(int? Choice);

internal sealed class KnowledgeChecks
{
    private readonly Dictionary<(string, int), CheckDefinition> definitions;

    public KnowledgeChecks(IWebHostEnvironment environment)
    {
        var items = DataJson.Read<CheckDefinition[]>(File.ReadAllText(Path.Combine(environment.ContentRootPath, "Content", "knowledge-checks.json")));
        if (items.Any(x => x.Version < 1 || string.IsNullOrWhiteSpace(x.Prompt) || string.IsNullOrWhiteSpace(x.EnglishPrompt)
            || x.Choices.Length is < 2 or > 6 || x.EnglishChoices.Length != x.Choices.Length
            || x.CorrectIndex < 0 || x.CorrectIndex >= x.Choices.Length || x.Choices.Any(string.IsNullOrWhiteSpace)
            || x.EnglishChoices.Any(string.IsNullOrWhiteSpace) || x.Choices.Distinct().Count() != x.Choices.Length
            || x.EnglishChoices.Distinct().Count() != x.EnglishChoices.Length
            || string.IsNullOrWhiteSpace(x.Explanation) || string.IsNullOrWhiteSpace(x.EnglishExplanation)))
            throw new InvalidDataException("Bài kiểm tra vận dụng không hợp lệ.");
        definitions = items.ToDictionary(x => (x.Slug, x.Version));
    }

    private static object View(KnowledgeCheckAttempt row)
    {
        var definition = DataJson.Read<CheckDefinition>(row.Definition);
        return new { definition.Prompt, definition.EnglishPrompt, definition.Choices, definition.EnglishChoices,
            row.Choice, row.Correct, row.Assisted, row.AnsweredAt, row.StudyDay,
            explanation = row.AnsweredAt.HasValue ? definition.Explanation : null,
            englishExplanation = row.AnsweredAt.HasValue ? definition.EnglishExplanation : null };
    }

    public static void Map(RouteGroupBuilder api)
    {
        var group = api.MapGroup("/practice/attempts/{id:guid}/check").RequireAuthorization();
        group.MapGet("", async (Guid id, ClaimsPrincipal user, KnowledgeChecks catalog, PracticeDb db, CancellationToken ct) =>
        {
            var attempt = await db.Attempts.AsNoTracking().SingleOrDefaultAsync(a => a.Id == id && a.UserId == user.Id(), ct)
                ?? throw ApiProblem.Missing();
            var row = await db.KnowledgeChecks.AsNoTracking().SingleOrDefaultAsync(x => x.AttemptId == id, ct);
            return new { available = attempt.Outcome == "answered" && catalog.definitions.ContainsKey((attempt.Slug, attempt.Version)),
                check = row is null ? null : View(row) };
        });
        group.MapPost("", async (Guid id, ClaimsPrincipal user, KnowledgeChecks catalog, PracticeDb db, TimeProvider clock, CancellationToken ct) =>
        {
            await using var tx = await db.LockLearning(user.Id(), ct);
            var attempt = await db.Attempts.SingleOrDefaultAsync(a => a.Id == id && a.UserId == user.Id(), ct) ?? throw ApiProblem.Missing();
            var row = await db.KnowledgeChecks.FindAsync([id], ct);
            if (row is not null) return View(row);
            if (attempt.Outcome != "answered" || !catalog.definitions.TryGetValue((attempt.Slug, attempt.Version), out var definition))
                throw ApiProblem.Missing("Phiên bản câu hỏi này chưa có bài kiểm tra vận dụng.");
            var order = Enumerable.Range(0, definition.Choices.Length).OrderBy(_ => Guid.NewGuid()).ToArray();
            var shuffled = definition with { Choices = order.Select(i => definition.Choices[i]).ToArray(),
                EnglishChoices = order.Select(i => definition.EnglishChoices[i]).ToArray(), CorrectIndex = Array.IndexOf(order, definition.CorrectIndex) };
            row = new() { AttemptId = id, Definition = DataJson.Write(shuffled), OpenedAt = clock.GetUtcNow() };
            db.KnowledgeChecks.Add(row);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return View(row);
        });
        group.MapPost("/answer", async (Guid id, CheckAnswer input, ClaimsPrincipal user, PracticeDb db, Catalog catalog,
            TimeProvider clock, CancellationToken ct) =>
        {
            await using var tx = await db.LockLearning(user.Id(), ct);
            var attempt = await db.Attempts.SingleOrDefaultAsync(a => a.Id == id && a.UserId == user.Id(), ct) ?? throw ApiProblem.Missing();
            var row = await db.KnowledgeChecks.FindAsync([id], ct) ?? throw ApiProblem.Missing();
            if (row.AnsweredAt.HasValue)
            {
                if (row.Choice != input.Choice) throw ApiProblem.Conflict("Bài kiểm tra này đã nộp. Luyện lại câu hỏi để có lượt mới.");
                return View(row);
            }
            var definition = DataJson.Read<CheckDefinition>(row.Definition);
            if (input.Choice is null or < 0 || input.Choice >= definition.Choices.Length) throw ApiProblem.Invalid("Chọn một đáp án trong bài kiểm tra.");
            row.Choice = input.Choice;
            row.Correct = input.Choice == definition.CorrectIndex;
            row.AnsweredAt = clock.GetUtcNow();
            row.StudyDay = await Learning.Today(db, user.Id(), clock, ct);
            row.Assisted = attempt.HintSeen || attempt.AnswerSeen || attempt.ReferenceViewedAt.HasValue ||
                await db.AiReviews.AnyAsync(ai => ai.AttemptId == id && ai.Feedback != null, ct);
            // Persist inside the owner transaction before rebuilding the learning projection.
            await db.SaveChangesAsync(ct);
            var state = await db.StudyStates.FindAsync([user.Id(), attempt.Slug], ct) ?? throw ApiProblem.Missing();
            await Recall.Refresh(db, state, await catalog.Version(attempt.Slug, attempt.Version, ct), ct, today: row.StudyDay);
            state.Revision++;
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return View(row);
        });
    }
}
