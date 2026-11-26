using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

internal sealed record StartStudy(Guid Id, string Mode, int Minutes, string? Topic);
internal sealed record StudyItem(string Slug, int Version, string Title, int Minutes);

internal static class StudySessions
{
    internal static readonly string[] Modes = ["new", "due", "wrong", "weak", "core", "flashcard", "quiz", "essay", "debug", "predict", "compare", "speed"];

    public static void Map(RouteGroupBuilder api)
    {
        var group = api.MapGroup("/study-sessions").RequireAuthorization();
        group.MapPost("", Start);
        group.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal user, PracticeDb db, CancellationToken ct) =>
            await View(await Owned(db, user.Id(), id, ct), db, ct));
        group.MapPost("/{id:guid}/finish", async (Guid id, ClaimsPrincipal user, PracticeDb db, TimeProvider clock, CancellationToken ct) =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var row = await Locked(db, user.Id(), id, ct);
            row.EndedAt ??= clock.GetUtcNow();
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return await View(row, db, ct);
        });
    }

    internal static async Task<StudySession> Owned(PracticeDb db, string owner, Guid id, CancellationToken ct) =>
        await db.StudySessions.AsNoTracking().SingleOrDefaultAsync(s => s.UserId == owner && s.Id == id, ct) ?? throw ApiProblem.Missing();

    internal static async Task<StudySession> Locked(PracticeDb db, string owner, Guid id, CancellationToken ct) =>
        await db.StudySessions.FromSqlInterpolated($"SELECT * FROM [StudySessions] WITH (UPDLOCK, ROWLOCK) WHERE [Id]={id} AND [UserId]={owner}")
            .SingleOrDefaultAsync(ct) ?? throw ApiProblem.Missing();

    internal static StudyItem[] Plan(StudySession session) => DataJson.Read<StudyItem[]>(session.Plan);

    private static async Task<IResult> Start(StartStudy request, ClaimsPrincipal user, PracticeDb db, Catalog catalog, TimeProvider clock, CancellationToken ct)
    {
        if (request.Id == Guid.Empty || request.Minutes is not (5 or 10 or 15 or 30) || !Modes.Contains(request.Mode)
            || request.Topic is not null && !Catalog.Topics.Any(x => x.Id == request.Topic))
            throw ApiProblem.Invalid("Chọn chế độ, chủ đề và thời lượng hợp lệ.");
        var owner = user.Id();
        var existing = await db.StudySessions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.Id && x.UserId == owner, ct);
        if (existing is not null) return await View(existing, db, ct);
        var goal = await Learning.Goal(db, owner, ct);
        var today = Learning.LocalDate(clock.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById(goal.TimeZone));
        var states = await db.StudyStates.AsNoTracking().Where(s => s.UserId == owner).ToDictionaryAsync(s => s.Slug, ct);
        var wrong = await db.Attempts.Where(a => a.UserId == owner && a.Correct == false &&
            db.StudyStates.Any(s => s.UserId == owner && s.LastAttemptId == a.Id)).Select(a => a.Slug).ToListAsync(ct);
        var current = await catalog.PublishedQuery().AsNoTracking().ToListAsync(ct);
        var weakTopics = current.Where(q => states.GetValueOrDefault(q.Slug)?.Mastery == "review")
            .Select(q => q.Topic).Concat(goal.ReviewTopics).ToHashSet();
        var candidates = from q in current
            let s = states.GetValueOrDefault(q.Slug)
            let c = Catalog.Content(q)
            let unmet = (c.Prerequisites ?? []).Count(k => !states.TryGetValue(k, out var prerequisite) ||
                prerequisite.AnsweredCount == 0 || prerequisite.Mastery == "review")
            where (request.Topic is null || request.Topic == q.Topic) && (request.Mode switch
            {
                "new" => s?.LastAttemptId is null && unmet == 0,
                "due" => s?.Due <= today,
                "wrong" => wrong.Contains(q.Slug),
                "weak" => weakTopics.Contains(q.Topic),
                "core" => c.Core || Interviews.Presets.Any(p => p.Suggested.Contains(q.Slug)),
                "quiz" => c.Quiz is not null,
                "essay" => c.Quiz is null,
                "debug" or "predict" or "compare" => q.Format == request.Mode,
                _ => true
            })
            orderby request.Mode == "due" ? s?.Due : null,
                unmet,
                s?.LastActivityAt, goal.Topics.Contains(q.Topic) descending,
                Math.Abs(Array.IndexOf(Catalog.Levels, q.Level) - Math.Max(0, Array.IndexOf(Catalog.Levels, goal.Level))),
                q.Minutes, q.Slug
            select new StudyItem(q.Slug, q.Version, q.Title, request.Mode == "speed" ? 1 : q.Minutes);
        var plan = new List<StudyItem>();
        var remaining = request.Minutes;
        foreach (var item in candidates)
        {
            if (item.Minutes > remaining) continue;
            plan.Add(item);
            remaining -= item.Minutes;
            if (remaining == 0) break;
        }
        if (plan.Count == 0) throw new ApiProblem(422, "empty_session", "Chưa có câu phù hợp với bộ lọc và thời lượng này.");
        var row = new StudySession { Id = request.Id, UserId = owner, Mode = request.Mode, Minutes = request.Minutes,
            StartedAt = clock.GetUtcNow(), Plan = DataJson.Write(plan) };
        db.StudySessions.Add(row);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
            existing = await db.StudySessions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.Id && x.UserId == owner, ct);
            if (existing is null) throw;
            return await View(existing, db, ct);
        }
        return await View(row, db, ct);
    }

    private static async Task<IResult> View(StudySession row, PracticeDb db, CancellationToken ct)
    {
        var attempts = await (from a in db.Attempts where a.UserId == row.UserId && a.StudySessionId == row.Id
            join s in db.Assessments on a.Id equals s.AttemptId into ratings from s in ratings.DefaultIfEmpty()
            join state in db.StudyStates on new { a.UserId, a.Slug } equals new { state.UserId, state.Slug }
            select new { a.Id, a.Slug, a.Outcome, a.Correct, a.HintSeen, a.AnswerSeen, a.ActiveSeconds, state.Due, Rating = s == null ? null : s.Rating })
            .ToDictionaryAsync(a => a.Slug, ct);
        return TypedResults.Ok(new { row.Id, row.Mode, row.Minutes, row.StartedAt, row.EndedAt,
            items = Plan(row).Select(i => new { i.Slug, i.Version, i.Title, i.Minutes, attempt = attempts.GetValueOrDefault(i.Slug) }) });
    }
}
