using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http.Features;

namespace InterviewPractice;

internal sealed record ProjectSource(string Url, string[]? Paths, string? Fingerprint);
internal sealed record ProjectPrompt(string Path, int Line, string Symbol, string Area, string Question, string Check);
internal sealed record ProjectIndex(string Fingerprint, string[] Files, ProjectPrompt[] Questions);

internal static class ProjectInterview
{
    private const int ArchiveLimit = 2 * 1024 * 1024;
    private const int FileLimit = 96 * 1024;
    private static readonly HashSet<string> Extensions = new(StringComparer.OrdinalIgnoreCase) {
        ".cs", ".csproj", ".sln", ".sql", ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".java", ".yml", ".yaml"
    };
    private static readonly HashSet<string> Excluded = new(StringComparer.OrdinalIgnoreCase) {
        "bin", "obj", "dist", "build", "vendor", "node_modules", "coverage", "packages", "secrets", "credentials"
    };
    private static readonly (string Area, string Pattern, string Question, string Check)[] Rules = [
        ("Công nghệ", @"<TargetFrameworks?\b|Microsoft\.NET\.Sdk\.Web\b|createRoot\(", "Vì sao dự án chọn nền tảng này? Khi nào bạn sẽ chọn khác?", "Đặt lựa chọn trong bối cảnh runtime, thư viện phụ thuộc và môi trường triển khai."),
        ("Kiến trúc", @"\b(?:AddScoped|AddSingleton|AddTransient|IRequestHandler|BackgroundService)\b", "Thành phần này chịu trách nhiệm gì và có vòng đời thế nào?", "Mô tả bên gọi, tài nguyên sở hữu và một phương án tổ chức khác."),
        ("Dữ liệu", @"\b(?:DbSet|HasIndex|HasKey|CREATE\s+TABLE|FOREIGN\s+KEY)\b", "Ràng buộc hoặc kiểu truy cập dữ liệu nào ảnh hưởng đến thiết kế này?", "Dẫn một truy vấn hoặc quy tắc toàn vẹn, rồi giải thích đánh đổi khi dữ liệu lớn lên."),
        ("Xác thực và phân quyền", @"\b(?:RequireAuthorization|Authorize|AddAuthentication|AddIdentity|AllowAnonymous)\b", "Danh tính và quyền trên tài nguyên được kiểm tra ở đâu trong luồng này?", "Theo một request từ danh tính đến quyết định cho phép và mô tả một test quyền."),
        ("API", @"\b(?:MapGet|MapPut|MapPost|MapDelete|HttpGet|HttpPost|HttpPatch|HttpDelete|HttpPut)\b", "Hợp đồng của thao tác này là gì khi thành công, thất bại hoặc được gửi lại?", "Liên hệ dữ liệu vào, trạng thái lưu trữ và phản hồi người gọi nhận được."),
        ("Nghiệp vụ", @"\b(?:BeginTransactionAsync|CommitAsync|SaveChangesAsync|ExecuteUpdateAsync|PublishAsync|SendAsync)\b", "Nếu thao tác này bị gián đoạn giữa chừng, trạng thái nào cần được bảo toàn?", "Nêu biên giao dịch hoặc tác dụng phụ, cách đối soát và khi nào được thử lại."),
        ("Mẫu thiết kế", @"\b(?:IOptions|IMediator|IHostedService|IHttpClientFactory|IDistributedCache)\b", "Abstraction ở đây giải quyết yêu cầu nào? Chi phí thay thế là gì?", "Nối interface với một phụ thuộc thật, một lợi ích và một chi phí."),
        ("Kiểm thử", @"\b(?:Fact|Theory|TestMethod|Assert|test|describe)\s*[.(\]]", "Test gần vị trí này quan sát hành vi nào? Trường hợp biên nào đáng thêm?", "Phân biệt setup, hành vi và điều kiện quan sát được của test."),
        ("Triển khai", @"^\s*(?:FROM\s+|uses:\s*|services:\s*$|COPY\s+|ENTRYPOINT\s*)", "Thay đổi ở bước này ảnh hưởng thế nào tới build, phát hành và rollback?", "Giải thích artifact, cấu hình lúc chạy và cách nhận biết bản phát hành lỗi."),
        ("Phân chia trách nhiệm", @"\b(?:class|interface|record|struct|function|def|func)\s+[A-Za-z_]\w{0,70}", "Vì sao đặt trách nhiệm này ở đây? Khi tải tăng gấp 100 lần, bạn sẽ đo gì trước?", "Nêu đầu vào, phụ thuộc, nút thắt giả định và cách đo kiểm chứng.")
    ];
    private static readonly Regex[] Matchers = Rules.Select(r => new Regex(r.Pattern,
        RegexOptions.CultureInvariant | RegexOptions.NonBacktracking, TimeSpan.FromMilliseconds(80))).ToArray();

