using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

/// <summary>Chủ đề và tiêu chí của một bước trong lộ trình.</summary>
internal sealed record TopicInfo(string Id, string Name, string Stage, string Check, string Exercise);

/// <summary>Nội dung đầy đủ của một phiên bản câu hỏi.</summary>
internal sealed record QuestionContent(
    string Title, string Topic, string Subtopic, string[] Tags, string Format, string Difficulty, string Level,
    int Minutes, string? Technology, string Prompt, string EnglishPrompt, string Context, string? Code,
    string Hint, string FollowUp, string EnglishFollowUp, string[] Outline, string ShortAnswer,
    string Explanation, string Alternative, string Trap, string[] Rubric, string Source, DateOnly CheckedOn,
    string? NextHint = null, string[]? Prerequisites = null, string[]? Related = null, QuizKey? Quiz = null, bool Core = false);

internal sealed record QuizKey(string[] Vi, string[] En, int CorrectIndex, int[]? CorrectIndices=null, string[]? Reasons=null);
internal sealed record QuizOptions(string[] Vi, string[] En,bool Multiple=false);

/// <summary>Tóm tắt công khai của câu hỏi và trạng thái học cá nhân nếu đã đăng nhập.</summary>
internal sealed record QuestionCard(
    string Slug, int Version, string Title, string Topic, string Format, string Difficulty, string Level,
    string? Technology, int Minutes, bool Bookmarked, string? Outcome, string? Rating, DateOnly? Due, string[]? Tags,
    string? Mastery = null, int VerifiedDays = 0, string? ReviewReason = null, bool AiAssessed = false);

/// <summary>Đề bài công khai. Các mục phản hồi được yêu cầu qua luồng luyện tập.</summary>
internal sealed record QuestionResponse(
    QuestionCard Card, string Subtopic, string[] Tags, string Prompt, string EnglishPrompt, string Context, string? Code,
    QuizOptions? Choices, string[] Prerequisites, string[] Related);

/// <summary>Đáp án, rubric và tài liệu cho đúng phiên bản câu hỏi.</summary>
internal sealed record ReferenceResponse(
    int Version, string ShortAnswer, string[] Outline, string Explanation, string Alternative, string Trap,
    string[] Rubric, string Source, DateOnly CheckedOn);

/// <summary>Trang kết quả tìm theo bộ lọc câu hỏi.</summary>
internal sealed record QuestionPage(QuestionCard[] Items, int Total, int Page, int PageSize);

/// <summary>Nội dung cần lưu thành phiên bản nháp mới.</summary>
internal sealed record EditQuestionRequest(int Revision, QuestionContent Content);

/// <summary>Thao tác xuất bản hoặc ngừng xuất bản theo phiên bản biên tập hiện tại.</summary>
internal sealed record PublicationRequest(int Revision, string Status);

internal sealed record SeedQuestion(string Slug, QuestionContent Content);

internal sealed partial class Catalog(PracticeDb db, IWebHostEnvironment environment, TimeProvider clock, Materials materials)
{
    internal TopicInfo[] TopicList => materials.Latest<TopicInfo>("topic");
    internal InterviewPreset[] PresetList => materials.Latest<InterviewPreset>("preset");
    private PracticeDb Db => db;
    public static readonly TopicInfo[] Topics =
    [
        new("csharp", "C# & .NET", "Nền tảng", "Giải thích cách sao chép và so sánh kiểu bằng một ví dụ.", "frequency-map"),
        new("oop", "OOP & Thiết kế", "Nền tảng", "Nêu khi nào chọn composition và cách thay dependency khi test.", "balanced-delimiters"),
        new("linq", "LINQ & Async", "Ứng dụng", "Phân biệt lúc truy vấn chạy và cách hủy một thao tác I/O.", "merge-ranges"),
        new("aspnet", "ASP.NET Core", "Ứng dụng", "Đọc pipeline và chỉ vị trí đặt kiểm tra quyền tài nguyên.", "unique-window"),
        new("efcore", "EF Core", "Ứng dụng", "Đọc SQL sinh ra và đề xuất projection hoặc xử lý tranh chấp.", "department-salary"),
        new("sql", "SQL & Database", "Ứng dụng", "Dự đoán số hàng, NULL và thứ tự từ dữ liệu mẫu.", "customer-orders"),
        new("algorithms", "Thuật toán", "Nền tảng", "Nêu invariant, độ phức tạp và edge case trước khi viết code.", "first-true"),
        new("systems", "Hệ thống phân tán", "Thực tế", "Xác định biên nhất quán, lỗi từng phần và cách phục hồi.", "hop-count"),
        new("delivery", "Git & Triển khai", "Thực tế", "Mô tả cách đưa một thay đổi lên production và quay lui.", "first-true"),
        new("behavioral", "HR & Dự án", "Thực tế", "Trình bày quyết định cá nhân và bằng chứng về kết quả.", "balanced-delimiters"),
        new("testing", "Testing & Tình huống", "Thực tế", "Dùng bằng chứng để tìm giả thuyết và nêu cách kiểm chứng.", "daily-totals")
    ];

