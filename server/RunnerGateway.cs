using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

internal sealed record RunRequest(Guid Id, string Action, string Code, string? Input, Guid? PlacementId = null);
internal sealed record RunRow(Guid Id, string Slug, int Version, string Action, string Status, DateTimeOffset At,
    string? Output, string[]? Columns, string?[][]? Rows, int? Passed, int? Total, int? Milliseconds);
internal sealed record RunnerCapabilities(int Protocol, bool Isolated, string[] Kinds, string[]? Exercises=null);
internal sealed record RunPage(RunRow[] Items, int Total);

// Only the isolated worker holds datasets, hidden cases and execution credentials.
internal sealed class RunnerGateway(IHttpClientFactory clients, IConfiguration config, TimeProvider clock)
{
    private readonly Uri? endpoint = Uri.TryCreate(config["Runner:Endpoint"], UriKind.Absolute, out var uri)
        && uri.Scheme == "https" && uri.UserInfo.Length == 0 && uri.Query.Length == 0 && uri.Fragment.Length == 0
        ? new Uri(uri.AbsoluteUri.TrimEnd('/') + "/") : null;
    private readonly string? token = config["Runner:Token"];
    private readonly bool approved = config.GetValue<bool>("Runner:IsolationVerified");
    internal bool Configured => approved && endpoint is not null && !string.IsNullOrWhiteSpace(token);
    private readonly SemaphoreSlim gate = new(1, 1);
    private (DateTimeOffset Until, string[] Kinds, string[]? Exercises) capabilities = (DateTimeOffset.MinValue, [], null);

    private static ApiProblem Offline() => new(503, "runner_unavailable", "Chưa cấu hình môi trường thực thi hoặc worker đang ngoại tuyến.");

