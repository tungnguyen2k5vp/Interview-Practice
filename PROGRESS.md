# Bàn giao nâng cấp Interview Practice

## V2 · Phase 2 · Hai batch đã kiểm định

Đã thêm 24 câu C#/LINQ, 12 câu T-SQL, hai bài C# và hai bài SQL. Ngân hàng có 94 câu chính trên 11 chủ đề, với 13 Intern, 19 Fresher, 42 Junior, 17 Middle và 3 Senior. 42 câu có đáp án lựa chọn trực tiếp, 52 câu có bài vận dụng gắn với lượt tự luận. Tổng số bài thực hành là 22 (11 C#, 11 SQL).

Đã chạy toàn bộ 97 ca nội dung trên .NET 10 và SQL Server, đối chiếu preview với dataset thật và kiểm tra 67 URL nguồn HTTPS. Cả 36 đáp án mới đều được đối chiếu bằng kết quả thực thi độc lập. Kiểm tra cả hai ngôn ngữ cho đề trùng gần, khóa đáp án, slug, prerequisite và chu trình. Hai suite E2E của bản mở rộng đạt 21 và 22 nhóm.

Còn 156 câu để đạt mốc 250. Cần thêm ít nhất 68 câu Intern/Fresher và 58 câu Junior. Các batch tiếp theo ưu tiên HTTP/ASP.NET Core, EF, kiến trúc và tình huống behavioral.

## V2 · Phase 1 đã kiểm chứng ngày 26/11/2026

- 58 câu chính có đường kiểm chứng. Sáu câu có khóa quiz, 52 câu còn lại có tình huống vận dụng Việt–Anh chấm tại máy chủ. Đề mở được chụp theo phiên bản và xáo lựa chọn. Lượt tự luận, tự đánh giá, đánh giá AI, bài vận dụng và kết quả worker lưu riêng.
- Lượt sai, cần trợ giúp và bằng chứng hết hạn làm mất chuỗi kiểm chứng. Ngày học mới lưu lúc nộp. Ngày cũ được khôi phục theo múi giờ có trong hồ sơ khi nâng cấp vì V1 chưa lưu múi giờ từng lượt. Đã thử đổi qua đường đổi ngày, hai phiên cùng câu, tab cũ, nộp trùng và truy cập chéo tài khoản.
- Migration tăng dần `20261126091535_LearningEvidenceV2` đã chạy trên SQL Server QA có dữ liệu V1. Đã đối chiếu câu trả lời, rubric, tự đánh giá, chủ sở hữu và ngày ôn thủ công. Seed trên kho câu trống giữ được câu `sql-constraints` V1 có lựa chọn trong đề. EF đối chiếu model và snapshot đạt.
- Đã chạy build React/TypeScript, ESLint, build Release .NET, 42 kiểm tra logic và giao thức, 49 ca nội dung thực thi trên C#/T-SQL, 21 nhóm E2E khi tắt AI và 22 nhóm với provider fixture. Ca tích hợp riêng dùng SQL Server thật và HTTP handler kiểm thử, xác nhận verdict đồng bộ sau restart, che hidden output, phân biệt owner/trợ giúp và giữ kết quả accepted sau lần chạy thử. Chưa kiểm chứng dịch vụ OpenAI hoặc worker chạy mã thí sinh.
- Chrome đã chụp 15 màn hình V2, hai theme tại 360/390/768/1024/1440/1920 px. Đã tái hiện cùng câu trên giao diện V1 ở sáu kích thước. [Mobile V1](docs/qa/v1-essay-390-dark.png) · [Mobile V2](docs/qa/transfer-390-dark.png) · [Desktop V1](docs/qa/v1-essay-1920-light.png) · [Desktop V2](docs/qa/transfer-1920-light.png)

Tiếp theo là batch nội dung Phase 2 theo [kế hoạch V2](UPGRADE_PLAN_V2.md). Các số và giới hạn bên dưới thuộc V1.

## Bản V1

Mốc 26/11/2026. Phạm vi bắt đầu từ commit `a6090c3`. [Audit và tiêu chí nghiệm thu](UPGRADE_PLAN.md)