    public static readonly string[] Difficulties = ["easy", "medium", "hard"];
    public static readonly string[] Levels = ["intern", "fresher", "junior", "mid", "senior"];
    public static readonly string[] Formats = ["concept", "compare", "read", "debug", "predict", "design", "experience", "quiz"];

    public static void Map(RouteGroupBuilder api)
    {
        api.MapGet("/topics", (Catalog c, ExerciseCatalog exercises) => c.TopicList.Select(t=>new { t.Id,t.Name,t.Stage,t.Check,t.Exercise,exerciseKind=exercises.Find(t.Exercise,null).Kind })).WithSummary("Liệt kê chủ đề và bước lộ trình.");
        api.MapGet("/questions/technologies", async (Catalog catalog, CancellationToken ct) =>
            await catalog.PublishedQuery().Where(q => q.Technology != null).Select(q => q.Technology!).Distinct().OrderBy(x => x).ToArrayAsync(ct))
            .WithSummary("Liệt kê phiên bản kỹ thuật đang xuất bản.");
        api.MapGet("/questions", (
            string? search, string? topic, string? format, string? difficulty, string? level, string? technology, string? status,
            bool? bookmarked, bool? due, int? page, string? concept, string? sort, string? subtopic,string? skill, ClaimsPrincipal user, Catalog catalog, CancellationToken ct)
            => catalog.List(search, topic, format, difficulty, level, technology, status, bookmarked, due, page, concept, sort, subtopic,skill,user, ct))
            .WithSummary("Tìm kiếm và phân trang ngân hàng câu hỏi.");
        api.MapGet("/concepts", (Materials content) => content.Concepts.Select(c => new { c.Id, c.Name, c.Prerequisites, c.Exercise, c.Review }));
        api.MapGet("/questions/facets", async (PracticeDb db,CancellationToken ct) =>
        {
            var groups=await db.Database.SqlQuery<string>($"""
                SELECT DISTINCT JSON_VALUE(q.Data,'$.subtopic') AS Value FROM Questions h
                JOIN QuestionVersions q ON q.Slug=h.Slug AND q.Version=h.Published
                """).OrderBy(x=>x).ToArrayAsync(ct);
            var skills=await db.Database.SqlQuery<string>($"""
                SELECT DISTINCT t.value AS Value FROM Questions h
                JOIN QuestionVersions q ON q.Slug=h.Slug AND q.Version=h.Published
                CROSS APPLY OPENJSON(q.Data,'$.tags') t
                """).OrderBy(x=>x).ToArrayAsync(ct);
            return new { subtopics=groups,skills };
        });
        api.MapGet("/questions/{slug}", async (string slug, ClaimsPrincipal user, Catalog catalog, CancellationToken ct)
            => View(await catalog.Published(slug, ct), await catalog.State(slug, user, ct)))
            .WithSummary("Đọc đề bài và tiến độ cá nhân của một câu.");

        var admin = api.MapGroup("/admin/questions").RequireAuthorization(p => p.RequireRole(Auth.Admin));
        admin.MapGet("/{slug}/export", async (string slug, Catalog catalog, CancellationToken ct) =>
        {
            var head = await catalog.Db.Questions.FindAsync([slug], ct) ?? throw ApiProblem.Missing();
            var item = new SeedQuestion(slug, Content(await catalog.Version(slug, head.Latest, ct)));
            return TypedResults.File(System.Text.Encoding.UTF8.GetBytes(DataJson.Write(new[] { item })), "application/json", slug + ".json");
        });
        admin.MapPost("/import", (SeedQuestion[] items, ClaimsPrincipal user, Catalog catalog, CancellationToken ct) => catalog.Import(items, user.Id(), ct));
        admin.MapGet("/coverage", async (Catalog catalog, CancellationToken ct) =>
        {
            var published = catalog.PublishedQuery();
            var counts = await published.GroupBy(q => new { q.Topic, q.Level, q.Format })
                .Select(g => new { g.Key.Topic, g.Key.Level, g.Key.Format, Count = g.Count() }).ToArrayAsync(ct);
            var pending = await catalog.Db.Questions.CountAsync(q => q.Status != "retired" && q.Latest != (q.Published ?? 0), ct);
            return new { published = counts.Sum(x => x.Count), pending, counts };
        });
        admin.MapGet("", async (int? page,string? search,string? status,Catalog catalog, CancellationToken ct) =>
        {
            var rows=catalog.Db.Questions.Join(catalog.Db.QuestionVersions,
                head => new { head.Slug, Version = head.Latest }, version => new { version.Slug, version.Version },
                (head, version) => new { head.Slug, head.Latest, head.Published, head.Revision,head.Status, version.Title, version.Topic });
            if (Term(search) is {} term) {
                if(term.Length>120)throw ApiProblem.Invalid("Từ khóa tối đa 120 ký tự.");
                rows=rows.Where(r=>r.Slug.Contains(term)||EF.Functions.Collate(r.Title,"Latin1_General_100_CI_AI").Contains(term));
            }
            if (Term(status) is not null) rows=rows.Where(r=>r.Status==status);
            var ordered=rows.OrderBy(r=>r.Title).ThenBy(r=>r.Slug);
            if(page is null)return Results.Ok(await ordered.ToArrayAsync(ct));
            const int size=20;
            var total=await rows.CountAsync(ct);
            var n=Math.Clamp(page.Value,1,Math.Max(1,(total+size-1)/size));
            return Results.Ok(new {items=await ordered.Skip((n-1)*size).Take(size).ToArrayAsync(ct),total,page=n,pageSize=size});
        })
            .WithSummary("Liệt kê nội dung ở mọi trạng thái cho admin.");
        admin.MapGet("/{slug}", (string slug, Catalog catalog, CancellationToken ct) => catalog.AdminDetail(slug, ct))
            .WithSummary("Đọc bản biên tập mới nhất và phiên bản đang xuất bản.");
        admin.MapPut("/{slug}", (string slug, EditQuestionRequest request, ClaimsPrincipal user, Catalog catalog, CancellationToken ct)
            => catalog.SaveVersion(slug, request, user.Id(), ct)).WithSummary("Lưu một phiên bản nội dung bất biến.");
        admin.MapPost("/{slug}/publication", (string slug, PublicationRequest request, ClaimsPrincipal user, Catalog catalog, CancellationToken ct)
            => catalog.Publish(slug, request,user.Id(), ct)).WithSummary("Xuất bản bản mới nhất hoặc ngừng xuất bản.");
    }

