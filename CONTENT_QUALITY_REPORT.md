# Kiểm định ngân hàng V3 · 27/11/2026

Đơn vị đếm là slug ở version phát hành. 256 câu có prompt Việt–Anh, 198 câu có key trực tiếp, 58 câu viết có bài kiểm tra vận dụng riêng. Một bài vận dụng hoặc một bản dịch không tăng số câu. Tất cả 154 câu mới ở ba trình độ đầu. Không đưa bản nháp vào seed.

| Nội dung | Trước | Sau | Tăng | Mục tiêu dài hạn |
|---|---:|---:|---:|---:|
| Câu hỏi chính |102|256|154|1.000|
| C# Coding (gồm lab sửa lỗi) |14|24|10|200|
| T-SQL |11|21|10|150|
| Debugging Lab (đã tính trong C#) |3|7|4|80|
| Code Review |15|23|8|60|
| System Design |8|20|12|40|
| Project Interview theo ngành |0|10|10|40|
| Mock preset |7|11|4|50|

| Trình độ | Trước | Sau | Chủ đề | Trước | Sau |
|---|---:|---:|---|---:|---:|
| Intern |16|55| C# & .NET |25|49|
| Fresher |21|83| LINQ & Async |15|39|
| Junior |45|98| ASP.NET Core |14|38|
| Middle |17|17| EF Core |6|22|
| Senior |3|3| SQL & Database |19|43|
| | | | Thuật toán |8|8|
| | | | OOP & Thiết kế |5|17|
| | | | Hệ thống phân tán |2|6|
| | | | Git & Triển khai |2|10|
| | | | HR & Dự án |1|7|
| | | | Testing & Tình huống |5|17|

Độ khó sau nhập gồm 144 easy, 99 medium, 13 hard. Phân loại sau nhập gồm 87 predict, 10 debug, 9 compare, 20 design, 9 experience, 115 quiz, 4 concept và 2 read. 236/256 câu ở mức Intern–Junior. Các chủ đề, trình độ, dạng câu trong admin được đếm từ các **version đang xuất bản**, còn bảng trên đếm bản phân phối mặc định.

## Bằng chứng

- `node web/checks/content.mjs --sources` trả **206 URL HTTPS đạt**, **218 ca thực thi đạt**, 0 lỗi, 0 bỏ qua. Gồm ví dụ/test của bài C#, T-SQL reference, metadata cột và kết quả của snippet chạy được. Bản kiểm thử kiểm thêm 21 preview bảng trên SQL Server. Tám bài mới dùng schema thư viện và kỳ thi dùng lại; hai bài khác dùng chung schema lớp học. Thứ tự được so theo hợp đồng của từng bài.
- Báo cáo phạm vi từng câu nằm trong [SOURCES.md](SOURCES.md). Đã mở tài liệu cho bài biên soạn, đối chiếu điều kiện đáp án/distractor ở cả hai ngôn ngữ, kiểm tra phiên bản và các liên kết giữa slug. Các URL có ngày kiểm tra mạng; HTTP 200 không tự xác nhận một mệnh đề kỹ thuật. Câu giao tiếp dùng rubric để tự đánh giá và bài vận dụng có tình huống với key. Chưa có người phỏng vấn bên ngoài chấm độc lập toàn bộ ngân hàng.
- Kiểm tra duplicate slug, prompt VI/EN gần giống bằng bigram, key đơn/đa lựa chọn, topic/level/format, tiên quyết vòng lặp, liên kết concept tới bài áp dụng và code review. Không xóa slug cũ. Trong review trước xuất bản, đổi câu phân trang EF sang bài lấy **trang trước** để khác mục tiêu với câu SQL lấy trang kế. Sửa 16 trường bẫy EF/Git/Docker và làm rõ nguồn cho FindAsync. Giữ 1 câu legacy `sql-constraints` và cách chấm viết của version đó.
- TypeScript, Vite production build, ESLint và .NET Release qua kiểm tra. Chrome + SQL Server chạy **13 nhóm journey và 16 nhóm upgrade**, 0 lỗi, 0 bỏ qua, dùng AI fixture. Có thử gửi lại import, giữ bản công khai qua các bước thẩm định, ngăn cycle khi xuất bản và giữ câu trả lời cũ khi ngừng/khôi phục. Cây bằng chứng đọc đúng owner, version và trạng thái thật.
- Đã xem giao diện desktop/mobile của tra concept, project interview và admin. Browser regression kiểm tra 360, 390, 768, 1024, 1440 và 1920 px ở cả hai theme. Impeccable detector trả danh sách rỗng. Các ảnh QA ở `.impeccable/review/v3-*.png`.
- C# và T-SQL đi qua gateway HTTPS local, worker và Chrome. Bộ worker kiểm tra quyền sở hữu, private verdict, test public/private, cách ly, hủy và khôi phục lịch sử. Thông số staging thực, OpenAI bằng tài khoản thật và thiết bị hỗ trợ vật lý chưa nghiệm thu.

## Phần còn mở

Trong lần chạy catalog Docker, cả **45/45 lời giải** qua test riêng và **7/7 starter debugging** tái hiện lỗi dự kiến. Kiểm tra trực tiếp bản publish Development tại cổng 5074 trả ready, trang ngân hàng HTTP 200 và API trả 256 câu.

Đo 30 request tuần tự sau một lần warm-up trên bản local, tài khoản khách, cùng SQL Server đang kiểm thử. P50/P95 tính bằng ms: alias DI 10,6/25,2; hai từ không dấu “trang truoc” 69,4/92,6; lọc kỹ năng DI 22,5/30,6; trang 20 là 11,5/15,1. Câu truy vấn bắt đầu bằng bộ lọc topic/level/difficulty có index ghép sẵn. Tìm chuỗi con và đọc tag JSON có thể cần scan. Dùng cùng phép đo với dữ liệu lớn hơn trước khi chọn chỉ mục full-text. Không cache kết quả học giữa các tài khoản.

Không có câu mới ở trạng thái nháp được cộng vào 256. Còn 744 câu tới 1.000; tới mốc tiếp theo 500 cần 244 câu. Catalog chưa phủ mọi concept ở chiều sâu như nhau. Chín lựa chọn roadmap bao gồm một lộ trình tùy chỉnh. Kế hoạch ngày dùng thời lượng, due cards và tiến độ; chuỗi bài và liên kết vận dụng của từng concept vẫn cần biên tập thêm. Bảng độ phủ admin hiện tập trung vào câu hỏi. Chưa có benchmark index full-text trên dữ liệu production hoặc thống kê tần suất tuyển dụng Việt Nam có tính đại diện. [Ma trận và kế hoạch](CONTENT_ROADMAP.md)
