# 04. .NET Interview Practice

Ứng dụng luyện phỏng vấn cá nhân cho lập trình viên .NET, với 94 câu Việt–Anh, 11 chủ đề, 11 bài C#, 11 bài T-SQL và 7 bộ phỏng vấn. Sau khi đăng ký, mở **Phiên học nhanh**, chọn 5, 10, 15 hoặc 30 phút, rồi nộp câu đầu tiên để bắt đầu lịch ôn cá nhân.

## Học và theo dõi tiến độ

- Phiên học chốt danh sách slug/version. Chọn câu mới, câu đến hạn, câu làm sai, chủ đề yếu, câu trọng tâm, flashcard, trắc nghiệm, tự luận, đọc/tìm lỗi/so sánh code hoặc trả lời trong 60 giây. Máy chủ quản lý deadline của phiên mock.
- Lịch ôn dùng biến thể SM-2 theo ngày địa phương, có xét độ khó, khoảng cách giữa lần ôn, kết quả khách quan, tự đánh giá, trợ giúp và nhận xét kỹ thuật AI nếu có. Có thể đặt ngày ôn thủ công và chuyển về lịch tự động bằng cách xóa ngày.
- Sau khi nộp tự luận, làm bài vận dụng trước khi xem gợi ý, đáp án hoặc phản hồi AI để ghi nhận bằng chứng độc lập. Một lần đúng xác nhận phần kiến thức được hỏi. Mức thành thạo cần ba ngày kiểm chứng trong một chuỗi kéo dài ít nhất bảy ngày. Lượt sai, cần trợ giúp hoặc bằng chứng hết hạn khiến người học cần kiểm chứng lại. Ngày học của lượt mới được chốt theo múi giờ tại thời điểm nộp.
- Trang lộ trình có các mốc 7/14/30/60/90 ngày và tùy chỉnh, đưa lý thuyết, ôn tập, code, SQL hoặc mock vào quỹ thời gian. Báo cáo 7/30 ngày lấy từ lịch sử thật. Tổng kết phiên cho phép mở lại từng lượt và so sánh với câu trả lời trước trên cùng phiên bản.
- Trong Phỏng vấn thử có thể chuẩn bị theo CV/JD, nhận dạng kỹ năng và chọn chủ đề. Trình duyệt xử lý văn bản dán hoặc tệp TXT UTF-8 và giải phóng dữ liệu khi bấm xóa hoặc rời trang. Trình duyệt hỗ trợ Web Speech có thể đọc đề và nhập lời nói. Người dùng sửa transcript trước khi nộp và có thể bật ghi âm để nghe lại trong trang đang mở.

## Chạy local

Cần .NET SDK 10, Node.js 24 và một instance SQL Server. Cấu hình Development mặc định kết nối SQL Server tại localhost bằng Windows Authentication và dùng cơ sở dữ liệu InterviewPractice.

~~~powershell
Set-Location -LiteralPath 'D:\ReactJS\Interview Practice'
npm.cmd ci --prefix web
npm.cmd run build --prefix web
dotnet run --project server
~~~

