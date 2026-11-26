using System.Net;
using System.Net.Http.Json;
using InterviewPractice;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

internal sealed class RunnerSyncCheck : HttpMessageHandler, IHttpClientFactory
{
    private readonly Dictionary<string, RunRow> results = [];
    public HttpClient CreateClient(string name) => new(this, disposeHandler: false);

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        if (request.Method != HttpMethod.Get || request.RequestUri!.Host != "runner.test" ||
            request.Headers.Authorization?.ToString() != "Bearer fixture") throw new InvalidOperationException("Worker authentication");
        return Task.FromResult(results.TryGetValue(request.RequestUri.AbsolutePath, out var row)
            ? new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(row) }
            : new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
    }

    public static async Task Run()
    {
        const string connection = "Server=localhost;Database=InterviewPractice_Runner_QA;Integrated Security=True;Encrypt=True;TrustServerCertificate=True";
        var options = new DbContextOptionsBuilder<PracticeDb>().UseSqlServer(connection).Options;
        await using var db = new PracticeDb(options);
        await db.Database.MigrateAsync();
        var owner = new Learner { Id = Guid.NewGuid().ToString() };
        var peer = new Learner { Id = Guid.NewGuid().ToString() };
        db.Users.AddRange(owner, peer);
        await db.SaveChangesAsync();
        using var worker = new RunnerSyncCheck();
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string> {
            ["Runner:Endpoint"]="https://runner.test", ["Runner:Token"]="fixture", ["Runner:IsolationVerified"]="true"
        }).Build();
        var time = DateTimeOffset.UtcNow.AddMinutes(-2);
        var exercise = DataJson.Read<ExerciseContent[]>(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Content","exercises.json")))[0];
        async Task<ExerciseSubmission> Job(string user, string action, string verdict, int seconds, bool assisted = false)
        {
            var job = new ExerciseSubmission { Id = Guid.NewGuid(), UserId = user, Slug = exercise.Slug, Version = exercise.Version,
                TestVersion = exercise.TestVersion, Action = action, Status = "queued", RequestedAt = time.AddSeconds(seconds), Assisted = assisted };
            db.ExerciseSubmissions.Add(job);
            await db.SaveChangesAsync();
            worker.results["/v1/owners/"+user+"/jobs/"+job.Id] = new(job.Id,job.Slug,job.Version,action,verdict,job.RequestedAt,
                "worker output", null, null, verdict == "wrong_answer" ? 0 : 1,1,15);
            return job;
        }
        async Task Reopen()
        {
            // A fresh gateway and DbContext simulate an API restart with no browser polling.
            await using var fresh = new PracticeDb(options);
            await new RunnerGateway(worker, config, TimeProvider.System).SyncPending(fresh,0,NullLogger.Instance,default);
        }
        async Task<string> Progress(string user, ExerciseContent item) => ExerciseCatalog.Progress(item,null,
            (await ExerciseCatalog.Evidence(db,user,default,item.Slug,item.Version)).SingleOrDefault());
        try
        {
            var submit = await Job(owner.Id,"submit","accepted",0);
            await Job(owner.Id,"run","completed",5);
            await Job(peer.Id,"submit","accepted",7,assisted:true);
            await Reopen();
            var result = await db.ExerciseSubmissions.AsNoTracking().SingleAsync(j => j.Id == submit.Id);
            if (await Progress(owner.Id,exercise) != "independent" || await Progress(peer.Id,exercise) != "accepted" ||
                await Progress(owner.Id,exercise with { TestVersion = exercise.TestVersion + 1 }) != "needs-review" ||
                DataJson.Read<RunRow>(result.Result!).Output != null) throw new InvalidOperationException("Execution evidence");
            await Job(owner.Id,"submit","wrong_answer",10);
            await Reopen();
            if (await Progress(owner.Id,exercise) != "needs-review" || await Progress(peer.Id,exercise) != "accepted")
                throw new InvalidOperationException("Owner or later assessment");
            Console.WriteLine("PASS SQL Server restart sync, hidden output, trial run after acceptance, owner, assistance, failed resubmission and test version");
        }
        finally { await db.Users.Where(u => u.Id == owner.Id || u.Id == peer.Id).ExecuteDeleteAsync(); }
    }
}
