using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

/// <summary>Bộ lọc và thời lượng cho một phiên mới.</summary>
internal sealed record StartInterviewRequest(Guid Id, string Preset, string Level, string[] Topics, string? Difficulty, string Language,
    int Minutes, string Mode, Guid? ReviewOf);

/// <summary>Thao tác tại một phiên bản trạng thái phiên cụ thể.</summary>
internal sealed record InterviewActionRequest(Guid Id, int Revision, string Action, [StringLength(16000)] string? Text);

/// <summary>Thu thập tự đánh giá chính chủ cho một câu đã trả lời.</summary>
internal sealed record InterviewRatingRequest(string Rating);

/// <summary>Cấu hình phỏng vấn có sẵn.</summary>
internal sealed record InterviewPreset(string Id, string Name, string Description, string[] Topics, string[] Suggested);

internal sealed record QuestionPointer(string Slug, int Version);
internal sealed record InterviewPlan(string Level, string[] Topics, string? Difficulty, QuestionPointer[] Questions);

/// <summary>Thông tin phiên có thể mở tiếp.</summary>
internal sealed record InterviewSummary(Guid Id, string Preset, string Mode, string Language, string Status, DateTimeOffset StartedAt, int Minutes);

/// <summary>Câu hỏi hoặc phản hồi duy nhất đang mở.</summary>
internal sealed record CurrentPrompt(string Slug, int Version, string Title, string Topic, string Text, string? Context, string? Code,
    string? Hint, ReferenceResponse? Reference, string? Answer, string? FollowUpAnswer, string? Rating);

/// <summary>Một câu và bằng chứng được lưu trong báo cáo phiên.</summary>
internal sealed record ReportItem(int Position, string Slug, string Title, string Topic, string Prompt, string Status,
    string? Answer, bool HintSeen, string? FollowUp, string? FollowUpAnswer, bool FollowUpSkipped, string? Rating, ReferenceResponse Reference);

/// <summary>Trạng thái phiên và nội dung được phép xem ở bước hiện tại.</summary>
internal sealed record InterviewResponse(InterviewSummary Session, int Revision, int Position, int Count, string Stage, string Draft,
    DateTimeOffset ServerNow, DateTimeOffset Deadline, int? PausedSeconds, CurrentPrompt? Current, ReportItem[]? Report);

internal sealed class Interviews(PracticeDb db, Catalog catalog, TimeProvider clock)
{
    public static readonly InterviewPreset[] Presets =
    [
        new("foundation", "Nền tảng .NET", "C# và OOP, cách diễn đạt và lập luận.", ["csharp", "oop", "linq"], ["value-reference", "interface-abstract", "deferred-execution"]),
        new("backend", "Backend & API", "Pipeline, EF Core, phân quyền và tình huống vận hành.", ["aspnet", "efcore", "testing"], ["di-lifetimes", "middleware-order", "ef-projection", "resource-authorization", "slow-api"]),
        new("problem-solving", "SQL & Problem Solving", "Đọc truy vấn và lý giải thuật toán.", ["sql", "algorithms"], ["join-duplicates", "two-pointers", "sql-null"])
    ];

