using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace InterviewPractice;

/// <summary>Con trỏ tới bản nháp tại phiên bản người học đang xem.</summary>
internal sealed record DraftCursor(Guid Id, [Range(0, int.MaxValue)] int Revision, [Range(1, int.MaxValue)] int Version);

/// <summary>Nội dung nháp cùng khóa kiểm tra phiên bản.</summary>
internal sealed record SaveDraftRequest(DraftCursor Cursor, [StringLength(16000)] string Text);

/// <summary>Lựa chọn mở gợi ý hoặc đáp án trước khi nộp.</summary>
internal sealed record RevealRequest(DraftCursor Cursor, string Kind);

/// <summary>Chốt bản nháp đã đồng bộ vào lịch sử.</summary>
internal sealed record SubmitRequest(DraftCursor Cursor, string Language, bool Skip, [Range(0, 3600)] int ActiveSeconds);

/// <summary>Tự đánh giá theo mức hiểu.</summary>
internal sealed record RateRequest(string Rating);

/// <summary>Lưu bản cải thiện với khóa chống gửi trùng.</summary>
internal sealed record ReviseRequest(Guid Id, [Required, StringLength(16000)] string Text);

/// <summary>Thay đổi dấu lưu hoặc ngày ôn.</summary>
internal sealed record MarkRequest(bool? Bookmarked, DateOnly? Due, bool SetDue);

/// <summary>Bản nháp đã lưu trên máy chủ và các tài liệu đã mở.</summary>
internal sealed record DraftResponse(DraftCursor Cursor, string Text, string? Hint, ReferenceResponse? Reference);

/// <summary>Câu hỏi, bản nháp và lần nộp gần nhất của người học.</summary>
internal sealed record PracticeResponse(QuestionResponse Question, DraftResponse? Draft, Guid? LastAttemptId);

/// <summary>Phiên bản cải thiện có liên kết với lượt nộp gốc.</summary>
internal sealed record RevisionResponse(Guid Id, string Text, DateTimeOffset At);

/// <summary>Lượt nộp bất biến, dấu đã xem và tự đánh giá.</summary>
internal sealed record AttemptResponse(Guid Id, QuestionResponse Question, string Text, string Language, string Outcome, bool HintSeen,
    bool AnswerSeen, DateTimeOffset? ReferenceViewedAt, DateTimeOffset At, int ActiveSeconds, string? Rating, RevisionResponse[] Revisions);

internal sealed class Practice(PracticeDb db, Catalog catalog, TimeProvider clock)
{
    public static readonly string[] Ratings = ["unsure", "partial", "clear"];

    public static void Map(RouteGroupBuilder api)
    {
        var group = api.MapGroup("/practice").RequireAuthorization();
        group.MapGet("/questions/{slug}", (string slug, ClaimsPrincipal user, Practice practice, CancellationToken ct)
            => practice.Open(slug, user.Id(), ct)).WithSummary("Mở câu hỏi và bản nháp của người học.");
        group.MapPatch("/questions/{slug}/draft", (string slug, SaveDraftRequest request, ClaimsPrincipal user, Practice practice, CancellationToken ct)
            => practice.SaveDraft(slug, request, user.Id(), ct)).WithSummary("Lưu bản nháp có kiểm soát hai tab.");
        group.MapPost("/questions/{slug}/reveal", (string slug, RevealRequest request, ClaimsPrincipal user, Practice practice, CancellationToken ct)
            => practice.Reveal(slug, request, user.Id(), ct)).WithSummary("Ghi nhận và mở gợi ý hoặc đáp án.");
        group.MapPut("/questions/{slug}/mark", (string slug, MarkRequest request, ClaimsPrincipal user, Practice practice, CancellationToken ct)
            => practice.Mark(slug, request, user.Id(), ct)).WithSummary("Cập nhật dấu lưu và lịch ôn.");
        group.MapPost("/questions/{slug}/submit", (string slug, SubmitRequest request, ClaimsPrincipal user, Practice practice, CancellationToken ct)
            => practice.Submit(slug, request, user.Id(), ct)).WithSummary("Chốt lượt nộp hoặc bỏ qua.");
        group.MapGet("/attempts/{id:guid}", (Guid id, ClaimsPrincipal user, Practice practice, CancellationToken ct)
            => practice.GetAttempt(id, user.Id(), ct)).WithSummary("Đọc một lượt luyện và các bản cải thiện.");
        group.MapPost("/attempts/{id:guid}/reference", (Guid id, ClaimsPrincipal user, Practice practice, CancellationToken ct)
            => practice.RevealAttempt(id, user.Id(), ct)).WithSummary("Mở tài liệu theo phiên bản lượt luyện.");
        group.MapPut("/attempts/{id:guid}/assessment", (Guid id, RateRequest request, ClaimsPrincipal user, Practice practice, CancellationToken ct)
            => practice.Rate(id, request, user.Id(), ct)).WithSummary("Ghi nhận tự đánh giá cho lượt luyện.");
        group.MapPost("/attempts/{id:guid}/revisions", (Guid id, ReviseRequest request, ClaimsPrincipal user, Practice practice, CancellationToken ct)
            => practice.Revise(id, request, user.Id(), ct)).WithSummary("Thêm phiên bản trả lời cải thiện.");
    }

