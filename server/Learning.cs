using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

/// <summary>Mục tiêu, lịch luyện và thứ tự lộ trình do học viên chọn.</summary>
internal sealed record GoalSettings(string Position, string? Level, string[] Topics, DateOnly? InterviewDate, int? MinutesPerDay, int? DaysPerWeek,
    string Language, string TimeZone, string[] Roadmap, string[] ReviewTopics, DateOnly? SkipDay, string? Track = null, DateOnly? TrackStart = null)
{
    public static readonly GoalSettings Default = new("", null, [], null, null, null, "vi", "Asia/Ho_Chi_Minh", [], [], null);
}

/// <summary>Ghi chú do người học tạo theo câu, chủ đề hoặc ghi chú chung.</summary>
internal sealed record NoteRequest([Required, StringLength(160)] string Title, [Required, StringLength(12000)] string Text,
    string? Slug, string? Topic, bool Important, int Revision);

/// <summary>Ghi chú và khóa sửa đồng thời.</summary>
internal sealed record NoteResponse(Guid Id, string Title, string Text, string? Slug, string? Topic, bool Important, int Revision, DateTimeOffset UpdatedAt);

/// <summary>Trang ghi chú của tài khoản hiện tại.</summary>
internal sealed record NotePage(NoteResponse[] Items, int Total, int Page, int PageSize);

/// <summary>Nhập lại mật khẩu để xác nhận xóa dữ liệu cá nhân.</summary>
internal sealed record DeleteAccountRequest([Required, StringLength(128)] string Password);

/// <summary>Thống kê theo chủ đề tính từ số lượt đã trả lời.</summary>
internal sealed record TopicActivity(string Topic, int CatalogCount, int Answers, int PracticedQuestions, int ConfidentQuestions);

/// <summary>Số lượt và số phút quan sát được theo ngày địa phương.</summary>
internal sealed record DayActivity(DateOnly Date, int Answers, int Seconds, int CompletedMocks, int Objective, int Correct);

/// <summary>Liên kết tiếp tục với nhãn giải thích.</summary>
internal sealed record StudyLink(string Label, string Path, string Reason, string? Topic = null);

/// <summary>Số liệu và hành động tiếp theo trên trang tổng quan.</summary>
internal sealed record DashboardResponse(GoalSettings Goal, DateOnly Today, int QuestionCount, int Answers, int CompletedMocks, int ActiveSeconds,
    int WeekSeconds, int Streak, int DueCount, int WeakCount, int CodingRemaining, int SqlRemaining, StudyLink? Resume,
    StudyLink[] Suggestions, QuestionCard[] Due, TopicActivity[] Topics, DayActivity[] Week, bool RunnerAvailable,
    DayActivity[] Month, int? TrackDay, bool StudyDay, StudyLink[] TodayPlan);

/// <summary>Một mục lịch sử có nguồn đánh giá riêng.</summary>
internal sealed record HistoryItem(string Id, string Label, string Path, string Topic, string Status, string? Rating,
    DateTimeOffset At, string AssessmentSource, int Version, bool HintSeen, bool AnswerSeen, int Revisions, bool HasAiFeedback);

/// <summary>Trang lịch sử và số mẫu.</summary>
internal sealed record HistoryPage(HistoryItem[] Items, int Total, int Page, int PageSize);

