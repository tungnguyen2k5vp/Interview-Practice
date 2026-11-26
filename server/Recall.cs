using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

internal sealed record RecallEvent(DateOnly Day, int Quality, bool Verified);
internal sealed record RecallResult(DateOnly Due, string Stage, int VerifiedDays, int Lapses);

internal static class Recall
{
    // SM-2 adapted for one observation per local date. A same-day retry cannot add a spaced repetition.
    internal static RecallResult Schedule(IEnumerable<RecallEvent> events, string difficulty)
    {
        var ease = difficulty switch { "hard" => 2.1, "medium" => 2.3, _ => 2.5 };
        var interval = 1;
        var streak = 0;
        var lapses = 0;
        var verified = 0;
        DateOnly? previous = null, firstVerified = null;
        var stage = "learning";
        foreach (var day in events.GroupBy(x => x.Day).OrderBy(x => x.Key))
        {
            var quality = day.Min(x => x.Quality);
            if (day.Any(x => x.Quality == 0))
            {
                verified = 0;
                firstVerified = null;
            }
            else if (day.Any(x => x.Verified))
            {
                verified++;
                firstVerified ??= day.Key;
            }
            if (quality < 3)
            {
                if (quality <= 1) lapses++;
                streak = 0;
                interval = 1;
                stage = "review";
            }
            else
            {
                var elapsed = previous.HasValue ? day.Key.DayNumber - previous.Value.DayNumber : 0;
                var overdue = Math.Clamp(elapsed - interval, 0, interval) / 4.0;
                interval = ++streak switch { 1 => 1, 2 => difficulty == "hard" ? 3 : 5,
                    _ => Math.Clamp((int)Math.Round((interval + overdue) * ease), 1, 180) };
                stage = verified >= 3 && day.Key.DayNumber - firstVerified!.Value.DayNumber >= 7 ? "mastered" :
                    verified >= 2 ? "secure" : "learning";
            }
            var difference = 5 - quality;
            ease = Math.Clamp(ease + 0.1 - difference * (0.08 + difference * 0.02), 1.3, 2.8);
            previous = day.Key;
        }
        return new((previous ?? throw new ArgumentException("Cần ít nhất một lượt luyện.")).AddDays(interval), stage, verified, lapses);
    }

    internal static async Task Refresh(PracticeDb db, StudyState state, QuestionVersion question, CancellationToken ct,
        Attempt? pending = null, Guid? overrideId = null, string? rating = null, AiBody? feedback = null)
    {
        if (!await db.Questions.AnyAsync(h => h.Slug == question.Slug && h.Published == question.Version, ct)) return;
        var zone = TimeZoneInfo.FindSystemTimeZoneById((await Learning.Goal(db, state.UserId, ct)).TimeZone);
        var history = await (from a in db.Attempts.AsNoTracking()
            where a.UserId == state.UserId && a.Slug == state.Slug && a.Version == question.Version
            join s in db.Assessments on a.Id equals s.AttemptId into assessments from s in assessments.DefaultIfEmpty()
            join ai in db.AiReviews on a.Id equals ai.AttemptId into reviews from ai in reviews.DefaultIfEmpty()
            select new { a.Id, a.At, a.Outcome, a.HintSeen, a.AnswerSeen, a.Correct, Rating = s == null ? null : s.Rating,
                Feedback = ai == null ? null : ai.Feedback }).ToListAsync(ct);
        if (pending is not null) history.Add(new { pending.Id, pending.At, pending.Outcome, pending.HintSeen, pending.AnswerSeen,
            pending.Correct, Rating = (string?)null, Feedback = (string?)null });
        var events = history.Select(x =>
        {
            var self = x.Id == overrideId && rating is not null ? rating : x.Rating;
            var ai = x.Id == overrideId && feedback is not null ? feedback :
                x.Feedback is null ? null : DataJson.Read<AiResponse>(x.Feedback).Body;
            var technical = ai?.Criteria.FirstOrDefault();
            var observed = technical?.Status == "scored" ? technical.Score : null;
            var quality = x.Outcome == "skipped" || x.Correct is false ? 0 :
                x.AnswerSeen || self == "unsure" ? 1 : x.HintSeen || self == "partial" ? 2 :
                x.Correct is true ? 5 : self == "clear" ? 4 : 3;
            if (x.Correct is null && observed.HasValue) quality = Math.Min(quality, observed.Value + 1);
            return new RecallEvent(Learning.LocalDate(x.At, zone), quality, x.Correct is true && !x.AnswerSeen && !x.HintSeen);
        });
        var result = Schedule(events, question.Difficulty);
        state.ScheduledVersion = question.Version;
        state.Mastery = result.Stage;
        state.VerifiedDays = result.VerifiedDays;
        state.Lapses = result.Lapses;
        state.SuggestedDue = result.Due;
        if (!state.ManualDue) state.Due = result.Due;
    }
}
