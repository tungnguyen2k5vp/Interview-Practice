using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

/// <summary>Mục tiêu, lịch luyện và thứ tự lộ trình do học viên chọn.</summary>
internal sealed record GoalSettings(string Position, string? Level, string[] Topics, DateOnly? InterviewDate, int? MinutesPerDay, int? DaysPerWeek,
    string Language, string TimeZone, string[] Roadmap, string[] ReviewTopics, DateOnly? SkipDay)
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
internal sealed record DayActivity(DateOnly Date, int Answers, int Seconds, int CompletedMocks);

/// <summary>Liên kết tiếp tục với nhãn giải thích.</summary>
internal sealed record StudyLink(string Label, string Path, string Reason, string? Topic = null);

/// <summary>Số liệu và hành động tiếp theo trên trang tổng quan.</summary>
internal sealed record DashboardResponse(GoalSettings Goal, DateOnly Today, int QuestionCount, int Answers, int CompletedMocks, int ActiveSeconds,
    int WeekSeconds, int Streak, int DueCount, int WeakCount, int CodingRemaining, int SqlRemaining, StudyLink? Resume,
    StudyLink[] Suggestions, QuestionCard[] Due, TopicActivity[] Topics, DayActivity[] Week, bool RunnerAvailable);

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

    private static async Task<GoalSettings> Goal(PracticeDb db, string owner, CancellationToken ct)
    {
        if (owner.Length == 0) return GoalSettings.Default;
        var json = await db.Users.Where(x => x.Id == owner).Select(x => x.GoalJson).SingleOrDefaultAsync(ct);
        return json is null ? GoalSettings.Default : DataJson.Read<GoalSettings>(json);
    }

    internal static async Task<DateOnly> Today(PracticeDb db, string owner, TimeProvider clock, CancellationToken ct) =>
        LocalDate(clock.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById((await Goal(db, owner, ct)).TimeZone));

    private static DateOnly LocalDate(DateTimeOffset time, TimeZoneInfo zone) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(time, zone).DateTime);

    private async Task<GoalSettings> SaveGoal(string owner, GoalSettings request, CancellationToken ct)
    {
        static bool Known(string[]? keys) => keys is not null && keys.Length <= Catalog.Topics.Length &&
            keys.Distinct().Count() == keys.Length && keys.All(key => Catalog.Topics.Any(t => t.Id == key));
        if (request.Position is null || request.Position.Length > 100 || request.Language is not ("vi" or "en")
            || request.TimeZone is null || request.TimeZone.Length > 80 || !TimeZoneInfo.TryFindSystemTimeZoneById(request.TimeZone, out _)
            || (request.Level is not null && !Catalog.Levels.Contains(request.Level))
            || request.MinutesPerDay is < 1 or > 480 || request.DaysPerWeek is < 1 or > 7
            || !Known(request.Topics) || !Known(request.Roadmap) || !Known(request.ReviewTopics))
            throw ApiProblem.Invalid("Kiểm tra mục tiêu, chủ đề, múi giờ và thời lượng.");
        var user = await db.Users.FindAsync([owner], ct) ?? throw ApiProblem.Missing();
        var iana = TimeZoneInfo.TryConvertWindowsIdToIanaId(request.TimeZone, out var mapped) ? mapped : request.TimeZone;
        user.GoalJson = DataJson.Write(request with { Position = request.Position.Trim(), TimeZone = iana });
        user.ConcurrencyStamp = Guid.NewGuid().ToString();
        await db.SaveChangesAsync(ct);
        return DataJson.Read<GoalSettings>(user.GoalJson);
    }

    private async Task<DashboardResponse> Dashboard(string owner, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var goal = await Goal(db, owner, ct);
        var zone = TimeZoneInfo.FindSystemTimeZoneById(goal.TimeZone);
        var today = LocalDate(now, zone);
        var current = await catalog.PublishedQuery().Select(q => new { q.Slug, q.Topic, q.Version, q.Title, q.Level, q.Minutes }).ToArrayAsync(ct);
        var answered = db.Attempts.AsNoTracking().Where(x => x.UserId == owner && x.Outcome == "answered");
        var reviews = States(owner);
        var due = reviews.Where(x => x.Due != null && x.Due <= today);
        var dueCards = await Cards(due.OrderBy(x => x.Due).ThenBy(x => x.Slug).Take(4)).ToArrayAsync(ct);
        var weak = reviews.Where(x => x.Rating == "unsure" || x.Rating == "partial" || x.LastOutcome == "skipped");
        var weakFirst = await Cards(weak.OrderBy(x => x.LastActivityAt).Take(1)).FirstOrDefaultAsync(ct);
        var attempts = await (from a in answered
            join q in db.QuestionVersions on new { a.Slug, a.Version } equals new { q.Slug, q.Version }
            join r in db.Assessments on a.Id equals r.AttemptId into ratings
            from r in ratings.DefaultIfEmpty()
            select new { q.Topic, a.Slug, a.Version, a.At, a.ActiveSeconds, a.HintSeen, a.AnswerSeen, Rating = r == null ? null : r.Rating })
            .ToArrayAsync(ct);
        var mocks = await db.Interviews.Where(x => x.UserId == owner && x.Status == "completed")
            .Select(x => new { x.EndedAt, HasAnswer = db.Turns.Any(y => y.SessionId == x.Id && y.Kind == "question" && !y.Skipped) }).ToArrayAsync(ct);
        var week = Enumerable.Range(0, 7).Select(i => today.AddDays(i - 6)).Select(date =>
        {
            var day = attempts.Where(x => LocalDate(x.At, zone) == date).ToArray();
            return new DayActivity(date, day.Length, day.Sum(x => x.ActiveSeconds), mocks.Count(x => LocalDate(x.EndedAt!.Value, zone) == date));
        }).ToArray();
        var activityDays = attempts.Select(x => LocalDate(x.At, zone)).Concat(mocks.Where(x => x.HasAnswer).Select(x => LocalDate(x.EndedAt!.Value, zone))).ToHashSet();
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
        var exerciseProgress = await db.ExerciseDrafts.Where(x => x.UserId == owner)
            .Select(x => new { x.Slug, x.Version, x.Reviewed }).ToArrayAsync(ct);
        var pending = exercises.Latest.Where(e => !exerciseProgress.Any(x => x.Slug == e.Slug && x.Version == e.Version && x.Reviewed)).ToArray();
        var suggestions = new List<StudyLink>();
        if (dueCards.FirstOrDefault() is { } first)
            suggestions.Add(new(first.Title, $"/cau-hoi/{first.Slug}", "Đã đến ngày ôn", first.Topic));
        if (weakFirst is not null && suggestions.All(x => x.Path != $"/cau-hoi/{weakFirst.Slug}"))
            suggestions.Add(new(weakFirst.Title, $"/cau-hoi/{weakFirst.Slug}",
                weakFirst.Outcome == "skipped" ? "Bạn từng bỏ qua câu này" : "Tự đánh giá gần nhất · " + (weakFirst.Rating == "unsure" ? "Chưa hiểu" : "Hiểu một phần"), weakFirst.Topic));
        var next = current.Where(x => !attempts.Any(a => a.Slug == x.Slug))
            .OrderByDescending(x => goal.ReviewTopics.Contains(x.Topic)).ThenByDescending(x => goal.Topics.Contains(x.Topic))
            .ThenBy(x => goal.MinutesPerDay is { } max && x.Minutes > max).ThenByDescending(x => x.Level == goal.Level)
            .ThenByDescending(x => x.Slug == "di-lifetimes").FirstOrDefault();
        if (next is not null && suggestions.Count < 3 && !suggestions.Any(x => x.Path == $"/cau-hoi/{next.Slug}"))
            suggestions.Add(new(next.Title, $"/cau-hoi/{next.Slug}", $"Câu chưa luyện · khoảng {next.Minutes} phút", next.Topic));
        if (suggestions.Count < 3 && pending.FirstOrDefault() is { } exercise)
            suggestions.Add(new(exercise.Title, $"/{(exercise.Kind == "sql" ? "sql" : "coding")}/{exercise.Slug}", "Bài thực hành đang chờ đối chiếu", exercise.Topic));
        if (suggestions.Count < 3)
            suggestions.Add(new("Nền tảng .NET", "/phong-van?preset=foundation", "Dành 15 phút để tập trả lời từng câu"));
        var activity = Catalog.Topics.Select(topic =>
        {
            var rows = attempts.Where(x => x.Topic == topic.Id).ToArray();
            return new TopicActivity(topic.Id, current.Count(x => x.Topic == topic.Id), rows.Length, rows.Select(x => x.Slug).Distinct().Count(),
                rows.Where(x => !x.HintSeen && !x.AnswerSeen && x.Rating == "clear").GroupBy(x => new { x.Slug, x.Version })
                    .Where(g => g.Select(x => LocalDate(x.At, zone)).Distinct().Count() >= 2).Select(g => g.Key.Slug).Distinct().Count());
        }).ToArray();
        return new(goal, today, current.Length, attempts.Length, mocks.Length, attempts.Sum(x => x.ActiveSeconds), week.Sum(x => x.Seconds),
            streak, await due.CountAsync(ct), await weak.CountAsync(ct), pending.Count(x => x.Kind == "coding"), pending.Count(x => x.Kind == "sql"),
            resume, [.. suggestions], dueCards, activity, week, false);
    }

    private IQueryable<StudyState> States(string owner) =>
        db.StudyStates.Where(s => s.UserId == owner && db.Questions.Any(q => q.Slug == s.Slug && q.Published != null));

    private IQueryable<QuestionCard> Cards(IQueryable<StudyState> rows) =>
        from s in rows
        join q in catalog.PublishedQuery() on s.Slug equals q.Slug
        orderby s.Due, q.Title
        select new QuestionCard(q.Slug, q.Version, q.Title, q.Topic, q.Format, q.Difficulty, q.Level, q.Technology,
            q.Minutes, s.Bookmarked, s.LastOutcome, s.Rating, s.Due, null);

    private async Task<QuestionCard[]> Reviews(string owner, string? kind, CancellationToken ct)
    {
        var today = await Today(db, owner, clock, ct);
        var q = States(owner);
        q = kind switch
        {
            "weak" => q.Where(x => x.Rating == "unsure" || x.Rating == "partial"),
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
                    a.At, r == null ? "Chưa tự đánh giá" : "Tự đánh giá", a.Version, a.HintSeen, a.AnswerSeen,
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
            revisions = await db.Revisions.AsNoTracking().Where(x => attempts.Any(a => a.Id == x.AttemptId)).ToArrayAsync(ct),
            aiFeedback = ai.Select(x => new { x.AttemptId, Feedback = DataJson.Read<AiResponse>(x.Feedback!) }),
            sessions = await sessions.ToArrayAsync(ct),
            turns = await db.Turns.AsNoTracking().Where(x => sessions.Any(s => s.Id == x.SessionId)).ToArrayAsync(ct),
            notes = await db.Notes.AsNoTracking().Where(x => x.UserId == owner).ToArrayAsync(ct),
            study = await db.StudyStates.AsNoTracking().Where(x => x.UserId == owner).ToArrayAsync(ct),
            exercises = await db.ExerciseDrafts.AsNoTracking().Where(x => x.UserId == owner).ToArrayAsync(ct),
            external = await db.ExternalPractice.AsNoTracking().Where(x => x.UserId == owner).ToArrayAsync(ct)
        };
        return TypedResults.File(System.Text.Encoding.UTF8.GetBytes(DataJson.Write(export)), "application/json", "interview-practice-data.json");
    }
}
