using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

internal sealed class MaterialVersion
{
    public string Kind { get; init; } = "";
    public string Slug { get; init; } = "";
    public int Version { get; init; }
    public string Body { get; init; } = "";
    public DateTimeOffset? PublishedAt { get; set; }
}
internal sealed class EditorialEvent
{
    public long Id { get; init; }
    public DateTimeOffset At { get; init; }
    public string Actor { get; init; } = "";
    public string Action { get; init; } = "";
    public string Kind { get; init; } = "";
    public string Slug { get; init; } = "";
    public int Version { get; init; }
}
internal sealed record DesignScenario(string Slug, int Version, string Title, string Brief, string[] Requirements, string[] Rubric);
internal sealed record RoadmapTrack(string Id, string Name, string? Level, int Days, int? Minutes);
internal sealed record MaterialEdit(int Revision, JsonElement Content);
internal sealed record MaterialItem(string Kind, string Slug, int Version, string Title, object Content);

internal sealed class Materials
{
    private readonly MaterialItem[] seeds;
    private MaterialItem[] published;
    private long loaded;
    private readonly SemaphoreSlim refresh = new(1,1);
    internal static readonly string[] Kinds = ["design","review","exercise","preset","topic","track"];
    private static readonly Regex Key = new("^[a-z0-9]+(?:-[a-z0-9]+)*$",RegexOptions.CultureInvariant|RegexOptions.NonBacktracking);
    private static readonly JsonSerializerOptions Strict = new(DataJson.Options) {
        PropertyNameCaseInsensitive=false, AllowDuplicateProperties=false, UnmappedMemberHandling=System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow
    };

    public Materials(IWebHostEnvironment env)
    {
        var dir=Path.Combine(env.ContentRootPath,"Content");
        T Read<T>(string name)=>DataJson.Read<T>(File.ReadAllText(Path.Combine(dir,name)));
        var tables=Read<Dictionary<string,PreviewTable[]>>("sql-preview.json");
        var exercises=Directory.GetFiles(dir,"exercises-batch-*.json").Order(StringComparer.Ordinal).Prepend(Path.Combine(dir,"exercises.json"))
            .SelectMany(f=>DataJson.Read<ExerciseContent[]>(File.ReadAllText(f)));
        RoadmapTrack[] tracks=[new("intern30","Intern .NET · 30 ngày","intern",30,20),new("fresher60","Fresher .NET · 60 ngày","fresher",60,30),
            new("junior90","Junior Backend · 90 ngày","junior",90,45),new("sprint7","Ôn cấp tốc · 7 ngày",null,7,30),
            new("sprint14","Ôn cấp tốc · 14 ngày",null,14,30),new("custom","Lộ trình tùy chỉnh",null,0,null)];
        seeds=[..Read<DesignScenario[]>("system-design.json").Select(x=>new MaterialItem("design",x.Slug,x.Version,x.Title,x)),
            ..Read<ReviewCase[]>("code-reviews.json").Select(x=>new MaterialItem("review",x.Slug,x.Version,x.Title,x)),
            ..exercises.Select(x=>new MaterialItem("exercise",x.Slug,x.Version,x.Title,x with {Tables=tables.GetValueOrDefault($"{x.Slug}@{x.Version}")})),
            ..Catalog.Topics.Select(x=>new MaterialItem("topic",x.Id,1,x.Name,x)),
            ..Interviews.Presets.Select(x=>new MaterialItem("preset",x.Id,1,x.Name,x)),..tracks.Select(x=>new MaterialItem("track",x.Id,1,x.Name,x))];
        if (seeds.DistinctBy(x=>(x.Kind,x.Slug,x.Version)).Count()!=seeds.Length) throw new InvalidDataException("Trùng phiên bản nội dung.");
        published=seeds;
    }
    private MaterialItem[] Items => Volatile.Read(ref published);
    internal T[] Latest<T>(string kind)=>Items.Where(i=>i.Kind==kind).GroupBy(i=>i.Slug).Select(g=>(T)g.MaxBy(i=>i.Version)!.Content).ToArray();
    internal T Find<T>(string kind,string slug,int? version)=> (T)(Items.Where(i=>i.Kind==kind && i.Slug==slug && (version==null || i.Version==version))
        .MaxBy(i=>i.Version)?.Content ?? throw ApiProblem.Missing("Không tìm thấy phiên bản nội dung."));
    internal bool IsSeed(ExerciseContent e)=>seeds.Any(i=>i.Kind=="exercise" && i.Slug==e.Slug && i.Version==e.Version);

