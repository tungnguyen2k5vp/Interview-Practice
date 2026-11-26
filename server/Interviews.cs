using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

/// <summary>Bộ lọc và thời lượng cho một phiên mới.</summary>
internal sealed record StartInterviewRequest(Guid Id, string Preset, string Level, string[] Topics, string? Difficulty, string Language,
    int Minutes, string Mode, Guid? ReviewOf, int? Count = null, bool PreferWeak = false, bool AiConsent = false, int AiLimit = 0);

/// <summary>Thao tác tại một phiên bản trạng thái phiên cụ thể.</summary>
internal sealed record InterviewActionRequest(Guid Id, int Revision, string Action, [StringLength(16000)] string? Text);

/// <summary>Thu thập tự đánh giá chính chủ cho một câu đã trả lời.</summary>
internal sealed record InterviewRatingRequest(string Rating);
internal sealed record InterviewReviewRequest(Guid Id, int? Position);
internal sealed record InterviewRewriteRequest(int Revision, string Text);

/// <summary>Cấu hình phỏng vấn có sẵn.</summary>
internal sealed record InterviewPreset(string Id, string Name, string Description, string[] Topics, string[] Suggested);

internal sealed record QuestionPointer(string Slug, int Version);
internal sealed record InterviewPlan(string Level, string[] Topics, string? Difficulty, QuestionPointer[] Questions,
    Dictionary<int, string>? FollowUps = null, int AiLimit = 0, int AiUsed = 0, int? ActiveStart = null,
    Dictionary<string, InterviewEntry>? Entries = null, Dictionary<int, string>? Rewrites = null);

/// <summary>Thông tin phiên có thể mở tiếp.</summary>
internal sealed record InterviewSummary(Guid Id, string Preset, string Mode, string Language, string Status, DateTimeOffset StartedAt, int Minutes);

/// <summary>Câu hỏi hoặc phản hồi duy nhất đang mở.</summary>
internal sealed record CurrentPrompt(string Slug, int Version, string Title, string Topic, string Text, string? Context, string? Code,
    string? Hint, ReferenceResponse? Reference, string? Answer, string? FollowUpAnswer, string? Rating,
    string? AiState, InterviewObservation? Feedback);

/// <summary>Một câu và bằng chứng được lưu trong báo cáo phiên.</summary>
internal sealed record ReportItem(int Position, string Slug, string Title, string Topic, string Prompt, string Status,
    string? Answer, bool HintSeen, string? FollowUp, string? FollowUpAnswer, bool FollowUpSkipped, string? Rating, ReferenceResponse Reference,
    InterviewEntry? MainEntry, InterviewEntry? FollowEntry, string? Rewrite)
{
    public string? ReviewReason => Status switch {
        "unasked" => null, "skipped" => "skipped", "unanswered" => "unanswered",
        _ when (MainEntry?.Observation?.Assessment.Findings ?? []).Concat(FollowEntry?.Observation?.Assessment.Findings ?? [])
            .Any(f => f.Kind is "misconception" or "gap" or "contradiction") => "ai",
        _ when Rating is "unsure" or "partial" => "self",
        _ when FollowUpSkipped || FollowUp != null && FollowUpAnswer == null => "followup",
        _ when HintSeen => "assisted",
        _ when Rating == null && MainEntry?.Observation == null => "unrated",
        _ => null
    };
}

internal sealed record InterviewComparison(Guid Id, DateTimeOffset At, int Answered, int FollowUps, int ActiveSeconds);

/// <summary>Trạng thái phiên và nội dung được phép xem ở bước hiện tại.</summary>
internal sealed record InterviewResponse(InterviewSummary Session, int Revision, int Position, int Count, string Stage, string Draft,
    DateTimeOffset ServerNow, DateTimeOffset Deadline, int? PausedSeconds, CurrentPrompt? Current, ReportItem[]? Report,
    int AiLimit, int AiUsed, int ActiveSeconds, InterviewComparison? Previous);

internal sealed class Interviews(PracticeDb db, Catalog catalog, TimeProvider clock, AiProvider coach)
{
    internal static bool Guided(string mode) => mode is "offline" or "guided" or "guided-ai";
    private static bool Automatic(string mode) => mode is "guided-ai" or "realistic-ai";