    internal static Uri ArchiveUrl(string? value)
    {
        var match = Regex.Match(value ?? "", @"\Ahttps://github\.com/([a-zA-Z0-9][a-zA-Z0-9-]{0,38})/([a-zA-Z0-9_.-]{1,100})/?\z");
        if (!match.Success || match.Groups[2].Value is "." or "..") throw ApiProblem.Invalid("Nhập URL repository công khai dạng https://github.com/owner/repo.");
        var repo = match.Groups[2].Value;
        if (repo.EndsWith(".git", StringComparison.Ordinal)) repo = repo[..^4];
        if (repo is "" or "." or "..") throw ApiProblem.Invalid("Tên repository không hợp lệ.");
        return new($"https://codeload.github.com/{match.Groups[1].Value}/{repo}/zip/HEAD");
    }

    private static async Task<byte[]> ReadBounded(Stream stream, int limit, CancellationToken ct)
    {
        using var result = new MemoryStream();
        var buffer = new byte[8192];
        int read;
        while ((read = await stream.ReadAsync(buffer, ct)) > 0)
        {
            if (result.Length + read > limit) throw ApiProblem.Invalid("Dữ liệu vượt giới hạn kích thước.");
            result.Write(buffer, 0, read);
        }
        return result.ToArray();
    }

    internal static async Task<ProjectIndex> Inspect(byte[] bytes, string[]? paths, string? fingerprint, CancellationToken ct)
    {
        paths ??= [];
        if (paths.Length > 12 || paths.Any(string.IsNullOrWhiteSpace) || paths.Distinct(StringComparer.Ordinal).Count() != paths.Length)
            throw ApiProblem.Invalid("Chọn tối đa 12 tệp khác nhau.");
        if (bytes.Length is < 4 or > ArchiveLimit || bytes[0] != 'P' || bytes[1] != 'K') throw ApiProblem.Invalid("Cần tệp ZIP tối đa 2 MiB.");
        var hash = Convert.ToHexString(SHA256.HashData(bytes));
        if (paths.Length > 0 && fingerprint != hash) throw ApiProblem.Conflict("Nội dung đã đổi. Hãy đọc lại danh sách tệp.");
        try
        {
            using var archive = new ZipArchive(new MemoryStream(bytes), ZipArchiveMode.Read);
            if (archive.Entries.Count > 2000) throw ApiProblem.Invalid("ZIP vượt 2.000 mục.");
            long total = 0;
            var files = new SortedDictionary<string, ZipArchiveEntry>(StringComparer.Ordinal);
            foreach (var entry in archive.Entries)
            {
                var name = entry.FullName.TrimEnd('/');
                var parts = name.Split('/');
                if (name.Length > 300 || name.Any(c => char.IsControl(c) || c is '\\' or ':') ||
                    parts.Any(p => p is "" or "." or "..") || ((entry.ExternalAttributes >> 16) & 0xf000) == 0xa000)
                    throw ApiProblem.Invalid("ZIP có đường dẫn hoặc liên kết không hợp lệ.");
                if (entry.Length > 32 * 1024 * 1024 - total) throw ApiProblem.Invalid("ZIP vượt 32 MiB sau giải nén.");
                total += entry.Length;
                if (entry.Name.Length == 0 || entry.Length is 0 or > FileLimit || parts.Any(p =>
                    (p.StartsWith('.') && p != ".github") || Excluded.Contains(p)) ||
                    parts.Any(p => p.Contains("secret", StringComparison.OrdinalIgnoreCase) || p.Contains("credential", StringComparison.OrdinalIgnoreCase)) ||
                    !(Extensions.Contains(Path.GetExtension(name)) || entry.Name == "Dockerfile")) continue;
                if (!files.TryAdd(name, entry)) throw ApiProblem.Invalid("ZIP có tên tệp trùng.");
            }
            var questions = new List<ProjectPrompt>();
            foreach (var path in paths)
            {
                if (!files.TryGetValue(path, out var entry)) throw ApiProblem.Invalid("Tệp đã chọn ngoài phạm vi.");
                await using var source = entry.Open();
                var data = await ReadBounded(source, FileLimit, ct);
                if (data.Length != entry.Length) throw ApiProblem.Invalid("Kích thước tệp không khớp.");
                var content = new UTF8Encoding(false, true).GetString(data);
                if (content.Any(c => char.IsControl(c) && c is not ('\r' or '\n' or '\t'))) throw ApiProblem.Invalid("Cần mã nguồn văn bản UTF-8.");
                var lines = content.Split('\n');
                var found = new bool[Rules.Length];
                for (var index = 0; index < lines.Length; index++)
                {
                    ct.ThrowIfCancellationRequested();
                    var line = lines[index].TrimStart();
                    if (line.Length is 0 or > 1500 || line.StartsWith("//") || line.StartsWith('#') || line.StartsWith('*')) continue;
                    for (var rule = 0; rule < Rules.Length; rule++)
                    {
                        if (found[rule]) continue;
                        var match = Matchers[rule].Match(line);
                        if (!match.Success) continue;
                        var r = Rules[rule];
                        // Return just the matched code token. Comments, literals, file bodies and archives never go to a provider.
                        questions.Add(new(path, index + 1, match.Value.Trim(), r.Area, r.Question, r.Check));
                        found[rule] = true;
                    }
                }
            }
            return new(hash, [..files.Keys], [..questions]);
        }
        catch (Exception e) when (e is InvalidDataException or DecoderFallbackException or NotSupportedException)
        { throw ApiProblem.Invalid("Không đọc được ZIP hoặc mã nguồn UTF-8 đã chọn."); }
    }