    public async Task<bool> Available(string kind, CancellationToken ct, string? exercise=null, bool seed=false)
    {
        if (!Configured) return false;
        await gate.WaitAsync(ct);
        try
        {
            if (clock.GetUtcNow() >= capabilities.Until)
            {
                string[] kinds = [];
                string[]? exercises = null;
                try
                {
                    var caps = await Send<RunnerCapabilities>(HttpMethod.Get, "v1/capabilities", null, ct);
                    if (caps is { Protocol: 1, Isolated: true, Kinds: not null }) { kinds=caps.Kinds; exercises=caps.Exercises; }
                }
                catch (ApiProblem) { /* A failed handshake keeps execution disabled. */ }
                capabilities = (clock.GetUtcNow().AddSeconds(10), kinds, exercises);
            }
            return capabilities.Kinds.Contains(kind) && (exercise == null ||
                (capabilities.Exercises?.Contains(kind + ":" + exercise) ?? seed));
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

    private static string OwnerPath(string owner) => "v1/owners/" + Uri.EscapeDataString(owner) + "/jobs";

    internal static RunRow Public(RunRow row, Guid? requestedId = null)
    {
        if (row is null || row.Id == Guid.Empty || requestedId.HasValue && row.Id != requestedId || row.Status is not ("queued" or "running" or "accepted" or "completed" or "compile_error" or
            "runtime_error" or "wrong_answer" or "timeout" or "memory_limit" or "output_limit" or "cancelled" or "failed") || row.Action is not ("run" or "submit")
            || string.IsNullOrWhiteSpace(row.Slug) || row.Slug.Length > 90 || row.Version < 1 || row.At == default
            || row.Passed < 0 || row.Total < 0 || row.Milliseconds < 0 || row.Passed.HasValue != row.Total.HasValue
            || row.Passed > row.Total || row.Total > 100000 || row.Output?.Length > 65536
            || row.Columns is not null && (row.Columns.Length > 100 || row.Columns.Any(c => c is null || c.Length > 256))
            || row.Rows is not null && (row.Columns is null || row.Rows.Length > 1000 ||
                row.Rows.Any(r => r is null || r.Length != row.Columns.Length || r.Any(v => v?.Length > 8192)))
            || row.Status == "accepted" && (row.Action != "submit" || row.Total is null or 0 || row.Passed != row.Total)
            || row.Status == "wrong_answer" && (row.Action != "submit" || row.Total is null or 0 || row.Passed >= row.Total)
            || row.Status is "queued" or "running" && (row.Passed.HasValue || row.Milliseconds.HasValue || row.Output != null || row.Columns != null || row.Rows != null)
            || row.Status == "completed" && row.Action != "run") throw Offline();
        // Submissions may execute hidden data. Forward only their aggregate verdict.
        return row.Action == "submit" ? row with { Output = null, Columns = null, Rows = null } : row;
    }

    private static bool Final(string status) => status is not ("requested" or "queued" or "running");

    private static async Task<ExerciseSubmission> Owned(PracticeDb db, string owner, Guid id, CancellationToken ct) =>
        await db.ExerciseSubmissions.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == owner && x.Id == id, ct)
            ?? throw ApiProblem.Missing();

    private static async Task<RunRow> Store(PracticeDb db, string owner, RunRow result, TimeProvider clock, CancellationToken ct)
    {
        await using var tx = await db.LockLearning(owner, ct);
        var row = await db.ExerciseSubmissions.SingleOrDefaultAsync(x => x.UserId == owner && x.Id == result.Id, ct) ?? throw ApiProblem.Missing();
        var value = Public(result, row.Id);
        if (value.Slug != row.Slug || value.Version != row.Version || value.Action != row.Action ||
            value.At < row.RequestedAt.AddMinutes(-5) || value.At > clock.GetUtcNow().AddMinutes(5)) throw Offline();
        if (Final(row.Status) && row.Result is not null) return DataJson.Read<RunRow>(row.Result);
        if (row.Status == "running" && value.Status == "queued") throw Offline();
        row.Status = value.Status;
        row.Result = DataJson.Write(value);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return value;
    }

    internal async Task<int> SyncPending(PracticeDb db, int offset, ILogger log, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var jobs = await db.ExerciseSubmissions.AsNoTracking().Where(j => (j.Status == "requested" || j.Status == "queued" || j.Status == "running")
                && j.RequestedAt < now.AddSeconds(-5))
            .OrderBy(j => j.RequestedAt).ThenBy(j => j.Id).Skip(offset).Take(16)
            .Select(j => new { j.Id, j.UserId, j.Slug, j.Version, j.Action, j.RequestedAt }).ToListAsync(ct);
        foreach (var j in jobs)
        {
            try
            {
                RunRow result;
                try { result = await Send<RunRow>(HttpMethod.Get, OwnerPath(j.UserId) + "/" + j.Id, null, ct); }
                catch (ApiProblem p) when (p.Status == 404 && j.RequestedAt < now.AddMinutes(-5))
                {
                    // No worker job after the retry window. Record infrastructure failure without a grading verdict.
                    result = new(j.Id, j.Slug, j.Version, j.Action, "failed", j.RequestedAt, null, null, null, null, null, null);
                }
                await Store(db, j.UserId, Public(result, j.Id), clock, ct);
            }
            catch (ApiProblem p) { log.LogDebug("Job {Id} sync deferred ({Status})", j.Id, p.Status); }
            finally { db.ChangeTracker.Clear(); }
        }
        return jobs.Count == 16 ? offset + jobs.Count : 0;
    }

    public static void Map(RouteGroupBuilder api)
    {
        var owned = api.MapGroup("/runner").RequireAuthorization();
        owned.MapPost("/{slug}/{version:int}/jobs", async (string slug, int version, RunRequest input, ClaimsPrincipal user,
            RunnerGateway gateway, ExerciseCatalog catalog, PracticeDb db, TimeProvider clock, CancellationToken ct) =>
        {
            var e = catalog.Find(slug, version);
            if (input.Id == Guid.Empty || input.Action is not ("run" or "submit") || string.IsNullOrWhiteSpace(input.Code) ||
                input.Code.Length > 32000 || input.Input?.Length > 8000 || (input.Action == "submit" && input.Input is not null))
                throw ApiProblem.Invalid("Kiểm tra mã nguồn, thao tác và đầu vào tùy chỉnh.");
            if (!await catalog.Available(e, ct)) throw Offline();
            if(input.PlacementId != null && input.Action!="submit") throw ApiProblem.Invalid("Chỉ lượt nộp mới gắn với bài kiểm tra đầu vào.");
            var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(DataJson.Write(new { slug, version, input.Action, input.Code, input.Input, e.TestVersion })+input.PlacementId?.ToString("N"))));
            await using (var tx = await db.LockLearning(user.Id(), ct))
            {
                var saved = await db.ExerciseSubmissions.SingleOrDefaultAsync(x => x.Id == input.Id, ct);
                if (saved is not null)
                {
                    if (saved.UserId != user.Id() || saved.RequestHash != hash) throw ApiProblem.Conflict("Mã lượt chạy đã được dùng với nội dung khác.");
                    if (Final(saved.Status) && saved.Result is not null) return DataJson.Read<RunRow>(saved.Result);
                }
                else
                {
                    if(input.PlacementId is { } assessment) await Placement.Attach(db,user.Id(),assessment,e,input.Id,ct);
                    var draft = await db.ExerciseDrafts.FindAsync([user.Id(), slug, version], ct);
                    db.ExerciseSubmissions.Add(new() { Id = input.Id, UserId = user.Id(), Slug = slug, Version = version,
                        TestVersion = e.TestVersion, Action = input.Action, RequestHash = hash, RequestedAt = clock.GetUtcNow(),
                        Assisted = draft?.HintSeen == true || draft?.SolutionSeen == true });
                    await db.SaveChangesAsync(ct);
                }
                await tx.CommitAsync(ct);
            }
            db.ChangeTracker.Clear();
            var row = Public(await gateway.Send<RunRow>(HttpMethod.Put, OwnerPath(user.Id()) + "/" + input.Id,
                new { input.Action, input.Code, input.Input, e.Slug, e.Kind, e.Version, e.TestVersion }, ct));
            if (row.Id != input.Id || row.Slug != slug || row.Version != version || row.Action != input.Action) throw Offline();
            return await Store(db, user.Id(), row, clock, ct);
        }).RequireRateLimiting("runner");
        owned.MapGet("/jobs/{id:guid}", async (Guid id, ClaimsPrincipal user, RunnerGateway gateway, PracticeDb db, TimeProvider clock, CancellationToken ct) =>
        {
            var saved = await Owned(db, user.Id(), id, ct);
            if (Final(saved.Status) && saved.Result is not null) return DataJson.Read<RunRow>(saved.Result);
            return await Store(db, user.Id(), Public(await gateway.Send<RunRow>(HttpMethod.Get, OwnerPath(user.Id()) + "/" + id, null, ct), id), clock, ct);
        });
        owned.MapDelete("/jobs/{id:guid}", async (Guid id, ClaimsPrincipal user, RunnerGateway gateway, PracticeDb db, TimeProvider clock, CancellationToken ct) =>
        {
            var saved = await Owned(db, user.Id(), id, ct);
            if (Final(saved.Status) && saved.Result is not null) return DataJson.Read<RunRow>(saved.Result);
            return await Store(db, user.Id(), Public(await gateway.Send<RunRow>(HttpMethod.Delete, OwnerPath(user.Id()) + "/" + id, null, ct), id), clock, ct);
        });
        owned.MapGet("/{slug}/{version:int}/jobs", async (string slug, int version, int? page, ClaimsPrincipal user, RunnerGateway gateway,
            ExerciseCatalog catalog, PracticeDb db, CancellationToken ct) =>
        {
            catalog.Find(slug, version);
            var p = Math.Clamp(page ?? 1, 1, 100000);
            var query = db.ExerciseSubmissions.AsNoTracking().Where(x => x.UserId == user.Id() && x.Slug == slug && x.Version == version && x.Result != null);
            var count = await query.CountAsync(ct);
            var results = await query.OrderByDescending(x => x.RequestedAt).ThenBy(x => x.Id).Skip((p - 1) * 10).Take(10).Select(x => x.Result!).ToArrayAsync(ct);
            return new RunPage(results.Select(x => Public(DataJson.Read<RunRow>(x))).ToArray(), count);
        });
    }
}

internal sealed class RunnerSync(RunnerGateway gateway, IServiceScopeFactory scopes, ILogger<RunnerSync> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!gateway.Configured) return;
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
        var offset = 0;
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await using var scope = scopes.CreateAsyncScope();
            try { offset = await gateway.SyncPending(scope.ServiceProvider.GetRequiredService<PracticeDb>(), offset, log, stoppingToken); }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            { log.LogWarning(ex, "Could not reconcile pending exercise jobs"); }
        }
    }
}