    // Published revisions are immutable. Check the SQL watermark so other API instances see a committed release.
    internal async Task Refresh(PracticeDb db,CancellationToken ct)
    {
        var latest=await db.EditorialEvents.Where(e=>e.Action=="release").MaxAsync(e=>(long?)e.Id,ct)??0;
        if(latest<=Interlocked.Read(ref loaded))return;
        await refresh.WaitAsync(ct);
        try {
            if(latest<=loaded)return;
            var rows=await db.Materials.AsNoTracking().Where(r=>r.PublishedAt!=null).ToArrayAsync(ct);
            Volatile.Write(ref published,[..seeds,..rows.Select(r=>Decode(r.Kind,r.Slug,r.Version,r.Body))]);
            Interlocked.Exchange(ref loaded,latest);
        } finally {refresh.Release();}
    }
    private static MaterialItem Decode(string kind,string slug,int version,string body)
    {
        T Read<T>()=>JsonSerializer.Deserialize<T>(body,Strict)??throw ApiProblem.Invalid("Thiếu nội dung JSON.");
        object value=kind switch {"design"=>Read<DesignScenario>(),"review"=>Read<ReviewCase>(),"exercise"=>Read<ExerciseContent>(),
            "preset"=>Read<InterviewPreset>(),"topic"=>Read<TopicInfo>(),"track"=>Read<RoadmapTrack>(),_=>throw ApiProblem.Invalid("Loại nội dung chưa được hỗ trợ.")};
        var title=value switch {DesignScenario s=>s.Title, ReviewCase r=>r.Title, ExerciseContent e=>e.Title,
            InterviewPreset p=>p.Name, TopicInfo t=>t.Name, RoadmapTrack t=>t.Name,_=>""};
        return new(kind,slug,version,title,value);
    }
    internal static void Audit(PracticeDb db,string actor,string action,string kind,string slug,int version,DateTimeOffset at)=>
        db.EditorialEvents.Add(new(){Actor=actor,Action=action,Kind=kind,Slug=slug,Version=version,At=at});