    private async Task<PracticeResponse> Open(string slug, string owner, CancellationToken ct)
    {
        var row = await db.StudyStates.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == owner && x.Slug == slug, ct);
        var q = row?.DraftId is not null ? await catalog.Version(slug, row.DraftVersion, ct) : await catalog.Published(slug, ct);
        return new(Catalog.View(q, row), row?.DraftId is null ? null : Draft(row, q), row?.LastAttemptId);
    }

    private async Task<DraftResponse> SaveDraft(string slug, SaveDraftRequest request, string owner, CancellationToken ct)
    {
        if (request.Text is null || request.Text.Length > 16000)
            throw ApiProblem.Invalid("Bản nháp tối đa 16.000 ký tự.");
        var (row, q) = await GetDraft(slug, request.Cursor, owner, ct);
        if (row.DraftText == request.Text && row.DraftRevision > 0)
            return Draft(row, q);
        CheckRevision(row, request.Cursor);
        row.DraftText = request.Text;
        await SaveDraftChange(row, ct);
        return Draft(row, q);
    }

    private async Task<DraftResponse> Reveal(string slug, RevealRequest request, string owner, CancellationToken ct)
    {
        if (request.Kind is not ("hint" or "answer"))
            throw ApiProblem.Invalid("Tài liệu yêu cầu không hợp lệ.");
        var (row, q) = await GetDraft(slug, request.Cursor, owner, ct);
        if (request.Kind == "hint" ? row.HintSeen : row.AnswerSeen)
            return Draft(row, q);
        CheckRevision(row, request.Cursor);
        if (request.Kind == "hint") row.HintSeen = true;
        else row.AnswerSeen = true;
        row.LastOutcome ??= "viewed";
        await SaveDraftChange(row, ct);
        return Draft(row, q);
    }

    private async Task<(StudyState Row, QuestionVersion Question)> GetDraft(string slug, DraftCursor cursor, string owner, CancellationToken ct)
    {
        if (cursor is null || cursor.Id == Guid.Empty || cursor.Revision < 0 || cursor.Version < 1)
            throw ApiProblem.Invalid("Thông tin bản nháp không hợp lệ.");
        var row = await db.StudyStates.FindAsync([owner, slug], ct);
        if (row?.DraftId == cursor.Id && row.DraftVersion == cursor.Version)
            return (row, await catalog.Version(slug, row.DraftVersion, ct));
        if (row?.DraftId is not null || cursor.Revision != 0 || await db.Attempts.AnyAsync(x => x.Id == cursor.Id, ct))
            throw ApiProblem.Conflict("Bản nháp đã đổi hoặc đã nộp. Hãy tải lại bản trên máy chủ.");
        var q = await catalog.Published(slug, ct);
        if (q.Version != cursor.Version)
            throw ApiProblem.Conflict("Câu hỏi có phiên bản mới. Tải lại đề trước khi tiếp tục.");
        if (row is null)
        {
            row = new StudyState { UserId = owner, Slug = slug };
            db.StudyStates.Add(row);
        }
        row.DraftId = cursor.Id;
        row.DraftVersion = q.Version;
        row.DraftStartedAt = clock.GetUtcNow();
        return (row, q);
    }

    private async Task SaveDraftChange(StudyState row, CancellationToken ct)
    {
        row.DraftRevision++;
        row.Revision++;
        row.LastActivityAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
    }

    private static DraftResponse Draft(StudyState row, QuestionVersion q) => new(
        new DraftCursor(row.DraftId!.Value, row.DraftRevision, row.DraftVersion),
        row.DraftText, row.HintSeen ? Catalog.Content(q).Hint : null, row.AnswerSeen ? Catalog.Reference(q) : null);

    private static void CheckRevision(StudyState row, DraftCursor cursor)
    {
        if (row.DraftRevision != cursor.Revision)
            throw ApiProblem.Conflict();
    }

    private async Task<IResult> Submit(string slug, SubmitRequest request, string owner, CancellationToken ct)
    {
        if (request.Cursor is null || request.Language is not ("vi" or "en") || request.ActiveSeconds is < 0 or > 3600)
            throw ApiProblem.Invalid("Thông tin lượt luyện không hợp lệ.");
        var id = request.Cursor.Id;
        var existing = await db.Attempts.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner && x.Slug == slug, ct);
        if (existing is not null)
            return TypedResults.Ok(await AttemptView(existing, ct));
        (StudyState row, QuestionVersion q) draft;
        try { draft = await GetDraft(slug, request.Cursor, owner, ct); }
        catch (ApiProblem problem) when (problem.Status == 409)
        {
            existing = await db.Attempts.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner && x.Slug == slug, ct);
            if (existing is null) throw;
            return TypedResults.Ok(await AttemptView(existing, ct));
        }
        var (row, q) = draft;
        CheckRevision(row, request.Cursor);
        if (!request.Skip && string.IsNullOrWhiteSpace(row.DraftText))
            throw ApiProblem.Invalid("Hãy nhập câu trả lời hoặc chọn Bỏ qua.");
        var now = clock.GetUtcNow();
        var elapsed = Math.Clamp((int)(now - row.DraftStartedAt!.Value).TotalSeconds, 0, 3600);
        var attempt = new Attempt
        {
            Id = id, UserId = owner, Slug = slug, Version = q.Version, Text = request.Skip ? "" : row.DraftText,
            Outcome = request.Skip ? "skipped" : "answered", Language = request.Language, HintSeen = row.HintSeen, AnswerSeen = row.AnswerSeen,
            At = now, ActiveSeconds = request.Skip ? 0 : Math.Min(elapsed, request.ActiveSeconds)
        };
        db.Attempts.Add(attempt);
        row.DraftId = null;
        row.DraftStartedAt = null;
        row.DraftText = "";
        row.DraftRevision = 0;
        row.HintSeen = false;
        row.AnswerSeen = false;
        row.Revision++;
        row.LastAttemptId = id;
        row.LastActivityAt = now;
        row.LastOutcome = attempt.Outcome;
        row.Rating = null;
        if (!request.Skip) row.AnsweredCount++;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
            existing = await db.Attempts.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner && x.Slug == slug, ct);
            if (existing is null) throw;
            return TypedResults.Ok(await AttemptView(existing, ct));
        }
        return TypedResults.Created($"/api/practice/attempts/{id}", await AttemptView(attempt, ct));
    }

    private async Task<Attempt> Owned(Guid id, string owner, CancellationToken ct)
        => await db.Attempts.SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct) ?? throw ApiProblem.Missing("Không tìm thấy lượt luyện.");

    private async Task<AttemptResponse> GetAttempt(Guid id, string owner, CancellationToken ct)
        => await AttemptView(await Owned(id, owner, ct), ct);

    private async Task<AttemptResponse> AttemptView(Attempt row, CancellationToken ct)
    {
        var q = await catalog.Version(row.Slug, row.Version, ct);
        var state = await db.StudyStates.FindAsync([row.UserId, row.Slug], ct);
        var rating = await db.Assessments.Where(x => x.AttemptId == row.Id).Select(x => x.Rating).SingleOrDefaultAsync(ct);
        var revisions = await db.Revisions.Where(x => x.AttemptId == row.Id).OrderBy(x => x.At)
            .Select(x => new RevisionResponse(x.Id, x.Text, x.At)).ToArrayAsync(ct);
        return new(row.Id, Catalog.View(q, state), row.Text, row.Language, row.Outcome, row.HintSeen, row.AnswerSeen,
            row.ReferenceViewedAt, row.At, row.ActiveSeconds, rating, revisions);
    }

    private async Task<ReferenceResponse> RevealAttempt(Guid id, string owner, CancellationToken ct)
    {
        var row = await Owned(id, owner, ct);
        if (row.ReferenceViewedAt is null)
        {
            row.ReferenceViewedAt = clock.GetUtcNow();
            await db.SaveChangesAsync(ct);
        }
        return Catalog.Reference(await catalog.Version(row.Slug, row.Version, ct));
    }

    private async Task<AttemptResponse> Rate(Guid id, RateRequest request, string owner, CancellationToken ct)
    {
        if (!Ratings.Contains(request.Rating))
            throw ApiProblem.Invalid("Chọn mức tự đánh giá hợp lệ.");
        var attempt = await Owned(id, owner, ct);
        if (attempt.Outcome != "answered")
            throw ApiProblem.Invalid("Chỉ tự đánh giá lượt đã trả lời.");
        var rating = await db.Assessments.FindAsync([id], ct);
        if (rating is null)
        {
            rating = new SelfAssessment { AttemptId = id };
            db.Assessments.Add(rating);
        }
        rating.Rating = request.Rating;
        rating.At = clock.GetUtcNow();
        var state = await db.StudyStates.FindAsync([owner, attempt.Slug], ct);
        if (state?.LastAttemptId == id)
        {
            state.Rating = request.Rating;
            if (!state.ManualDue)
                state.Due = (await Learning.Today(db, owner, clock, ct)).AddDays(request.Rating switch { "unsure" => 1, "partial" => 3, _ => 7 });
            state.Revision++;
        }
        await db.SaveChangesAsync(ct);
        return await AttemptView(attempt, ct);
    }

    private async Task<IResult> Revise(Guid attemptId, ReviseRequest request, string owner, CancellationToken ct)
    {
        var attempt = await Owned(attemptId, owner, ct);
        if (attempt.Outcome != "answered" || request.Id == Guid.Empty || string.IsNullOrWhiteSpace(request.Text) || request.Text.Length > 16000)
            throw ApiProblem.Invalid("Nhập bản cải thiện cho một lượt đã trả lời.");
        var old = await db.Revisions.SingleOrDefaultAsync(x => x.Id == request.Id && x.AttemptId == attemptId, ct);
        if (old is not null)
            return TypedResults.Ok(new RevisionResponse(old.Id, old.Text, old.At));
        var row = new AnswerRevision { Id = request.Id, AttemptId = attemptId, Text = request.Text.Trim(), At = clock.GetUtcNow() };
        db.Revisions.Add(row);
        await db.SaveChangesAsync(ct);
        return TypedResults.Created($"/api/practice/attempts/{attemptId}", new RevisionResponse(row.Id, row.Text, row.At));
    }

    private async Task<QuestionCard> Mark(string slug, MarkRequest request, string owner, CancellationToken ct)
    {
        var q = await catalog.Published(slug, ct);
        var row = await db.StudyStates.FindAsync([owner, slug], ct);
        if (row is null)
        {
            row = new StudyState { UserId = owner, Slug = slug };
            db.StudyStates.Add(row);
        }
        row.Bookmarked = request.Bookmarked ?? row.Bookmarked;
        if (request.SetDue)
        {
            row.Due = request.Due;
            row.ManualDue = request.Due is not null;
        }
        row.Revision++;
        await db.SaveChangesAsync(ct);
        return Catalog.Card(q, row);
    }
}