| Giai đoạn | Đã triển khai | Phần cần tiếp tục |
| --- | --- | --- |
| 1 · Vòng học | 12 chế độ và quỹ 5/10/15/30 phút, danh sách câu theo phiên bản, khôi phục sau refresh, tổng kết, chấm trắc nghiệm ở server. Lịch ôn SM‑2 xét ngày địa phương, độ khó, trợ giúp và lịch sử. Tự đánh giá, AI và bằng chứng đúng có nguồn riêng. | Thêm câu có đáp án khách quan và mở rộng ngân hàng theo batch kiểm định. |
| 2 · C# và SQL | Editor có tô cú pháp, gợi ý, căn lề, nháp và reset. SQL hiển thị bảng từ dataset thật. Gateway và giao diện có hợp đồng Run/Submit, lịch sử phân trang, hủy job và so sánh hai verdict. | Run/Submit tắt. Chưa có worker cách ly để xác minh thực thi C#/T-SQL, chấm hidden test, giới hạn tài nguyên và dọn job. |
| 3 · Mock và AI | Bảy bộ đề, chọn số câu, hạn chế lặp và ưu tiên câu yếu. Phiên hướng dẫn có thể đổi thứ tự câu còn lại và hỏi sâu theo câu trả lời. Phiên thi giữ deadline ở server và công bố tài liệu sau khi hết phiên. | Xác minh bằng OpenAI thật. Mock Coding là vòng giải thích thuật toán. Kết quả thực thi trong mock còn phụ thuộc worker. |
| 4 · Cá nhân hóa | Lộ trình 7/14/30/60/90 ngày và tùy chỉnh. Kế hoạch theo ngày, quỹ thời gian, thứ tự kỹ năng tiên quyết và lịch sử thật. CV/JD hỗ trợ dán văn bản hoặc TXT, checklist, câu hỏi về dự án và bằng chứng luyện theo kỹ năng. Giọng nói dùng Web Speech, transcript sửa được, ghi âm nghe lại khi người dùng bật. | CV/JD nhận diện kỹ năng bằng từ khóa và chỉ nhận TXT. Ghi âm giữ trong bộ nhớ phiên. Chưa xác minh microphone hoặc IME trên thiết bị vật lý, Safari hay Firefox. |
| 5 · Giao diện | Thiết kế lại Dashboard, phiên học, tự luyện, C#/SQL, thiết lập mock và báo cáo. Lộ trình và ôn tập có điểm bắt đầu trực tiếp. Theme sáng/tối, focus, điều hướng bàn phím và panel đổi kích thước trên desktop. | Kiểm tra thêm với công nghệ hỗ trợ và thiết bị thật. |
| 6 · Dữ liệu, biên tập và vận hành | Migration tăng dần, readiness probe, truy vấn thống kê tổng hợp ở SQL Server. Admin tạo, xem trước, nhập/xuất JSON, phát hiện đề trùng và biên tập lựa chọn, rubric, liên kết. Phiên bản đã dùng vẫn đọc được từ lượt cũ. | Dataset, test case, preset và roadmap vẫn biên tập qua mã/tệp. Chưa đo tải production hoặc triển khai worker. |

## Nội dung đã kiểm định

| Hạng mục | Batch mới | Tổng sau nâng cấp |
| --- | ---: | ---: |
| Câu Việt–Anh | 14 | 58 |
| Chủ đề | 3 | 11 |
| Bài C# | 3 | 9 |
| Bài T-SQL | 3 | 9 |
| Bộ mock | 4 | 7 |
| Câu chấm theo đáp án xác định | 6 | 6 |

Batch có nguồn HTTPS, gợi ý hai bước, câu đào sâu, rubric, kiến thức tiên quyết và liên kết ôn tập. Bộ kiểm định đã kiểm tra 58 bản ghi, chạy 37 ca bài C#, 3 ví dụ C# trong câu hỏi và 9 truy vấn T-SQL. Dữ liệu mẫu SQL được đối chiếu với chính dataset trên SQL Server. Mục tiêu dài hạn trong brief là 400–600 câu, 60 bài C# và 50 bài SQL.

