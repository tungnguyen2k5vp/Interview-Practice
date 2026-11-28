# Kế hoạch V4

Ngày bắt đầu 27/11/2026; checkpoint 28/11/2026. Baseline `30b34ea` đã được đối chiếu: seed và API local đều 256 câu, content harness đạt 218 ca thực thi. Phase 1–2 hoàn tất đủ chỉ tiêu và gate bên dưới. Không có migration mới. [Kết quả và giới hạn kiểm định](CONTENT_QUALITY_REPORT.md).

| Phase | Ưu tiên và phụ thuộc | Mục tiêu | Tiêu chí nghiệm thu | Checkpoint |
|---|---|---|---|---|
| 1 · Verify V3 | P0, bắt đầu | Đối chiếu số lượng, chạy lại hồi quy và kiểm nguồn | Seed/API thống nhất; build, lint, .NET checks, browser và worker có kết quả | Đạt baseline: 218 ca thực thi, 13 journey + 16 upgrade; .NET recall/import/runner sync đạt |
| 2 · Content expansion | P0 sau audit | 500 câu, 80 C# gồm 30 debug, 60 SQL, 40 review, 30 design, 25 project, 25 preset | Batch 30–50 câu có nguồn hỗ trợ, schema, song ngữ, kiểm mục tiêu trùng, import, quiz key, UI; reference và mutation sai có kết quả thực | Đạt: 546 ca thực thi, 140 reference Docker, 95 mutant bị bắt, 30 starter tái hiện lỗi; 17 upgrade, gateway, import và UI đạt |
| 3 · Interactive learning | P0 sau core content | 30 bài học theo concept và bốn cách học | Tiên quyết, lý giải, ví dụ, câu tương tác, bài áp dụng, mock và lịch ôn; đọc không tăng mastery | Chờ Phase 2 |
| 4 · Practical engineering | P0 sau nền nội dung | 10 mini project cùng vòng Learn→Review | Requirements, starter, acceptance, test, reference, kiến trúc và bảo mật; dùng runner có cách ly hoặc self-practice rõ phạm vi | Chờ Phase 3 |
| 5 · Interview intelligence | P0 AI, P1 countdown | Chiến lược đào sâu, thời gian/ngân sách, hồi phục provider; lịch 1/3/7/14/30 ngày | Bám câu trả lời và rubric, giữ kín đáp án khi thi; lịch trong quỹ thời gian, trạng thái qua retry | Chờ Phase 4 |
| 6 · Personalization | P1 | 300 thuật ngữ, 100 mẫu câu, 30 tình huống English; nhật ký lỗi, readiness và analytics | Dữ liệu thật theo owner/version, chấm kỹ thuật/diễn đạt riêng, có đường luyện lại | Chờ Phase 5 |
| 7 · Refinement | P1 sau luồng hoàn chỉnh | UI, a11y, hiệu năng và production verification | Sáu kích thước, hai theme, bàn phím, loading/error/empty; đo 500/1.000 câu; giữ dữ liệu | Chờ Phase 6 |

## Baseline đã kiểm đếm

| Câu | Intern | Fresher | Junior | Middle | Senior | C# | SQL | Debug (trong C#) | Review | Design | Project | Mock |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|256|55|83|98|17|3|24|21|7|23|20|10|11|

Có 10 concept và 58 bài vận dụng. Topic csharp 49, linq 39, aspnet 38, efcore 22, sql 43, oop 17, testing 17, systems 6, delivery 10, behavioral 7 và algorithms 8. Sử dụng ma trận 1.000 trong CONTENT_ROADMAP.md.

## Checkpoint nội dung V4

Sáu batch 20–25 có 42, 42, 40, 40, 40 và 40 câu. Tổng 500 câu gồm Intern 99, Fresher 142, Junior 183, Middle 61 và Senior 15; 424 câu cho ba trình độ đầu. Có 370 câu có key trực tiếp, 130 câu viết có bài vận dụng riêng. Stable ID và phiên bản V3 được giữ nguyên.

Đã bổ sung 56 C#, 39 SQL, 17 code review, 10 system design, 15 project interview và 14 preset. Debugging là tập con của C#, không cộng hai lần. Bộ chọn 25 preset dùng select có nhãn, tự điền mức/thời lượng; phiên và lịch sử hiển thị tên bộ đề từ catalog.

Nguồn đã đối chiếu theo mệnh đề trong manifest 406 mục; kiểm HTTP đạt 488 URL đang dùng. Hai URL LeetCode bị 403 được thay bằng định nghĩa/invariant công khai và lưu trạng thái cũ. Đo tìm kiếm với 500 câu thật và 1.000 hàng QA, xóa hàng scale sau đo; chưa có bằng chứng cần thêm cache hoặc full-text.

Điểm tiếp tục sau phát hành checkpoint là **Phase 3: 30 interactive lessons**, dùng lại taxonomy, nội dung và scheduler. Phase 4–7 còn nguyên phạm vi: 10 mini project, AI/countdown sâu hơn, Technical English, journal, readiness, analytics và nghiệm thu production. Không thêm màn hình placeholder để đại diện phần chưa triển khai.

## Quy tắc checkpoint

Mỗi batch có danh sách mục tiêu kiến thức, slug, nguồn, phiên bản framework và kết quả kiểm. Chỉ nội dung kiểm định được đặt vào seed xuất bản. Lịch sử và stable ID đã có tiếp tục dùng revision hiện hành. Thao tác QA dùng DB riêng và fixture trong .artifacts. Nếu cần chuyển phiên, hoàn tất batch đang làm, cập nhật các báo cáo và ghi rõ phần còn lại.
