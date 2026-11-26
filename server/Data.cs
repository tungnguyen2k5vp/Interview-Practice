using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

internal sealed class Learner : IdentityUser
{
    public string DisplayName { get; set; } = "";
    public string? GoalJson { get; set; }
}

internal sealed class QuestionHead
{
    public string Slug { get; init; } = "";
    public int Latest { get; set; }
    public int? Published { get; set; }
    public string Status { get; set; } = "draft";
    public int Revision { get; set; }
}

internal sealed class QuestionVersion
{
    public string Slug { get; init; } = "";
    public int Version { get; init; }
    public string Title { get; init; } = "";
    public string Topic { get; init; } = "";
    public string Format { get; init; } = "";
    public string Difficulty { get; init; } = "";
    public string Level { get; init; } = "";
    public string? Technology { get; init; }
    public string SearchText { get; init; } = "";
    public int Minutes { get; init; }
    public string Data { get; init; } = "";
}

internal sealed class StudyState
{
    public string UserId { get; init; } = "";
    public string Slug { get; init; } = "";
    public int Revision { get; set; }
    public bool Bookmarked { get; set; }
    public DateOnly? Due { get; set; }
    public bool ManualDue { get; set; }
    public DateOnly? SuggestedDue { get; set; }
    public string? Mastery { get; set; }
    public int VerifiedDays { get; set; }
    public int Lapses { get; set; }
    public int ScheduledVersion { get; set; }
    public int AnsweredCount { get; set; }
    public DateTimeOffset? LastActivityAt { get; set; }
    public string? LastOutcome { get; set; }
    public string? Rating { get; set; }
    public Guid? LastAttemptId { get; set; }
    public Guid? DraftId { get; set; }
    public int DraftRevision { get; set; }
    public int DraftVersion { get; set; }
    public string DraftText { get; set; } = "";
    public DateTimeOffset? DraftStartedAt { get; set; }
    public bool HintSeen { get; set; }
    public bool AnswerSeen { get; set; }
}

internal sealed class Attempt
{
    public Guid Id { get; init; }
    public string UserId { get; init; } = "";
    public string Slug { get; init; } = "";
    public int Version { get; init; }
    public string Text { get; init; } = "";
    public string Language { get; init; } = "vi";
    public string Outcome { get; init; } = "answered";
    public bool HintSeen { get; init; }
    public bool AnswerSeen { get; init; }
    public DateTimeOffset? ReferenceViewedAt { get; set; }
    public DateTimeOffset At { get; init; }
    public int ActiveSeconds { get; init; }
    public int? Choice { get; init; }
    public bool? Correct { get; init; }
    public Guid? StudySessionId { get; init; }
}

internal sealed class StudySession
{
    public Guid Id { get; init; }
    public string UserId { get; init; } = "";
    public string Mode { get; init; } = "";
    public int Minutes { get; init; }
    public string Plan { get; set; } = "";
    public DateTimeOffset StartedAt { get; init; }
    public DateTimeOffset? EndedAt { get; set; }
}

internal sealed class SelfAssessment
{
    public Guid AttemptId { get; init; }
    public string Rating { get; set; } = "";
    public DateTimeOffset At { get; set; }
}

internal sealed class AnswerRevision
{
    public Guid Id { get; init; }
    public Guid AttemptId { get; init; }
    public string Text { get; init; } = "";
    public DateTimeOffset At { get; init; }
}