    public static void Map(RouteGroupBuilder api)
    {
        var group = api.MapGroup("/labs/project").RequireAuthorization().RequireRateLimiting("project");
        group.MapPost("/archive", async (HttpContext http, CancellationToken ct) => {
            if (http.Request.ContentType != "application/zip" || http.Request.ContentLength > ArchiveLimit) throw ApiProblem.Invalid("Chọn ZIP tối đa 2 MiB.");
            var size = http.Features.Get<IHttpMaxRequestBodySizeFeature>();
            if (size is {IsReadOnly:false}) size.MaxRequestBodySize = ArchiveLimit;
            return await Inspect(await ReadBounded(http.Request.Body, ArchiveLimit, ct), http.Request.Query["path"].OfType<string>().ToArray(), http.Request.Query["fingerprint"], ct);
        });
        group.MapPost("/github", async (ProjectSource input, IHttpClientFactory clients, CancellationToken ct) => {
            var url = ArchiveUrl(input.Url);
            using var http = clients.CreateClient("public-github");
            using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
            deadline.CancelAfter(TimeSpan.FromSeconds(15));
            try
            {
                using var response = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
                if (!response.IsSuccessStatusCode) throw new ApiProblem(422, "repository_unavailable", "Chưa đọc được repository công khai. Kiểm tra URL hoặc chọn tệp ZIP.");
                if (response.Content.Headers.ContentLength > ArchiveLimit) throw ApiProblem.Invalid("Repository vượt 2 MiB. Hãy đóng ZIP riêng thư mục cần luyện.");
                await using var stream = await response.Content.ReadAsStreamAsync(deadline.Token);
                return await Inspect(await ReadBounded(stream, ArchiveLimit, deadline.Token), input.Paths, input.Fingerprint, deadline.Token);
            }
            catch (Exception e) when (!ct.IsCancellationRequested && e is HttpRequestException or OperationCanceledException)
            { throw new ApiProblem(503, "github_unavailable", "GitHub chưa phản hồi. Bạn có thể tải ZIP từ máy."); }
        });
    }
}
