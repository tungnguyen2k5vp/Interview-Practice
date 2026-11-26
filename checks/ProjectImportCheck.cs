using System.IO.Compression;
using System.Text;
using InterviewPractice;

internal static class ProjectImportCheck
{
    internal static async Task Run()
    {
        static byte[] Archive(params (string Path, string Text)[] files)
        {
            using var buffer = new MemoryStream();
            using (var zip = new ZipArchive(buffer, ZipArchiveMode.Create, true))
                foreach (var f in files) {
                    using var dst = zip.CreateEntry(f.Path).Open();
                    dst.Write(Encoding.UTF8.GetBytes(f.Text));
                }
            return buffer.ToArray();
        }
        const string path = "sample/Service.cs";
        var data = Archive((path, "// sample\npublic class BillingService {}\napp.MapGet(\"/status\", Status);"),
            ("sample/credentials.cs", "class Hidden {}"), ("sample/.env", "value"), ("sample/ignored.txt", "ineligible"));
        var index = await ProjectInterview.Inspect(data, [], null, default);
        if (!index.Files.SequenceEqual([path]) || index.Questions.Length != 0) throw new InvalidOperationException("Scope and filtering");
        var scoped = await ProjectInterview.Inspect(data, [path], index.Fingerprint, default);
        if (!scoped.Questions.Any(q => q.Path == path && q.Line == 3 && q.Area == "API") ||
            !scoped.Questions.Any(q => q.Line == 2 && q.Symbol == "class BillingService")) throw new InvalidOperationException("Source citations");
        foreach (var url in new[] { "https://example.org/team/repo", "https://github.com/team/repo?ref=local", "http://github.com/team/repo", "https://github.com/team/.." })
        {
            try { ProjectInterview.ArchiveUrl(url); } catch (ApiProblem) { continue; }
            throw new InvalidOperationException("Unexpected repository origin");
        }
        foreach (var invalid in new Func<Task>[] {
            () => ProjectInterview.Inspect(data, ["sample/.env"], index.Fingerprint, default),
            () => ProjectInterview.Inspect(data, [path], "old", default),
            () => ProjectInterview.Inspect(Archive(("../outside.cs","class Outside {}")), [], null, default),
            () => ProjectInterview.Inspect(Archive((path,"one"),(path,"two")), [], null, default),
            () => ProjectInterview.Inspect([0,1,2], [], null, default)
        })
        {
            try { await invalid(); } catch (ApiProblem) { continue; }
            throw new InvalidOperationException("Rejected archive or selection");
        }
        Console.WriteLine("PASS repository origin, bounded ZIP type, paths, duplicate names, excluded secrets, fingerprint, scope and real line citations");
    }
}
