# Kiểm định V4 · Phase 1–2 · 28/11/2026

Baseline `30b34ea` đã được kiểm đếm lại từ seed và API: 256 câu, content harness 218 ca đạt, 13 nhóm journey và 16 nhóm upgrade đạt trước khi mở rộng. Checkpoint này hoàn thành Phase 1–2 của [kế hoạch V4](UPGRADE_PLAN_V4.md). Các kết quả V3 bên dưới được giữ làm lịch sử.

## Nội dung trước và sau

| Nội dung | V3 | Thêm V4 | Hiện tại |
|---|---:|---:|---:|
| Câu hỏi Việt–Anh |256|244|500|
| C# (gồm debugging) |24|56|80|
| Debugging Lab, đã tính trong C# |7|23|30|
| T-SQL |21|39|60|
| Code Review |23|17|40|
| System Design |20|10|30|
| Project Interview |10|15|25|
| Mock preset |11|14|25|
| Bài kiểm tra vận dụng, không cộng vào số câu |58|72|130|

Đếm theo stable ID/version phát hành trong bản phân phối mặc định. Có 370 câu có key trực tiếp và 130 câu viết với bài vận dụng riêng. Bản dịch, follow-up, transfer check và debugging không được cộng thêm lần nữa vào các tổng tương ứng. Có 424/500 câu cho Intern–Junior.

| Trình độ | V3 | V4 | Topic | V3 | V4 |
|---|---:|---:|---|---:|---:|
| Intern |55|99| C# & .NET |49|85|
| Fresher |83|142| LINQ & Async |39|63|
| Junior |98|183| ASP.NET Core |38|68|
| Middle |17|61| EF Core |22|50|
| Senior |3|15| SQL & Database |43|75|
| | | | OOP & Thiết kế |17|37|
| | | | Testing & Tình huống |17|33|
| | | | Hệ thống phân tán |6|32|
| | | | Git & Triển khai |10|22|
| | | | HR & Dự án |7|19|
| | | | Thuật toán |8|16|

Độ khó: 271 easy, 204 medium, 25 hard. Dạng biên tập: 147 predict, 10 debug, 9 compare, 45 design, 15 experience, 227 quiz, 45 concept và 2 read. Dạng biên tập và hình thức chấm là hai chiều riêng; câu concept vẫn có thể có quiz key.

## Các gate đã chạy

| Gate | Kết quả và phạm vi |
|---|---|
| Schema, liên kết và trùng | Đạt 500 câu; kiểm slug, prompt gần giống VI/EN, taxonomy, key, rubric, tiên quyết và liên kết; mở rộng validator cho material batch |
| Nội dung thực thi | `node web/checks/content.mjs`: **Passed: 546 executable checks, 500 question records; Failed: 0, Skipped: 0** trên .NET 10 và SQL Server 2022, sau tích hợp seed |
| Source HTTP | 488 URL HTTPS đang dùng đạt; gồm 415 URL câu hỏi. Manifest V4 dùng 304 URL web và một locator local, có phần giao với nguồn cũ |
| Review kỹ thuật | 244 câu mới được review chéo về mục tiêu, giả định, bản dịch, distractor và follow-up; mệnh đề được gắn với nguồn/section trong manifest |
| C# trước Docker | 56 reference/mutant mới với 509 ca của lượt biên soạn; lượt kiểm độc lập dùng 1.987 ca, gồm oracle vét cạn và kiểm input không bị sửa |
| SQL trước Docker | 234 truy vấn thực cho 39 reference và 39 mutant trên public + hai dataset biến thể; kiểm riêng golden nghiệp vụ của cả 39 kết quả public |
| Docker catalog | **140/140 reference đạt**, **95/95 lời giải sai mới bị bắt**, **30/30 starter debugging tái hiện lỗi** |
| Import thực | Sáu batch 42/42/40/40/40/40 câu: nhập, retry giống hệt, kiểm quyền, gate xuất bản, đọc VI/EN và giữ câu trả lời/rubric/tiến độ cũ đều đạt |
| Browser/API | 13 nhóm journey và **17 nhóm upgrade** đạt; upgrade dùng AI fixture, không phải dịch vụ OpenAI thật |
| Gateway thực thi | Chrome Run/Submit qua HTTPS, C#/SQL, hidden verdict, background sync, history, dashboard và export đạt; bảy nhóm cách ly/giới hạn/restart/cleanup của worker đạt |
| .NET | Build Release và check recall, project import, runner sync trên SQL Server đạt |
| Frontend | TypeScript, Vite production build và ESLint đạt |

Content harness có một cảnh báo nullable `CS8629` từ đoạn mã minh họa, không có lỗi hay ca bỏ qua. JSON output C# được so theo cấu trúc để không nhầm Unicode escape; decimal SQL được chuẩn hóa nhưng vẫn kiểm kiểu cột, NULL, dòng và thứ tự theo hợp đồng. Snippet có khai báo type được biên dịch riêng, chạy đúng output hiển thị.

Kết quả Docker được hợp nhất theo **key khác nhau** từ ba log, không cộng lượt chạy lặp: `.artifacts/v4-docker-catalog-part1.log`, `-part2.log` và `-sql.log`. Lượt đầu dừng vì checker chỉ chấp nhận `wrong_answer` cho starter xoay mảng âm, trong khi lỗi thực là `runtime_error`; đã sửa checker để nhận hai loại lỗi thực thi và vẫn từ chối compile error. Lượt tiếp tục và lượt SQL riêng hoàn tất, đối chiếu đủ cả 140 key. Các test pack riêng và output hidden không đưa vào Git.

