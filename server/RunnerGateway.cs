using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;

namespace InterviewPractice;

internal sealed record RunRequest(Guid Id, string Action, string Code, string? Input);
internal sealed record RunRow(Guid Id, string Slug, int Version, string Action, string Status, DateTimeOffset At,
    string? Output, string[]? Columns, string?[][]? Rows, int? Passed, int? Total, int? Milliseconds);
internal sealed record RunnerCapabilities(int Protocol, bool Isolated, string[] Kinds);
internal sealed record RunPage(RunRow[] Items, int Total);

// Only the isolated worker holds datasets, hidden cases and execution credentials.
internal sealed class RunnerGateway(IHttpClientFactory clients, IConfiguration config, TimeProvider clock)
{
    private readonly Uri? endpoint = Uri.TryCreate(config["Runner:Endpoint"], UriKind.Absolute, out var uri)
        && uri.Scheme == "https" && uri.UserInfo.Length == 0 && uri.Query.Length == 0 && uri.Fragment.Length == 0
        ? new Uri(uri.AbsoluteUri.TrimEnd('/') + "/") : null;
    private readonly string? token = config["Runner:Token"];
    private readonly bool approved = config.GetValue<bool>("Runner:IsolationVerified");
    private readonly SemaphoreSlim gate = new(1, 1);
    private (DateTimeOffset Until, string[] Kinds) capabilities = (DateTimeOffset.MinValue, []);

    private static ApiProblem Offline() => new(503, "runner_unavailable", "Chưa cấu hình môi trường thực thi hoặc worker đang ngoại tuyến.");

    public async Task<bool> Available(string kind, CancellationToken ct)
    {
        if (!approved || endpoint is null || string.IsNullOrWhiteSpace(token)) return false;
        await gate.WaitAsync(ct);
        try
        {
            if (clock.GetUtcNow() >= capabilities.Until)
            {
                string[] kinds = [];
                try
                {
                    var caps = await Send<RunnerCapabilities>(HttpMethod.Get, "v1/capabilities", null, ct);
                    if (caps is { Protocol: 1, Isolated: true, Kinds: not null }) kinds = caps.Kinds;
                }
                catch (ApiProblem) { /* A failed handshake keeps execution disabled. */ }
                capabilities = (clock.GetUtcNow().AddSeconds(10), kinds);
            }
            return capabilities.Kinds.Contains(kind);
        }
        finally { gate.Release(); }
    }

    private async Task<T> Send<T>(HttpMethod method, string path, object? body, CancellationToken ct)
    {
        if (!approved || endpoint is null || string.IsNullOrWhiteSpace(token)) throw Offline();
        using var http = clients.CreateClient("runner");
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
        deadline.CancelAfter(TimeSpan.FromSeconds(4));
        using var req = new HttpRequestMessage(method, new Uri(endpoint, path));
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body is not null) req.Content = JsonContent.Create(body);
        try
        {
            using var res = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
            if (res.StatusCode == HttpStatusCode.NotFound) throw ApiProblem.Missing();
            if (res.StatusCode == HttpStatusCode.Conflict) throw ApiProblem.Conflict();
            if (res.StatusCode == HttpStatusCode.TooManyRequests) throw new ApiProblem(429, "runner_quota", "Worker đã đạt giới hạn lượt chạy.");
            if (!res.IsSuccessStatusCode) throw Offline();
            await res.Content.LoadIntoBufferAsync(256 * 1024, deadline.Token);
            return await res.Content.ReadFromJsonAsync<T>(cancellationToken: deadline.Token) ?? throw Offline();
        }
        catch (Exception ex) when (!ct.IsCancellationRequested && ex is HttpRequestException or OperationCanceledException or JsonException) { throw Offline(); }
    }

    private static string OwnerPath(ClaimsPrincipal user) => "v1/owners/" + Uri.EscapeDataString(user.Id()) + "/jobs";

    internal static RunRow Public(RunRow row, Guid? requestedId = null)
    {
        if (row is null || row.Id == Guid.Empty || requestedId.HasValue && row.Id != requestedId || row.Status is not ("queued" or "running" or "accepted" or "completed" or "compile_error" or
            "runtime_error" or "wrong_answer" or "timeout" or "cancelled" or "failed") || row.Action is not ("run" or "submit")) throw Offline();
        // Submissions may execute hidden data. Forward only their aggregate verdict.
        return row.Action == "submit" ? row with { Output = null, Columns = null, Rows = null } : row;
    }

    public static void Map(RouteGroupBuilder api)
    {
        var owned = api.MapGroup("/runner").RequireAuthorization();
        owned.MapPost("/{slug}/{version:int}/jobs", async (string slug, int version, RunRequest input, ClaimsPrincipal user,
            RunnerGateway gateway, ExerciseCatalog catalog, CancellationToken ct) =>
        {
            var e = catalog.Find(slug, version);
            if (input.Id == Guid.Empty || input.Action is not ("run" or "submit") || string.IsNullOrWhiteSpace(input.Code) ||
                input.Code.Length > 32000 || input.Input?.Length > 8000 || (input.Action == "submit" && input.Input is not null))
                throw ApiProblem.Invalid("Kiểm tra mã nguồn, thao tác và đầu vào tùy chỉnh.");
            if (!await gateway.Available(e.Kind, ct)) throw Offline();
            var row = Public(await gateway.Send<RunRow>(HttpMethod.Put, OwnerPath(user) + "/" + input.Id,
                new { input.Action, input.Code, input.Input, e.Slug, e.Kind, e.Version, e.TestVersion }, ct));
            if (row.Id != input.Id || row.Slug != slug || row.Version != version || row.Action != input.Action) throw Offline();
            return row;
        }).RequireRateLimiting("runner");
        owned.MapGet("/jobs/{id:guid}", async (Guid id, ClaimsPrincipal user, RunnerGateway gateway, CancellationToken ct) =>
            Public(await gateway.Send<RunRow>(HttpMethod.Get, OwnerPath(user) + "/" + id, null, ct), id));
        owned.MapDelete("/jobs/{id:guid}", async (Guid id, ClaimsPrincipal user, RunnerGateway gateway, CancellationToken ct) =>
            Public(await gateway.Send<RunRow>(HttpMethod.Delete, OwnerPath(user) + "/" + id, null, ct), id));
        owned.MapGet("/{slug}/{version:int}/jobs", async (string slug, int version, int? page, ClaimsPrincipal user, RunnerGateway gateway,
            ExerciseCatalog catalog, CancellationToken ct) =>
        {
            var e = catalog.Find(slug, version);
            if (!await gateway.Available(e.Kind, ct)) throw Offline();
            var p = Math.Clamp(page ?? 1, 1, 100000);
            var rows = await gateway.Send<RunPage>(HttpMethod.Get, OwnerPath(user) + $"?slug={Uri.EscapeDataString(slug)}&version={version}&page={p}&pageSize=10", null, ct);
            if (rows.Items is null || rows.Items.Length > 10 || rows.Total < 0 || rows.Items.Any(r => r is null || r.Slug != slug || r.Version != version)) throw Offline();
            return new RunPage(rows.Items.Select(r => Public(r)).ToArray(), rows.Total);
        });
    }
}
