using System.Security.Claims;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using InterviewPractice;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography.X509Certificates;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(x => x.Limits.MaxRequestBodySize = 256 * 1024);
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddProblemDetails(x => x.CustomizeProblemDetails = context =>
    context.ProblemDetails.Extensions["correlationId"] = context.HttpContext.TraceIdentifier);
builder.Services.AddExceptionHandler<ApiErrors>();
builder.Services.AddValidation();
builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(x =>
{
    x.SerializerOptions.PropertyNameCaseInsensitive = false;
    x.SerializerOptions.AllowDuplicateProperties = false;
    x.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});
var connection = builder.Configuration.GetConnectionString("Practice");
builder.Services.AddDbContext<PracticeDb>(x => x.UseSqlServer(connection
    ?? throw new InvalidOperationException("Thiếu ConnectionStrings:Practice.")));
builder.Services.AddIdentity<Learner, IdentityRole>(x =>
{
    x.User.RequireUniqueEmail = true;
    x.Password.RequiredLength = 12;
    x.Password.RequireDigit = false;
    x.Password.RequireUppercase = false;
    x.Password.RequireNonAlphanumeric = false;
    x.Password.RequireLowercase = false;
    x.Lockout.MaxFailedAccessAttempts = 6;
}).AddEntityFrameworkStores<PracticeDb>();
builder.Services.AddAuthorization();
builder.Services.ConfigureApplicationCookie(x =>
{
    x.Cookie.Name = "InterviewPractice.Session";
    x.Cookie.HttpOnly = true;
    x.Cookie.SameSite = SameSiteMode.Lax;
    x.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    x.ExpireTimeSpan = TimeSpan.FromHours(12);
    x.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
    x.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
});
builder.Services.AddAntiforgery(x =>
{
    x.HeaderName = "X-CSRF-Token";
    x.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
});
builder.Services.AddRateLimiter(x =>
{
    x.RejectionStatusCode = 429;
    x.AddPolicy("auth", http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "local",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 24, Window = TimeSpan.FromMinutes(1) }));
    x.AddPolicy("ai", http => RateLimitPartition.GetFixedWindowLimiter(
        http.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "guest",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 6, Window = TimeSpan.FromHours(1) }));
    x.AddPolicy("runner", http => RateLimitPartition.GetFixedWindowLimiter(
        http.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "guest",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});
builder.Services.AddHttpClient("runner").ConfigurePrimaryHttpMessageHandler(() =>
{
    var handler = new SocketsHttpHandler { AllowAutoRedirect = false };
    if (builder.Configuration["Runner:CaFile"] is { Length: > 0 } caFile)
    {
        handler.SslOptions.CertificateChainPolicy = new X509ChainPolicy { TrustMode = X509ChainTrustMode.CustomRootTrust };
        handler.SslOptions.CertificateChainPolicy.CustomTrustStore.Add(X509Certificate2.CreateFromPem(File.ReadAllText(caFile)));
    }
    return handler;
});
builder.Services.AddSingleton<RunnerGateway>();
builder.Services.AddHostedService<RunnerSync>();
builder.Services.AddSingleton<ExerciseCatalog>();
builder.Services.AddSingleton<KnowledgeChecks>();
builder.Services.AddScoped<Catalog>();
builder.Services.AddScoped<Practice>();
builder.Services.AddScoped<Interviews>();
builder.Services.AddScoped<Learning>();
builder.Services.AddSingleton(AiOptions.From(builder.Configuration, builder.Environment));
builder.Services.AddScoped<AiFeedback>();
builder.Services.AddSingleton(PartitionedRateLimiter.Create<string, string>(owner => RateLimitPartition.GetFixedWindowLimiter(owner,
    _ => new FixedWindowRateLimiterOptions { PermitLimit = 6, Window = TimeSpan.FromHours(1) })));
builder.Services.AddHttpClient<AiProvider>().ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });

var app = builder.Build();
app.UseExceptionHandler();
app.UseStatusCodePages();
if (!app.Environment.IsDevelopment())
    app.UseHsts();
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    if (!app.Environment.IsDevelopment())
        context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        if (!string.Equals(context.Request.Path.Value, "/api/auth/csrf", StringComparison.OrdinalIgnoreCase))
            context.Response.Headers.CacheControl = "no-store";
        context.Response.Headers["X-Correlation-Id"] = context.TraceIdentifier;
    }
    await next();
});
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

