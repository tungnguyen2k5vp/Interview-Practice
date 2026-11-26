using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

/// <summary>Ví dụ hoặc trường hợp kiểm tra công khai.</summary>
internal sealed record Example(string Input, string Output, string Explanation);

/// <summary>Phiên bản bài tập, thông số runtime và tài liệu đối chiếu.</summary>
internal sealed record ExerciseContent(
    string Slug, string Kind, string Title, string Difficulty, string Topic, string[] Tags, int Version, int TestVersion, string Runtime, int Minutes,
    string Description, string Input, string Output, string[] Constraints, Example[] Examples, Example[] Tests,
    string Starter, string Hint, string Solution, string Explanation, string Complexity, string? Schema, string? Dataset, string? Expected, bool? Ordered);

/// <summary>Tóm tắt bài tập và bản nháp cá nhân.</summary>
internal sealed record ExerciseCard(string Slug, string Kind, string Title, string Difficulty, string Topic, string[] Tags,
    int Version, string Runtime, int Minutes, bool HasDraft, bool Reviewed);

/// <summary>Mã đã lưu cho một phiên bản bài và trạng thái tự đối chiếu.</summary>
internal sealed record ExerciseDraftResponse(int Revision, string Text, DateTimeOffset SavedAt, bool HintSeen, bool SolutionSeen, bool Reviewed);

/// <summary>Dữ liệu dùng trong không gian làm bài coding hoặc SQL.</summary>
internal sealed record ExerciseResponse(ExerciseCard Card, int TestVersion, string Description, string Input, string Output,
    string[] Constraints, Example[] Examples, Example[] Tests, string Starter, string? Schema, string? Dataset, string? Expected, bool? Ordered,
    string? Hint, ExerciseReference? Reference, ExerciseDraftResponse? Draft, int[] SavedVersions, bool RunnerAvailable);

/// <summary>Lời giải và giải thích độ phức tạp.</summary>
internal sealed record ExerciseReference(string Code, string Explanation, string Complexity);

/// <summary>Mã đang viết cùng phiên bản nháp người học đã đọc.</summary>
internal sealed record ExerciseSaveRequest(int Revision, [StringLength(32000)] string Text);

/// <summary>Đường dẫn tới bài luyện độc lập và nhãn tự ghi nhận.</summary>
internal sealed record ExternalLink(string Slug, int Number, string Name, string Difficulty, string[] Tags, string Url, DateOnly CheckedOn);

/// <summary>Trạng thái và ghi chú cá nhân cho một bài ngoài ứng dụng.</summary>
internal sealed record ExternalRequest(string Status, [StringLength(4000)] string Note);

internal sealed class ExerciseCatalog
{
    private readonly ExerciseContent[] _items;
    public ExerciseContent[] Latest { get; }
    public static readonly ExternalLink[] Links =
    [
        new("two-sum", 1, "Two Sum", "easy", ["Hash map", "Array"], "https://leetcode.com/problems/two-sum/", new(2026, 11, 25)),
        new("valid-parentheses", 20, "Valid Parentheses", "easy", ["Stack", "String"], "https://leetcode.com/problems/valid-parentheses/", new(2026, 11, 25)),
        new("binary-search", 704, "Binary Search", "easy", ["Binary search"], "https://leetcode.com/problems/binary-search/", new(2026, 11, 25)),
        new("merge-intervals", 56, "Merge Intervals", "medium", ["Sort", "Intervals"], "https://leetcode.com/problems/merge-intervals/", new(2026, 11, 25))
    ];

    public ExerciseCatalog(IWebHostEnvironment env)
    {
        _items = DataJson.Read<ExerciseContent[]>(File.ReadAllText(Path.Combine(env.ContentRootPath, "Content", "exercises.json")));
        if (_items.Select(x => (x.Slug, x.Version)).Distinct().Count() != _items.Length ||
            _items.Any(x => x.Version < 1 || x.TestVersion < 1 || x.Kind is not ("coding" or "sql")))
            throw new InvalidDataException("Mỗi phiên bản bài tập phải có khóa duy nhất và thông số kiểm thử.");
        Latest = _items.GroupBy(x => x.Slug).Select(x => x.MaxBy(e => e.Version)!).ToArray();
    }

