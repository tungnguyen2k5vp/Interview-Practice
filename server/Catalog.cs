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
    string Explanation, string Alternative, string Trap, string[] Rubric, string Source, DateOnly CheckedOn);

/// <summary>Tóm tắt công khai của câu hỏi và trạng thái học cá nhân nếu đã đăng nhập.</summary>
internal sealed record QuestionCard(
    string Slug, int Version, string Title, string Topic, string Format, string Difficulty, string Level,
    string? Technology, int Minutes, bool Bookmarked, string? Outcome, string? Rating, DateOnly? Due, string[]? Tags);

/// <summary>Đề bài công khai. Các mục phản hồi được yêu cầu qua luồng luyện tập.</summary>
internal sealed record QuestionResponse(
    QuestionCard Card, string Subtopic, string[] Tags, string Prompt, string EnglishPrompt, string Context, string? Code);

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

internal sealed partial class Catalog(PracticeDb db, IWebHostEnvironment environment, TimeProvider clock)
{
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
        new("testing", "Testing & Tình huống", "Thực tế", "Dùng bằng chứng để tìm giả thuyết và nêu cách kiểm chứng.", "daily-totals")
    ];

    public static readonly string[] Difficulties = ["easy", "medium", "hard"];
    public static readonly string[] Levels = ["fresher", "junior", "mid", "senior"];
    public static readonly string[] Formats = ["concept", "compare", "read", "debug", "predict", "design", "experience", "quiz"];

    public static void Map(RouteGroupBuilder api)
    {
        api.MapGet("/topics", () => TypedResults.Ok(Topics)).WithSummary("Liệt kê chủ đề và bước lộ trình.");
        api.MapGet("/questions/technologies", async (Catalog catalog, CancellationToken ct) =>
            await catalog.PublishedQuery().Where(q => q.Technology != null).Select(q => q.Technology!).Distinct().OrderBy(x => x).ToArrayAsync(ct))
            .WithSummary("Liệt kê phiên bản kỹ thuật đang xuất bản.");
        api.MapGet("/questions", (
            string? search, string? topic, string? format, string? difficulty, string? level, string? technology, string? status,
            bool? bookmarked, bool? due, int? page, ClaimsPrincipal user, Catalog catalog, CancellationToken ct)
            => catalog.List(search, topic, format, difficulty, level, technology, status, bookmarked, due, page, user, ct))
            .WithSummary("Tìm kiếm và phân trang ngân hàng câu hỏi.");
        api.MapGet("/questions/{slug}", async (string slug, ClaimsPrincipal user, Catalog catalog, CancellationToken ct)
            => View(await catalog.Published(slug, ct), await catalog.State(slug, user, ct)))
            .WithSummary("Đọc đề bài và tiến độ cá nhân của một câu.");

        var admin = api.MapGroup("/admin/questions").RequireAuthorization(p => p.RequireRole(Auth.Admin));
        admin.MapGet("", async (Catalog catalog, CancellationToken ct) =>
            await catalog.Db.Questions.Join(catalog.Db.QuestionVersions,
                head => new { head.Slug, Version = head.Latest }, version => new { version.Slug, version.Version },
                (head, version) => new { head.Slug, head.Latest, head.Published, head.Status, version.Title, version.Topic })
                .OrderBy(x => x.Title).ToArrayAsync(ct))
            .WithSummary("Liệt kê nội dung ở mọi trạng thái cho admin.");
        admin.MapGet("/{slug}", (string slug, Catalog catalog, CancellationToken ct) => catalog.AdminDetail(slug, ct))
            .WithSummary("Đọc bản biên tập mới nhất và phiên bản đang xuất bản.");
        admin.MapPut("/{slug}", (string slug, EditQuestionRequest request, Catalog catalog, CancellationToken ct)
            => catalog.SaveVersion(slug, request, ct)).WithSummary("Lưu một phiên bản nội dung bất biến.");
        admin.MapPost("/{slug}/publication", (string slug, PublicationRequest request, Catalog catalog, CancellationToken ct)
            => catalog.Publish(slug, request, ct)).WithSummary("Xuất bản bản mới nhất hoặc ngừng xuất bản.");
    }

    private static string? Term(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private async Task<QuestionPage> List(
        string? search, string? topic, string? format, string? difficulty, string? level, string? technology,
        string? status, bool? bookmarked, bool? due, int? page, ClaimsPrincipal user, CancellationToken ct)
    {
        const int size = 9;
        var pageNumber = Math.Clamp(page ?? 1, 1, 100_000);
        var owner = user.Identity?.IsAuthenticated is true ? user.Id() : "";
        var today = await Learning.Today(db, owner, clock, ct);
        var term = Term(search);
        if (term?.Length > 120)
            throw ApiProblem.Invalid("Từ khóa tối đa 120 ký tự.");
        var query = from q in db.QuestionVersions
            join h in db.Questions on q.Slug equals h.Slug
            where h.Published == q.Version
            join st in db.StudyStates.Where(x => x.UserId == owner) on q.Slug equals st.Slug into states
            from s in states.DefaultIfEmpty()
            select new { q, s };
        if (term is not null) query = query.Where(x => EF.Functions.Collate(x.q.SearchText, "Latin1_General_100_CI_AI").Contains(term));
        if (Term(topic) is not null) query = query.Where(x => x.q.Topic == topic);
        if (Term(format) is not null) query = query.Where(x => x.q.Format == format);
        if (Term(difficulty) is not null) query = query.Where(x => x.q.Difficulty == difficulty);
        if (Term(level) is not null) query = query.Where(x => x.q.Level == level);
        if (Term(technology) is not null) query = query.Where(x => x.q.Technology == technology);
        if (bookmarked is true) query = query.Where(x => x.s != null && x.s.Bookmarked);
        if (due is true) query = query.Where(x => x.s != null && x.s.Due != null && x.s.Due <= today);
        query = status switch
        {
            "answered" => query.Where(x => x.s != null && x.s.AnsweredCount > 0),
            "new" => query.Where(x => x.s == null || x.s.AnsweredCount == 0),
            "skipped" => query.Where(x => x.s != null && x.s.LastOutcome == "skipped"),
            _ => query
        };
        var total = await query.CountAsync(ct);
        pageNumber = Math.Min(pageNumber, Math.Max(1, (total + size - 1) / size));
        var items = await query.OrderBy(x => x.q.Title).ThenBy(x => x.q.Slug).Skip((pageNumber - 1) * size).Take(size)
            .Select(x => new { x.q.Data, Card = new QuestionCard(x.q.Slug, x.q.Version, x.q.Title, x.q.Topic, x.q.Format, x.q.Difficulty,
                x.q.Level, x.q.Technology, x.q.Minutes, x.s != null && x.s.Bookmarked, x.s == null ? null : x.s.LastOutcome,
                x.s == null ? null : x.s.Rating, x.s == null ? null : x.s.Due, null) }).ToArrayAsync(ct);
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
        => user.Identity?.IsAuthenticated is true
            ? await db.StudyStates.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == user.Id() && x.Slug == slug, ct)
            : null;

    public static QuestionContent Content(QuestionVersion q) => DataJson.Read<QuestionContent>(q.Data);
    public static QuestionCard Card(QuestionVersion q, StudyState? s = null)
        => new(q.Slug, q.Version, q.Title, q.Topic, q.Format, q.Difficulty, q.Level, q.Technology, q.Minutes,
            s?.Bookmarked ?? false, s?.LastOutcome, s?.Rating, s?.Due, null);

    public static QuestionResponse View(QuestionVersion q, StudyState? s = null)
    {
        var c = Content(q);
        return new(Card(q, s), c.Subtopic, c.Tags, c.Prompt, c.EnglishPrompt, c.Context, c.Code);
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
        var path = Path.Combine(environment.ContentRootPath, "Content", "questions.json");
        var items = DataJson.Read<SeedQuestion[]>(await File.ReadAllTextAsync(path, ct));
        var existing = (await db.Questions.Select(x => x.Slug).ToArrayAsync(ct)).ToHashSet(StringComparer.Ordinal);
        foreach (var item in items.Where(x => !existing.Contains(x.Slug)))
        {
            Validate(item.Slug, item.Content);
            db.Questions.Add(new QuestionHead { Slug = item.Slug, Latest = 1, Published = 1, Status = "published", Revision = 1 });
            db.QuestionVersions.Add(VersionRow(item.Slug, 1, item.Content));
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task<IResult> AdminDetail(string slug, CancellationToken ct)
    {
        var head = await db.Questions.FindAsync([slug], ct) ?? throw ApiProblem.Missing();
        var version = await Version(slug, head.Latest, ct);
        return TypedResults.Ok(new { head.Slug, head.Latest, head.Published, head.Revision, head.Status, content = Content(version) });
    }

    private async Task<IResult> SaveVersion(string slug, EditQuestionRequest request, CancellationToken ct)
    {
        if (request.Content is null)
            throw ApiProblem.Invalid("Cần nhập nội dung câu hỏi.");
        Validate(slug, request.Content);
        var head = await db.Questions.FindAsync([slug], ct);
        var created = head is null;
        if ((head?.Revision ?? 0) != request.Revision)
            throw ApiProblem.Conflict();
        if (head is null)
        {
            head = new QuestionHead { Slug = slug };
            db.Questions.Add(head);
        }
        head.Latest++;
        head.Revision++;
        head.Status = "draft";
        db.QuestionVersions.Add(VersionRow(slug, head.Latest, request.Content));
        await db.SaveChangesAsync(ct);
        var response = new { head.Slug, head.Latest, head.Published, head.Revision, head.Status };
        return created ? TypedResults.Created($"/api/admin/questions/{slug}", response) : TypedResults.Ok(response);
    }

    private async Task<IResult> Publish(string slug, PublicationRequest request, CancellationToken ct)
    {
        var head = await db.Questions.FindAsync([slug], ct) ?? throw ApiProblem.Missing();
        if (head.Revision != request.Revision)
            throw ApiProblem.Conflict();
        head.Published = request.Status switch
        {
            "published" => head.Latest,
            "retired" => null,
            _ => throw ApiProblem.Invalid("Trạng thái xuất bản không hợp lệ.")
        };
        head.Status = request.Status;
        head.Revision++;
        await db.SaveChangesAsync(ct);
        return await AdminDetail(slug, ct);
    }

    private static void Validate(string slug, QuestionContent c)
    {
        static bool Has(string? value, int max) => !string.IsNullOrWhiteSpace(value) && value.Length <= max;
        static bool List(string[]? values, int min, int max, int length) =>
            values is not null && values.Length >= min && values.Length <= max && values.All(x => Has(x, length));
        if (slug == "new" || slug.Length > 90 || !SlugShape().IsMatch(slug))
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
    }

    [GeneratedRegex(@"^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.CultureInvariant, 100)]
    private static partial Regex SlugShape();

}