    private static string? Term(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private async Task<QuestionPage> List(
        string? search, string? topic, string? format, string? difficulty, string? level, string? technology,
        string? status, bool? bookmarked, bool? due, int? page, string? concept, string? sort,string? subtopic,string? skill, ClaimsPrincipal user, CancellationToken ct)
    {
        const int size = 9;
        var pageNumber = Math.Clamp(page ?? 1, 1, 100_000);
        var owner = user.Identity?.IsAuthenticated is true ? user.Id() : "";
        var today = await Learning.Today(db, owner, clock, ct);
        await Recall.Expire(db, owner, today, ct);
        var term = Term(search);
        if (term?.Length > 120)
            throw ApiProblem.Invalid("Từ khóa tối đa 120 ký tự.");
        var query = from q in db.QuestionVersions
            join h in db.Questions on q.Slug equals h.Slug
            where h.Published == q.Version
            join st in db.StudyStates.Where(x => x.UserId == owner) on q.Slug equals st.Slug into states
            from s in states.DefaultIfEmpty()
            select new { q, s };
        if (term is not null)
        {
            var matches = materials.Concepts.Where(c => c.Aliases.Append(c.Name).Contains(term, StringComparer.OrdinalIgnoreCase))
                .SelectMany(c => c.Questions).Distinct().ToArray();
            if (matches.Length > 0 && term.Length <= 3)
                query = query.Where(x => matches.Contains(x.q.Slug));
            else if (matches.Length > 0)
                query = query.Where(x => matches.Contains(x.q.Slug) || EF.Functions.Collate(x.q.SearchText, "Latin1_General_100_CI_AI").Contains(term));
            else foreach (var word in term.Split((char[]?)null,StringSplitOptions.RemoveEmptyEntries).Distinct(StringComparer.OrdinalIgnoreCase))
            {
                var normalized = word.Replace('đ','d').Replace('Đ','D');
                query = query.Where(x => EF.Functions.Collate(x.q.SearchText.Replace("đ","d").Replace("Đ","D"), "Latin1_General_100_CI_AI").Contains(normalized));
            }
        }
        if (Term(concept) is not null)
        {
            var matching = materials.Concepts.SingleOrDefault(c => c.Id == concept)?.Questions ?? [];
            query = query.Where(x => matching.Contains(x.q.Slug));
        }
        if (Term(topic) is not null) query = query.Where(x => x.q.Topic == topic);
        if (Term(subtopic) is {} sub)
        {
            if(sub.Length>120) throw ApiProblem.Invalid("Chủ đề con tối đa 120 ký tự.");
            var selected=db.Database.SqlQuery<string>($"""
                SELECT q.Slug AS Value FROM Questions h JOIN QuestionVersions q ON q.Slug=h.Slug AND q.Version=h.Published
                WHERE JSON_VALUE(q.Data,'$.subtopic')={sub}
                """);
            query=query.Where(x=>selected.Contains(x.q.Slug));
        }
        if (Term(skill) is {} tag)
        {
            if(tag.Length>35) throw ApiProblem.Invalid("Kỹ năng tối đa 35 ký tự.");
            var selected=db.Database.SqlQuery<string>($"""
                SELECT q.Slug AS Value FROM Questions h JOIN QuestionVersions q ON q.Slug=h.Slug AND q.Version=h.Published
                CROSS APPLY OPENJSON(q.Data,'$.tags') t WHERE t.value={tag}
                """);
            query=query.Where(x=>selected.Contains(x.q.Slug));
        }
        if (Term(format) is not null) query = query.Where(x => x.q.Format == format);
        if (Term(difficulty) is not null) query = query.Where(x => x.q.Difficulty == difficulty);
        if (Term(level) is not null) query = query.Where(x => x.q.Level == level);
        if (Term(technology) is not null) query = query.Where(x => x.q.Technology == technology);
        if (bookmarked is true) query = query.Where(x => x.s != null && x.s.Bookmarked);
        if (due is true) query = query.Where(x => x.s != null && x.s.Due != null && x.s.Due <= today);
        query = status switch
        {
            "learning" => query.Where(x => x.s != null && (x.s.Mastery == "learning" || x.s.Mastery == null && x.s.DraftId != null)),
            "secure" or "mastered" or "review" or "self" or "ai" => query.Where(x => x.s != null && x.s.Mastery == status && x.s.ScheduledVersion == x.q.Version),
            "answered" => query.Where(x => x.s != null && x.s.AnsweredCount > 0),
            "new" => query.Where(x => x.s == null || x.s.LastAttemptId == null && x.s.DraftId == null),
            "skipped" => query.Where(x => x.s != null && x.s.LastOutcome == "skipped"),
            _ => query
        };
        var total = await query.CountAsync(ct);
        pageNumber = Math.Min(pageNumber, Math.Max(1, (total + size - 1) / size));
        var sorted = sort switch {
            null or "" or "title" => query.OrderBy(x => x.q.Title),
            "minutes" => query.OrderBy(x => x.q.Minutes).ThenBy(x => x.q.Title),
            "practice" => query.OrderByDescending(x => x.s == null ? 0 : x.s.AnsweredCount).ThenBy(x => x.q.Title),
            _ => throw ApiProblem.Invalid("Thứ tự sắp xếp không hợp lệ.")
        };
        var items = await sorted.ThenBy(x => x.q.Slug).Skip((pageNumber - 1) * size).Take(size)
            .Select(x => new { x.q.Data, Card = new QuestionCard(x.q.Slug, x.q.Version, x.q.Title, x.q.Topic, x.q.Format, x.q.Difficulty,
                x.q.Level, x.q.Technology, x.q.Minutes, x.s != null && x.s.Bookmarked, x.s == null ? null : x.s.LastOutcome,
                x.s == null ? null : x.s.Rating, x.s == null ? null : x.s.Due, null,
                x.s == null ? null : x.s.Mastery ?? (x.s.DraftId != null ? "learning" : null), x.s == null ? 0 : x.s.VerifiedDays,
                x.s == null ? null : x.s.ReviewReason, x.s != null && x.s.AiAssessed) }).ToArrayAsync(ct);
        return new(items.Select(x => x.Card with { Tags = DataJson.Read<QuestionContent>(x.Data).Tags }).ToArray(), total, pageNumber, size);
    }

    public IQueryable<QuestionVersion> PublishedQuery() => from q in db.QuestionVersions
        join h in db.Questions on q.Slug equals h.Slug
        where q.Version == h.Published
        select q;

    public async Task<QuestionVersion> Published(string slug, CancellationToken ct)
        => await PublishedQuery().AsNoTracking().SingleOrDefaultAsync(x => x.Slug == slug, ct)
            ?? throw ApiProblem.Missing("Câu hỏi hiện không được xuất bản.");

    public async Task<QuestionVersion> Version(string slug, int version, CancellationToken ct)
        => await db.QuestionVersions.AsNoTracking().SingleOrDefaultAsync(x => x.Slug == slug && x.Version == version, ct)
            ?? throw ApiProblem.Missing("Không tìm thấy phiên bản câu hỏi.");

    private async Task<StudyState?> State(string slug, ClaimsPrincipal user, CancellationToken ct)
    {
        if (user.Identity?.IsAuthenticated is not true) return null;
        await Recall.Expire(db, user.Id(), await Learning.Today(db, user.Id(), clock, ct), ct);
        return await db.StudyStates.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == user.Id() && x.Slug == slug, ct);
    }