    private ExerciseContent Find(string slug, int? version) =>
        (version is null ? Latest : _items).SingleOrDefault(x => x.Slug == slug && (version is null || x.Version == version))
        ?? throw ApiProblem.Missing("Không tìm thấy phiên bản bài tập.");

    public static ExerciseCard Card(ExerciseContent e, ExerciseDraft? draft) =>
        new(e.Slug, e.Kind, e.Title, e.Difficulty, e.Topic, e.Tags, e.Version, e.Runtime, e.Minutes, draft is not null, draft?.Reviewed ?? false);

    private static ExerciseDraftResponse Draft(ExerciseDraft row) =>
        new(row.Revision, row.Text, row.SavedAt, row.HintSeen, row.SolutionSeen, row.Reviewed);

    private async Task<ExerciseResponse> Open(string slug, int? version, string? owner, PracticeDb db, CancellationToken ct)
    {
        var e = Find(slug, version);
        var drafts = owner is null ? [] : await db.ExerciseDrafts.AsNoTracking().Where(x => x.UserId == owner && x.Slug == slug).ToArrayAsync(ct);
        var draft = drafts.SingleOrDefault(x => x.Version == e.Version);
        return new(Card(e, draft), e.TestVersion, e.Description, e.Input, e.Output, e.Constraints, e.Examples, e.Tests, e.Starter,
            e.Schema, e.Dataset, e.Expected, e.Ordered, draft?.HintSeen is true ? e.Hint : null,
            draft?.SolutionSeen is true ? new(e.Solution, e.Explanation, e.Complexity) : null, draft is null ? null : Draft(draft),
            drafts.Select(x => x.Version).OrderDescending().ToArray(), false);
    }

    private async Task<ExerciseDraftResponse> Save(string slug, int version, ExerciseSaveRequest request, string owner,
        PracticeDb db, TimeProvider clock, CancellationToken ct)
    {
        if (request.Text is null || request.Text.Length > 32000 || request.Revision < 0)
            throw ApiProblem.Invalid("Mã nháp tối đa 32.000 ký tự.");
        var e = Find(slug, version);
        var row = await db.ExerciseDrafts.FindAsync([owner, slug, version], ct);
        if (row?.Text == request.Text)
            return Draft(row);
        if ((row?.Revision ?? 0) != request.Revision)
            throw ApiProblem.Conflict("Mã nháp đã đổi. Hãy tải bản mới trước khi lưu lại.");
        row ??= AddDraft(db, owner, e);
        row.Text = request.Text;
        row.Reviewed = false;
        row.Revision++;
        row.SavedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return Draft(row);
    }

    private static ExerciseDraft AddDraft(PracticeDb db, string user, ExerciseContent e)
    {
        var row = new ExerciseDraft { UserId = user, Slug = e.Slug, Version = e.Version, Text = e.Starter };
        db.ExerciseDrafts.Add(row);
        return row;
    }

    private async Task<ExerciseResponse> Mark(string slug, int version, string kind, string user, PracticeDb db,
        TimeProvider clock, CancellationToken ct)
    {
        if (kind is not ("hint" or "solution" or "reviewed"))
            throw ApiProblem.Invalid("Thao tác bài tập không hợp lệ.");
        var e = Find(slug, version);
        var row = await db.ExerciseDrafts.FindAsync([user, slug, version], ct);
        if (kind == "reviewed" && (row is null || row.Text == e.Starter || string.IsNullOrWhiteSpace(row.Text)))
            throw ApiProblem.Invalid("Hãy lưu lời giải của bạn trước khi đánh dấu đã đối chiếu.");
        row ??= AddDraft(db, user, e);
        if (kind == "hint") row.HintSeen = true;
        if (kind == "solution") row.SolutionSeen = true;
        if (kind == "reviewed") row.Reviewed = true;
        row.Revision++;
        row.SavedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return await Open(slug, version, user, db, ct);
    }

