# Bàn giao nâng cấp Interview Practice

## V2 · Phase 7 · Thiết kế hệ thống và quản trị học liệu

Thêm tám tình huống thiết kế hệ thống. Sơ đồ có 11 loại thành phần, liên kết có hướng, ghi chú đánh đổi, điều khiển kéo thả hoặc bàn phím, tự lưu theo thiết bị/phiên bản đề và xuất SVG. Phần tự đối chiếu kiểm tra kết nối và hỏi về luồng dữ liệu, nhất quán, mở rộng, phục hồi và bảo mật.

Quản trị mở rộng sang bài C#/SQL/debugging, code review, bộ phỏng vấn, nhóm kỹ năng, lộ trình và đề thiết kế hệ thống. Có nhập/xuất JSON, xem trước, xuất bản theo phiên bản và nhật ký thao tác. Test ẩn được nhập/xuất cục bộ rồi chuyển thẳng lên host worker. API xác nhận worker hỗ trợ đúng loại và phiên bản bài trước khi cho nộp. Migration `20261126163855_EditorialMaterials` thêm bảng học liệu và nhật ký, đã đối chiếu câu trả lời, rubric và ngày ôn từ Phase 6.

Flashcard ghi nguồn tự đánh giá riêng. Quiz nhiều lựa chọn dùng chấm chính xác tập đáp án và chỉ trả giải thích sau khi nộp. Đồng hồ 60 giây dùng mốc tuyệt đối trong cùng trình duyệt, giữ phần đã viết sau khi hết giờ. Danh sách luyện lại hiển thị lý do và bài code cần kiểm chứng lại. Tám câu HTTP/ASP.NET Core nâng ngân hàng lên 102 câu, gồm 37 Intern/Fresher, 45 Junior và 20 Middle/Senior. Đối chiếu 75 URL HTTPS và 111 ca thực thi nội dung đạt.

Chrome/SQL Server đạt 26 nhóm khi tắt AI và 28 nhóm với AI fixture. Giao diện đã qua sáu chiều rộng, hai theme, điều khiển bàn phím và Impeccable. Docker đạt bảy nhóm kiểm định và luồng Chrome → worker → lưu verdict trên SQL Server. [Sơ đồ trên điện thoại](docs/qa/design-390-dark.png) · [Sơ đồ trên desktop](docs/qa/design-1440-light.png) · [Biên tập học liệu](docs/qa/materials-1440.png)

## V2 · Phase 6 · Cá nhân hóa

Ba bài đầu vào cố định phiên bản cho Intern, Fresher và Junior lưu kết quả theo tài khoản. Khi có worker, người học có thể nộp tiếp phần C# sau bốn câu lý thuyết. Báo cáo nhận đúng ID submission. Cây kỹ năng mở từng câu cùng bằng chứng và tiên quyết. Dùng cấu trúc JSON mới riêng cho placement, giữ định dạng các phiên V1 và V2 trước đó.

Đã kiểm tra DOCX thật và PDF do Chrome tạo, xem trước, lưu/mở/xóa tự nguyện và xác nhận văn bản tài liệu không đi vào request API. Bài đầu vào có lượt đúng lẫn sai và chống đọc chéo tài khoản. Đã thử ghi âm, tạm dừng, tiếp tục, đọc lại blob và xóa với microphone giả lập của Chrome. Chưa đo độ chính xác nhận dạng trên micro vật lý. Bản publish phục vụ PDF worker với MIME `text/javascript`.

Chrome/SQL Server đạt 25 nhóm với AI tắt và 27 nhóm với AI fixture. Detector Impeccable không báo lỗi. Đã rà ảnh thật ở desktop và mobile. [Cây kỹ năng trên điện thoại](docs/qa/skills-390-dark.png) · [Cây kỹ năng trên desktop](docs/qa/skills-1440-light.png) · [CV/JD trên điện thoại](docs/qa/cv-390-light.png)

## V2 · Phase 5 · Ba lab thực hành

Phỏng vấn dự án nhận GitHub công khai hoặc ZIP 2 MiB. Người dùng chọn tối đa 12 tệp, mỗi tệp 96 KiB. Máy chủ kiểm tra định danh archive bằng SHA-256, giới hạn 2.000 mục và tổng kích thước sau giải nén 32 MiB. Nó đọc trong bộ nhớ, chỉ gọi host codeload đã định, tắt chuyển hướng, lọc tệp bí mật và trả về ký hiệu, đường dẫn, số dòng cùng câu hỏi biên soạn. Phần phân tích dùng quy tắc, không thực thi mã hay gọi AI.

Code Review có 15 tình huống với diff, chọn dòng, severity, nguyên nhân, phương án sửa, nhận xét tự do và đối chiếu rubric. Tự luận giữ nguyên cho người học tự đối chiếu. Migration tăng dần `20261126144657_PracticalReviews` chỉ thêm bảng và index. Lượt học tạo bằng bản Phase 4 vẫn giữ nguyên câu trả lời, tự đánh giá, rubric và ngày ôn sau migration. Bản xuất và xóa tài khoản bao gồm review.