    public static void Map(RouteGroupBuilder api)
    {
        api.MapGet("/interview-presets", () => TypedResults.Ok(Presets)).WithSummary("Xem ba bộ phỏng vấn.");
        var group = api.MapGroup("/interviews").RequireAuthorization();
        group.MapPost("", (StartInterviewRequest request, ClaimsPrincipal user, Interviews service, CancellationToken ct)
            => service.Start(request, user.Id(), ct)).WithSummary("Chốt kế hoạch và bắt đầu phiên.");
        group.MapGet("/{id:guid}", (Guid id, ClaimsPrincipal user, Interviews service, CancellationToken ct)
            => service.Read(id, user.Id(), ct)).WithSummary("Tiếp tục phiên hoặc xem báo cáo.");
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
        if (request.Id == Guid.Empty || preset is null || request.Mode is not ("guided" or "mock")
            || request.Language is not ("vi" or "en") || request.Minutes is not (15 or 30 or 45)
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
            var asked = previousPlan.Questions;
            var strong = await db.Turns.Where(x => x.SessionId == reviewId && x.Kind == "question" && x.Rating == "clear")
                .Select(x => x.Position).ToArrayAsync(ct);
            weak = asked.Where((_, index) => !strong.Contains(index)).Select(x => x.Slug).ToArray();
        }
        var source = catalog.PublishedQuery().Where(x => topics.Contains(x.Topic));
        if (!string.IsNullOrWhiteSpace(request.Difficulty))
            source = source.Where(x => x.Difficulty == request.Difficulty);
        var candidates = await source.Select(x => new { x.Slug, x.Version, x.Level }).ToArrayAsync(ct);
        var level = Array.IndexOf(Catalog.Levels, request.Level);
        var count = request.Minutes switch { 15 => 3, 30 => 5, _ => 7 };
        var choices = candidates.OrderByDescending(x => weak.Contains(x.Slug))
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
            SegmentStartedAt = now, Plan = DataJson.Write(new InterviewPlan(request.Level, topics, request.Difficulty, choices))
        };
        db.Interviews.Add(row);
        await db.SaveChangesAsync(ct);
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
        switch (request.Action)
        {
            case "end":
                Finish(row, "ended", now);
                break;
            case "pause" when row.Mode == "guided" && row.Status == "active":
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
            case "hint" when row.Status == "active" && row.Mode == "guided" && row.Stage == "question":
                if (request.Text is not null) row.Draft = request.Text;
                row.HintSeen = true;
                break;
            case "next" when row.Status == "active" && row.Stage == "feedback":
                Advance(row, plan, now);
                break;
            case "answer" or "skip" when row.Status == "active" && row.Stage != "feedback":
                var skipped = request.Action == "skip";
                var text = skipped ? "" : (request.Text ?? row.Draft).Trim();
                if (!skipped && text.Length == 0)
                    throw ApiProblem.Invalid("Hãy nhập câu trả lời hoặc chọn Bỏ qua.");
                db.Turns.Add(new InterviewTurn
                {
                    SessionId = id, ActionId = request.Id, Position = row.Position, Kind = row.Stage, Text = text,
                    Skipped = skipped, HintSeen = row.HintSeen, At = now
                });
                if (row.Stage == "question" && !skipped && text is not ("Chưa biết" or "I don't know"))
                {
                    row.Stage = "followup";
                    row.Draft = "";
                }
                else if (row.Mode == "guided" && (row.Stage == "followup" || !skipped))
                {
                    row.Stage = "feedback";
                    row.Draft = "";
                }
                else Advance(row, plan, now);
                break;
            default:
                throw ApiProblem.Invalid("Thao tác chưa khả dụng ở bước này.");
        }
        row.LastAction = request.Id;
        row.Revision++;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
            var current = await Owned(id, user, ct);
            if (current.LastAction != request.Id && !await db.Turns.AnyAsync(x => x.SessionId == id && x.ActionId == request.Id, ct))
                throw;
            row = current;
        }
        return await View(row, ct);
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
                row.Stage == "followup" ? english ? c.EnglishFollowUp : c.FollowUp : english ? c.EnglishPrompt : c.Prompt,
                row.Stage == "question" && !english ? c.Context : null,
                row.Stage == "question" ? c.Code : null,
                row.Mode == "guided" && row.Stage == "question" && row.HintSeen ? c.Hint : null,
                feedback ? Catalog.Reference(q) : null, main?.Text, follow is { Skipped: false } ? follow.Text : null, main?.Rating);
        }
        else
        {
            var turns = await db.Turns.AsNoTracking().Where(x => x.SessionId == row.Id).ToArrayAsync(ct);
            var items = new List<ReportItem>();
            for (var index = 0; index < plan.Questions.Length; index++)
            {
                var pointer = plan.Questions[index];
                var q = await catalog.Version(pointer.Slug, pointer.Version, ct);
                var c = Catalog.Content(q);
                var main = turns.SingleOrDefault(x => x.Position == index && x.Kind == "question");
                var follow = turns.SingleOrDefault(x => x.Position == index && x.Kind == "followup");
                var english = row.Language == "en";
                items.Add(new(index, q.Slug, q.Title, q.Topic, english ? c.EnglishPrompt : c.Prompt,
                    main is null ? index <= row.Position ? "unanswered" : "unasked" : main.Skipped ? "skipped" : "answered",
                    main is { Skipped: false } ? main.Text : null, main?.HintSeen ?? false,
                    follow is not null || (row.Position == index && row.Stage == "followup") ? english ? c.EnglishFollowUp : c.FollowUp : null,
                    follow is { Skipped: false } ? follow.Text : null, follow?.Skipped ?? false, main?.Rating, Catalog.Reference(q)));
            }
            report = [.. items];
        }
        return new(Summary(row), row.Revision, Math.Min(row.Position, plan.Questions.Length - 1), plan.Questions.Length, row.Stage,
            row.Draft, clock.GetUtcNow(), row.Deadline, row.PausedSeconds, current, report);
    }
}