## Kiểm định nguồn và biên tập

[Manifest](docs/content/v4-review-manifest.json) có 406 mục: 395 học liệu mới và 11 nguồn nghiên cứu. Tách riêng schema validated, source support, HTTP, review, code tested, SQL tested và publication. Hash nội dung trỏ tới record seed đã tích hợp; hash URL là định danh URL, không phải hash nội dung website. Các bằng chứng local trong `.artifacts` được ghi rõ là artifact local.

HTTP 200 chỉ chứng minh khả năng truy cập. Mệnh đề, section hỗ trợ, phần suy luận ứng dụng và giới hạn nguồn được ghi riêng. Review chéo giữa các lượt biên soạn không đại diện cho việc một chuyên gia tuyển dụng bên ngoài đã chấm toàn bộ ngân hàng; kết quả runtime, SQL, oracle và test có chủ đích được đối chiếu riêng với nhận xét.

Trước xuất bản đã thay câu CQRS trùng mục tiêu bằng precondition ghi dữ liệu có kiểm quyền; làm rõ Reverse cần buffer trước lần MoveNext đầu; sửa 14 vấn đề distractor/diễn đạt, 40 mảng lý do đáp án và 40 follow-up lặp ý. Chỉ xáo lựa chọn ở câu mới chưa phát hành, giữ nguyên ánh xạ VI/EN/key. Hai URL LeetCode trả 403 được thay bằng định nghĩa subsequence của NIST và invariant prefix minimum của CP-Algorithms; trạng thái nguồn bị thay được giữ trong manifest. Không vượt hạn chế truy cập hoặc tái sử dụng đề/test thương mại.

## UI và bảo toàn dữ liệu

25 preset dùng select có nhãn, tự điền mức/thời lượng và cho phép điều chỉnh trước khi bắt đầu. Tên preset lấy từ catalog trong phiên, báo cáo và lịch sử; không lộ ID thô của bộ mới. Kiểm tra speed-clock dùng câu viết đã biết thay vì giả định cả topic behavioral chỉ gồm tự luận. Kiểm số system design theo tập seed để không đếm thêm scenario do QA tạo.

Đã chụp và xem 360, 390, 768, 1024, 1440, 1920 px ở light/dark; kiểm native keyboard selection, số lựa chọn, thời lượng, page errors và tràn ngang. Screenshot chốt màu sau transition. Detector phát hiện dòng phụ tài khoản 10,24 px; đã tăng lên 11 px. Quét render desktop/mobile sau sửa có 0 primary finding; mobile còn một advisory về từ cuối xuống dòng trong đoạn giải thích chế độ hiện có. Ảnh đại diện: [desktop sáng](docs/qa/v4-presets-1440-light.png), [desktop tối](docs/qa/v4-presets-1440-dark.png), [mobile sáng](docs/qa/v4-presets-390-light.png), [mobile tối](docs/qa/v4-presets-390-dark.png). Bộ đủ 12 ảnh ở `.impeccable/review/v4-presets-*.png`, cũng được browser CI lưu như artifact.

Không có migration hoặc dependency mới. QA import dùng database mới riêng; suite hiện có giữ database QA tách khỏi người học. Bản local tại cổng 5074 trả readiness `ready`, homepage HTTP 200, API 500 câu/25 preset. Đối chiếu trước/sau khởi động cho thấy số Attempts, Interviews, Notes, ExerciseDrafts và ExerciseSubmissions không đổi; thử nghiệm import còn đối chiếu nội dung câu trả lời và rubric cũ. Không ghi đè version câu V3 đã dùng. Run/Submit của bản local vẫn phụ thuộc cấu hình worker được kiểm chứng theo [RUNNER.md](RUNNER.md).

## Hiệu năng tìm kiếm

Đo 30 request tuần tự sau một warm-up trên SQL Server local, cùng phiên learner QA. 500 là câu thật; 1.000 gồm 500 hàng scale tạm được xóa trong `finally`. API vẫn trả tối đa chín câu/trang; payload lớn nhất dưới 2,9 KiB trong phép đo này.

| Truy vấn | 500 P50/P95 (ms) | 1.000 P50/P95 (ms) |
|---|---:|---:|
| Danh sách |16,5 / 19,0|25,1 / 36,5|
| Alias DI |8,8 / 11,9|10,3 / 14,6|
| Hai từ không dấu “trang truoc” |137,5 / 192,1|133,4 / 150,2|
| Trang 80 |17,1 / 25,5|23,4 / 26,8|

Đây là phép đo local đã warm, không phải load test production hoặc cam kết độ trễ. Chưa có bằng chứng cần thêm cache/full-text; giữ truy vấn và chỉ mục hiện có. Kết quả máy đọc được ở `.artifacts/v4-search-performance.json` và manifest.

## Checkpoint tiếp theo

Phase 3–7 chưa hoàn thành: 30 interactive lessons, 10 mini project, AI Interviewer/countdown sâu hơn, 300 thuật ngữ/100 mẫu câu/30 tình huống English, mistake journal, readiness theo vai trò và analytics. Mười concept và 25 project interview hiện có không được tính thay cho các mục tiêu đó. Giữ ma trận 1.000 câu, còn 500 câu tới mục tiêu dài hạn.

Chưa nghiệm thu provider AI thật, tải production, thiết bị/microphone vật lý, Safari/Firefox hoặc kiểm thử đầy đủ với công nghệ hỗ trợ. Không phát hiện regression dữ liệu/quyền truy cập trong các flow đã chạy; đây là phạm vi hồi quy, không thay cho kiểm toán bảo mật độc lập.

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
