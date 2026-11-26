# 04. .NET Interview Practice

Ứng dụng luyện phỏng vấn cá nhân cho lập trình viên .NET, giao diện tiếng Việt và đề trả lời Việt–Anh. Bộ khởi đầu có 44 câu qua tám chủ đề, 6 bài C#, 6 bài T-SQL và 3 bộ phỏng vấn thử. Tài khoản mới bắt đầu với lịch sử trống.

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

AI có thể bật qua OpenAI Responses API. Chọn model có Structured Outputs và khai báo ba giá trị trong server. Mỗi lượt đã nộp có nút yêu cầu riêng. Máy chủ chỉ gửi đề, câu trả lời đã nộp, rubric và tài liệu của câu. Phản hồi lưu riêng theo model, phiên bản rubric và thời điểm. Hạn mức ứng dụng là 6 yêu cầu mỗi giờ cho mỗi tài khoản trên một tiến trình.

~~~powershell
dotnet user-secrets set --project server 'Ai:Provider' 'OpenAI'
dotnet user-secrets set --project server 'Ai:Model' '<model hỗ trợ Structured Outputs>'
dotnet user-secrets set --project server 'Ai:ApiKey' '<khóa API>'
~~~

Tự luyện, tự đánh giá và mock theo bộ câu vẫn chạy khi AI tắt, hết quota hoặc timeout. Phiên mock dùng tối đa một câu đào sâu biên soạn sẵn mỗi câu. [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

### Coding và SQL

Editor tải khi mở bài, tô cú pháp và hỗ trợ Ctrl+S trong editor. Có thể đọc đề, lưu code, mở gợi ý/lời giải, xem schema, dữ liệu T-SQL và tự đối chiếu. Run/Submit đang ở trạng thái **Chưa cấu hình môi trường thực thi**. Bài SQL định nghĩa dialect SQL Server 2022 và phiên bản dataset ngay trong nội dung.

Runner nằm trong P1. Điểm tích hợp cần triển khai trước khi bật nút là API tạo job theo owner, worker dành riêng cho mã C# và database reset riêng cho T-SQL, kèm giới hạn tài nguyên, timeout, quyền tối thiểu và sự kiện kết quả. Bài kiểm tra nội dung trong dự án chỉ thực thi các lời giải tham khảo đã biên soạn, dùng bảng tạm trong tempdb cho SQL. [Cô lập mã .NET không tin cậy](https://learn.microsoft.com/en-us/dotnet/core/tutorials/creating-app-with-plugin-support) · [Giới hạn tài nguyên Docker](https://docs.docker.com/engine/containers/resource_constraints/)

## Các màn hình và tệp chính

| Khu vực | Hành vi | Mã |
| --- | --- | --- |
| Tổng quan, lộ trình, tiến độ | Dữ liệu thật, câu cần ôn, kế hoạch buổi học, lịch sử và số mẫu. Phút luyện lấy từ đồng hồ tự luyện khi trang có focus. | server/Learning.cs, web/src/Dashboard.tsx, web/src/Learning.tsx |
| Câu hỏi và lượt luyện | URL trực tiếp, bộ lọc, nháp theo tài khoản, tự đối chiếu, tự đánh giá và bản cải thiện. | server/Catalog.cs, server/Practice.cs, web/src/Practice.tsx |
| Phỏng vấn thử | Hai chế độ, deadline phía server, pause, bỏ qua, kết thúc sớm và báo cáo có xuất xứ. | server/Interviews.cs, web/src/Interview.tsx |
| Coding, SQL và LeetCode | Editor, nháp theo phiên bản, tài liệu kiểm tra công khai và ghi chú tự ghi nhận. | server/Exercises.cs, server/Content/exercises.json, web/src/Exercises.tsx |
| Tài khoản và quản trị | Identity, quyền theo owner, CSRF, xuất/xóa dữ liệu và xuất bản phiên bản câu. | server/Auth.cs, server/Data.cs, web/src/Admin.tsx |
| Nhận xét AI | Đối chiếu lời nộp với rubric và kiểm tra trích dẫn nguyên văn trước khi lưu. | server/AiFeedback.cs |

Backend dùng Minimal APIs và EF Core. Cookie của Identity xác định tài khoản; API ghi xác thực token CSRF. Database giữ bản nháp với khóa phiên bản và chỉ lưu lượt nộp mới một lần theo ID. Trình duyệt giữ bản nháp chưa đồng bộ trên thiết bị theo tài khoản và tab. Khi phát hiện xung đột, người học chọn bản cần giữ.

## Thêm hoặc sửa nội dung

- Đề mới dùng slug ổn định. Có thể khai báo trong server/Content/questions.json cho lần seed hoặc tạo nháp trong Quản trị. Seed chỉ thêm slug mới.
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

test:content kiểm tra metadata, biên dịch và chạy 25 ví dụ/test công khai C#, rồi so 6 truy vấn SQL theo kiểu, cột, NULL, số lượng hàng và thứ tự được yêu cầu. Nó cần quyền dùng SQL Server local và tempdb.

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
