using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

internal sealed record ReviewCase(string Slug, int Version, string Title, string File, string Context, string[] Diff,
    int[] Lines, string Severity, string Cause, string OtherCause, string Repair, string OtherRepair, string Check);
internal sealed record ReviewInput(Guid Id, int Line, string Severity, string Cause, string Repair, string Comment, string Suggestion);

internal sealed class CodeReviews(IWebHostEnvironment env)
{
    private readonly ReviewCase[] cases = DataJson.Read<ReviewCase[]>(File.ReadAllText(Path.Combine(env.ContentRootPath,"Content","code-reviews.json")));
    private ReviewCase Find(string slug, int version) => cases.SingleOrDefault(c => c.Slug == slug && c.Version == version) ?? throw ApiProblem.Missing();
    private static string[] Choices(string a, string b) => [.. new[]{a,b}.Order(StringComparer.Ordinal)];
    private static object Result(ReviewCase c, ReviewInput a) => new { input = a, located = c.Lines.Contains(a.Line),
        severityMatches = a.Severity == c.Severity, causeMatches = a.Cause == c.Cause, repairMatches = a.Repair == c.Repair,
        c.Lines, c.Severity, c.Cause, c.Repair, c.Check };

    internal static void Map(RouteGroupBuilder api)
    {
        var group = api.MapGroup("/labs/reviews").RequireAuthorization();
        group.MapGet("", (CodeReviews service) => service.cases.GroupBy(c => c.Slug).Select(g => g.MaxBy(c => c.Version)!)
            .Select(c => new { c.Slug, c.Version, c.Title, c.File }));
        group.MapGet("/{slug}/{version:int}", async (string slug, int version, ClaimsPrincipal user, CodeReviews service, PracticeDb db, CancellationToken ct) => {
            var c = service.Find(slug, version);
            var history = await db.ReviewComments.AsNoTracking().Where(r => r.UserId == user.Id() && r.Slug == slug && r.Version == version)
                .OrderByDescending(r => r.At).ThenByDescending(r => r.Id).Take(10).Select(r => r.Answer).ToListAsync(ct);
            return new { c.Slug, c.Version, c.Title, c.File, c.Context, c.Diff, causes = Choices(c.Cause,c.OtherCause),
                repairs = Choices(c.Repair,c.OtherRepair), history = history.Select(s => Result(c,DataJson.Read<ReviewInput>(s))) };
        });
        group.MapPost("/{slug}/{version:int}", async (string slug, int version, ReviewInput input, ClaimsPrincipal user, CodeReviews service, PracticeDb db, TimeProvider clock, CancellationToken ct) => {
            var c = service.Find(slug, version);
            if (input.Id == Guid.Empty || input.Line < 1 || input.Line > c.Diff.Count(l => !l.StartsWith('-'))
                || input.Severity is not ("moderate" or "major" or "critical") || !Choices(c.Cause,c.OtherCause).Contains(input.Cause)
                || !Choices(c.Repair,c.OtherRepair).Contains(input.Repair) || string.IsNullOrWhiteSpace(input.Comment) || input.Comment.Length > 2000
                || string.IsNullOrWhiteSpace(input.Suggestion) || input.Suggestion.Length > 2000) throw ApiProblem.Invalid("Hãy chọn dòng, mức độ, nguyên nhân, cách sửa và viết nhận xét.");
            var owner = user.Id();
            var json = DataJson.Write(input);
            await using var tx = await db.LockLearning(owner, ct);
            var old = await db.ReviewComments.FindAsync([input.Id],ct);
            if (old == null) db.ReviewComments.Add(new(){Id=input.Id,UserId=owner,Slug=slug,Version=version,At=clock.GetUtcNow(),Answer=json});
            else if (old.UserId != owner || old.Answer != json || old.Slug != slug || old.Version != version) throw ApiProblem.Conflict();
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Result(c,input);
        });
    }
}