    public static readonly InterviewPreset[] Presets =
    [
        new("foundation", "Nền tảng .NET", "C# và OOP, cách diễn đạt và lập luận.", ["csharp", "oop", "linq"], ["value-reference", "interface-abstract", "deferred-execution"]),
        new("backend", "Backend & API", "Pipeline, EF Core, phân quyền và tình huống vận hành.", ["aspnet", "efcore", "testing"], ["di-lifetimes", "middleware-order", "ef-projection", "resource-authorization", "slow-api"]),
        new("problem-solving", "SQL & Problem Solving", "Đọc truy vấn và lý giải thuật toán.", ["sql", "algorithms"], ["join-duplicates", "two-pointers", "sql-null"]),
        new("coding", "Coding Interview", "Đọc code và giải thích thuật toán bằng lời.", ["algorithms", "csharp"], ["binary-search-boundary", "hash-frequency"]),
        new("sql-round", "SQL Interview", "JOIN, chỉ mục và tính nhất quán.", ["sql"], ["index-plan", "join-duplicates"]),
        new("design", "System Design", "Chọn biên nhất quán, xử lý lỗi và đánh đổi.", ["systems", "delivery"], ["outbox-commit", "cache-invalidation"]),
        new("people", "HR & Dự án", "Quyết định, phối hợp và bằng chứng trong dự án.", ["behavioral", "testing"], ["behavioral-disagreement", "project-star"])
    ];

    public static void Map(RouteGroupBuilder api)
    {
        api.MapGet("/interview-presets", () => TypedResults.Ok(Presets)).WithSummary("Xem các bộ phỏng vấn.");
        var group = api.MapGroup("/interviews").RequireAuthorization();
        group.MapPost("", (StartInterviewRequest request, ClaimsPrincipal user, Interviews service, CancellationToken ct)
            => service.Start(request, user.Id(), ct)).WithSummary("Chốt kế hoạch và bắt đầu phiên.");
        group.MapGet("/{id:guid}", (Guid id, ClaimsPrincipal user, Interviews service, CancellationToken ct)
            => service.Read(id, user.Id(), ct)).WithSummary("Tiếp tục phiên hoặc xem báo cáo.");
        group.MapPost("/{id:guid}/review-session", (Guid id, InterviewReviewRequest request, ClaimsPrincipal user, Interviews service, CancellationToken ct)
            => service.ReviewSession(id, request, user.Id(), ct)).WithSummary("Tạo phiên học theo các câu cần luyện lại trong báo cáo.");
        group.MapPut("/{id:guid}/rewrites/{position:int}", (Guid id, int position, InterviewRewriteRequest request, ClaimsPrincipal user,
            Interviews service, CancellationToken ct) => service.Rewrite(id, position, request, user.Id(), ct));
        group.MapPost("/{id:guid}/coach-followup", (Guid id, int revision, ClaimsPrincipal user, Interviews service, CancellationToken ct)
            => service.FollowUp(id, revision, user.Id(), ct)).RequireRateLimiting("ai");
        group.MapPost("/{id:guid}/actions", (Guid id, InterviewActionRequest request, ClaimsPrincipal user, Interviews service, CancellationToken ct)
            => service.Act(id, request, user.Id(), ct)).WithSummary("Gửi câu trả lời hoặc điều khiển phiên.");
        group.MapPut("/{id:guid}/ratings/{position:int}", (Guid id, int position, InterviewRatingRequest request, ClaimsPrincipal user, Interviews service,
            CancellationToken ct) => service.Rate(id, position, request, user.Id(), ct)).WithSummary("Lưu tự đánh giá của một câu.");
    }

    public static InterviewSummary Summary(InterviewSession row) =>
        new(row.Id, row.Preset, row.Mode, row.Language, row.Status, row.StartedAt, row.SessionSeconds / 60);

