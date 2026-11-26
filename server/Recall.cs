using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

internal sealed record RecallEvent(DateOnly Day, int Quality, bool Verified, string Source = "objective", DateTimeOffset? At = null);
internal sealed record RecallResult(DateOnly Due, string Stage, int VerifiedDays, int Lapses,
    DateOnly? EvidenceUntil = null, string? ReviewReason = null);

internal static class Recall
{
    // SM-2 adapted for one observation per local date. A same-day retry cannot add a spaced repetition.
    internal static RecallResult Schedule(IEnumerable<RecallEvent> events, string difficulty, DateOnly? today = null)
    {
        var ease = difficulty switch { "hard" => 2.1, "medium" => 2.3, _ => 2.5 };
        var interval = 1;
        var streak = 0;
        var lapses = 0;
        var verified = 0;
        DateOnly? previous = null, firstVerified = null;
        DateOnly? evidenceUntil = null;
        string? reason = null;
        var stage = "learning";
        // Crossing a time zone can move a later attempt to yesterday. Keep it in the current recall round.
        DateOnly lastDay = DateOnly.MinValue;
        var rounds = events.OrderBy(x => x.At).ThenBy(x => x.Day).GroupBy(x => lastDay = x.Day > lastDay ? x.Day : lastDay);
        foreach (var day in rounds)
        {
            var quality = day.Min(x => x.Quality);
            if (quality is < 0 or > 5) throw new ArgumentOutOfRangeException(nameof(events));
            if (quality < 3 || evidenceUntil < day.Key)
            {
                verified = 0;
                firstVerified = null;
                evidenceUntil = null;
            }
            if (quality >= 3 && day.Any(x => x.Verified))
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
                reason = day.Where(x => x.Quality == quality).Select(x => x.Source).Order(StringComparer.Ordinal).First();
            }
            else
            {
                var elapsed = previous.HasValue ? day.Key.DayNumber - previous.Value.DayNumber : 0;
                var overdue = Math.Clamp(elapsed - interval, 0, interval) / 4.0;
                interval = ++streak switch { 1 => 1, 2 => difficulty == "hard" ? 3 : 5,
                    _ => Math.Clamp((int)Math.Round((interval + overdue) * ease), 1, 180) };
                stage = verified >= 3 && day.Key.DayNumber - firstVerified!.Value.DayNumber >= 7 ? "mastered" :
                    verified >= 1 ? "secure" : day.Any(x => x.Source == "self" && x.Quality >= 4) ? "self" :
                    day.Any(x => x.Source == "ai") ? "ai" : "learning";
                reason = null;
                if (day.Any(x => x.Verified)) evidenceUntil = day.Key.AddDays(Math.Max(14, interval * 2));
            }
            var difference = 5 - quality;
            ease = Math.Clamp(ease + 0.1 - difference * (0.08 + difference * 0.02), 1.3, 2.8);
            previous = day.Key;
        }
        if (today > evidenceUntil && verified > 0) { verified = 0; stage = "review"; reason = "stale"; }
        return new((previous ?? throw new ArgumentException("Cần ít nhất một lượt luyện.")).AddDays(interval), stage, verified, lapses,
            evidenceUntil, reason);
    }

    internal static async Task Refresh(PracticeDb db, StudyState state, QuestionVersion question, CancellationToken ct,
        Attempt? pending = null, Guid? overrideId = null, string? rating = null, AiBody? feedback = null, DateOnly? today = null)
    {
        if (!await db.Questions.AnyAsync(h => h.Slug == question.Slug && h.Published == question.Version, ct)) return;
        var zone = TimeZoneInfo.FindSystemTimeZoneById((await Learning.Goal(db, state.UserId, ct)).TimeZone);
        var history = await (from a in db.Attempts.AsNoTracking()
            where a.UserId == state.UserId && a.Slug == state.Slug && a.Version == question.Version
            join s in db.Assessments on a.Id equals s.AttemptId into assessments from s in assessments.DefaultIfEmpty()
            join ai in db.AiReviews on a.Id equals ai.AttemptId into reviews from ai in reviews.DefaultIfEmpty()
            select new { a.Id, a.At, a.StudyDay, a.Outcome, a.HintSeen, a.AnswerSeen, a.Correct, Rating = s == null ? null : s.Rating,
                Feedback = ai == null ? null : ai.Feedback }).ToListAsync(ct);
        if (pending is not null) history.Add(new { pending.Id, pending.At, pending.StudyDay, pending.Outcome, pending.HintSeen, pending.AnswerSeen,
            pending.Correct, Rating = (string?)null, Feedback = (string?)null });
        var events = history.Select(x =>
        {
            var self = x.Id == overrideId && rating is not null ? rating : x.Rating;
            var ai = x.Id == overrideId && feedback is not null ? feedback :
                x.Feedback is null ? null : DataJson.Read<AiResponse>(x.Feedback).Body;
            var technical = ai?.Criteria.FirstOrDefault();
            var observed = technical?.Status == "scored" ? technical.Score : null;
            var source = x.Outcome == "skipped" ? "skipped" : x.AnswerSeen || x.HintSeen ? "assisted" :
                x.Correct.HasValue ? "objective" : self is not null ? "self" : observed.HasValue ? "ai" : "essay";
            var quality = x.Outcome == "skipped" || x.Correct is false ? 0 :
                x.AnswerSeen ? 1 : x.HintSeen ? 2 : self == "unsure" ? 1 : self == "partial" ? 2 :
                x.Correct is true ? 5 : self == "clear" ? 4 : 3;
            if (x.Correct is null && observed.HasValue && observed.Value + 1 < quality) { quality = observed.Value + 1; source = "ai"; }
            return new RecallEvent(x.StudyDay ?? Learning.LocalDate(x.At, zone), quality,
                x.Correct is true && !x.AnswerSeen && !x.HintSeen && quality >= 3, source, x.At);
        }).ToList();
        var checks = await (from check in db.KnowledgeChecks.AsNoTracking()
            join a in db.Attempts on check.AttemptId equals a.Id
            where a.UserId == state.UserId && a.Slug == state.Slug && a.Version == question.Version && check.AnsweredAt != null
            select check).ToArrayAsync(ct);
        events.AddRange(checks.Select(c => new RecallEvent(c.StudyDay ?? Learning.LocalDate(c.AnsweredAt!.Value, zone),
            c.Correct == false ? 0 : c.Assisted ? 2 : 5, c.Correct == true && !c.Assisted, c.Assisted ? "assisted" : "transfer", c.AnsweredAt)));
        var result = Schedule(events, question.Difficulty, today);
        state.ScheduledVersion = question.Version;
        state.RecallRevision = 2;
        state.Mastery = result.Stage;
        state.VerifiedDays = result.VerifiedDays;
        state.Lapses = result.Lapses;
        state.EvidenceUntil = result.EvidenceUntil;
        state.ReviewReason = result.ReviewReason;
        state.AiAssessed = feedback is not null || history.Any(x => x.Feedback is not null);
        state.SuggestedDue = result.Due;
        if (!state.ManualDue) state.Due = result.Due;
    }

    internal static Task Expire(PracticeDb db, string owner, DateOnly today, CancellationToken ct) =>
        db.StudyStates.Where(s => s.UserId == owner && s.EvidenceUntil < today && (s.Mastery == "secure" || s.Mastery == "mastered"))
            .ExecuteUpdateAsync(set => set.SetProperty(s => s.Mastery, "review").SetProperty(s => s.VerifiedDays, 0)
                .SetProperty(s => s.ReviewReason, "stale").SetProperty(s => s.Revision, s => s.Revision + 1), ct);
}