Mở [http://127.0.0.1:5074](http://127.0.0.1:5074). Development tự áp migration và seed nội dung còn thiếu. Đăng ký từ giao diện để lưu tiến độ. Có thể duyệt ngân hàng câu hỏi và đề bài trước khi tạo tài khoản.

Khi sửa frontend, giữ API ở cổng 5074 và chạy npm.cmd run dev --prefix web. Vite phục vụ cổng 5178 và proxy /api cùng origin. OpenAPI có tại [/openapi/v1.json](http://127.0.0.1:5074/openapi/v1.json) trong Development.

### Cơ sở dữ liệu và migration

- server/appsettings.Development.json là cấu hình mẫu dùng tài khoản Windows. Đặt ConnectionStrings__Practice trong môi trường nếu dùng instance, cơ sở dữ liệu hoặc tài khoản khác.
- Chạy dotnet tool restore ở thư mục gốc để có công cụ EF theo manifest. Chạy dotnet tool run dotnet-ef database update --project server khi muốn áp migration thủ công. Migrations còn giữ trong server/Migrations.
- Khi publish, build frontend trước để dotnet publish mang theo wwwroot. Khai báo connection string và AllowedHosts theo môi trường. Dùng HTTPS cho cookie Production và cấp quyền migration riêng cho quy trình vận hành. --migrate-and-seed là chế độ chạy migration và seed rồi thoát.
- Môi trường kiểm thử dùng SQL Server 2022 Developer và .NET runtime 10.0.2 đã cài trên máy. Gói EF Core, Identity EF và OpenAPI ở 10.0.15. Theo chính sách Microsoft, .NET 10 LTS tiếp tục được hỗ trợ đến tháng 11/2028 và runtime vận hành cần theo bản vá hiện hành. [Chính sách hỗ trợ .NET](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)

### Tài khoản quản trị nội dung

Khai báo hai giá trị sau trước lần khởi động Development đầu tiên có admin. Tạo một email riêng, mật khẩu từ 12 ký tự. Identity cấp vai trò ContentAdmin và mở mục Quản trị nội dung. Tài khoản đã đăng ký không được tự nâng quyền khi trùng email cấu hình.

~~~powershell
dotnet user-secrets set --project server 'Admin:Email' '<email quản trị>'
dotnet user-secrets set --project server 'Admin:Password' '<mật khẩu quản trị>'
~~~

### Nhận xét AI

AI có thể bật qua OpenAI Responses API. Chọn model có Structured Outputs và khai báo ba giá trị trong server. Với bài tự luyện, người học bấm yêu cầu nhận xét sau khi nộp. Máy chủ gửi đề, câu trả lời, rubric và tài liệu của câu. Phản hồi lưu theo model, phiên bản rubric và thời điểm.

~~~powershell
dotnet user-secrets set --project server 'Ai:Provider' 'OpenAI'
dotnet user-secrets set --project server 'Ai:Model' '<model hỗ trợ Structured Outputs>'
dotnet user-secrets set --project server 'Ai:ApiKey' '<khóa API>'
~~~

Phỏng vấn thử mở mặc định bằng bộ câu hỏi biên soạn. Người học có thể chọn AI hướng dẫn hoặc AI mô phỏng, đồng ý gửi nội dung và đặt ngân sách 1–4 lượt. Mỗi yêu cầu mang câu hiện tại và tối đa hai trích đoạn trả lời trước. API giới hạn sáu lần gọi provider cho mỗi tài khoản trong một giờ trên mỗi tiến trình API. Phiên lưu câu trả lời và giữ chỗ ngân sách trước khi gọi. Hết giờ, chạm hạn mức, mất kết nối hoặc trích dẫn sai đều có đường tiếp tục bằng bộ câu hỏi. Phiên mô phỏng mở nhận xét và gợi ý viết lại khi kết thúc. [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

Báo cáo hiển thị thời gian, lượt đào sâu, kết quả theo chủ đề, rubric và trích dẫn nếu có AI. Bản viết lại lưu riêng với lời đáp gốc. Chọn **Ôn câu này** để luyện đúng phiên bản hoặc mở kế hoạch 3/7/14 ngày. So sánh chỉ hiển thị cho phiên hoàn tất có cùng điều kiện và đúng các phiên bản câu đã hỏi.

### Coding và SQL

Editor CodeMirror có tô cú pháp, gợi ý từ/SQL, căn lề, Ctrl+S, đổi độ rộng panel và reset về starter. Bảng dữ liệu mẫu T-SQL được sinh từ chính schema/dataset của từng phiên bản. Có thể đối chiếu kết quả dự kiến, mở lời giải và lưu nháp khi runner tắt.

Worker trong `worker/` biên dịch C# và chạy T-SQL trong container dùng một lần. Mỗi lần Submit chấm cả dữ liệu công khai và bộ test riêng. Kết quả vẫn cập nhật tiến độ sau khi đóng trang. Run/Submit mặc định tắt. Để chạy thử trên máy có Docker Linux, xem hướng dẫn dựng image, cấu hình HTTPS và kiểm định môi trường trong [RUNNER.md](RUNNER.md).

## Các màn hình và tệp chính

| Khu vực | Hành vi | Mã |
| --- | --- | --- |
| Tổng quan, lộ trình, tiến độ | Dữ liệu thật, câu cần ôn, kế hoạch buổi học, lịch sử và số mẫu. Phút luyện lấy từ đồng hồ tự luyện khi trang có focus. | server/Learning.cs, web/src/Dashboard.tsx, web/src/Learning.tsx |
| Câu hỏi và lượt luyện | URL trực tiếp, bộ lọc, nháp theo tài khoản, tự đối chiếu, tự đánh giá và bản cải thiện. | server/Catalog.cs, server/Practice.cs, web/src/Practice.tsx |
| Phỏng vấn thử | Bộ câu biên soạn, AI hướng dẫn và AI mô phỏng, hạn giờ phía server, báo cáo có dẫn chứng và luyện lại. | server/Interviews.cs, server/InterviewCoach.cs, web/src/Interview.tsx |
| Coding, SQL và LeetCode | Editor, nháp theo phiên bản, tài liệu kiểm tra công khai và ghi chú tự ghi nhận. | server/Exercises.cs, server/Content/exercises.json, web/src/Exercises.tsx |
| Tài khoản và quản trị | Identity, quyền theo owner, CSRF, xuất/xóa dữ liệu và xuất bản phiên bản câu. | server/Auth.cs, server/Data.cs, web/src/Admin.tsx |
| Nhận xét AI | Đối chiếu lời nộp với rubric và kiểm tra trích dẫn nguyên văn trước khi lưu. | server/AiFeedback.cs |

Backend dùng Minimal APIs và EF Core. Cookie của Identity xác định tài khoản. API xác thực token CSRF trước thao tác ghi. Database giữ bản nháp với khóa phiên bản và chỉ lưu lượt nộp mới một lần theo ID. Trình duyệt giữ bản nháp chưa đồng bộ trên thiết bị theo tài khoản và tab. Khi phát hiện xung đột, người học chọn bản cần giữ.

## Thêm hoặc sửa nội dung

- Đề mới dùng slug ổn định. Catalog nạp questions.json và các module questions-batch-*.json trong server/Content, thêm các slug chưa có. Bộ bài thực hành đọc exercises.json và exercises-batch-*.json. Quản trị hỗ trợ tạo, xem trước, nhập JSON tối đa 20 câu thành nháp, phát hiện trùng, xuất JSON theo câu, sửa và xuất bản phiên bản mới.
- Sửa câu hỏi, gợi ý, nguồn, đáp án và rubric qua Quản trị. Lưu nháp tạo phiên bản mới. Xuất bản mới thay phiên bản hiển thị. Attempt và phiên mock đã tạo tiếp tục tham chiếu phiên bản cũ.
- Khi sửa đề, lời giải hoặc dữ liệu của bài tập, thêm bản ghi cùng slug với version tăng trong server/Content/exercises.json và giữ bản cũ. Tăng testVersion khi thay test công khai hoặc dataset. Nháp cũ có thể mở qua ?version= với phiên bản đã lưu.
- Ngày kiểm tra nguồn ghi trong metadata. Tài liệu tham khảo và bốn tiêu chí rubric xuất hiện khi người học mở đáp án. Phần nội dung được tự biên soạn.

## Kiểm thử

~~~powershell
npm.cmd run build --prefix web
npm.cmd run lint --prefix web
dotnet build server --no-restore
npm.cmd run test:content --prefix web
~~~

test:content kiểm định 94 bản ghi câu hỏi, 52 bài vận dụng và 22 bài thực hành. 97 ca thực thi gồm ví dụ, test C#, truy vấn T-SQL và đoạn mã dự đoán kết quả. Thêm `--sources` vào `node web/checks/content.mjs` để xác minh URL nguồn. Cần SQL Server local và tempdb. Khi thay dataset, tăng phiên bản, đặt IP_REFRESH_PREVIEW=1 và chạy lại để cập nhật snapshot.

Trên Windows, sau khi build frontend, chạy các lệnh sau từ thư mục dự án. Hai lượt QA dùng Chrome đã cài, cơ sở dữ liệu InterviewPractice_QA, tài khoản thử nghiệm và tiến trình loopback tạm. Lần chạy sau phải bắt đầu sau khi lần trước đã kết thúc.

~~~powershell
dotnet run --project checks/LearningChecks.csproj -c Release
powershell -NoProfile -File web/checks/qa.ps1 -Upgrade
powershell -NoProfile -File web/checks/qa.ps1 -AiFixture -Upgrade
~~~

Để kiểm tra nâng cấp dữ liệu cũ, chạy `node web/checks/migration.mjs before` với `IP_BASE` trỏ tới bản trước trên DB QA. Sau đó dùng `web/checks/qa.ps1 -Migration` trên cùng DB. Tài khoản QA dùng mật khẩu ngẫu nhiên lưu tạm trong .artifacts. Suite xóa tài khoản và fixture sau khi đối chiếu. Kiểm tra đồng bộ verdict bằng `dotnet run --project checks -c Release -- --runner-sync` trên SQL Server local, database riêng InterviewPractice_Runner_QA.

Chạy test:e2e trên instance riêng để giữ dữ liệu kiểm thử tách khỏi lịch sử cá nhân. Terminal thứ nhất ở thư mục gốc chạy:

~~~powershell
$env:ASPNETCORE_ENVIRONMENT='Development'
$env:ConnectionStrings__Practice='Server=localhost;Database=InterviewPractice_QA;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;'
$env:Admin__Email='fixture-admin@example.test'
$env:Admin__Password='<mật khẩu riêng cho QA>'
dotnet run --project server --no-launch-profile --urls http://127.0.0.1:5094
~~~

Terminal thứ hai dùng cùng email/mật khẩu QA:

~~~powershell
$env:IP_BROWSER='chrome'
$env:IP_QA_DB='InterviewPractice_QA'
$env:IP_ADMIN_EMAIL='fixture-admin@example.test'
$env:IP_ADMIN_PASSWORD='<mật khẩu riêng cho QA>'
npm.cmd run test:e2e --prefix web
~~~

IP_BROWSER có thể bỏ trống khi đã cài Chromium của Playwright. Bỏ IP_QA_DB sẽ bỏ qua ca chỉnh deadline trên DB QA. Có thể chạy thêm checks/provider.mjs ở loopback cổng 5095 để kiểm tra hợp đồng AI. Cấu hình API QA với Ai__Provider=OpenAI, Ai__Model=fixture-structured-v1, Ai__ApiKey=fixture, Ai__Endpoint=http://127.0.0.1:5095/v1/responses, rồi đặt IP_AI_FIXTURE=1 khi chạy test:e2e. Kết quả đó kiểm chứng tích hợp theo hợp đồng, còn truy cập dịch vụ OpenAI thật phụ thuộc khóa và model được cấp.

Kết quả kiểm tra, ảnh và phạm vi còn lại được ghi trong [PROGRESS.md](PROGRESS.md).