Debugging Lab thêm ba bài sửa mã C# và ASP.NET Core. Cả ba starter trả Wrong Answer, cả ba lời giải đạt public/hidden tests. Đã chạy 25/25 lời giải, bảy nhóm kiểm định worker, 111 ca nội dung và đối chiếu 67 URL tài liệu. Đã kiểm tra nâng bộ test riêng từ 22 lên 25 mà vẫn giữ nguyên dữ liệu cũ.

Build .NET/React, ESLint và Impeccable đạt. Chrome/SQL Server đạt **24 nhóm khi tắt AI** (gồm GitHub thật) và **26 nhóm với provider fixture**. Đã kiểm tra quyền truy cập review, khóa nộp trùng, dẫn dòng trong ZIP, phiên bản bài và ba lab qua sáu kích thước ở hai theme. [Review trên điện thoại](docs/qa/code-review-390.png) · [Review trên desktop](docs/qa/code-review-1440.png) · [Import dự án](docs/qa/project-390-dark.png)

## V2 · Phase 4 · Phỏng vấn và luyện lại

Ba hình thức gồm bộ câu biên soạn, AI hướng dẫn và AI mô phỏng. Mỗi phiên AI cần đồng ý gửi nội dung và chọn trần 1–4 lượt. API lưu câu trả lời và giữ ngân sách trước khi gọi provider, giới hạn sáu lần gọi/tài khoản/giờ trên mỗi tiến trình. Tối đa một câu đào sâu cho mỗi câu chính. AI chọn hướng hỏi nguyên nhân, ví dụ, thay giả định hoặc đối chiếu phát biểu trước. Máy chủ kiểm tra trích dẫn nguyên văn và chỉ phát câu hỏi từ khuôn đã biên soạn. Thiếu cấu hình, hết thời gian, quota hay lỗi schema đều có fallback. Phiên mô phỏng giữ kín nhận xét trong API và bản xuất cá nhân khi đang thi.

Báo cáo có thời gian theo lượt, câu hỏi/đáp án theo phiên bản, dẫn chứng và nhận xét AI khi có, phân tích chủ đề, gợi ý diễn đạt, bản viết lại riêng, lịch ôn 3/7/14 ngày và phiên luyện theo từng câu. So sánh tối đa 30 phiên hoàn tất gần nhất cùng preset, mode, ngôn ngữ và thời lượng, rồi lọc tiếp theo trình độ, chủ đề, ngân sách, độ khó và các cặp câu/phiên bản. Phiên V1 thiếu thời gian theo lượt vẫn đọc được. Phase này mở rộng JSON hiện có, không cần migration SQL mới.

Build React/TypeScript, ESLint và .NET Release đạt. Hai lượt Chrome trên SQL Server QA đạt **23 nhóm khi tắt AI**, **25 nhóm với provider fixture**. Các ca mới kiểm tra opt-in, hạn mức theo owner, nộp lại, đổi chủ đề, trích dẫn sai, quota, giấu phản hồi khi đang thi, bản viết lại, quyền truy cập phiên ôn và JSON phiên cũ. Detector Impeccable trả danh sách rỗng. Chrome kiểm tra hai theme ở 360/390/768/1024/1440/1920 px và điều hướng bàn phím. Chưa xác minh OpenAI thật, screen reader hoặc thiết bị vật lý. [Báo cáo V1](docs/qa/mock-report-1024-light.png) · [V2 trên điện thoại](docs/qa/interview-v2-ai-390.png) · [V2 trên desktop](docs/qa/interview-v2-ai-1440.png)

## V2 · Phase 3 · Thực thi C# và T-SQL

Worker HTTPS độc lập đã chạy trên Docker Desktop Linux Engine 29.4.3. Cả 22 lời giải tham khảo (11 C#, 11 T-SQL) đạt với bộ dữ liệu riêng. Bảy nhóm kiểm định đã kiểm tra cấu hình container thực tế, compile/runtime error, kết quả sai, giới hạn thời gian/bộ nhớ/output, owner, nộp trùng, quota, hủy, phục hồi hàng đợi sau restart và dọn container còn sót. SQL đối chiếu kiểu cột, NULL, dòng trùng và thứ tự theo đề bài. Gateway ẩn output khi chấm Submit.

Chrome đã nộp C#, chạy thử với đầu vào tùy chỉnh và kiểm tra lịch sử qua API, HTTPS và Docker. Sau khi đóng trang, bộ đối soát vẫn ghi Accepted của T-SQL vào SQL Server và cập nhật Dashboard, lịch sử và bản xuất cá nhân. Đã kiểm tra sáu chiều rộng từ 360 đến 1920 px. [Điện thoại](docs/qa/worker-accepted-390.png) · [Desktop](docs/qa/worker-accepted-1440.png)

Phase này dùng bảng submission của Phase 1 và SQLite WAL riêng của worker. Cấu hình mặc định tắt Run/Submit. Mỗi host triển khai cần chạy kiểm định với image của chính host đó. Chưa chạy trên staging bên ngoài máy QA. [Hướng dẫn dựng và kiểm định](RUNNER.md)

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