    private async Task<IResult> Start(StartInterviewRequest request, string user, CancellationToken ct)
    {
        var preset = Presets.SingleOrDefault(x => x.Id == request.Preset);
        if (request.Id == Guid.Empty || preset is null || request.Mode is not ("guided" or "mock" or "offline" or "guided-ai" or "realistic-ai")
            || (Automatic(request.Mode) ? !request.AiConsent || request.AiLimit is < 1 or > 4 : request.AiConsent || request.AiLimit != 0)
            || request.Language is not ("vi" or "en") || request.Minutes is not (15 or 30 or 45)
            || request.Count is < 1 or > 12 || request.Count > request.Minutes / 2
            || !Catalog.Levels.Contains(request.Level) || request.Topics is null || request.Topics.Length > Catalog.Topics.Length
            || request.Topics.Any(x => !Catalog.Topics.Any(t => t.Id == x))
            || (!string.IsNullOrWhiteSpace(request.Difficulty) && !Catalog.Difficulties.Contains(request.Difficulty)))
            throw ApiProblem.Invalid("Kiểm tra chế độ, thời lượng, mức mục tiêu và chủ đề.");
        var existing = await db.Interviews.SingleOrDefaultAsync(x => x.Id == request.Id && x.UserId == user, ct);
        if (existing is not null)
            return TypedResults.Ok(await View(existing, ct));
        var topics = request.Topics.Length == 0 ? preset.Topics : request.Topics.Distinct().ToArray();
        string[] weak = [];
        if (request.ReviewOf is { } reviewId)
        {
            var previous = await Owned(reviewId, user, ct);
            if (previous.Status is "active" or "paused")
                throw ApiProblem.Invalid("Hãy kết thúc phiên trước khi tạo phiên ôn.");
            var previousPlan = DataJson.Read<InterviewPlan>(previous.Plan);
            if (request.Topics.Length == 0) topics = previousPlan.Topics;
            weak = (await View(previous, ct)).Report!.Where(item => item.ReviewReason != null).Select(item => item.Slug).ToArray();
        }
        var source = catalog.PublishedQuery().Where(x => topics.Contains(x.Topic));
        if (!string.IsNullOrWhiteSpace(request.Difficulty))
            source = source.Where(x => x.Difficulty == request.Difficulty);
        var candidates = await source.Select(x => new { x.Slug, x.Version, x.Level }).ToArrayAsync(ct);
        var level = Array.IndexOf(Catalog.Levels, request.Level);
        var count = request.Count ?? (request.Minutes switch { 15 => 3, 30 => 5, _ => 7 });
        var recentPlans = await db.Interviews.Where(x => x.UserId == user).OrderByDescending(x => x.StartedAt)
            .Take(8).Select(x => x.Plan).ToArrayAsync(ct);
        var seen = recentPlans.SelectMany((p, i) => DataJson.Read<InterviewPlan>(p).Questions.Select(q => (q.Slug, Cost: 8 - i)))
            .GroupBy(x => x.Slug).ToDictionary(g => g.Key, g => g.Sum(x => x.Cost));
        var weakSlugs = request.PreferWeak ? await db.StudyStates.Where(x => x.UserId == user && x.Mastery == "review")
            .Select(x => x.Slug).ToListAsync(ct) : [];
        var choices = candidates.OrderByDescending(x => weak.Contains(x.Slug))
            .ThenByDescending(x => weakSlugs.Contains(x.Slug)).ThenBy(x => seen.GetValueOrDefault(x.Slug))
            .ThenBy(x => Math.Abs(Array.IndexOf(Catalog.Levels, x.Level) - level))
            .ThenByDescending(x => preset.Suggested.Contains(x.Slug))
            .ThenBy(x => x.Slug, StringComparer.Ordinal)
            .Take(count).Select(x => new QuestionPointer(x.Slug, x.Version)).ToArray();
        if (choices.Length == 0)
            throw ApiProblem.Invalid("Bộ lọc này chưa có câu phù hợp. Hãy đổi chủ đề hoặc độ khó.");
        var now = clock.GetUtcNow();
        var row = new InterviewSession
        {
            Id = request.Id, UserId = user, Preset = preset.Id, Mode = request.Mode, Language = request.Language,
            StartedAt = now, Deadline = now.AddMinutes(request.Minutes), SessionSeconds = request.Minutes * 60,
            SegmentStartedAt = now, Plan = DataJson.Write(new InterviewPlan(request.Level, topics, request.Difficulty, choices,
                AiLimit: request.AiLimit, ActiveStart: 0))
        };
        db.Interviews.Add(row);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
            existing = await db.Interviews.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.Id && x.UserId == user, ct);
            if (existing is null) throw;
            return TypedResults.Ok(await View(existing, ct));
        }
        return TypedResults.Created($"/api/interviews/{row.Id}", await View(row, ct));
    }

    private async Task<InterviewSession> Owned(Guid id, string user, CancellationToken ct) =>
        await db.Interviews.SingleOrDefaultAsync(x => x.Id == id && x.UserId == user, ct) ?? throw ApiProblem.Missing("Không tìm thấy phiên phỏng vấn.");

    private async Task<InterviewResponse> Read(Guid id, string user, CancellationToken ct)
    {
        var row = await Owned(id, user, ct);
        await Expire(row, ct);
        return await View(row, ct);
    }

    private async Task Expire(InterviewSession row, CancellationToken ct)
    {
        if (row.Status != "active" || row.Deadline > clock.GetUtcNow())
            return;
        Finish(row, "expired", row.Deadline);
        row.Revision++;
        await db.SaveChangesAsync(ct);
    }

    private static void StoreActiveTime(InterviewSession row, DateTimeOffset now)
    {
        if (row.SegmentStartedAt is { } since)
            row.ActiveSeconds = (int)Math.Clamp(row.ActiveSeconds + (now - since).TotalSeconds, 0, row.SessionSeconds);
        row.SegmentStartedAt = null;
    }

    private static int Elapsed(InterviewSession row, DateTimeOffset now) => (int)Math.Clamp(
        row.ActiveSeconds + (row.SegmentStartedAt is { } start ? (now - start).TotalSeconds : 0), 0, row.SessionSeconds);

    private static void Finish(InterviewSession row, string status, DateTimeOffset now)
    {
        StoreActiveTime(row, now);
        row.Status = status;
        row.EndedAt = now;
        row.PausedSeconds = null;
    }

    private static void Advance(InterviewSession row, InterviewPlan plan, DateTimeOffset now)
    {
        row.Position++;
        row.Stage = "question";
        row.HintSeen = false;
        row.Draft = "";
        if (row.Position >= plan.Questions.Length)
            Finish(row, "completed", now);
    }

    private async Task<InterviewResponse> Act(Guid id, InterviewActionRequest request, string user, CancellationToken ct)
    {
        if (request.Id == Guid.Empty || request.Revision < 0 || request.Text?.Length > 16000)
            throw ApiProblem.Invalid("Thao tác phiên không hợp lệ.");
        var row = await Owned(id, user, ct);
        await Expire(row, ct);
        if (row.LastAction == request.Id || await db.Turns.AnyAsync(x => x.SessionId == id && x.ActionId == request.Id, ct))
            return await View(row, ct);
        if (row.Status is not ("active" or "paused"))
            return await View(row, ct);
        if (row.Revision != request.Revision)
            throw ApiProblem.Conflict("Phiên đã đổi ở tab khác. Hãy tải lại trạng thái phiên.");
        var now = clock.GetUtcNow();
        if (row.Status == "active" && now >= row.Deadline)
        {
            await Expire(row, ct);
            return await View(row, ct);
        }
        var plan = DataJson.Read<InterviewPlan>(row.Plan);
        var position = row.Position;
        var stage = row.Stage;
        var entryKey = $"{position}-{stage}";
        string? assess = null;
        switch (request.Action)
        {
            case "end":
                Finish(row, "ended", now);
                break;
            case "pause" when Guided(row.Mode) && row.Status == "active":
                row.PausedSeconds = Math.Max(1, (int)Math.Ceiling((row.Deadline - now).TotalSeconds));
                row.Status = "paused";
                if (row.Stage != "feedback" && request.Text is not null)
                    row.Draft = request.Text;
                StoreActiveTime(row, now);
                break;
            case "resume" when row.Status == "paused":
                row.Deadline = now.AddSeconds(row.PausedSeconds!.Value);
                row.PausedSeconds = null;
                row.SegmentStartedAt = now;
                row.Status = "active";
                break;
            case "draft" when row.Status == "active" && row.Stage != "feedback":
                row.Draft = request.Text ?? "";
                break;
            case "hint" when row.Status == "active" && Guided(row.Mode) && row.Stage == "question":
                if (request.Text is not null) row.Draft = request.Text;
                row.HintSeen = true;
                break;
            case "next" when row.Status == "active" && row.Stage == "feedback":
                if (Guided(row.Mode) && string.IsNullOrEmpty(plan.Difficulty) && row.Position + 2 < plan.Questions.Length)
                {
                    var turn = await db.Turns.FindAsync([id, row.Position, "question"], ct);
                    if (turn?.Rating is "clear" or "unsure" || turn?.HintSeen == true)
                    {
                        var unasked = plan.Questions[(row.Position + 1)..];
                        var ids = unasked.Select(x => x.Slug).ToArray();
                        var levels = await db.QuestionVersions.Where(q => ids.Contains(q.Slug))
                            .Select(q => new { q.Slug, q.Version, q.Difficulty }).ToDictionaryAsync(q => (q.Slug, q.Version), q => q.Difficulty, ct);
                        var direction = turn.Rating == "clear" && !turn.HintSeen ? -1 : 1;
                        var chosen = unasked.MinBy(q => direction * Array.IndexOf(Catalog.Difficulties, levels[(q.Slug, q.Version)]))!;
                        var swap = Array.IndexOf(plan.Questions, chosen);
                        (plan.Questions[row.Position+1], plan.Questions[swap]) = (plan.Questions[swap], plan.Questions[row.Position+1]);
                    }
                }
                Advance(row, plan, now);
                break;
            case "answer" or "skip" when row.Status == "active" && row.Stage != "feedback":
                var skipped = request.Action == "skip";
                var text = skipped ? "" : (request.Text ?? row.Draft).Trim();
                if (!skipped && text.Length == 0)
                    throw ApiProblem.Invalid("Hãy nhập câu trả lời hoặc chọn Bỏ qua.");
                var known = !skipped && text is not ("Chưa biết" or "I don't know");
                if (plan.ActiveStart is { } start)
                {
                    var entries = plan.Entries ?? [];
                    string? aiState = null;
                    if (Automatic(row.Mode) && known)
                    {
                        aiState = !coach.Available ? "offline" : plan.AiUsed >= plan.AiLimit ? "budget" :
                            (row.Deadline - now).TotalSeconds < 30 ? "time" : "fallback";
                        if (aiState == "fallback")
                        {
                            // Reserve the call in the same transaction as the answer, before contacting the provider.
                            plan = plan with { AiUsed = plan.AiUsed + 1 };
                            assess = text;
                        }
                    }
                    entries[entryKey] = new(Math.Max(0, Elapsed(row, now) - start), aiState);
                    plan = plan with { Entries = entries };
                }
                db.Turns.Add(new InterviewTurn
                {
                    SessionId = id, ActionId = request.Id, Position = row.Position, Kind = row.Stage, Text = text,
                    Skipped = skipped, HintSeen = row.HintSeen, At = now
                });
                if (row.Stage == "question" && known && (row.Deadline - now).TotalSeconds >= 30)
                {
                    row.Stage = "followup";
                    row.Draft = "";
                }
                else if (Guided(row.Mode) && (row.Stage == "followup" || !skipped))
                {
                    row.Stage = "feedback";
                    row.Draft = "";
                }
                else Advance(row, plan, now);
                break;
            default:
                throw ApiProblem.Invalid("Thao tác chưa khả dụng ở bước này.");
        }
        if ((row.Stage != stage || row.Position != position) && plan.ActiveStart.HasValue)
            plan = plan with { ActiveStart = Elapsed(row, now) };
        row.Plan = DataJson.Write(plan);
        row.LastAction = request.Id;
        row.Revision++;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
            var current = await Owned(id, user, ct);
            if (current.LastAction != request.Id && !await db.Turns.AnyAsync(x => x.SessionId == id && x.ActionId == request.Id, ct))
                throw;
            return await View(current, ct);
        }
        if (assess != null)
            await AssessTurn(row, plan, position, stage, assess, ct);
        return await View(row, ct);
    }

    private async Task AssessTurn(InterviewSession row, InterviewPlan plan, int position, string stage, string answer, CancellationToken ct)
    {
        var revision = row.Revision;
        var pointer = plan.Questions[position];
        var material = Catalog.Content(await catalog.Version(pointer.Slug, pointer.Version, ct));
        var prompt = stage == "question" ? row.Language == "en" ? material.EnglishPrompt : material.Prompt :
            plan.FollowUps?.GetValueOrDefault(position) ?? (row.Language == "en" ? material.EnglishFollowUp : material.FollowUp);
        var priorTurns = await db.Turns.AsNoTracking().Where(t => t.SessionId == row.Id && !t.Skipped &&
            (t.Position < position || t.Position == position && t.Kind == "question" && stage == "followup"))
            .OrderByDescending(t => t.At).ThenByDescending(t => t.Position).Take(2).ToArrayAsync(ct);
        var prior = new List<InterviewContext>();
        foreach (var turn in priorTurns.Reverse())
        {
            var p = plan.Questions[turn.Position];
            var c = Catalog.Content(await catalog.Version(p.Slug, p.Version, ct));
            var previousPrompt = turn.Kind == "followup" ? plan.FollowUps?.GetValueOrDefault(turn.Position) ??
                (row.Language == "en" ? c.EnglishFollowUp : c.FollowUp) : row.Language == "en" ? c.EnglishPrompt : c.Prompt;
            prior.Add(new(previousPrompt, turn.Text[..Math.Min(1800, turn.Text.Length)]));
        }
        var state = "assessed";
        InterviewObservation? observation = null;
        try
        {
            observation = await InterviewCoach.Assess(coach, row.UserId, material, row.Language, stage, prompt, answer,
                [.. prior], (int)(row.Deadline - clock.GetUtcNow()).TotalSeconds, ct);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested && ex is HttpRequestException or OperationCanceledException
                                   or ApiProblem or InvalidDataException or System.Text.Json.JsonException)
        {
            state = ex is ApiProblem { Code: "ai_quota" or "ai_limit" } ? "quota" : ex is OperationCanceledException ? "timeout" : "fallback";
        }
        await db.Entry(row).ReloadAsync(ct);
        if (row.Revision != revision) return;
        var now = clock.GetUtcNow();
        if (row.Status == "active" && now >= row.Deadline) { await Expire(row, ct); return; }
        var entryKey = $"{position}-{stage}";
        plan.Entries![entryKey] = plan.Entries[entryKey] with { AiState = state, Observation = observation };
        if (observation is not null && stage == "question" && row.Stage == "followup")
        {
            var next = InterviewCoach.Probe(observation.Assessment, row.Language);
            var follows = plan.FollowUps ?? [];
            if (next != null && (row.Deadline - now).TotalSeconds >= 20 && !follows.Values.Contains(next, StringComparer.OrdinalIgnoreCase))
            {
                follows[position] = next;
                plan = plan with { FollowUps = follows };
            }
            else if (Guided(row.Mode)) row.Stage = "feedback";
            else Advance(row, plan, now);
        }
        var nextIndex = position + 1;
        if (observation?.Assessment.Difficulty is "easier" or "harder" && plan.Difficulty == null && nextIndex + 1 < plan.Questions.Length)
        {
            var remaining = plan.Questions[nextIndex..];
            var slugs = remaining.Select(q => q.Slug).ToArray();
            var levels = await db.QuestionVersions.Where(q => slugs.Contains(q.Slug))
                .Select(q => new { q.Slug, q.Version, q.Difficulty }).ToDictionaryAsync(q => (q.Slug, q.Version), q => q.Difficulty, ct);
            var direction = observation.Assessment.Difficulty == "easier" ? 1 : -1;
            var chosen = remaining.MinBy(q => direction * Array.IndexOf(Catalog.Difficulties, levels[(q.Slug, q.Version)]))!;
            var swap = Array.IndexOf(plan.Questions, chosen);
            (plan.Questions[nextIndex], plan.Questions[swap]) = (plan.Questions[swap], plan.Questions[nextIndex]);
        }
        row.Plan = DataJson.Write(plan with { ActiveStart = Elapsed(row, now) });
        row.Revision++;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { await db.Entry(row).ReloadAsync(ct); }
    }

    private async Task<InterviewComparison?> Comparable(InterviewSession row, InterviewPlan plan, CancellationToken ct)
    {
        var history = await db.Interviews.AsNoTracking().Where(s => s.UserId == row.UserId && s.Id != row.Id &&
            s.Status == "completed" && s.StartedAt < row.StartedAt && s.Preset == row.Preset && s.Language == row.Language &&
            s.Mode == row.Mode && s.SessionSeconds == row.SessionSeconds).OrderByDescending(s => s.StartedAt).Take(30)
            .Select(s => new { s.Id, s.StartedAt, s.ActiveSeconds, s.Plan }).ToArrayAsync(ct);
        foreach (var candidate in history)
        {
            var old = DataJson.Read<InterviewPlan>(candidate.Plan);
            if (old.Level != plan.Level || old.Difficulty != plan.Difficulty || old.AiLimit != plan.AiLimit ||
                !old.Topics.Order().SequenceEqual(plan.Topics.Order()) ||
                !old.Questions.OrderBy(q => q.Slug).SequenceEqual(plan.Questions.OrderBy(q => q.Slug))) continue;
            var kinds = await db.Turns.Where(t => t.SessionId == candidate.Id && !t.Skipped).Select(t => t.Kind).ToArrayAsync(ct);
            return new(candidate.Id, candidate.StartedAt, kinds.Count(k => k == "question"), kinds.Count(k => k == "followup"), candidate.ActiveSeconds);
        }
        return null;
    }

    private async Task<InterviewResponse> Rate(Guid id, int position, InterviewRatingRequest request, string user, CancellationToken ct)
    {
        if (!Practice.Ratings.Contains(request.Rating))
            throw ApiProblem.Invalid("Mức tự đánh giá không hợp lệ.");
        var row = await Owned(id, user, ct);
        await Expire(row, ct);
        if (row.Status is "active" or "paused" && (row.Stage != "feedback" || row.Position != position))
            throw ApiProblem.Invalid("Mở phản hồi trước khi tự đánh giá.");
        var answer = await db.Turns.FindAsync([id, position, "question"], ct) ?? throw ApiProblem.Missing();
        if (answer.Skipped) throw ApiProblem.Invalid("Câu đã bỏ qua chưa có tự đánh giá.");
        answer.Rating = request.Rating;
        await db.SaveChangesAsync(ct);
        return await View(row, ct);
    }

    private async Task<InterviewResponse> View(InterviewSession row, CancellationToken ct)
    {
        var plan = DataJson.Read<InterviewPlan>(row.Plan);
        CurrentPrompt? current = null;
        ReportItem[]? report = null;
        if (row.Status is "active" or "paused")
        {
            var pointer = plan.Questions[row.Position];
            var q = await catalog.Version(pointer.Slug, pointer.Version, ct);
            var c = Catalog.Content(q);
            var english = row.Language == "en";
            var feedback = row.Stage == "feedback";
            var turns = row.Stage != "question" ? await db.Turns.AsNoTracking().Where(x => x.SessionId == row.Id && x.Position == row.Position).ToArrayAsync(ct) : [];
            var main = turns.SingleOrDefault(x => x.Kind == "question");
            var follow = turns.SingleOrDefault(x => x.Kind == "followup");
            current = new(q.Slug, q.Version, q.Title, q.Topic,
                row.Stage == "followup" ? plan.FollowUps?.GetValueOrDefault(row.Position) ?? (english ? c.EnglishFollowUp : c.FollowUp) : english ? c.EnglishPrompt : c.Prompt,
                row.Stage == "question" && !english ? c.Context : null,
                row.Stage == "question" ? c.Code : null,
                Guided(row.Mode) && row.Stage == "question" && row.HintSeen ? c.Hint : null,
                feedback ? Catalog.Reference(q) : null, main?.Text, follow is { Skipped: false } ? follow.Text : null, main?.Rating,
                plan.Entries?.GetValueOrDefault($"{row.Position}-question")?.AiState,
                feedback ? plan.Entries?.GetValueOrDefault($"{row.Position}-question")?.Observation : null);
        }
        else
        {
            var turns = await db.Turns.AsNoTracking().Where(x => x.SessionId == row.Id).ToArrayAsync(ct);
            var items = new List<ReportItem>();
            var slugs = plan.Questions.Select(q => q.Slug).Distinct().ToArray();
            var versions = await db.QuestionVersions.AsNoTracking().Where(q => slugs.Contains(q.Slug))
                .ToDictionaryAsync(q => (q.Slug, q.Version), ct);
            for (var index = 0; index < plan.Questions.Length; index++)
            {
                var pointer = plan.Questions[index];
                var q = versions[(pointer.Slug, pointer.Version)];
                var c = Catalog.Content(q);
                var main = turns.SingleOrDefault(x => x.Position == index && x.Kind == "question");
                var follow = turns.SingleOrDefault(x => x.Position == index && x.Kind == "followup");
                var english = row.Language == "en";
                items.Add(new(index, q.Slug, q.Title, q.Topic, english ? c.EnglishPrompt : c.Prompt,
                    main is null ? index <= row.Position ? "unanswered" : "unasked" : main.Skipped ? "skipped" : "answered",
                    main is { Skipped: false } ? main.Text : null, main?.HintSeen ?? false,
                    follow is not null || (row.Position == index && row.Stage == "followup") ? plan.FollowUps?.GetValueOrDefault(index) ?? (english ? c.EnglishFollowUp : c.FollowUp) : null,
                    follow is { Skipped: false } ? follow.Text : null, follow?.Skipped ?? false, main?.Rating, Catalog.Reference(q),
                    plan.Entries?.GetValueOrDefault($"{index}-question"), plan.Entries?.GetValueOrDefault($"{index}-followup"),
                    plan.Rewrites?.GetValueOrDefault(index)));
            }
            report = [.. items];
        }
        return new(Summary(row), row.Revision, Math.Min(row.Position, plan.Questions.Length - 1), plan.Questions.Length, row.Stage,
            row.Draft, clock.GetUtcNow(), row.Deadline, row.PausedSeconds, current, report, plan.AiLimit, plan.AiUsed,
            Elapsed(row, clock.GetUtcNow()), row.Status == "completed" ? await Comparable(row, plan, ct) : null);
    }

    private async Task<InterviewResponse> FollowUp(Guid id, int revision, string user, CancellationToken ct)
    {
        var row = await Owned(id, user, ct);
        await Expire(row, ct);
        if (row.Mode != "guided" || row.Status != "active" || row.Stage != "followup" || row.Draft.Length != 0)
            throw ApiProblem.Conflict("Chỉ đổi câu đào sâu trước khi trả lời trong phiên có hướng dẫn.");
        var plan = DataJson.Read<InterviewPlan>(row.Plan);
        if (plan.FollowUps?.ContainsKey(row.Position) == true) return await View(row, ct);
        if (row.Revision != revision || (row.Deadline - clock.GetUtcNow()).TotalSeconds < 25) throw ApiProblem.Conflict();
        var pointer = plan.Questions[row.Position];
        var material = Catalog.Content(await catalog.Version(pointer.Slug, pointer.Version, ct));
        var turn = await db.Turns.SingleAsync(t => t.SessionId == id && t.Position == row.Position && t.Kind == "question", ct);
        var follow = await coach.ContextQuestion(material, turn.Text, row.Language, user, ct);
        if (row.Deadline <= clock.GetUtcNow()) { await Expire(row, ct); return await View(row, ct); }
        var saved = plan.FollowUps ?? [];
        saved[row.Position] = follow;
        row.Plan = DataJson.Write(plan with { FollowUps = saved });
        row.Revision++;
        await db.SaveChangesAsync(ct);
        return await View(row, ct);
    }

    private async Task<IResult> ReviewSession(Guid id, InterviewReviewRequest request, string user, CancellationToken ct)
    {
        if (request.Id == Guid.Empty) throw ApiProblem.Invalid("Thiếu mã phiên ôn.");
        var report = (await Read(id, user, ct)).Report ?? throw ApiProblem.Conflict("Hãy kết thúc phiên trước khi ôn.");
        if (request.Position is < 0 || request.Position >= report.Length) throw ApiProblem.Invalid("Vị trí câu không hợp lệ.");
        var items = report.Where(x => request.Position is { } index ? x.Position == index && x.Status != "unasked" : x.ReviewReason != null)
            .OrderBy(x => x.ReviewReason switch { "ai" => 0, "skipped" or "self" => 1, _ => 2 })
            .Select(x => new StudyItem(x.Slug, x.Reference.Version, x.Title, 5)).ToArray();
        if (items.Length == 0) throw ApiProblem.Invalid("Chưa có câu cần luyện lại ở lựa chọn này.");
        return await StudySessions.Save(db, new StudySession { Id = request.Id, UserId = user, StartedAt = clock.GetUtcNow(),
            Mode = "essay", Minutes = items.Sum(x => x.Minutes), Plan = DataJson.Write(items) }, ct);
    }

    private async Task<InterviewResponse> Rewrite(Guid id, int position, InterviewRewriteRequest request, string user, CancellationToken ct)
    {
        var row = await Owned(id, user, ct);
        if (row.Status is "active" or "paused") throw ApiProblem.Conflict("Bản viết lại mở khi kết thúc phiên.");
        if (request.Text == null || request.Text.Length > 16000 || !await db.Turns.AnyAsync(t =>
            t.SessionId == id && t.Position == position && t.Kind == "question" && !t.Skipped, ct)) throw ApiProblem.Invalid("Cần một lượt đã trả lời.");
        var plan = DataJson.Read<InterviewPlan>(row.Plan);
        var rewrites = plan.Rewrites ?? [];
        var text = request.Text.Trim();
        if ((rewrites.GetValueOrDefault(position) ?? "") == text) return await View(row, ct);
        if (row.Revision != request.Revision) throw ApiProblem.Conflict();
        if (text.Length == 0) rewrites.Remove(position); else rewrites[position] = text;
        row.Plan = DataJson.Write(plan with { Rewrites = rewrites });
        row.Revision++;
        await db.SaveChangesAsync(ct);
        return await View(row, ct);
    }
}
