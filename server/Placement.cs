using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

internal sealed record PlacementRequest(Guid Id, string Level);
internal sealed record PlacementCoding(string Slug, int Version, int TestVersion, Guid? Submission = null);
internal sealed record PlacementPlan(string Level, StudyItem[] Items, PlacementCoding? Coding);

internal static class Placement
{
    public static void Map(RouteGroupBuilder api)
    {
        api.MapPost("/placement", async (PlacementRequest request, ClaimsPrincipal user, PracticeDb db, Catalog catalog, ExerciseCatalog exercises,
            TimeProvider clock, CancellationToken ct) => {
            if(request.Id == Guid.Empty || request.Level is not ("intern" or "fresher" or "junior")) throw ApiProblem.Invalid("Chọn mức mục tiêu hợp lệ.");
            var owner = user.Id();
            var old = await db.StudySessions.AsNoTracking().SingleOrDefaultAsync(s => s.Id == request.Id && s.UserId == owner, ct);
            if (old != null) {
                if(old.Mode != "placement" || DataJson.Read<PlacementPlan>(old.Plan).Level != request.Level) throw ApiProblem.Conflict();
                return await StudySessions.View(old, db, ct);
            }
            string[] slugs = request.Level switch {
                "intern" => ["tryparse-zero","integer-division","sql-count-null","value-reference"],
                "fresher" => ["hashset-add-result","linq-any-empty","sql-filter-null-side","invariants"],
                _ => ["interlocked-compareexchange","closure-for","sql-anti-join-null","dispose-ownership"]
            };
            var versions = await catalog.PublishedQuery().Where(q => slugs.Contains(q.Slug)).ToDictionaryAsync(q => q.Slug,ct);
            if(versions.Count != slugs.Length) throw ApiProblem.Conflict("Bộ kiểm tra đang thiếu câu đã xuất bản.");
            var items = slugs.Select(slug => { var q = versions[slug];return new StudyItem(q.Slug,q.Version,q.Title,q.Minutes,q.Topic); }).ToArray();
            var e = exercises.Find(request.Level=="junior"?"debug-api-segments":"overlapping-bookings",null);
            var coding = await exercises.Available(e,ct) ? new PlacementCoding(e.Slug,e.Version,e.TestVersion) : null;
            return await StudySessions.Save(db,new StudySession{Id=request.Id,UserId=owner,Mode="placement",Minutes=items.Sum(i=>i.Minutes)+(coding==null?0:e.Minutes),
                StartedAt=clock.GetUtcNow(),Plan=DataJson.Write(new PlacementPlan(request.Level,items,coding))},ct);
        }).RequireAuthorization();
        api.MapGet("/skills/tree", async (ClaimsPrincipal user, PracticeDb db, Catalog catalog, ExerciseCatalog exercises, TimeProvider clock, CancellationToken ct) => {
            var owner=user.Id();
            await Recall.Expire(db,owner,await Learning.Today(db,owner,clock,ct),ct);
            var states=await db.StudyStates.AsNoTracking().Where(s=>s.UserId==owner).ToDictionaryAsync(s=>s.Slug,ct);
            var rows=await catalog.PublishedQuery().OrderBy(q=>q.Topic).ThenBy(q=>q.Title).ToArrayAsync(ct);
            return catalog.TopicList.Select(t=>new { t.Id,t.Name,t.Check,
                exercise=exercises.Latest.Where(e=>e.Slug==t.Exercise).Select(e=>new{e.Slug,e.Kind,e.Title}).SingleOrDefault(),
                nodes=rows.Where(q=>q.Topic==t.Id).Select(q=>{
                    var card=Catalog.Card(q,states.GetValueOrDefault(q.Slug));
                    return new {q.Slug,q.Title,q.Version,card.Mastery,card.VerifiedDays,card.AiAssessed, prerequisites=Catalog.Content(q).Prerequisites??[]};
                })
            });
        }).RequireAuthorization();
    }

    // The gateway associates a Submit with its originating assessment under the owner's existing learning lock.
    internal static async Task Attach(PracticeDb db, string owner, Guid id, ExerciseContent exercise, Guid job, CancellationToken ct)
    {
        var row=await StudySessions.Locked(db,owner,id,ct);
        if(row.Mode!="placement" || row.EndedAt!=null) throw ApiProblem.Conflict("Bài kiểm tra đầu vào đã đóng hoặc không phù hợp.");
        var plan=DataJson.Read<PlacementPlan>(row.Plan);
        if(plan.Coding is not { } c || c.Slug!=exercise.Slug || c.Version!=exercise.Version || c.TestVersion!=exercise.TestVersion) throw ApiProblem.Invalid("Bài code ngoài phạm vi kiểm tra.");
        row.Plan=DataJson.Write(plan with {Coding=c with {Submission=job}});
    }
}
