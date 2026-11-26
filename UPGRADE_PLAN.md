# Kế hoạch nâng cấp Interview Practice

Mốc audit 26/11/2026, từ commit `a6090c3`. Các mục dưới đây là tiêu chí nghiệm thu. Bằng chứng chạy và điểm tiếp tục được ghi ở cuối tài liệu và trong PROGRESS.md.

| Ưu tiên | Phạm vi | Phát hiện ở bản gốc | Điều kiện nghiệm thu |
|---|---|---|---|
| P0 · Core Learning | Catalog, Practice, Learning, Data, React | 44 câu, 8 chủ đề. Lịch ôn cộng 1/3/7 ngày từ lúc bấm tự đánh giá. Gửi lại hôm khác có thể dời lịch. Câu bỏ qua không tự vào lịch. Tự tin là nguồn duy nhất trong thống kê vững. | Lịch theo ngày địa phương, lịch sử cùng phiên bản, độ khó và trợ giúp. Kiểm tra lặp request, đổi phiên bản, pin lịch, câu quá hạn. Chấm trắc nghiệm trên server với nguồn riêng. |
| P0 · Vòng học | Ngân hàng, tự luyện, ôn, tổng quan | Sau mỗi lượt người học phải tự tìm câu kế tiếp. Đồng hồ tự luyện mặc định tắt. | Chọn chế độ và quỹ 5/10/15/30 phút, chuyển câu, khôi phục và tổng kết bằng dữ liệu đã nộp. Bổ sung nội dung theo đợt, nguồn và rubric riêng. |
| P0 · Thực thi | Exercises, CodeMirror, SQL Server | API chỉ lưu nháp và phục vụ test công khai để tự đối chiếu. Docker engine chưa sẵn sàng. SQL Server của ứng dụng chứa dữ liệu cá nhân. | Hợp đồng job theo owner, phân trang lịch sử và thông báo rõ khi tắt. Chỉ nhận việc khi đã kiểm chứng cách ly và giới hạn tài nguyên của worker riêng. |
| P1 · Mock và AI | Interviews, AiFeedback | Cùng bộ lọc luôn chọn cùng thứ tự. Có server deadline, revision, ownership, schema AI và trích dẫn. Thiếu số câu tùy chọn, giọng nói và phản hồi theo ngữ cảnh. | Phân bố câu nhờ lịch sử và giới hạn theo thời lượng. Giữ kín đáp án chế độ thi. AI tùy chọn, chấm theo nguồn riêng và giữ CV/JD trong trình duyệt. |
| P1 · Cá nhân hóa | Roadmap, Dashboard, Auth | Lộ trình là danh sách chủ đề, chưa áp dụng số ngày/tuần. Tổng quan đọc toàn bộ lượt trả lời vào RAM. | Lịch theo mục tiêu và múi giờ, ưu tiên nền tảng, heatmap và khối lượng học thực. Có xác nhận và xóa CV/JD, luôn có phương án trả lời bằng chữ. |
| P1 · Giao diện | Các màn hình React | Nhiều panel đồng cấp, mobile phải cuộn qua bản xem code trước khi thấy lịch hôm nay. Chỉ có theme sáng. | Hành động học hôm nay hiển thị đầu trang. Kiểm tra tương phản, focus, bàn phím, hai theme và bố cục desktop/mobile qua ảnh và test. |
| P2 · Vận hành, biên tập | Admin, migrations, API, tài liệu | Nháp và phiên bản xuất bản đã bất biến. Thiếu nhập/xuất biên tập, quản lý đề và giám sát runner. | Migration tăng dần trên DB có dữ liệu. Kiểm tra dữ liệu chéo tài khoản, đồng bộ nhiều tab, phiên bản cũ và hướng dẫn triển khai. |

## Baseline

Build .NET, Vite/TypeScript, ESLint đạt. Bộ kiểm định biên dịch/chạy lời giải đạt 25 ca C# và 6 ca T-SQL. Playwright chạy trên SQL Server QA với Chrome thật và AI tắt. 12 nhóm đạt, nhóm quản trị bỏ qua do thiếu fixture. Đã xem giao diện trước sửa ở desktop và mobile. Giữ hai migration cũ, tất cả khóa slug/version và dữ liệu hồ sơ.

## Nghiệm thu theo giai đoạn

| Giai đoạn | Nghiệm thu tại đợt này | Điểm tiếp tục |
| --- | --- | --- |
| 1 · Core Learning | Kiểm tra cả 12 chế độ, 4 quỹ thời gian, khôi phục, lịch ôn theo ngày, gửi trùng và chấm trắc nghiệm. Batch 02 được kiểm định trên bộ nội dung đầy đủ. | Đợt nội dung tiếp theo ưu tiên Async, EF Core và câu có đáp án xác định. |
| 2 · Coding Platform | Đề C# và T-SQL chạy trong bộ kiểm định nội dung do repo sở hữu. UI cho xem schema, bảng mẫu và lời giải. Hợp đồng worker có định danh theo owner, trạng thái rõ và loại chi tiết hidden khỏi Submit. | Nghiệm thu runner theo [hợp đồng](RUNNER.md). Worker, giới hạn thực thi, định mức bộ nhớ và lịch sử toàn tài khoản còn mở. |
| 3 · Interview Intelligence | Kiểm tra chọn câu qua nhiều phiên, giữ kín rubric, pause/resume, deadline, feedback theo nguồn và lỗi provider. | Thử dịch vụ OpenAI thật, thêm vòng luyện code có chấm khi có worker. |
| 4 · Personalization | Kiểm tra CV/JD tại trình duyệt, tải TXT, xóa, thiết lập lộ trình, đổi ngày nghỉ và phương án văn bản khi thiếu Speech Recognition. | Mở rộng định dạng CV, đánh giá giọng nói trên thiết bị thật, thêm đề xuất theo dự án và mức bằng chứng. |
| 5 · UI/UX | Rà 14 màn hình ở năm chiều rộng và hai theme, kiểm tra tràn ngang, focus bàn phím, khôi phục theme và chụp bằng Chrome. | QA bàn phím/IME vật lý và công nghệ hỗ trợ trên các trình duyệt khác. |
| 6 · Production Quality | Biên tập và xuất bản câu hỏi theo phiên bản, phân quyền, readiness, build/publish và nâng cấp DB từ bản cũ. | Quản trị dataset, test case, preset và roadmap. Đo hiệu năng trên dữ liệu đại diện và triển khai staging. |

Số ca, kết quả chạy cuối, lệnh tái hiện và ảnh được ghi trong [PROGRESS.md](PROGRESS.md).