## Kiến trúc và dữ liệu

`StudySessions` lưu owner và danh sách câu theo phiên bản. Migration `20261126035424_StudyRecall` thêm dữ liệu lịch ôn, bằng chứng trắc nghiệm, khóa theo phiên học và index theo owner/câu/phiên bản. Hai migration trước được giữ. Kiểm tra nâng cấp sử dụng một lượt luyện tạo bằng bản gốc trên SQL Server QA và đọc lại nguyên văn câu trả lời, rubric, tự đánh giá và ngày ôn thủ công sau khi áp migration.

Ôn tự luận và tự tin vẫn có giá trị để chọn lịch. Hai ngày trả lời đúng độc lập theo đáp án xác định mới đạt khá vững. Thành thạo cần từ ba ngày có bằng chứng đúng, cách mốc đầu tối thiểu bảy ngày. Sau khi xuất bản phiên bản mới, lịch tự động được đánh giá lại theo phiên bản đó và lịch ôn thủ công được giữ.

## Kết quả kiểm thử

| Phạm vi | Kết quả |
| --- | --- |
| Vite, TypeScript, ESLint, .NET Release và publish | Đạt. Build .NET có 0 cảnh báo và 0 lỗi. Gói publish có ứng dụng React, script theme, font và dữ liệu ngân hàng. |
| Unit checks | 16 đạt. Gồm 13 ca lịch ôn/múi giờ và 3 ca hợp đồng kết quả runner. |
| Kiểm định nội dung | 49 ca thực thi đạt, 58 bản ghi câu hỏi hợp lệ. |
| EF và nâng cấp DB | Schema đã nâng cấp từ bản cũ trên SQL Server QA. EF xác nhận Release khớp migration mới nhất. |
| E2E/API với AI tắt | 19 nhóm đạt, 0 lỗi, 0 bỏ qua. |
| E2E/API với AI fixture | 20 nhóm đạt, 0 lỗi, 0 bỏ qua. Xác minh quota, trích dẫn sai và timeout 20 giây giữ nguyên câu trả lời đã nộp. |
| Impeccable | Detector trả danh sách rỗng. CodeMirror đã chỉnh nền tối sau khi rà ảnh thật. |
| Kiểm thử phụ thuộc môi trường | Chờ worker cách ly, OpenAI thật và thiết bị vật lý. |

Playwright chụp 14 màn hình trong Chrome ở cả hai theme và năm chiều rộng. Bộ ảnh đại diện được lưu trong repo. Suite `web/checks/upgrade.mjs` ghi các ảnh còn lại vào `.impeccable/review/`.

| Chiều rộng | Màn hình |
| --- | --- |
| 360 px | [Phiên học nhanh, sáng](docs/qa/study-360-light.png) |
| 390 px | [Editor C#, tối](docs/qa/coding-390-dark.png) |
| 768 px | [Lộ trình, tối](docs/qa/roadmap-768-dark.png) |
| 1024 px | [Báo cáo mock, sáng](docs/qa/mock-report-1024-light.png) |
| 1440 px | [Dashboard, sáng](docs/qa/dashboard-1440-light.png) |

## Chạy và triển khai

- [README](README.md) có lệnh chạy local, cấu hình SQL Server, admin, AI và cách chạy lại các suite.
- [RUNNER](RUNNER.md) có giao thức worker và điều kiện xác nhận cách ly trước khi bật thực thi.
- Khi triển khai, build frontend trước khi publish .NET, sao lưu SQL Server, áp migration với quyền riêng rồi xác nhận `/api/health/ready`. Đưa cấu hình AI qua secret store và xác minh phản hồi thật bằng môi trường staging.
- Tiếp tục kiểm định nội dung theo batch. Sau khi có worker độc lập, nghiệm thu giới hạn tài nguyên và hidden test trước khi bật Run/Submit. Các hạng mục quản trị còn lại được ghi trong [kế hoạch](UPGRADE_PLAN.md).
