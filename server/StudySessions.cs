using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

internal sealed record StartStudy(Guid Id, string Mode, int Minutes, string? Topic, string? Concept=null);
internal sealed record StudyItem(string Slug, int Version, string Title, int Minutes, string? Topic=null, string? Reason=null);

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
            await using var tx = await db.LockLearning(user.Id(), ct);
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

    internal static StudyItem[] Plan(StudySession session) => session.Mode=="placement" ? DataJson.Read<PlacementPlan>(session.Plan).Items : DataJson.Read<StudyItem[]>(session.Plan);

    private static async Task<IResult> Start(StartStudy request, ClaimsPrincipal user, PracticeDb db, Catalog catalog, Materials materials, TimeProvider clock, CancellationToken ct)
    {
        if (request.Id == Guid.Empty || request.Minutes is not (5 or 10 or 15 or 30) || !Modes.Contains(request.Mode)
            || request.Topic is not null && !Catalog.Topics.Any(x => x.Id == request.Topic))
            throw ApiProblem.Invalid("Chọn chế độ, chủ đề và thời lượng hợp lệ.");
        var owner = user.Id();
        var existing = await db.StudySessions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.Id && x.UserId == owner, ct);
        if (existing is not null) return await View(existing, db, ct);
        var goal = await Learning.Goal(db, owner, ct);
        var today = Learning.LocalDate(clock.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById(goal.TimeZone));
        await Recall.Expire(db, owner, today, ct);
        var states = await db.StudyStates.AsNoTracking().Where(s => s.UserId == owner).ToDictionaryAsync(s => s.Slug, ct);
        var wrong = await db.Attempts.Where(a => a.UserId == owner && a.Correct == false &&
            db.StudyStates.Any(s => s.UserId == owner && s.LastAttemptId == a.Id)).Select(a => a.Slug).ToListAsync(ct);
        var questions = catalog.PublishedQuery().AsNoTracking();
        if (request.Concept is not null) {
            var slugs = materials.Concepts.SingleOrDefault(c=>c.Id==request.Concept)?.Questions ?? throw ApiProblem.Invalid("Khái niệm không hợp lệ.");
            questions = questions.Where(q=>slugs.Contains(q.Slug));
        }
        var current = await questions.ToListAsync(ct);
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
                "wrong" => s?.Bookmarked==true || s?.Mastery == "review" || s?.Rating == "unsure" || s?.LastOutcome == "skipped" || wrong.Contains(q.Slug),
                "weak" => weakTopics.Contains(q.Topic),
                "core" => c.Core || catalog.PresetList.Any(p => p.Suggested.Contains(q.Slug)),
                "quiz" => c.Quiz is not null,
                "essay" => c.Quiz is null,
                "debug" or "predict" or "compare" => q.Format == request.Mode,
                _ => true
            })
            orderby request.Mode=="flashcard" && s?.Due<=today descending, request.Mode is "due" or "flashcard" ? s?.Due : null,
                unmet,
                s?.LastActivityAt, goal.Topics.Contains(q.Topic) descending,
                Math.Abs(Array.IndexOf(Catalog.Levels, q.Level) - Math.Max(0, Array.IndexOf(Catalog.Levels, goal.Level))),
                q.Minutes, q.Slug
            select new StudyItem(q.Slug, q.Version, q.Title, request.Mode is "speed" or "flashcard" ? 1 : q.Minutes, q.Topic,
                request.Mode=="wrong" ? s?.ReviewReason ?? (s?.Bookmarked==true?"bookmarked":s?.LastOutcome=="skipped"?"skipped":"self") : null);
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
        return await Save(db, new StudySession { Id = request.Id, UserId = owner, Mode = request.Mode, Minutes = request.Minutes,
            StartedAt = clock.GetUtcNow(), Plan = DataJson.Write(plan) }, ct);
    }

    internal static async Task<IResult> Save(PracticeDb db, StudySession row, CancellationToken ct)
    {
        db.StudySessions.Add(row);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
            var existing = await db.StudySessions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == row.Id && x.UserId == row.UserId, ct);
            if (existing is null) throw;
            return await View(existing, db, ct);
        }
        return await View(row, db, ct);
    }

    internal static async Task<IResult> View(StudySession row, PracticeDb db, CancellationToken ct)
    {
        var attempts = await (from a in db.Attempts where a.UserId == row.UserId && a.StudySessionId == row.Id
            join s in db.Assessments on a.Id equals s.AttemptId into ratings from s in ratings.DefaultIfEmpty()
            join state in db.StudyStates on new { a.UserId, a.Slug } equals new { state.UserId, state.Slug }
            join check in db.KnowledgeChecks on a.Id equals check.AttemptId into checks from k in checks.DefaultIfEmpty()
            select new { a.Id, a.Slug, a.Outcome, a.Correct, a.HintSeen, a.AnswerSeen, a.ActiveSeconds, state.Due, Rating = s == null ? null : s.Rating,
                Transfer = k == null || k.Assisted ? null : k.Correct })
            .ToDictionaryAsync(a => a.Slug, ct);
        var placement = row.Mode=="placement" ? DataJson.Read<PlacementPlan>(row.Plan) : null;
        var codingResult = placement?.Coding?.Submission is { } job ? await db.ExerciseSubmissions.AsNoTracking().Where(j=>
            j.Id==job && j.UserId==row.UserId && j.Action=="submit").Select(j=>new{j.Status,j.Assisted}).SingleOrDefaultAsync(ct) : null;
        return TypedResults.Ok(new { row.Id, row.Mode, row.Minutes, row.StartedAt, row.EndedAt, level=placement?.Level, coding=placement?.Coding, codingResult,
            items = Plan(row).Select(i => new { i.Slug, i.Version, i.Title, i.Minutes, i.Topic, i.Reason, attempt = attempts.GetValueOrDefault(i.Slug) }) });
    }
}