var api = app.MapGroup("/api").AddEndpointFilter(async (context, next) =>
{
    var http = context.HttpContext;
    if (!HttpMethods.IsGet(http.Request.Method) && !HttpMethods.IsHead(http.Request.Method))
    {
        try { await http.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(http); }
        catch (AntiforgeryValidationException)
        {
            throw new ApiProblem(400, "csrf", "Phiên bảo mật đã thay đổi. Hãy tải lại hoặc đăng nhập lại.");
        }
    }
    return await next(context);
});
Auth.Map(api);
Catalog.Map(api);
Practice.Map(api);
KnowledgeChecks.Map(api);
StudySessions.Map(api);
Learning.Map(api);
Interviews.Map(api);
ExerciseCatalog.Map(api);
RunnerGateway.Map(api);
AiFeedback.Map(api);
api.MapGet("/health", () => TypedResults.Ok(new { status = "ok" })).WithSummary("Kiểm tra ứng dụng đang phục vụ.");
api.MapGet("/health/ready", async (PracticeDb db, CancellationToken ct) =>
    await db.Database.CanConnectAsync(ct) ? Results.Ok(new { status = "ready" }) : Results.StatusCode(503))
    .WithSummary("Kiểm tra kết nối SQL cho readiness probe.");
api.Map("/{**path}", () => TypedResults.NotFound()).ExcludeFromDescription();
if (app.Environment.IsDevelopment())
    app.MapOpenApi();
if (Directory.Exists(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot")))
    app.MapFallbackToFile("index.html");

await using (var scope = app.Services.CreateAsyncScope())
{
    var services = scope.ServiceProvider;
    var db = services.GetRequiredService<PracticeDb>();
    if (app.Environment.IsDevelopment() || args.Contains("--migrate-and-seed"))
        await db.Database.MigrateAsync();
    var catalog = services.GetRequiredService<Catalog>();
    await catalog.SeedAsync(app.Lifetime.ApplicationStopping);
    await catalog.ReconcileLegacyReviews(app.Lifetime.ApplicationStopping);
    if (app.Environment.IsDevelopment())
        await Auth.SeedAdmin(services, app.Configuration);
}
_ = app.Services.GetRequiredService<ExerciseCatalog>();
if (!args.Contains("--migrate-and-seed"))
    await app.RunAsync();

internal sealed class ApiProblem(int status, string code, string message) : Exception(message)
{
    public int Status => status;
    public string Code => code;
    public static ApiProblem Invalid(string message) => new(400, "validation", message);
    public static ApiProblem Missing(string message = "Không tìm thấy dữ liệu.") => new(404, "not_found", message);
    public static ApiProblem Conflict(string message = "Dữ liệu đã đổi ở phiên khác. Hãy tải bản mới rồi thử lại.")
        => new(409, "conflict", message);
}

internal sealed class ApiErrors(IProblemDetailsService problems, ILogger<ApiErrors> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception exception, CancellationToken ct)
    {
        if (http.RequestAborted.IsCancellationRequested)
        {
            http.Response.StatusCode = StatusCodes.Status499ClientClosedRequest;
            return true;
        }
        var error = exception switch
        {
            ApiProblem problem => problem,
            DbUpdateConcurrencyException => ApiProblem.Conflict(),
            DbUpdateException { InnerException: SqlException { Number: 2601 or 2627 } } => ApiProblem.Conflict(),
            BadHttpRequestException bad => new ApiProblem(bad.StatusCode, "invalid_request", "Không đọc được dữ liệu gửi lên."),
            _ => new ApiProblem(500, "server_error", "Máy chủ gặp lỗi. Hãy thử lại và dùng mã tham chiếu nếu lỗi tiếp diễn.")
        };
        if (error.Status >= 500)
            logger.LogError(exception, "Lỗi API {CorrelationId}", http.TraceIdentifier);
        http.Response.StatusCode = error.Status;
        return await problems.TryWriteAsync(new()
        {
            HttpContext = http,
            ProblemDetails = new ProblemDetails { Status = error.Status, Title = error.Message, Extensions = { ["code"] = error.Code } }
        });
    }
}

internal static class RequestUser
{
    public static string Id(this ClaimsPrincipal user) => user.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new ApiProblem(401, "sign_in", "Hãy đăng nhập lại để tiếp tục.");
}