    public static void Map(RouteGroupBuilder api)
    {
        api.MapGet("/exercises", async (string? kind, ClaimsPrincipal user, ExerciseCatalog catalog, PracticeDb db, CancellationToken ct) =>
        {
            var owner = user.Identity?.IsAuthenticated is true ? user.Id() : null;
            var drafts = owner is null ? [] : await db.ExerciseDrafts.AsNoTracking().Where(x => x.UserId == owner).ToArrayAsync(ct);
            return catalog.Latest.Where(x => kind is null || x.Kind == kind)
                .Select(x => Card(x, drafts.SingleOrDefault(d => d.Slug == x.Slug && d.Version == x.Version)));
        }).WithSummary("Liệt kê bài coding hoặc SQL.");
        api.MapGet("/exercises/{slug}", (string slug, int? version, ClaimsPrincipal user, ExerciseCatalog catalog, PracticeDb db, CancellationToken ct)
            => catalog.Open(slug, version, user.Identity?.IsAuthenticated is true ? user.Id() : null, db, ct))
            .WithSummary("Đọc đề bài, ví dụ, schema và dữ liệu công khai.");
        api.MapPut("/exercises/{slug}/{version:int}/draft", (string slug, int version, ExerciseSaveRequest request, ClaimsPrincipal user,
            ExerciseCatalog catalog, PracticeDb db, TimeProvider clock, CancellationToken ct)
            => catalog.Save(slug, version, request, user.Id(), db, clock, ct)).RequireAuthorization().WithSummary("Lưu mã nháp cho đúng phiên bản.");
        api.MapPost("/exercises/{slug}/{version:int}/marks/{kind}", (string slug, int version, string kind, ClaimsPrincipal user,
            ExerciseCatalog catalog, PracticeDb db, TimeProvider clock, CancellationToken ct)
            => catalog.Mark(slug, version, kind, user.Id(), db, clock, ct)).RequireAuthorization().WithSummary("Mở gợi ý hoặc ghi nhận tự đối chiếu.");
        api.MapGet("/external-practice", async (ClaimsPrincipal user, PracticeDb db, CancellationToken ct) =>
        {
            var owner = user.Identity?.IsAuthenticated is true ? user.Id() : null;
            var rows = owner is null ? [] : await db.ExternalPractice.AsNoTracking().Where(x => x.UserId == owner).ToArrayAsync(ct);
            return Links.Select(link => new { link, record = rows.FirstOrDefault(x => x.Slug == link.Slug) is { } row ? new ExternalRequest(row.Status, row.Note) : null });
        }).WithSummary("Đọc danh sách LeetCode và ghi nhận riêng.");
        api.MapPut("/external-practice/{slug}", async (string slug, ExternalRequest request, ClaimsPrincipal user, PracticeDb db, CancellationToken ct) =>
        {
            if (!Links.Any(x => x.Slug == slug) || request.Status is not ("new" or "working" or "done") || request.Note is null || request.Note.Length > 4000)
                throw ApiProblem.Invalid("Kiểm tra bài, trạng thái và độ dài ghi chú.");
            var owner = user.Id();
            var row = await db.ExternalPractice.FindAsync([owner, slug], ct);
            if (row is null)
            {
                row = new ExternalPractice { UserId = owner, Slug = slug };
                db.ExternalPractice.Add(row);
            }
            row.Status = request.Status;
            row.Note = request.Note;
            await db.SaveChangesAsync(ct);
            return TypedResults.Ok(new ExternalRequest(row.Status, row.Note));
        }).RequireAuthorization().WithSummary("Tự ghi nhận trạng thái bài luyện bên ngoài.");
    }
}
