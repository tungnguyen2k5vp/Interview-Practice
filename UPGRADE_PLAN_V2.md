# Interview Practice V2

Audit từ commit `b576821`, ngày 26/11/2026. Working tree sạch trước khi bắt đầu. Mục tiêu và thứ tự triển khai theo master prompt V2.

## Phát hiện đã xác minh

| Ưu tiên | Phát hiện | Phụ thuộc | Tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| P0 | Chỉ 6/58 câu có quiz key. Tự luận chưa có con đường kiểm chứng. | Nội dung kiểm tra theo câu và phiên bản | Câu tự luận có bài vận dụng riêng, chấm tại server và lưu nguồn bằng chứng. Tự tin và AI hiển thị riêng. |
| P0 | Schedule chỉ xóa chuỗi ngày đúng khi quality bằng 0. Sau một lượt có trợ giúp, chuỗi cũ có thể khôi phục mastery. | Scheduler và dữ liệu lịch sử | Các chuỗi quên, sai, dùng trợ giúp, cùng ngày và quá hạn có test. Thành thạo cần chuỗi bằng chứng mới sau khi suy giảm. |
| P0 | Lịch được suy ra lại theo múi giờ hiện tại. Đổi timezone có thể tách/gộp ngày của lượt cũ. | Migration tăng dần | Lưu ngày học ở thời điểm phát sinh. Đổi timezone chỉ áp cho lượt mới, giữ ngày ôn thủ công. |
| P0 | Bản nháp dùng chung theo owner/câu. Lượt đã nộp có thể được trả lại cho yêu cầu từ phiên khác. | Khóa phiên, khóa câu và cursor | Quy tắc bản nháp dùng chung rõ ràng. Lượt submit thuộc đúng phiên, request trùng trả cùng kết quả, phiên đóng chặn ghi. |
| P0 | Bài được loại khỏi danh sách cần luyện chỉ bằng Reviewed. | Mô hình submission và gateway | Tự đối chiếu, có trợ giúp, accepted và giải độc lập có trạng thái riêng. Chỉ kết quả worker hợp lệ cập nhật thực thi. |
| P0 | Gateway thiếu kiểm tra số liệu, thời điểm, trạng thái và cấu trúc kết quả. Chưa có worker. | Môi trường cách ly | Source worker, queue bền vững, cancellation/recovery và test hợp đồng. Chỉ bật thực thi sau kiểm định cách ly. |
| P1 | Flashcard/speed dùng cùng form. Wrong mode chỉ xét đáp án sai. | Phase 1 | Tương tác và điều kiện hoàn thành theo mode, lý do ôn có nguồn và khôi phục đồng hồ. |
| P1 | AI hỏi sâu bằng nút thủ công. CV/JD chỉ hỗ trợ TXT và Async chung nhãn LINQ. | Hợp đồng AI, taxonomy và parser | Opt-in, ngân sách, fallback, xác nhận nội dung trích xuất và nguồn đánh giá rõ. |

## Thứ tự và checkpoint

1. Learning correctness. Hoàn thiện scheduler, bài kiểm chứng cho câu tự luận, nguồn đánh giá, ngày học bất biến, quy tắc draft và tiến độ thực hành. Kiểm thử trên DB QA có dữ liệu V1 trước khi đi tiếp.
2. Content expansion. Chia batch theo chủ đề, kiểm tra trùng gần, đồ thị tiên quyết, bản dịch, nguồn và code. Mục tiêu 250–300 câu với ít nhất 100 Intern/Fresher và 100 Junior.
3. Real execution. Threat model, worker C#/T-SQL riêng, hợp đồng gateway và submission. Khi thiếu môi trường, ghi BLOCKED cùng lệnh tái hiện.
4. Interview intelligence. Ba chế độ, câu hỏi theo ngữ cảnh và báo cáo có bằng chứng.
5. Practical labs. Project import, code review và sửa lỗi thực hành theo hợp đồng đã ổn định.
6. Personalization. Placement, skill tree, PDF/DOCX và voice.
7. Advanced product. Canvas thiết kế hệ thống và quản trị nội dung có audit log.
8. Production verification. CI, bảo mật, migration, browser và tài liệu staging.

## Quyết định Phase 1

- Tiếp tục SM-2 điều chỉnh. Mức độ kiểm chứng chỉ dùng chuỗi trả lời độc lập còn hiệu lực. Tự đánh giá, AI và kết quả bài vận dụng lưu theo nguồn và phạm vi.
- Mỗi câu tự luận có bài kiểm tra vận dụng biên soạn riêng. Kết quả chứng minh phần kiến thức được hỏi trong bài kiểm tra. Rubric của câu tự luận vẫn hiển thị để đánh giá chiều sâu diễn đạt.
- Dùng chung bản nháp theo owner/câu/phiên bản, khóa revision và thông báo rõ khi nộp ở một ngữ cảnh khác. Phiên học lưu lượt nộp riêng.
- Giữ migration cũ và nội dung lịch sử. Nội dung kiểm tra được chụp vào lượt mở để lần triển khai sau không thay đáp án của bài đang làm.

## Kết quả

Phase 1 đã hoàn tất kiểm thử ngày 26/11/2026. Migration nâng từ V1 giữ nguyên bản trả lời, rubric và lịch thủ công. Đã kiểm tra đường khởi tạo mới, hai phiên đồng thời, retry, đổi múi giờ và verdict qua SQL Server. Có 58 câu chính, 52 bài vận dụng bổ sung và 18 bài C#/SQL. Run/Submit tắt trong cấu hình mặc định. Kết quả từng suite và ảnh so sánh nằm trong [PROGRESS.md](PROGRESS.md).

Phase 2 đã nghiệm thu hai batch C#/LINQ và SQL cùng bốn bài thực hành. Hiện có 94/250 câu, 32/100 Intern/Fresher và 42/100 Junior. Cả 36 câu mới có output được đối chiếu trên runtime. Docker Desktop đã được khởi động và `docker info` xác nhận Linux Engine 29.4.3.

Phase 3 đã nghiệm thu trên máy QA. Có worker HTTPS, SQLite bền vững, container C#/T-SQL dùng một lần và biên bản kiểm định theo image ID. Đã chạy 22/22 lời giải, bảy nhóm kiểm tra giới hạn/cách ly và Chrome → gateway → worker → tiến độ SQL Server, gồm đối soát khi đóng trang. Còn nghiệm thu trên host staging thật trước khi bật trên môi trường đó. [Kết quả và ảnh](PROGRESS.md) · [Lệnh triển khai](RUNNER.md)