    public static void Map(RouteGroupBuilder api)
    {
        api.MapGet("/design-scenarios",(Materials m)=>m.Items.Where(i=>i.Kind=="design").Select(i=>i.Content));
        api.MapGet("/roadmap-tracks",(Materials m)=>m.Latest<RoadmapTrack>("track"));
        var admin=api.MapGroup("/admin/materials").RequireAuthorization(p=>p.RequireRole(Auth.Admin));
        admin.MapGet("/audit",(PracticeDb db,CancellationToken ct)=>db.EditorialEvents.AsNoTracking().OrderByDescending(e=>e.Id).Take(100).ToListAsync(ct));
        admin.MapGet("/{kind}",async(string kind,Materials m,PracticeDb db,CancellationToken ct)=>{
            if(!Kinds.Contains(kind))throw ApiProblem.Missing();
            var drafts=await db.Materials.AsNoTracking().Where(r=>r.Kind==kind).ToArrayAsync(ct);
            return m.seeds.Where(i=>i.Kind==kind).Concat(drafts.Select(r=>Decode(r.Kind,r.Slug,r.Version,r.Body))).GroupBy(i=>i.Slug)
                .Select(g=>{var last=g.MaxBy(i=>i.Version)!;return new {last.Slug,last.Title,latest=last.Version,
                    published=m.Items.Where(i=>i.Kind==kind && i.Slug==last.Slug).Select(i=>(int?)i.Version).Max()};}).OrderBy(r=>r.Title);
        });
        admin.MapGet("/{kind}/{slug}",async(string kind,string slug,int? version,PracticeDb db,Materials m,CancellationToken ct)=>{
            var versions=await db.Materials.AsNoTracking().Where(r=>r.Kind==kind && r.Slug==slug).OrderByDescending(r=>r.Version).ToArrayAsync(ct);
            var seed=m.seeds.Where(s=>s.Kind==kind && s.Slug==slug);
            var latest=versions.Select(r=>r.Version).Concat(seed.Select(s=>s.Version)).DefaultIfEmpty().Max();
            var v=version??latest;
            var draft=versions.FirstOrDefault(r=>r.Version==v);
            var item=draft!=null?Decode(kind,slug,v,draft.Body):seed.SingleOrDefault(s=>s.Version==v)??throw ApiProblem.Missing();
            return new {item.Kind,item.Slug,item.Version,item.Content,latest,published=draft==null || draft.PublishedAt!=null,
                versions=versions.Select(r=>r.Version).Concat(seed.Select(s=>s.Version)).OrderDescending()};
        });
        admin.MapPut("/{kind}/{slug}",async(string kind,string slug,MaterialEdit input,Materials m,PracticeDb db,ClaimsPrincipal user,TimeProvider clock,CancellationToken ct)=>{
            if(!Kinds.Contains(kind)||slug.Length>90||!Key.IsMatch(slug)||input.Revision<0||input.Content.ValueKind!=JsonValueKind.Object)
                throw ApiProblem.Invalid("Kiểm tra loại nội dung, slug và JSON.");
            await using var tx=await EditLock(db,ct);
            var previous=await m.Last(db,kind,slug,ct);
            if(input.Revision!=previous)throw ApiProblem.Conflict();
            var version=checked(previous+1);
            try {
                var obj=input.Content.Deserialize<JsonObject>(Strict)!;
                var hasVersion=kind is "design" or "exercise" or "review";
                obj[hasVersion?"slug":"id"]=slug;
                if(hasVersion)obj["version"]=version;
                var body=obj.ToJsonString();
                if(body.Length>140000)throw ApiProblem.Invalid("Nội dung tối đa 140.000 ký tự.");
                var item=Decode(kind,slug,version,body);
                await m.Validate(item,db,ct);
                db.Materials.Add(new(){Kind=kind,Slug=slug,Version=version,Body=DataJson.Write(item.Content)});
            } catch(JsonException){throw ApiProblem.Invalid("Dữ liệu không khớp cấu trúc của loại nội dung này.");}
            Audit(db,user.Id(),"draft",kind,slug,version,clock.GetUtcNow());
            await db.SaveChangesAsync(ct);await tx.CommitAsync(ct);
            return new {slug,version};
        });
        admin.MapPost("/{kind}/{slug}/{version:int}/publish",async(string kind,string slug,int version,Materials m,PracticeDb db,ClaimsPrincipal user,TimeProvider clock,CancellationToken ct)=>{
            await using var tx=await EditLock(db,ct);
            var row=await db.Materials.FindAsync([kind,slug,version],ct)??throw ApiProblem.Missing();
            if(version!=await m.Last(db,kind,slug,ct))throw ApiProblem.Conflict();
            if(row.PublishedAt==null){
                await m.Validate(Decode(kind,slug,version,row.Body),db,ct);
                row.PublishedAt=clock.GetUtcNow();
                Audit(db,user.Id(),"release",kind,slug,version,row.PublishedAt.Value);
                await db.SaveChangesAsync(ct);
            }
            await tx.CommitAsync(ct);
            await m.Refresh(db,ct);
            return new {slug,version};
        });
    }
    private async Task<int> Last(PracticeDb db,string kind,string slug,CancellationToken ct)=>
        await db.Materials.Where(r=>r.Kind==kind&&r.Slug==slug).MaxAsync(r=>(int?)r.Version,ct)
        ??seeds.Where(r=>r.Kind==kind&&r.Slug==slug).Select(r=>r.Version).DefaultIfEmpty().Max();
    private static async Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> EditLock(PracticeDb db,CancellationToken ct)
    {
        var tx=await db.Database.BeginTransactionAsync(ct);
        try {
            await db.Database.ExecuteSqlRawAsync("DECLARE @r int; EXEC @r = sp_getapplock @Resource='InterviewPractice.Materials', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000; IF @r<0 THROW 50001,'Content lock unavailable',1;",ct);
            return tx;
        }catch{await tx.DisposeAsync();throw;}
    }
    private async Task Validate(MaterialItem i,PracticeDb db,CancellationToken ct)
    {
        static bool Text(string? s,int max=4000)=>!string.IsNullOrWhiteSpace(s)&&s.Length<=max;
        static bool List(string[]? s,int min,int max)=>s!=null&&s.Length>=min&&s.Length<=max&&s.All(x=>Text(x));
        static bool Examples(Example[]? xs)=>xs is {Length:>=1 and <=40}&&xs.All(x=>x!=null&&x.Input!=null&&x.Input.Length<=8000&&Text(x.Output,8000)&&Text(x.Explanation));
        if(!Text(i.Title,160))throw ApiProblem.Invalid("Cần tiêu đề từ 1 đến 160 ký tự.");
        if (i.Content is ExerciseContent next)
        {
            var previous = await db.Materials.AsNoTracking().Where(r => r.Kind == i.Kind && r.Slug == i.Slug && r.Version < i.Version)
                .OrderByDescending(r => r.Version).Select(r => r.Body).FirstOrDefaultAsync(ct);
            var original = previous != null ? DataJson.Read<ExerciseContent>(previous) :
                seeds.Where(s => s.Kind == i.Kind && s.Slug == i.Slug).MaxBy(s => s.Version)?.Content as ExerciseContent;
            if (original != null && original.Kind != next.Kind)
                throw ApiProblem.Invalid("Mỗi slug bài tập giữ nguyên loại C# hoặc SQL qua các phiên bản.");
        }
        bool valid=i.Content switch {
            DesignScenario s=>Text(s.Brief)&&List(s.Requirements,1,8)&&List(s.Rubric,5,5),
            ReviewCase r=>Text(r.Context)&&Text(r.File,160)&&List(r.Diff,1,100)&&r.Lines is {Length:>0}&&r.Lines.Distinct().Count()==r.Lines.Length
                &&r.Lines.All(l=>l>=1&&l<=r.Diff.Count(line=>!line.StartsWith('-')))&&r.Severity is "moderate" or "major" or "critical"
                &&List([r.Cause,r.OtherCause,r.Repair,r.OtherRepair,r.Check],5,5)&&r.Cause!=r.OtherCause&&r.Repair!=r.OtherRepair,
            ExerciseContent e=> e.Kind is "coding" or "sql" && Catalog.Difficulties.Contains(e.Difficulty)&&Catalog.Topics.Any(t=>t.Id==e.Topic)
                &&e.TestVersion>=1&&e.Minutes is >=1 and <=180&&List(e.Tags,1,15)&&List(e.Constraints,1,30)&&Examples(e.Examples)&&Examples(e.Tests)
                &&List([e.Runtime,e.Description,e.Input,e.Output,e.Hint,e.Explanation,e.Complexity],7,7)&&Text(e.Starter,32000)&&Text(e.Solution,32000)
                &&(e.Kind=="coding"||Text(e.Schema,32000)&&Text(e.Dataset,32000)&&e.Ordered!=null&&e.Tables is {Length:>0 and <=30}
                    &&e.Tables.All(t=>t!=null&&Text(t.Name,150)&&t.Columns is {Length:>0 and <=64}&&t.Columns.All(c=>c!=null&&Text(c.Name,150)&&Text(c.Type,150))
                        &&t.Rows is {Length:<=200}&&t.Rows.All(r=>r!=null&&r.Length==t.Columns.Length))),
            TopicInfo t=>Catalog.Topics.Any(x=>x.Id==t.Id)&&t.Stage is "Nền tảng" or "Ứng dụng" or "Thực tế"&&Text(t.Check)
                &&Latest<ExerciseContent>("exercise").Any(e=>e.Slug==t.Exercise),
            InterviewPreset p=>Text(p.Description)&&List(p.Topics,1,11)&&p.Topics.Distinct().Count()==p.Topics.Length
                &&p.Topics.All(k=>Catalog.Topics.Any(t=>t.Id==k))&&List(p.Suggested,1,24)&&p.Suggested.Distinct().Count()==p.Suggested.Length
                &&await (from h in db.Questions join q in db.QuestionVersions on new{h.Slug,Version=h.Published} equals new{q.Slug,Version=(int?)q.Version}
                   where p.Suggested.Contains(q.Slug)&&p.Topics.Contains(q.Topic) select q.Slug).CountAsync(ct)==p.Suggested.Length,
            RoadmapTrack t=>(t.Level==null||Catalog.Levels.Contains(t.Level))&&t.Days is >=0 and <=365&&t.Minutes is null or >=1 and <=480,
            _=>false
        };
        if(!valid)throw ApiProblem.Invalid("Kiểm tra các trường bắt buộc, tham chiếu, rubric và giới hạn của loại nội dung.");
    }
}