    public static QuestionContent Content(QuestionVersion q) => DataJson.Read<QuestionContent>(q.Data);
    internal static string[] ContentPrerequisites(string data) => DataJson.Read<QuestionContent>(data).Prerequisites ?? [];
    public static QuestionCard Card(QuestionVersion q, StudyState? s = null)
        => new(q.Slug, q.Version, q.Title, q.Topic, q.Format, q.Difficulty, q.Level, q.Technology, q.Minutes,
            s?.Bookmarked ?? false, s?.LastOutcome, s?.Rating, s?.Due, null,
            s?.ScheduledVersion == q.Version ? s.Mastery : s?.DraftId is not null ? "learning" : null, s?.ScheduledVersion == q.Version ? s.VerifiedDays : 0,
            s?.ScheduledVersion == q.Version ? s.ReviewReason : null, s?.ScheduledVersion == q.Version && s.AiAssessed);

    public static QuestionResponse View(QuestionVersion q, StudyState? s = null)
    {
        var c = Content(q);
        return new(Card(q, s), c.Subtopic, c.Tags, c.Prompt, c.EnglishPrompt, c.Context, c.Code,
            c.Quiz is null ? null : new(c.Quiz.Vi, c.Quiz.En,c.Quiz.CorrectIndices!=null), c.Prerequisites ?? [], c.Related ?? []);
    }

