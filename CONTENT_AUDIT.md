# Baseline V3 · 27/11/2026

Commit `8481652`, branch `main`, working tree sạch, HEAD trùng tracking ref `origin/main`. Đếm theo slug từ tất cả `server/Content/questions*.json`, đối chiếu GET /api/questions của ứng dụng local đang dùng SQL Server, cả hai trả 102. Mỗi đề song ngữ chỉ tính một lần. Đây là mốc trước khi nhập V3.

| Chủ đề seed | Số câu | Chủ đề seed | Số câu |
|---|---:|---|---:|
| C# & .NET |25| LINQ & Async |15|
| ASP.NET Core |14| EF Core |6|
| SQL & Database |19| Thuật toán |8|
| OOP & Thiết kế |5| Testing & Tình huống |5|
| Hệ thống phân tán |2| Git & Triển khai |2|
| HR & Dự án |1| Tổng |102|

| Intern | Fresher | Junior | Middle | Senior | Dễ | Vừa | Khó |
|---:|---:|---:|---:|---:|---:|---:|---:|
|16|21|45|17|3|43|46|13|

Dạng câu: 45 predict, 10 debug, 9 compare, 20 design, 3 experience, 9 quiz, 4 concept, 2 read. Dạng biên tập và cách chấm là hai chiều khác nhau. Có 50 câu có key ngay trong đề, 52 bài vận dụng phụ theo phiên bản dành cho câu viết. Bài vận dụng không được cộng vào 102. `sql-constraints` lịch sử gắn nhãn quiz nhưng lưu câu viết.

| Học liệu | Cách đếm | Ban đầu |
|---|---|---:|
| C# | Exercise kind coding |14|
| T-SQL | Exercise kind sql |11|
| Debugging Lab | Exercise tag debug-lab, đã nằm trong 14 C# |3|
| Code Review | Case có slug, diff và rubric |15|
| System Design | Scenario có slug, version 1 |8|
| Project Interview | Scenario ngành biên soạn riêng |0|
| Mock Interview | Preset có ID |7|

Project Interview có 10 quy tắc tạo câu hỏi theo dòng mã repository. Số file khớp trong một repo cụ thể không đo được số scenario ngành. Sáu lộ trình seed gồm cả mục tùy chỉnh. Ba placement track khóa phiên bản đề tại lúc bắt đầu.

## Bằng chứng và khoảng trống

- Recall dùng lượt làm độc lập qua nhiều ngày. Tự chấm, rubric AI và kết quả vận dụng có nguồn riêng. Skill tree hiện chiếu trạng thái theo câu. Các câu về cùng một concept chưa có quy tắc tổng hợp bằng chứng ở baseline.
- Bộ chấm C# so output thật. Bộ SQL kiểm cột, kiểu, dòng và thứ tự tùy hợp đồng. Source URL thành công chỉ chứng minh trang có thể truy cập. Báo cáo CI V2 có browser/API, worker cục bộ có biên bản riêng. Kết quả chạy lại V3 nằm trong [CONTENT_QUALITY_REPORT.md](CONTENT_QUALITY_REPORT.md). [CI baseline](https://github.com/tungnguyen2k5vp/Interview-Practice/actions/runs/45933833395)
- Tìm kiếm phân trang trên SQL theo chuỗi con, collation CI_AI, 9 câu/trang. Từ viết tắt như DI dễ khớp nhầm đoạn chữ trong từ khác. Chưa có chỉ mục full-text. Không thể suy ra độ trễ ở quy mô production từ 102 câu.
- 45/102 câu thuộc dạng dự đoán. Chỉ 1 câu thuộc topic behavioral dù còn câu về dự án ở topic testing. EF Core, testing theo tình huống, giao tiếp kỹ thuật và Git là các ưu tiên biên tập. Các gợi ý và rubric của một số đề cũ lặp ý. Kiểm tra bằng bigram VI/EN phát hiện câu gần giống về từ vựng, không chứng minh không trùng mục tiêu kiến thức.
- Quản trị đã có lịch sử và audit theo version. Seed bỏ qua slug đã có nên import lại giữ tiến độ và bản biên tập; sửa file v1 của một slug đã xuất bản không cập nhật DB cũ. Đổi đáp án cần xuất bản revision mới.