internal sealed class Learning(PracticeDb db, Catalog catalog, ExerciseCatalog exercises, TimeProvider clock)
{
    public static void Map(RouteGroupBuilder api)
    {
        api.MapGet("/dashboard", (ClaimsPrincipal user, Learning service, CancellationToken ct)
            => service.Dashboard(user.Identity?.IsAuthenticated is true ? user.Id() : "", ct))
            .WithSummary("Tổng quan dữ liệu thật theo tuần và chủ đề.");
        var owned = api.MapGroup("").RequireAuthorization();
        owned.MapGet("/profile", (ClaimsPrincipal user, Learning service, CancellationToken ct)
            => Goal(service.Db, user.Id(), ct)).WithSummary("Đọc mục tiêu và thiết lập học.");
        owned.MapPut("/profile", (GoalSettings goal, ClaimsPrincipal user, Learning service, CancellationToken ct)
            => service.SaveGoal(user.Id(), goal, ct)).WithSummary("Cập nhật mục tiêu và lộ trình.");
        owned.MapGet("/reviews", (string? kind, ClaimsPrincipal user, Learning service, CancellationToken ct)
            => service.Reviews(user.Id(), kind, ct)).WithSummary("Câu đến hạn, bỏ qua, đánh dấu và chưa vững.");
        owned.MapGet("/history", (string? kind, int? page, ClaimsPrincipal user, Learning service, CancellationToken ct)
            => service.History(user.Id(), kind, page, ct)).WithSummary("Đọc lịch sử học có phân trang.");
        owned.MapGet("/notes", (string? search, string? slug, string? topic, bool? important, int? page,
            ClaimsPrincipal user, Learning service, CancellationToken ct) => service.Notes(user.Id(), search, slug, topic, important, page, ct))
            .WithSummary("Tìm ghi chú theo câu, chủ đề hoặc nội dung chữ.");
        owned.MapPut("/notes/{id:guid}", (Guid id, NoteRequest request, ClaimsPrincipal user, Learning service, CancellationToken ct)
            => service.SaveNote(id, user.Id(), request, ct)).WithSummary("Tạo hoặc sửa ghi chú cá nhân.");
        owned.MapDelete("/notes/{id:guid}", (Guid id, int revision, ClaimsPrincipal user, Learning service, CancellationToken ct)
            => service.RemoveNote(id, revision, user.Id(), ct)).WithSummary("Xóa đúng phiên bản ghi chú cá nhân.");
        owned.MapGet("/profile/export", (ClaimsPrincipal user, Learning service, CancellationToken ct)
            => service.Export(user.Id(), ct)).WithSummary("Tải dữ liệu học và hồ sơ riêng.");
        owned.MapPost("/profile/account/delete", async (DeleteAccountRequest request, ClaimsPrincipal principal, UserManager<Learner> users,
            SignInManager<Learner> signIn) =>
        {
            var user = await users.GetUserAsync(principal) ?? throw ApiProblem.Missing();
            if (!(await signIn.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true)).Succeeded)
                throw ApiProblem.Invalid("Không thể xác nhận mật khẩu.");
            if (!(await users.DeleteAsync(user)).Succeeded)
                throw ApiProblem.Conflict("Chưa xóa được tài khoản. Hãy thử lại.");
            await signIn.SignOutAsync();
            return TypedResults.NoContent();
        }).RequireRateLimiting("auth").WithSummary("Xóa tài khoản và dữ liệu học sau khi xác nhận mật khẩu.");
    }

    private PracticeDb Db => db;

    internal static async Task<GoalSettings> Goal(PracticeDb db, string owner, CancellationToken ct)
    {
        if (owner.Length == 0) return GoalSettings.Default;
        var json = await db.Users.Where(x => x.Id == owner).Select(x => x.GoalJson).SingleOrDefaultAsync(ct);
        return json is null ? GoalSettings.Default : DataJson.Read<GoalSettings>(json);
    }

    internal static async Task<DateOnly> Today(PracticeDb db, string owner, TimeProvider clock, CancellationToken ct) =>
        LocalDate(clock.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById((await Goal(db, owner, ct)).TimeZone));

    internal static DateOnly LocalDate(DateTimeOffset time, TimeZoneInfo zone) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(time, zone).DateTime);

    private async Task<GoalSettings> SaveGoal(string owner, GoalSettings request, CancellationToken ct)
    {
        static bool Known(string[]? keys) => keys is not null && keys.Length <= Catalog.Topics.Length &&
            keys.Distinct().Count() == keys.Length && keys.All(key => Catalog.Topics.Any(t => t.Id == key));
        if (request.Position is null || request.Position.Length > 100 || request.Language is not ("vi" or "en")
            || request.TimeZone is null || request.TimeZone.Length > 80 || !TimeZoneInfo.TryFindSystemTimeZoneById(request.TimeZone, out _)
            || (request.Level is not null && !Catalog.Levels.Contains(request.Level))
            || request.MinutesPerDay is < 1 or > 480 || request.DaysPerWeek is < 1 or > 7
            || (request.Track is not null && request.Track is not ("intern30" or "fresher60" or "junior90" or "sprint7" or "sprint14" or "custom"))
            || !Known(request.Topics) || !Known(request.Roadmap) || !Known(request.ReviewTopics))
            throw ApiProblem.Invalid("Kiểm tra mục tiêu, chủ đề, múi giờ và thời lượng.");
        await using var tx = await db.LockLearning(owner, ct);
        var user = await db.Users.FindAsync([owner], ct) ?? throw ApiProblem.Missing();
        var iana = TimeZoneInfo.TryConvertWindowsIdToIanaId(request.TimeZone, out var mapped) ? mapped : request.TimeZone;
        var old = user.GoalJson is null ? GoalSettings.Default : DataJson.Read<GoalSettings>(user.GoalJson);
        var start = old.Track == request.Track && old.TrackStart.HasValue ? old.TrackStart : LocalDate(clock.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById(iana));
        user.GoalJson = DataJson.Write(request with { Position = request.Position.Trim(), TimeZone = iana, TrackStart = request.Track is null ? null : start });
        user.ConcurrencyStamp = Guid.NewGuid().ToString();
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return DataJson.Read<GoalSettings>(user.GoalJson);
    }

    private async Task<DashboardResponse> Dashboard(string owner, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var goal = await Goal(db, owner, ct);
        var zone = TimeZoneInfo.FindSystemTimeZoneById(goal.TimeZone);
        var today = LocalDate(now, zone);
        await Recall.Expire(db, owner, today, ct);
        var current = await catalog.PublishedQuery().Select(q => new { q.Slug, q.Topic, q.Version, q.Title, q.Level, q.Minutes, q.Data }).ToArrayAsync(ct);
        var answered = db.Attempts.AsNoTracking().Where(x => x.UserId == owner && x.Outcome == "answered");
        var reviews = States(owner);
        var due = reviews.Where(x => x.Due != null && x.Due <= today);
        var dueCards = await Cards(due.OrderBy(x => x.Due).ThenBy(x => x.Slug).Take(4)).ToArrayAsync(ct);
        var weak = reviews.Where(x => x.Mastery == "review" || x.Rating == "unsure" || x.Rating == "partial" || x.LastOutcome == "skipped");
        var weakFirst = await Cards(weak.OrderBy(x => x.LastActivityAt).Take(1)).FirstOrDefaultAsync(ct);
        var topicCounts = await (from a in answered
            join q in db.QuestionVersions on new { a.Slug, a.Version } equals new { q.Slug, q.Version }
            group a by q.Topic into g select new { Topic = g.Key, Answers = g.Count() }).ToDictionaryAsync(x => x.Topic, x => x.Answers, ct);
        var known = await reviews.Select(x => new { x.Slug, x.Mastery, x.AnsweredCount, x.ScheduledVersion }).ToDictionaryAsync(x => x.Slug, ct);
        var sqlZone = TimeZoneInfo.TryConvertIanaIdToWindowsId(goal.TimeZone, out var windowsZone) ? windowsZone : zone.Id;
        var days = await answered.GroupBy(a => a.StudyDay!.Value)
            .Select(g => new { Day = g.Key, Answers = g.Count(), Seconds = g.Sum(a => a.ActiveSeconds),
                Objective = g.Count(a => a.Correct != null), Correct = g.Count(a => a.Correct == true) })
            .ToDictionaryAsync(x => x.Day, ct);
        var completed = db.Interviews.Where(x => x.UserId == owner && x.Status == "completed" && x.EndedAt != null);
        var mockDays = await completed.GroupBy(m => EF.Functions.AtTimeZone(m.EndedAt!.Value, sqlZone).Date)
            .Select(g => new { Day = g.Key, Count = g.Count() }).ToDictionaryAsync(x => DateOnly.FromDateTime(x.Day), x => x.Count, ct);
        var mockActivity = await completed.Where(m => db.Turns.Any(t => t.SessionId == m.Id && t.Kind == "question" && !t.Skipped))
            .Select(m => EF.Functions.AtTimeZone(m.EndedAt!.Value, sqlZone).Date).Distinct().ToArrayAsync(ct);
        var month = Enumerable.Range(0, 30).Select(i => today.AddDays(i - 29)).Select(date =>
        {
            var day = days.GetValueOrDefault(date);
            return new DayActivity(date, day?.Answers ?? 0, day?.Seconds ?? 0, mockDays.GetValueOrDefault(date), day?.Objective ?? 0, day?.Correct ?? 0);
        }).ToArray();
        var week = month[^7..];
        var activityDays = days.Keys.Concat(mockActivity.Select(DateOnly.FromDateTime)).ToHashSet();
        var streakDay = activityDays.Contains(today) ? today : today.AddDays(-1);
        var streak = 0;
        while (activityDays.Contains(streakDay.AddDays(-streak))) streak++;
        var resumeMock = await db.Interviews.Where(x => x.UserId == owner && (x.Status == "paused" || (x.Status == "active" && x.Deadline > now)))
            .OrderByDescending(x => x.StartedAt).Select(x => new { x.Id, x.Preset }).FirstOrDefaultAsync(ct);
        var resumeQuestion = await Cards(reviews.Where(x => x.DraftId != null && x.DraftText != "")
            .OrderByDescending(x => x.LastActivityAt).Take(1)).FirstOrDefaultAsync(ct);
        StudyLink? resume = resumeMock is not null
            ? new(Interviews.Presets.First(x => x.Id == resumeMock.Preset).Name, $"/phong-van/{resumeMock.Id}", "Phiên phỏng vấn đang dở")
            : resumeQuestion is not null ? new(resumeQuestion.Title, $"/cau-hoi/{resumeQuestion.Slug}", "Có câu trả lời đang viết", resumeQuestion.Topic) : null;
        var quick = await db.StudySessions.Where(x => x.UserId == owner && x.EndedAt == null).OrderByDescending(x => x.StartedAt)
            .Select(x => new { x.Id, x.Minutes }).FirstOrDefaultAsync(ct);
        if (quick is not null && resumeMock is null) resume = new($"Phiên học {quick.Minutes} phút", $"/phien-hoc/{quick.Id}", "Kế hoạch đang thực hiện");
        var submissions = await ExerciseCatalog.Evidence(db, owner, ct);
        var pending = exercises.Latest.Where(e => ExerciseCatalog.Progress(e, null, submissions.SingleOrDefault(s => s.Slug == e.Slug)) != "independent").ToArray();
        var suggestions = new List<StudyLink>();
        if (dueCards.FirstOrDefault() is { } first)
            suggestions.Add(new(first.Title, $"/cau-hoi/{first.Slug}", "Đã đến ngày ôn", first.Topic));
        if (weakFirst is not null && suggestions.All(x => x.Path != $"/cau-hoi/{weakFirst.Slug}"))
            suggestions.Add(new(weakFirst.Title, $"/cau-hoi/{weakFirst.Slug}",
                weakFirst.Outcome == "skipped" ? "Bạn từng bỏ qua câu này" :
                weakFirst.Rating is "unsure" or "partial" ? "Tự đánh giá gần nhất · " + (weakFirst.Rating == "unsure" ? "Chưa hiểu" : "Hiểu một phần")
                : "Lịch ôn đề xuất luyện lại độc lập", weakFirst.Topic));
        var limit = goal.MinutesPerDay ?? 15;
        var targetLevel = Array.IndexOf(Catalog.Levels, goal.Level ?? "junior");
        var newQuestions = current.Where(x => (known.GetValueOrDefault(x.Slug)?.AnsweredCount ?? 0) == 0)
            .Where(x => Catalog.ContentPrerequisites(x.Data).All(k => known.TryGetValue(k, out var s) && s.AnsweredCount > 0 && s.Mastery != "review"))
            .OrderByDescending(x => goal.ReviewTopics.Contains(x.Topic)).ThenByDescending(x => goal.Topics.Contains(x.Topic))
            .ThenBy(x => Math.Abs(Array.IndexOf(Catalog.Levels, x.Level) - targetLevel))
            .ThenBy(x => x.Minutes).ThenBy(x => x.Slug, StringComparer.Ordinal).ToArray();
        var next = newQuestions.FirstOrDefault(x => x.Minutes <= limit);
        if (next is not null && suggestions.Count < 3 && !suggestions.Any(x => x.Path == $"/cau-hoi/{next.Slug}"))
            suggestions.Add(new(next.Title, $"/cau-hoi/{next.Slug}", $"Câu chưa luyện · khoảng {next.Minutes} phút", next.Topic));
        if (suggestions.Count < 3 && pending.FirstOrDefault() is { } exercise)
            suggestions.Add(new(exercise.Title, $"/{(exercise.Kind == "sql" ? "sql" : "coding")}/{exercise.Slug}", "Bài thực hành đang chờ đối chiếu", exercise.Topic));
        if (suggestions.Count < 3)
            suggestions.Add(new("Nền tảng .NET", "/phong-van?preset=foundation", "Dành 15 phút để tập trả lời từng câu"));
        var activity = Catalog.Topics.Select(topic =>
        {
            var rows = current.Where(x => x.Topic == topic.Id).ToArray();
            return new TopicActivity(topic.Id, rows.Length, topicCounts.GetValueOrDefault(topic.Id),
                rows.Count(x => known.GetValueOrDefault(x.Slug)?.AnsweredCount > 0),
                rows.Count(x => known.TryGetValue(x.Slug, out var s) && s.ScheduledVersion == x.Version && s.Mastery is "secure" or "mastered"));
        }).ToArray();
        int? trackDay = goal.TrackStart is { } start ? today.DayNumber - start.DayNumber + 1 : null;
        var offset = trackDay.HasValue ? Math.Max(0, trackDay.Value - 1) % 7 : ((int)today.DayOfWeek + 6) % 7;
        var daysPerWeek = goal.DaysPerWeek ?? 7;
        var studyDay = goal.SkipDay != today && (offset * daysPerWeek % 7 < daysPerWeek);
        var plan = new List<StudyLink>();
        if (studyDay)
        {
            var remaining = Math.Max(0, limit - (int)Math.Ceiling(month[^1].Seconds / 60.0));
            if (dueCards.FirstOrDefault() is { } review && review.Minutes <= remaining)
            {
                plan.Add(new(review.Title, "/cau-hoi/" + review.Slug, $"Ôn đến hạn · {review.Minutes} phút", review.Topic));
                remaining -= review.Minutes;
            }
            var trainingDays = activityDays.Count(d => d < today && (goal.TrackStart == null || d >= goal.TrackStart));
            var duration = goal.Track switch { "intern30" => 30, "fresher60" => 60, "junior90" => 90, "sprint7" => 7, "sprint14" => 14, _ => 0 };
            var soon = goal.InterviewDate is { } interviewDate && interviewDate >= today && interviewDate <= today.AddDays(2)
                || duration > 0 && trackDay >= duration - 2 && trackDay <= duration;
            var rotation = soon ? 2 : trainingDays % 3;
            if (rotation == 2 && remaining >= 15)
            {
                plan.Add(new("Phỏng vấn theo mục tiêu", "/phong-van", "Tập trả lời trong phiên 15 phút"));
                remaining -= 15;
            }
            else
            {
                var practiceTask = pending.Where(e => e.Kind == (rotation == 1 ? "sql" : "coding") && e.Minutes <= remaining)
                    .OrderByDescending(e => goal.Topics.Contains(e.Topic)).ThenBy(e => e.Minutes).FirstOrDefault();
                if (practiceTask is not null)
                {
                    plan.Add(new(practiceTask.Title, $"/{practiceTask.Kind}/{practiceTask.Slug}", $"Thực hành · {practiceTask.Minutes} phút", practiceTask.Topic));
                    remaining -= practiceTask.Minutes;
                }
            }
            foreach (var item in newQuestions)
            {
                if (plan.Count >= 4) break;
                if (item.Minutes > remaining) continue;
                plan.Add(new(item.Title, "/cau-hoi/" + item.Slug, $"Kiến thức mới · {item.Minutes} phút", item.Topic));
                remaining -= item.Minutes;
            }
        }
        return new(goal, today, current.Length, topicCounts.Values.Sum(), mockDays.Values.Sum(), days.Values.Sum(x => x.Seconds), week.Sum(x => x.Seconds),
            streak, await due.CountAsync(ct), await weak.CountAsync(ct), pending.Count(x => x.Kind == "coding"), pending.Count(x => x.Kind == "sql"),
            resume, [.. suggestions], dueCards, activity, week, false, month, trackDay, studyDay, [.. plan]);
    }

    private IQueryable<StudyState> States(string owner) =>
        db.StudyStates.Where(s => s.UserId == owner && db.Questions.Any(q => q.Slug == s.Slug && q.Published != null));

    private IQueryable<QuestionCard> Cards(IQueryable<StudyState> rows) =>
        from s in rows
        join q in catalog.PublishedQuery() on s.Slug equals q.Slug
        orderby s.Due, q.Title
        select new QuestionCard(q.Slug, q.Version, q.Title, q.Topic, q.Format, q.Difficulty, q.Level, q.Technology,
            q.Minutes, s.Bookmarked, s.LastOutcome, s.Rating, s.Due, null, s.Mastery, s.VerifiedDays, s.ReviewReason, s.AiAssessed);

    private async Task<QuestionCard[]> Reviews(string owner, string? kind, CancellationToken ct)
    {
        var today = await Today(db, owner, clock, ct);
        await Recall.Expire(db, owner, today, ct);
        var q = States(owner);
        q = kind switch
        {
            "weak" => q.Where(x => x.Mastery == "review" || x.Rating == "unsure" || x.Rating == "partial"),
            "wrong" => q.Where(x => x.Mastery == "review" || x.Rating == "unsure" || x.LastOutcome == "skipped"),
            "skipped" => q.Where(x => x.LastOutcome == "skipped"),
            "bookmarked" => q.Where(x => x.Bookmarked),
            "planned" => q.Where(x => x.Due > today),
            _ => q.Where(x => x.Due != null && x.Due <= today)
        };
        return await Cards(q).ToArrayAsync(ct);
    }

    private async Task<HistoryPage> History(string owner, string? kind, int? page, CancellationToken ct)
    {
        const int size = 15;
        if (kind is "coding" or "sql")
        {
            var slugs = exercises.Latest.Where(e => e.Kind == kind).Select(e => e.Slug).ToArray();
            var events = db.ExerciseDrafts.AsNoTracking().Where(d => d.UserId == owner && slugs.Contains(d.Slug))
                .Select(d => new { Job = (Guid?)null, d.Slug, d.Version, TestVersion = 0, At = d.SavedAt, Status = d.Reviewed ? "reviewed" : "draft",
                    d.HintSeen, d.SolutionSeen, Assisted = false, Action = "draft" })
                .Concat(db.ExerciseSubmissions.AsNoTracking().Where(j => j.UserId == owner && slugs.Contains(j.Slug))
                    .Select(j => new { Job = (Guid?)j.Id, j.Slug, j.Version, j.TestVersion, At = j.RequestedAt, j.Status,
                        HintSeen = false, SolutionSeen = false, j.Assisted, j.Action }));
            var count = await events.CountAsync(ct);
            var number = Math.Clamp(page ?? 1, 1, Math.Max(1, (count + size - 1) / size));
            var rows = await events.OrderByDescending(d => d.At).ThenBy(d => d.Slug).ThenByDescending(d => d.Version).ThenBy(d => d.Job)
                .Skip((number-1)*size).Take(size).ToArrayAsync(ct);
            return new(rows.Select(d => {
                var e = exercises.Find(d.Slug, d.Version);
                var source = d.Job == null ? "Bản nháp đã lưu" : $"{(d.Action == "submit" ? "Lượt nộp" : "Chạy thử")} · test v{d.TestVersion}";
                if (d.Job != null && d.Assisted) source += " · có trợ giúp";
                return new HistoryItem(d.Job?.ToString() ?? $"{d.Slug}@{d.Version}", e.Title, $"/{e.Kind}/{e.Slug}?version={e.Version}", e.Topic,
                    d.Status, null, d.At, source, d.Version, d.HintSeen, d.SolutionSeen, 0, false);
            }).ToArray(), count, number, size);
        }
        IQueryable<HistoryItem> query;
        if (kind == "interview")
        {
            query = db.Interviews.Where(x => x.UserId == owner).OrderByDescending(x => x.StartedAt).ThenBy(x => x.Id)
                .Select(x => new HistoryItem(x.Id.ToString(), x.Preset, "/phong-van/" + x.Id, "", x.Status, null,
                    x.StartedAt, "Bộ câu biên soạn", 0, false, false, 0, false));
        }
        else
        {
            query = from a in db.Attempts
                where a.UserId == owner
                join q in db.QuestionVersions on new { a.Slug, a.Version } equals new { q.Slug, q.Version }
                join r in db.Assessments on a.Id equals r.AttemptId into ratings
                from r in ratings.DefaultIfEmpty()
                orderby a.At descending, a.Id
                select new HistoryItem(a.Id.ToString(), q.Title, "/luot-luyen/" + a.Id, q.Topic, a.Outcome, r == null ? null : r.Rating,
                    a.At, a.Correct != null ? "Đáp án xác định" : db.KnowledgeChecks.Any(k => k.AttemptId == a.Id && k.AnsweredAt != null)
                        ? "Bài kiểm tra vận dụng" : r == null ? "Chưa tự đánh giá" : "Tự đánh giá", a.Version, a.HintSeen, a.AnswerSeen,
                    db.Revisions.Count(x => x.AttemptId == a.Id), db.AiReviews.Any(x => x.AttemptId == a.Id && x.Feedback != null));
        }
        var total = await query.CountAsync(ct);
        var p = Math.Clamp(page ?? 1, 1, Math.Max(1, (total + size - 1) / size));
        return new(await query.Skip((p - 1) * size).Take(size).ToArrayAsync(ct), total, p, size);
    }

    private async Task<NotePage> Notes(string owner, string? search, string? slug, string? topic, bool? important, int? page, CancellationToken ct)
    {
        const int size = 12;
        var q = db.Notes.AsNoTracking().Where(x => x.UserId == owner);
        if (!string.IsNullOrWhiteSpace(search))
        {
            search = search.Trim();
            if (search.Length > 120) throw ApiProblem.Invalid("Từ khóa tối đa 120 ký tự.");
            q = q.Where(x => EF.Functions.Collate(x.Title, "Latin1_General_100_CI_AI").Contains(search)
                || EF.Functions.Collate(x.Text, "Latin1_General_100_CI_AI").Contains(search));
        }
        if (slug is not null) q = q.Where(x => x.Slug == slug);
        if (topic is not null) q = q.Where(x => x.Topic == topic);
        if (important is true) q = q.Where(x => x.Important);
        var total = await q.CountAsync(ct);
        var p = Math.Clamp(page ?? 1, 1, Math.Max(1, (total + size - 1) / size));
        var items = await q.OrderByDescending(x => x.UpdatedAt).ThenBy(x => x.Id).Skip((p - 1) * size).Take(size)
            .Select(x => new NoteResponse(x.Id, x.Title, x.Text, x.Slug, x.Topic, x.Important, x.Revision, x.UpdatedAt)).ToArrayAsync(ct);
        return new(items, total, p, size);
    }

    private async Task<IResult> SaveNote(Guid id, string owner, NoteRequest request, CancellationToken ct)
    {
        if (id == Guid.Empty || string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 160 ||
            string.IsNullOrWhiteSpace(request.Text) || request.Text.Length > 12000 ||
            (request.Topic is not null && !Catalog.Topics.Any(x => x.Id == request.Topic)) ||
            (request.Slug is not null && !await db.Questions.AnyAsync(x => x.Slug == request.Slug, ct)))
            throw ApiProblem.Invalid("Nhập tiêu đề và nội dung ghi chú, hoặc kiểm tra câu hỏi và chủ đề đính kèm.");
        var row = await db.Notes.SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct);
        var created = row is null;
        if ((row?.Revision ?? 0) != request.Revision)
            throw ApiProblem.Conflict("Ghi chú đã được sửa ở tab khác.");
        if (row is null)
        {
            if (await db.Notes.AnyAsync(x => x.Id == id, ct)) throw ApiProblem.Missing();
            row = new Note { Id = id, UserId = owner };
            db.Notes.Add(row);
        }
        row.Title = request.Title.Trim();
        row.Text = request.Text.Trim();
        row.Slug = request.Slug;
        row.Topic = request.Topic;
        row.Important = request.Important;
        row.Revision++;
        row.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        var payload = new NoteResponse(row.Id, row.Title, row.Text, row.Slug, row.Topic, row.Important, row.Revision, row.UpdatedAt);
        return created ? TypedResults.Created("/api/notes", payload) : TypedResults.Ok(payload);
    }

    private async Task<IResult> RemoveNote(Guid id, int revision, string owner, CancellationToken ct)
    {
        var row = await db.Notes.SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct) ?? throw ApiProblem.Missing();
        if (row.Revision != revision) throw ApiProblem.Conflict("Ghi chú đã đổi. Tải lại trước khi xóa.");
        db.Notes.Remove(row);
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    private async Task<IResult> Export(string owner, CancellationToken ct)
    {
        var profile = await db.Users.Where(x => x.Id == owner).Select(x => new { x.Email, x.DisplayName }).SingleAsync(ct);
        var attempts = db.Attempts.AsNoTracking().Where(x => x.UserId == owner);
        var sessions = db.Interviews.AsNoTracking().Where(x => x.UserId == owner);
        var ai = await db.AiReviews.AsNoTracking().Where(x => x.Feedback != null && attempts.Any(a => a.Id == x.AttemptId))
            .Select(x => new { x.AttemptId, x.Feedback }).ToArrayAsync(ct);
        var export = new
        {
            exportedAt = clock.GetUtcNow(), profile, goal = await Goal(db, owner, ct),
            attempts = await attempts.ToArrayAsync(ct),
            assessments = await db.Assessments.AsNoTracking().Where(x => attempts.Any(a => a.Id == x.AttemptId)).ToArrayAsync(ct),
            knowledgeChecks = await db.KnowledgeChecks.AsNoTracking().Where(x => attempts.Any(a => a.Id == x.AttemptId))
                .Select(x => new { x.AttemptId, x.OpenedAt, x.AnsweredAt, x.StudyDay, x.Choice, x.Correct, x.Assisted }).ToArrayAsync(ct),
            revisions = await db.Revisions.AsNoTracking().Where(x => attempts.Any(a => a.Id == x.AttemptId)).ToArrayAsync(ct),
            aiFeedback = ai.Select(x => new { x.AttemptId, Feedback = DataJson.Read<AiResponse>(x.Feedback!) }),
            sessions = await sessions.ToArrayAsync(ct),
            studySessions = await db.StudySessions.AsNoTracking().Where(x => x.UserId == owner).ToArrayAsync(ct),
            turns = await db.Turns.AsNoTracking().Where(x => sessions.Any(s => s.Id == x.SessionId)).ToArrayAsync(ct),
            notes = await db.Notes.AsNoTracking().Where(x => x.UserId == owner).ToArrayAsync(ct),
            study = await db.StudyStates.AsNoTracking().Where(x => x.UserId == owner).ToArrayAsync(ct),
            exercises = await db.ExerciseDrafts.AsNoTracking().Where(x => x.UserId == owner).ToArrayAsync(ct),
            submissions = await db.ExerciseSubmissions.AsNoTracking().Where(x => x.UserId == owner)
                .Select(x => new { x.Id, x.Slug, x.Version, x.TestVersion, x.Action, x.Assisted, x.RequestedAt, x.Status, x.Result }).ToArrayAsync(ct),
            external = await db.ExternalPractice.AsNoTracking().Where(x => x.UserId == owner).ToArrayAsync(ct)
        };
        return TypedResults.File(System.Text.Encoding.UTF8.GetBytes(DataJson.Write(export)), "application/json", "interview-practice-data.json");
    }
}