internal sealed class AiReviewRow
{
    public Guid AttemptId { get; init; }
    public Guid Claim { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public string? Feedback { get; set; }
}

internal sealed class InterviewSession
{
    public Guid Id { get; init; }
    public string UserId { get; init; } = "";
    public string Preset { get; init; } = "";
    public string Mode { get; init; } = "";
    public string Language { get; init; } = "";
    public string Status { get; set; } = "active";
    public string Stage { get; set; } = "question";
    public string Plan { get; set; } = "";
    public int Position { get; set; }
    public int Revision { get; set; }
    public Guid? LastAction { get; set; }
    public DateTimeOffset StartedAt { get; init; }
    public DateTimeOffset Deadline { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public int? PausedSeconds { get; set; }
    public DateTimeOffset? SegmentStartedAt { get; set; }
    public int ActiveSeconds { get; set; }
    public int SessionSeconds { get; init; }
    public string Draft { get; set; } = "";
    public bool HintSeen { get; set; }
}

internal sealed class InterviewTurn
{
    public Guid SessionId { get; init; }
    public Guid ActionId { get; init; }
    public int Position { get; init; }
    public string Kind { get; init; } = "";
    public string Text { get; init; } = "";
    public bool Skipped { get; init; }
    public bool HintSeen { get; init; }
    public DateTimeOffset At { get; init; }
    public string? Rating { get; set; }
}

internal sealed class Note
{
    public Guid Id { get; init; }
    public string UserId { get; init; } = "";
    public string Title { get; set; } = "";
    public string Text { get; set; } = "";
    public string? Slug { get; set; }
    public string? Topic { get; set; }
    public bool Important { get; set; }
    public int Revision { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

internal sealed class ExerciseDraft
{
    public string UserId { get; init; } = "";
    public string Slug { get; init; } = "";
    public int Version { get; init; }
    public int Revision { get; set; }
    public string Text { get; set; } = "";
    public DateTimeOffset SavedAt { get; set; }
    public bool HintSeen { get; set; }
    public bool SolutionSeen { get; set; }
    public bool Reviewed { get; set; }
}

internal sealed class ExternalPractice
{
    public string UserId { get; init; } = "";
    public string Slug { get; init; } = "";
    public string Status { get; set; } = "";
    public string Note { get; set; } = "";
}

internal sealed class PracticeDb(DbContextOptions<PracticeDb> options) : IdentityDbContext<Learner>(options)
{
    public DbSet<QuestionHead> Questions => Set<QuestionHead>();
    public DbSet<QuestionVersion> QuestionVersions => Set<QuestionVersion>();
    public DbSet<StudyState> StudyStates => Set<StudyState>();
    public DbSet<Attempt> Attempts => Set<Attempt>();
    public DbSet<StudySession> StudySessions => Set<StudySession>();
    public DbSet<SelfAssessment> Assessments => Set<SelfAssessment>();
    public DbSet<AnswerRevision> Revisions => Set<AnswerRevision>();
    public DbSet<AiReviewRow> AiReviews => Set<AiReviewRow>();
    public DbSet<InterviewSession> Interviews => Set<InterviewSession>();
    public DbSet<InterviewTurn> Turns => Set<InterviewTurn>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<ExerciseDraft> ExerciseDrafts => Set<ExerciseDraft>();
    public DbSet<ExternalPractice> ExternalPractice => Set<ExternalPractice>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.Entity<Learner>().Property(x => x.DisplayName).HasMaxLength(60);
        b.Entity<QuestionHead>().HasKey(x => x.Slug);
        b.Entity<QuestionHead>().Property(x => x.Revision).IsConcurrencyToken();
        b.Entity<QuestionVersion>().HasKey(x => new { x.Slug, x.Version });
        b.Entity<QuestionVersion>().HasOne<QuestionHead>().WithMany().HasForeignKey(x => x.Slug);
        b.Entity<QuestionVersion>().HasIndex(x => new { x.Topic, x.Level, x.Difficulty });
        b.Entity<QuestionVersion>().Property(x => x.Topic).HasMaxLength(24);
        b.Entity<QuestionVersion>().Property(x => x.Level).HasMaxLength(12);
        b.Entity<QuestionVersion>().Property(x => x.Difficulty).HasMaxLength(12);
        b.Entity<QuestionVersion>().Property(x => x.Title).HasMaxLength(160);
        b.Entity<StudyState>().HasKey(x => new { x.UserId, x.Slug });
        b.Entity<StudyState>().HasOne<QuestionHead>().WithMany().HasForeignKey(x => x.Slug).OnDelete(DeleteBehavior.Restrict);
        b.Entity<StudyState>().Property(x => x.Revision).IsConcurrencyToken();
        b.Entity<StudyState>().HasIndex(x => new { x.UserId, x.Due });
        b.Entity<Attempt>().HasOne<QuestionVersion>().WithMany().HasForeignKey(x => new { x.Slug, x.Version }).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Attempt>().HasIndex(x => new { x.UserId, x.At });
        b.Entity<Attempt>().HasIndex(x => new { x.UserId, x.Slug, x.Version, x.At });
        b.Entity<Attempt>().HasIndex(x => new { x.StudySessionId, x.Slug }).IsUnique().HasFilter("[StudySessionId] IS NOT NULL");
        b.Entity<Attempt>().HasOne<StudySession>().WithMany().HasForeignKey(x => x.StudySessionId).OnDelete(DeleteBehavior.NoAction);
        b.Entity<StudySession>().HasIndex(x => new { x.UserId, x.StartedAt });
        b.Entity<StudySession>().Property(x => x.Mode).HasMaxLength(20);
        b.Entity<StudyState>().Property(x => x.Mastery).HasMaxLength(12);
        b.Entity<SelfAssessment>().HasKey(x => x.AttemptId);
        b.Entity<SelfAssessment>().HasOne<Attempt>().WithOne().HasForeignKey<SelfAssessment>(x => x.AttemptId);
        b.Entity<AnswerRevision>().HasOne<Attempt>().WithMany().HasForeignKey(x => x.AttemptId);
        b.Entity<AnswerRevision>().HasIndex(x => new { x.AttemptId, x.At });
        b.Entity<AiReviewRow>().HasKey(x => x.AttemptId);
        b.Entity<AiReviewRow>().Property(x => x.Claim).IsConcurrencyToken();
        b.Entity<AiReviewRow>().HasOne<Attempt>().WithOne().HasForeignKey<AiReviewRow>(x => x.AttemptId);
        b.Entity<InterviewSession>().Property(x => x.Revision).IsConcurrencyToken();
        b.Entity<InterviewSession>().HasIndex(x => new { x.UserId, x.StartedAt });
        b.Entity<InterviewTurn>().HasKey(x => new { x.SessionId, x.Position, x.Kind });
        b.Entity<InterviewTurn>().Property(x => x.Kind).HasMaxLength(12);
        b.Entity<InterviewTurn>().HasIndex(x => new { x.SessionId, x.ActionId }).IsUnique();
        b.Entity<InterviewTurn>().HasOne<InterviewSession>().WithMany().HasForeignKey(x => x.SessionId);
        b.Entity<Note>().Property(x => x.Revision).IsConcurrencyToken();
        b.Entity<Note>().HasIndex(x => new { x.UserId, x.UpdatedAt });
        b.Entity<ExerciseDraft>().HasKey(x => new { x.UserId, x.Slug, x.Version });
        b.Entity<ExerciseDraft>().Property(x => x.Revision).IsConcurrencyToken();
        b.Entity<ExternalPractice>().HasKey(x => new { x.UserId, x.Slug });

        foreach (var type in new[] { typeof(StudyState), typeof(Attempt), typeof(StudySession), typeof(InterviewSession), typeof(Note), typeof(ExerciseDraft), typeof(ExternalPractice) })
            b.Entity(type).HasOne(typeof(Learner)).WithMany().HasForeignKey("UserId");
        foreach (var type in new[] { typeof(QuestionHead), typeof(QuestionVersion), typeof(StudyState), typeof(Attempt), typeof(ExerciseDraft), typeof(ExternalPractice) })
            b.Entity(type).Property<string>("Slug").HasMaxLength(90);
    }
}

internal static class DataJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);
    public static T Read<T>(string json) => JsonSerializer.Deserialize<T>(json, Options)
        ?? throw new InvalidDataException("Dữ liệu JSON bị thiếu.");
    public static string Write<T>(T value) => JsonSerializer.Serialize(value, Options);
}