    public static ReferenceResponse Reference(QuestionVersion q)
    {
        var c = Content(q);
        return new(q.Version, c.ShortAnswer, c.Outline, c.Explanation, c.Alternative, c.Trap, c.Rubric, c.Source, c.CheckedOn);
    }

    private static QuestionVersion VersionRow(string slug, int number, QuestionContent c) => new()
    {
        Slug = slug, Version = number, Topic = c.Topic, Title = c.Title, Format = c.Format, Level = c.Level,
        Difficulty = c.Difficulty, Technology = Term(c.Technology), Minutes = c.Minutes,
        SearchText = string.Join(" ", new[] { c.Title, c.Subtopic, c.Prompt, c.EnglishPrompt }.Concat(c.Tags)),
        Data = DataJson.Write(c)
    };

    public async Task SeedAsync(CancellationToken ct)
    {
        var dir = Path.Combine(environment.ContentRootPath, "Content");
        var files = Directory.GetFiles(dir, "questions-batch-*.json").Order(StringComparer.Ordinal).Prepend(Path.Combine(dir, "questions.json"));
        var items = new List<SeedQuestion>();
        foreach (var file in files) items.AddRange(DataJson.Read<SeedQuestion[]>(await File.ReadAllTextAsync(file, ct)));
        await using var tx = await Materials.EditLock(db, ct);
        var existing = (await db.Questions.Select(x => x.Slug).ToArrayAsync(ct)).ToHashSet(StringComparer.Ordinal);
        foreach (var item in items.Where(x => !existing.Contains(x.Slug)))
        {
            // The original sql-constraints v1 stores its options in the prompt and takes a written answer.
            Validate(item.Slug, item.Content, allowLegacyWrittenQuiz: item.Slug == "sql-constraints");
            db.Questions.Add(new QuestionHead { Slug = item.Slug, Latest = 1, Published = 1, Status = "published", Revision = 1 });
            db.QuestionVersions.Add(VersionRow(item.Slug, 1, item.Content));
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    internal async Task ReconcileLegacyReviews(CancellationToken ct)
    {
        var stale = from s in db.StudyStates
            join q in PublishedQuery() on s.Slug equals q.Slug
            where s.LastAttemptId != null && (s.RecallRevision < 2 || s.ScheduledVersion != q.Version || s.SuggestedDue == null && !s.ManualDue)
            select new { State = s, Question = q, HasAttempt = db.Attempts.Any(a =>
                a.UserId == s.UserId && a.Slug == s.Slug && a.Version == q.Version) };
        var owners = await db.Attempts.Where(a => a.StudyDay == null).Select(a => a.UserId)
            .Union(stale.Select(x => x.State.UserId)).ToArrayAsync(ct);
        foreach (var owner in owners)
        {
            await using var tx = await db.LockLearning(owner, ct);
            var zone = TimeZoneInfo.FindSystemTimeZoneById((await Learning.Goal(db, owner, ct)).TimeZone);
            var attempts = await db.Attempts.Where(a => a.UserId == owner && a.StudyDay == null).ToArrayAsync(ct);
            foreach (var attempt in attempts) attempt.StudyDay = Learning.LocalDate(attempt.At, zone);
            await db.SaveChangesAsync(ct);
            var today = Learning.LocalDate(clock.GetUtcNow(), zone);
            foreach (var item in await stale.Where(x => x.State.UserId == owner).ToArrayAsync(ct))
            {
                if (item.HasAttempt) await Recall.Refresh(db, item.State, item.Question, ct, today: today);
                else ResetVersion(item.State, item.Question.Version, today);
                item.State.Revision++;
            }
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            db.ChangeTracker.Clear();
        }
    }

    private static void ResetVersion(StudyState state, int version, DateOnly today)
    {
        state.ScheduledVersion = version;
        state.RecallRevision = 2;
        state.Mastery = "review";
        state.ReviewReason = "version";
        state.EvidenceUntil = null;
        state.AiAssessed = false;
        state.SuggestedDue = today;
        if (!state.ManualDue) state.Due = today;
        state.VerifiedDays = state.Lapses = 0;
        state.Rating = null;
    }

    private async Task<IResult> AdminDetail(string slug, CancellationToken ct)
    {
        var head = await db.Questions.FindAsync([slug], ct) ?? throw ApiProblem.Missing();
        var version = await Version(slug, head.Latest, ct);
        return TypedResults.Ok(new { head.Slug, head.Latest, head.Published, head.Revision, head.Status, content = Content(version) });
    }

    private static void CheckPrerequisites(Dictionary<string,QuestionContent> content)
    {
        var visited = new HashSet<string>();
        var path = new HashSet<string>();
        void Visit(string slug)
        {
            if (visited.Contains(slug)) return;
            if (!path.Add(slug)) throw ApiProblem.Invalid("Vòng lặp kiến thức tiên quyết tại " + slug);
            if (!content.TryGetValue(slug,out var entry)) throw ApiProblem.Invalid("Thiếu câu tiên quyết " + slug);
            foreach (var dependency in entry.Prerequisites ?? []) Visit(dependency);
            path.Remove(slug);
            visited.Add(slug);
        }
        foreach (var slug in content.Keys) Visit(slug);
    }

    private async Task<IResult> Import(SeedQuestion[] items,string actor, CancellationToken ct)
    {
        if (items is not { Length: > 0 and <= 20 }) throw ApiProblem.Invalid("Nhập từ 1 đến 20 câu mỗi lần.");
        var slugs = new HashSet<string>(StringComparer.Ordinal);
        var prompts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in items)
        {
            if (item?.Content is null || string.IsNullOrWhiteSpace(item.Slug)) throw ApiProblem.Invalid("Thiếu slug hoặc nội dung.");
            Validate(item.Slug, item.Content);
            if (!slugs.Add(item.Slug) || !prompts.Add(item.Content.Prompt.Trim()))
                throw ApiProblem.Invalid("Tệp có câu trùng slug hoặc trùng đề.");
        }
        await using var tx = await Materials.EditLock(db, ct);
        var latest = await (from h in db.Questions join q in db.QuestionVersions
            on new { h.Slug, Version = h.Latest } equals new { q.Slug, q.Version } select new { h.Slug, q.Data }).ToArrayAsync(ct);
        var known = latest.ToDictionary(q => q.Slug, q => DataJson.Read<QuestionContent>(q.Data));
        var added = items.Where(i => !known.ContainsKey(i.Slug)).ToArray();
        if (items.Any(i => known.TryGetValue(i.Slug, out var old) && DataJson.Write(old) != DataJson.Write(i.Content))
            || added.Any(i => known.Values.Any(c => string.Equals(c.Prompt.Trim(),i.Content.Prompt.Trim(),StringComparison.OrdinalIgnoreCase))))
            throw ApiProblem.Conflict("Có slug hoặc nội dung đề đã tồn tại. Sửa qua trang phiên bản để giữ lịch sử.");
        var available = latest.Select(x => x.Slug).Concat(slugs).ToHashSet();
        if (items.Any(i => (i.Content.Prerequisites ?? []).Concat(i.Content.Related ?? []).Any(k => !available.Contains(k))))
            throw ApiProblem.Invalid("Liên kết câu hỏi chưa có trong hệ thống hoặc tệp nhập.");
        foreach (var item in added) known.Add(item.Slug,item.Content);
        CheckPrerequisites(known);
        foreach (var item in added)
        {
            db.Questions.Add(new QuestionHead { Slug = item.Slug, Latest = 1, Revision = 1, Status = "draft" });
            Materials.Audit(db,actor,"import","question",item.Slug,1,clock.GetUtcNow());
            db.QuestionVersions.Add(VersionRow(item.Slug, 1, item.Content));
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return TypedResults.Ok(new { imported = added.Length, unchanged = items.Length - added.Length });
    }

    private async Task<IResult> SaveVersion(string slug, EditQuestionRequest request,string actor, CancellationToken ct)
    {
        if (request.Content is null)
            throw ApiProblem.Invalid("Cần nhập nội dung câu hỏi.");
        Validate(slug, request.Content);
        await using var tx = await Materials.EditLock(db,ct);
        var links = (request.Content.Prerequisites ?? []).Concat(request.Content.Related ?? []).Distinct().ToArray();
        if (links.Length > 0 && await db.Questions.CountAsync(q => links.Contains(q.Slug), ct) != links.Length)
            throw ApiProblem.Invalid("Một câu tiên quyết hoặc liên quan chưa tồn tại. Kiểm tra lại slug.");
        var head = await db.Questions.FindAsync([slug], ct);
        var created = head is null;
        if ((head?.Revision ?? 0) != request.Revision)
            throw ApiProblem.Conflict();
        if (request.Content.Prerequisites?.Length > 0) {
            var graph = await (from h in db.Questions join q in db.QuestionVersions
                on new { h.Slug, Version=h.Latest } equals new { q.Slug,q.Version } select new { q.Slug,q.Data })
                .ToDictionaryAsync(q=>q.Slug,q=>DataJson.Read<QuestionContent>(q.Data),ct);
            graph[slug]=request.Content;
            CheckPrerequisites(graph);
        }
        if (head is null)
        {
            head = new QuestionHead { Slug = slug };
            db.Questions.Add(head);
        }
        head.Latest++;
        head.Revision++;
        head.Status = "draft";
        db.QuestionVersions.Add(VersionRow(slug, head.Latest, request.Content));
        Materials.Audit(db,actor,"draft","question",slug,head.Latest,clock.GetUtcNow());
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        var response = new { head.Slug, head.Latest, head.Published, head.Revision, head.Status };
        return created ? TypedResults.Created($"/api/admin/questions/{slug}", response) : TypedResults.Ok(response);
    }

    private async Task<IResult> Publish(string slug, PublicationRequest request,string actor, CancellationToken ct)
    {
        await using var transaction = await Materials.EditLock(db,ct);
        var head = await db.Questions.FindAsync([slug], ct) ?? throw ApiProblem.Missing();
        if (head.Revision != request.Revision)
            throw ApiProblem.Conflict();
        var previous = head.Published;
        var next = request.Status switch
        {
            "published" when head.Status == "verified" => head.Latest,
            "needs-review" when head.Status is "draft" or "retired" => previous,
            "verified" when head.Status == "needs-review" => previous,
            "retired" when previous.HasValue => null,
            _ => throw ApiProblem.Invalid("Trạng thái xuất bản không hợp lệ.")
        };
        if (next != previous)
        {
            var graph = await PublishedQuery().ToDictionaryAsync(q => q.Slug, Content, ct);
            if (next is int version) graph[slug] = Content(await Version(slug, version, ct));
            else graph.Remove(slug);
            CheckPrerequisites(graph);
        }
        head.Published = next;
        head.Status = request.Status;
        var auditedVersion = request.Status == "retired" ? previous.GetValueOrDefault() : head.Latest;
        Materials.Audit(db,actor,request.Status,"question",slug,auditedVersion,clock.GetUtcNow());
        head.Revision++;
        await db.SaveChangesAsync(ct);
        if (head.Published is int published && previous != published)
        {
            var now = clock.GetUtcNow();
            var states = await (from s in db.StudyStates
                join u in db.Users on s.UserId equals u.Id
                where s.Slug == slug && s.LastAttemptId != null && s.ScheduledVersion != published
                select new { State = s, u.GoalJson }).ToArrayAsync(ct);
            foreach (var item in states)
            {
                var goal = item.GoalJson is null ? GoalSettings.Default : DataJson.Read<GoalSettings>(item.GoalJson);
                var today = Learning.LocalDate(now, TimeZoneInfo.FindSystemTimeZoneById(goal.TimeZone));
                var state = item.State;
                ResetVersion(state, published, today);
                state.Revision++;
            }
            await db.SaveChangesAsync(ct);
        }
        await transaction.CommitAsync(ct);
        return await AdminDetail(slug, ct);
    }

    private static void Validate(string slug, QuestionContent c, bool allowLegacyWrittenQuiz = false)
    {
        static bool Has(string? value, int max) => !string.IsNullOrWhiteSpace(value) && value.Length <= max;
        static bool List(string[]? values, int min, int max, int length) =>
            values is not null && values.Length >= min && values.Length <= max && values.All(x => Has(x, length));
        if (slug is "new" or "hoc-lieu" or "coverage" or "technologies" or "facets" or "import" || slug.Length > 90 || !SlugShape().IsMatch(slug))
            throw ApiProblem.Invalid("Slug dùng chữ thường, số và dấu nối, tối đa 90 ký tự.");
        if (!Topics.Any(x => x.Id == c.Topic) || !Formats.Contains(c.Format) || !Levels.Contains(c.Level) || !Difficulties.Contains(c.Difficulty))
            throw ApiProblem.Invalid("Chọn chủ đề, dạng câu, mức mục tiêu và độ khó hợp lệ.");
        if (!Has(c.Title, 160) || !Has(c.Subtopic, 120) || !List(c.Tags, 1, 8, 35) || c.Minutes is < 1 or > 60
            || !Has(c.Prompt, 3500) || !Has(c.EnglishPrompt, 3500) || c.Technology?.Length > 60 || c.Context is null
            || c.Context.Length > 2500 || c.Code?.Length > 8000)
            throw ApiProblem.Invalid("Kiểm tra tiêu đề, đề Việt/Anh, thẻ và thời lượng 1–60 phút.");
        if (!List(c.Outline, 2, 8, 350) || !List(c.Rubric, 4, 4, 350)
            || !Has(c.Hint, 700) || !Has(c.FollowUp, 700) || !Has(c.EnglishFollowUp, 700) || !Has(c.ShortAnswer, 3000)
            || !Has(c.Explanation, 5000) || !Has(c.Alternative, 2000) || !Has(c.Trap, 2000))
            throw ApiProblem.Invalid("Cần ý chính, bốn tiêu chí rubric, gợi ý, câu đào sâu Việt/Anh và nội dung đáp án.");
        if (!Has(c.Source, 600) || !Uri.TryCreate(c.Source, UriKind.Absolute, out var source) || source.Scheme != Uri.UriSchemeHttps
            || c.CheckedOn == default)
            throw ApiProblem.Invalid("Nguồn phải là URL HTTPS và cần có ngày kiểm tra.");
        if (c.Format == "quiz" && c.Quiz is null && !allowLegacyWrittenQuiz)
            throw ApiProblem.Invalid("Dạng trắc nghiệm cần lựa chọn tiếng Việt, tiếng Anh và đáp án đúng.");
        if (c.Quiz is { } quiz && (!List(quiz.Vi, 2, 6, 300) || !List(quiz.En, 2, 6, 300)
            || quiz.CorrectIndices is {} indices && (indices.Length<2 || indices.Length>=quiz.Vi.Length || indices.Distinct().Count()!=indices.Length ||
                !indices.Contains(quiz.CorrectIndex) || indices.Any(i=>i<0 || i>=quiz.Vi.Length))
            || quiz.Reasons is {} reasons && !List(reasons,quiz.Vi.Length,quiz.Vi.Length,700)
            || quiz.En.Length != quiz.Vi.Length || quiz.CorrectIndex < 0 || quiz.CorrectIndex >= quiz.Vi.Length
            || quiz.Vi.Select(x => x.Trim()).Distinct().Count() != quiz.Vi.Length || quiz.En.Select(x => x.Trim()).Distinct().Count() != quiz.En.Length))
            throw ApiProblem.Invalid("Cần lựa chọn Việt/Anh tương ứng và một đáp án đúng hợp lệ.");
        if (c.NextHint?.Length > 700 || new[] { c.Prerequisites, c.Related }.Any(keys => keys is not null &&
            (keys.Length > 8 || keys.Distinct().Count() != keys.Length || keys.Any(k => k is null || k.Length > 90 || k == slug || !SlugShape().IsMatch(k)))))
            throw ApiProblem.Invalid("Kiểm tra gợi ý bổ sung và liên kết kiến thức.");
    }

    [GeneratedRegex(@"^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.CultureInvariant, 100)]
    private static partial Regex SlugShape();

}
