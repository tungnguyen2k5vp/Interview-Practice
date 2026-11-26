using InterviewPractice;

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
Check(Result(Hit(0,1,true)).VerifiedDays == 1, "low confidence cannot erase an objectively correct independent answer");
Check(Result(Hit(0), Hit(1), Hit(2,0,false)) == new RecallResult(first.AddDays(3), "review", 0, 1), "lapse schedules tomorrow");
Check(Result(Hit(0), Hit(0,2,false)).Stage == "review", "assistance does not increase mastery");
Check(Result(Hit(0), Hit(1), Hit(20)).Due > Result(Hit(0), Hit(1), Hit(6)).Due.AddDays(14), "overdue recall considers elapsed time");
Check(Recall.Schedule([Hit(0), Hit(3)], "hard").Due < Result(Hit(0), Hit(3)).Due, "difficulty changes interval");
var instant = new DateTimeOffset(2026, 11, 1, 23, 30, 0, TimeSpan.Zero);
Check(Learning.LocalDate(instant, TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok")) == first.AddDays(1), "local midnight");
Check(Learning.LocalDate(instant, TimeZoneInfo.FindSystemTimeZoneById("America/New_York")) == first, "DST transition day");

var submission = new RunRow(Guid.NewGuid(), "sample", 1, "submit", "wrong_answer", instant,
    "worker-only diagnostic", ["hidden column"], [["hidden row"]], 0, 1, null);
var visible = RunnerGateway.Public(submission, submission.Id);
Check(visible.Output is null && visible.Columns is null && visible.Rows is null && visible.Passed == 0, "hidden submission details stay at worker");
var publicRun = submission with { Action = "run" };
Check(RunnerGateway.Public(publicRun) == publicRun, "run preserves public results");
try { RunnerGateway.Public(submission, Guid.NewGuid()); throw new InvalidOperationException("wrong job id accepted"); }
catch (ApiProblem problem) { Check(problem.Status == 503, "reject a mismatched worker job"); }
