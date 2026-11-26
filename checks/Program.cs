using InterviewPractice;

if (args.SequenceEqual(["--runner-sync"])) { await RunnerSyncCheck.Run(); return; }
if (args.SequenceEqual(["--project-import"])) { await ProjectImportCheck.Run(); return; }

var first = new DateOnly(2026, 11, 1);
RecallEvent Hit(int days, int quality = 5, bool verified = true) => new(first.AddDays(days), quality, verified);
RecallResult Result(params RecallEvent[] attempts) => Recall.Schedule(attempts, "medium");
void Check(bool condition, string name)
{
    if (!condition) throw new InvalidOperationException(name);
    Console.WriteLine("PASS " + name);
}
Check(Result(Hit(0)).Due == first.AddDays(1), "first independent retrieval");
Check(Result(Hit(0), Hit(0)) == Result(Hit(0)), "same-day repetitions");
Check(Result(Hit(0), Hit(1)).Stage == "secure", "independent evidence on two dates");
Check(Result(Hit(0), Hit(1), Hit(7)).Stage == "mastered", "mastery after spaced independent checks");
Check(Result(Hit(0), Hit(1), Hit(2)).Stage == "secure", "minimum elapsed time for mastery");
Check(Result(Hit(0,4,false), Hit(2,4,false), Hit(9,4,false)).VerifiedDays == 0, "confidence is separate from verification");
Check(Result(Hit(0,1,true)).Stage == "review" && Result(Hit(0,1,true)).VerifiedDays == 0, "low confidence requires a new independent check while the attempt keeps its original result");
Check(Result(Hit(0), Hit(1), Hit(2,0,false)).Due == first.AddDays(3) && Result(Hit(0), Hit(1), Hit(2,0,false)).VerifiedDays == 0, "lapse schedules tomorrow");
Check(Result(Hit(0), Hit(0,2,false)).Stage == "review", "assistance does not increase mastery");
Check(Result(Hit(0), Hit(1), Hit(20)).Due > Result(Hit(0), Hit(1), Hit(6)).Due.AddDays(14), "overdue recall considers elapsed time");
Check(Recall.Schedule([Hit(0), Hit(3)], "hard").Due < Result(Hit(0), Hit(3)).Due, "difficulty changes interval");
var instant = new DateTimeOffset(2026, 11, 1, 23, 30, 0, TimeSpan.Zero);
Check(Learning.LocalDate(instant, TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok")) == first.AddDays(1), "local midnight");
Check(Learning.LocalDate(instant, TimeZoneInfo.FindSystemTimeZoneById("America/New_York")) == first, "DST transition day");
Check(Result(new(first.AddDays(1),5,true,"objective",instant), new(first,0,false,"transfer",instant.AddMinutes(1))).Stage == "review",
    "a later lapse across the date line invalidates earlier evidence");
Check(Result(Hit(0), Hit(1), Hit(7), Hit(8,2,false), Hit(9)).Stage == "secure", "assistance resets the mastery streak");
Check(Result(Hit(0), Hit(1), Hit(7), Hit(8,1,false), Hit(9,4,false)).VerifiedDays == 0, "self confidence cannot restore earlier mastery");
Check(Result(Hit(0), Hit(0,0,false)) == Result(Hit(0,0,false), Hit(0)), "same-day mixed outcomes are order independent");
Check(Result(Hit(0), Hit(1), Hit(7), Hit(8,0,false), Hit(9), Hit(10)).Stage == "secure", "two fresh successes after a lapse do not restore mastery");
Check(Result(Hit(0), Hit(1), Hit(7), Hit(90)).VerifiedDays == 1, "old evidence expires before a distant success");
Check(Recall.Schedule([Hit(0),Hit(1),Hit(7)], "medium", first.AddDays(200)).Stage == "review", "mastery expires without another attempt");
Check(Recall.Schedule([new(first,4,false,"self")], "medium").Stage == "self", "self confidence has its own status");
Check(Recall.Schedule([new(first,3,false,"ai")], "medium").Stage == "ai", "AI assessment has its own status");
Check(Recall.Schedule([new(first,5,true,"transfer")], "medium").Stage == "secure", "independent transfer check verifies its assessed concept");
Check(Recall.Schedule([new(first,2,false,"ai")], "medium").ReviewReason == "ai", "weak AI assessment has an explicit review source");
Check(Recall.Schedule([new(first,0,false,"skipped")], "medium").ReviewReason == "skipped", "skipped answer is review evidence");
Check(Result(Hit(0), Hit(1), Hit(7), Hit(8,2,false), Hit(9), Hit(10), Hit(16)).Stage == "mastered", "mastery can be rebuilt from a new spaced sequence");

var submission = new RunRow(Guid.NewGuid(), "sample", 1, "submit", "wrong_answer", instant,
    "worker-only diagnostic", ["hidden column"], [["hidden row"]], 0, 1, null);
var visible = RunnerGateway.Public(submission, submission.Id);
Check(visible.Output is null && visible.Columns is null && visible.Rows is null && visible.Passed == 0, "hidden submission details stay at worker");
var publicRun = submission with { Action = "run", Status = "completed" };
Check(RunnerGateway.Public(publicRun) == publicRun, "run preserves public results");
try { RunnerGateway.Public(submission, Guid.NewGuid()); throw new InvalidOperationException("wrong job id accepted"); }
catch (ApiProblem problem) { Check(problem.Status == 503, "reject a mismatched worker job"); }
foreach (var invalid in new[] {
    submission with { Passed = -1 }, submission with { Passed = 2 }, submission with { Total = null },
    submission with { Status = "accepted", Passed = 0 }, submission with { Milliseconds = -1 },
    publicRun with { Rows = [["a","b"]] }, publicRun with { Output = new string('x',65537) },
    submission with { Status = "completed" }, submission with { At = default }
})
{
    try { RunnerGateway.Public(invalid); throw new InvalidOperationException("invalid worker result accepted"); }
    catch (ApiProblem problem) { Check(problem.Status == 503, "reject malformed worker result"); }
}
var contentPath = Path.Combine(AppContext.BaseDirectory, "Content", "exercises.json");
var exercise = DataJson.Read<ExerciseContent[]>(File.ReadAllText(contentPath))[0];
var manual = new ExerciseDraft { Reviewed = true };
Check(ExerciseCatalog.Progress(exercise, manual, null) == "reviewed", "manual review is separate from execution");
var accepted = new ExerciseSubmission { Version = exercise.Version, TestVersion = exercise.TestVersion, Status = "accepted", Action = "submit" };
Check(ExerciseCatalog.Progress(exercise, manual, accepted) == "independent", "accepted independent submission drives progress");
Check(ExerciseCatalog.Progress(exercise, manual, new ExerciseSubmission { Version = exercise.Version, TestVersion = exercise.TestVersion, Status = "accepted", Assisted = true }) == "accepted", "assisted acceptance is labeled separately");
Check(ExerciseCatalog.Progress(exercise with { TestVersion = exercise.TestVersion + 1 }, manual, accepted) == "needs-review", "new test version requires fresh evidence");
