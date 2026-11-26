using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;

namespace InterviewPractice;

/// <summary>Thông tin tạo tài khoản học viên.</summary>
internal sealed record RegisterRequest(
    [Required, StringLength(60, MinimumLength = 2)] string DisplayName,
    [Required, EmailAddress, StringLength(254)] string Email,
    [Required, StringLength(128, MinimumLength = 12)] string Password);

/// <summary>Thông tin đăng nhập.</summary>
internal sealed record LoginRequest(
    [Required, EmailAddress, StringLength(254)] string Email,
    [Required, StringLength(128)] string Password);

/// <summary>Người học hiện tại và quyền biên tập.</summary>
internal sealed record LearnerResponse(string Id, string DisplayName, string Email, bool Admin);

internal static class Auth
{
    public const string Admin = "ContentAdmin";

    public static void Map(RouteGroupBuilder api)
    {
        var auth = api.MapGroup("/auth");
        auth.MapGet("/me", async (ClaimsPrincipal user, UserManager<Learner> users) =>
        {
            var learner = await users.GetUserAsync(user);
            return Results.Ok(new { user = learner is null ? null : View(learner, user.IsInRole(Admin)) });
        }).WithSummary("Đọc trạng thái đăng nhập.");
        auth.MapGet("/csrf", (HttpContext http, IAntiforgery antiforgery) =>
            TypedResults.Ok(new { token = antiforgery.GetAndStoreTokens(http).RequestToken }))
            .WithSummary("Lấy token cho thao tác ghi.");
        auth.MapPost("/register", async (RegisterRequest request, UserManager<Learner> users, SignInManager<Learner> signIn) =>
        {
            var email = request.Email.Trim();
            var name = request.DisplayName.Trim();
            if (name.Length < 2)
                throw ApiProblem.Invalid("Tên hiển thị cần ít nhất hai ký tự.");
            var learner = new Learner { Email = email, UserName = email, DisplayName = name };
            var created = await users.CreateAsync(learner, request.Password);
            if (!created.Succeeded)
                throw ApiProblem.Invalid("Không tạo được tài khoản. Kiểm tra địa chỉ email và độ dài mật khẩu, hoặc đăng nhập nếu đã có tài khoản.");
            await signIn.SignInAsync(learner, isPersistent: false);
            return TypedResults.Created("/api/auth/me", View(learner, false));
        }).RequireRateLimiting("auth").WithSummary("Tạo tài khoản và đăng nhập.");
        auth.MapPost("/login", async (LoginRequest request, UserManager<Learner> users, SignInManager<Learner> signIn) =>
        {
            var learner = await users.FindByEmailAsync(request.Email.Trim());
            if (learner is null || !(await signIn.PasswordSignInAsync(learner, request.Password, false, lockoutOnFailure: true)).Succeeded)
                throw new ApiProblem(401, "credentials", "Email hoặc mật khẩu chưa đúng, hoặc tài khoản đang tạm khóa.");
            return TypedResults.Ok(View(learner, await users.IsInRoleAsync(learner, Admin)));
        }).RequireRateLimiting("auth").WithSummary("Đăng nhập bằng ASP.NET Core Identity.");
        auth.MapPost("/logout", async (SignInManager<Learner> signIn) =>
        {
            await signIn.SignOutAsync();
            return TypedResults.NoContent();
        }).RequireAuthorization().WithSummary("Đăng xuất.");
    }

    internal static LearnerResponse View(Learner user, bool admin) => new(user.Id, user.DisplayName, user.Email!, admin);

    public static async Task SeedAdmin(IServiceProvider services, IConfiguration configuration)
    {
        var email = configuration["Admin:Email"]?.Trim();
        var password = configuration["Admin:Password"];
        if (string.IsNullOrWhiteSpace(email) && string.IsNullOrEmpty(password))
            return;
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrEmpty(password))
            throw new InvalidOperationException("Cần khai báo cả Admin:Email và Admin:Password.");
        var users = services.GetRequiredService<UserManager<Learner>>();
        var roles = services.GetRequiredService<RoleManager<IdentityRole>>();
        var existing = await users.FindByEmailAsync(email);
        if (existing is not null)
        {
            if (!await users.IsInRoleAsync(existing, Admin))
                throw new InvalidOperationException("Email admin đang thuộc tài khoản có sẵn. Hãy chọn một email riêng để khởi tạo admin.");
            return;
        }
        if (!await roles.RoleExistsAsync(Admin) && !(await roles.CreateAsync(new IdentityRole(Admin))).Succeeded)
            throw new InvalidOperationException("Không tạo được quyền quản trị nội dung.");
        var db = services.GetRequiredService<PracticeDb>();
        await using var tx = await db.Database.BeginTransactionAsync();
        var user = new Learner { UserName = email, Email = email, DisplayName = "Biên tập nội dung" };
        if (!(await users.CreateAsync(user, password)).Succeeded || !(await users.AddToRoleAsync(user, Admin)).Succeeded)
            throw new InvalidOperationException("Không tạo được admin. Kiểm tra email và mật khẩu tối thiểu 12 ký tự.");
        await tx.CommitAsync();
    }
}
