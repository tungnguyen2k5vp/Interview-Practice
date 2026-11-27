# Chạy local và triển khai staging

## Local

Cài .NET SDK 10, Node.js 24 và SQL Server 2022. Chạy từ thư mục gốc repository bằng PowerShell.

```powershell
npm.cmd ci --prefix web
npm.cmd run build --prefix web
dotnet run --project server
```

Mở [http://127.0.0.1:5074](http://127.0.0.1:5074). Cấu hình Development mặc định dùng Windows Authentication với SQL Server tại `localhost` và database `InterviewPractice`. API tự áp migration và seed khi khởi động trong Development. Giữ API chạy trên 5074 và mở terminal khác chạy `npm.cmd run dev --prefix web` để dùng Vite tại [http://127.0.0.1:5178](http://127.0.0.1:5178).

Nếu dùng Docker Linux trên máy x86-64, có thể chạy SQL Server Developer riêng cho local. Đặt mật khẩu mạnh dành riêng cho container trước khi chạy.

```powershell
$env:MSSQL_SA_PASSWORD = '<mật khẩu SQL riêng cho local>'
docker volume create interview-practice-sql
docker run -d --name interview-practice-sql -e ACCEPT_EULA=Y -e MSSQL_PID=Developer -e MSSQL_SA_PASSWORD -p 127.0.0.1:14330:1433 -v interview-practice-sql:/var/opt/mssql mcr.microsoft.com/mssql/server:2022-latest
$env:SQLCMDPASSWORD = $env:MSSQL_SA_PASSWORD
docker exec -e SQLCMDPASSWORD interview-practice-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b -Q 'SELECT 1'
$env:ConnectionStrings__Practice = "Server=127.0.0.1,14330;Database=InterviewPractice;User ID=sa;Password=$env:MSSQL_SA_PASSWORD;Encrypt=True;TrustServerCertificate=True;Connect Timeout=5;"
dotnet run --project server
```

Chờ SQL sẵn sàng rồi chạy lại `SELECT 1` nếu container vừa khởi động. `docker stop interview-practice-sql` dừng container và giữ volume. `docker start interview-practice-sql` dùng lại dữ liệu. `TrustServerCertificate=True` trong ví dụ chỉ áp dụng cho SQL local tự ký.

## Staging

Build cùng commit đã qua CI. Dùng ASP.NET Core Runtime 10 đã cập nhật trên máy staging. Frontend nằm trong `wwwroot` của bản publish và dùng cùng origin với API.

```powershell
npm.cmd ci --prefix web
npm.cmd run build --prefix web
dotnet restore server --locked-mode
dotnet publish server -c Release --no-restore -p:UseAppHost=false -o .artifacts/publish
```

1. Tạo database staging riêng với chứng chỉ SQL được tin cậy. Cấp tài khoản vận hành quyền migration và cấp tài khoản dịch vụ quyền đọc/ghi trên database ứng dụng, gồm quyền ghi cho seed và đối soát dữ liệu cũ khi API khởi động.
2. Sao lưu database. Rà soát SQL nâng cấp bằng `dotnet tool restore` và `dotnet tool run dotnet-ef migrations script --idempotent --project server --output .artifacts/staging-migrations.sql`. Chạy thử trên bản sao trước khi áp dụng lên staging có dữ liệu. Dùng lại bản publish trước khi tương thích với schema hiện tại. Khôi phục từ bản sao lưu đã kiểm tra nếu cần quay lại schema cũ.
3. Sao chép bản publish vào thư mục release. Đặt `ASPNETCORE_ENVIRONMENT=Staging`, `AllowedHosts` bằng hostname staging và lấy `ConnectionStrings__Practice` từ kho bí mật của môi trường với `Encrypt=True;TrustServerCertificate=False`. Chạy các lệnh sau từ thư mục publish. Lệnh đầu dùng tài khoản migration trong một tiến trình riêng. Lệnh sau dùng tài khoản dịch vụ.

   ```powershell
   dotnet InterviewPractice.dll --migrate-and-seed
   dotnet InterviewPractice.dll --urls https://127.0.0.1:5080
   ```

4. Cho dịch vụ chạy dưới trình quản lý tiến trình với thư mục làm việc là bản publish. Cấu hình chứng chỉ Kestrel qua `ASPNETCORE_Kestrel__Certificates__Default__Path` và lấy mật khẩu chứng chỉ từ kho bí mật. Reverse proxy giữ nguyên host công khai khi gọi upstream HTTPS và tin chứng chỉ upstream. Giữ key ASP.NET Core Data Protection ở thư mục bền vững của tài khoản dịch vụ để cookie tồn tại qua các lần phát hành.
5. Kiểm tra `GET /api/health` và `GET /api/health/ready` đều trả 200 qua hostname HTTPS. Mở dashboard, đăng ký tài khoản thử, lưu câu trả lời, tải lại URL trực tiếp và xác nhận dữ liệu vẫn xuất hiện. Nếu có lỗi API, đối chiếu `X-Correlation-Id` với log của tiến trình.

AI dùng `Ai__Provider=OpenAI`, `Ai__Model` hỗ trợ Structured Outputs và `Ai__ApiKey` từ kho bí mật. CI dùng fixture cục bộ để kiểm tra hợp đồng. Kiểm tra API OpenAI thật bằng một yêu cầu từ tài khoản staging với dữ liệu thử và sự đồng ý gửi nội dung.

Runner mặc định tắt. Chỉ bật `Runner__IsolationVerified=true` sau khi nghiệm thu chính host Docker dành riêng theo [RUNNER.md](../RUNNER.md). Hướng dẫn đó bao gồm chuẩn bị image, thiết lập TLS, lưu bộ test riêng, kiểm tra cách ly và khởi chạy worker. Giữ token, bộ test riêng và thư mục trạng thái ở ngoài web root.

## Xác minh trước khi phát hành

GitHub Actions chạy build/lint frontend, build API, các check .NET, kiểm định nội dung bằng SQL Server và hai suite Playwright với AI fixture. Với DB local dùng SQL Authentication, đặt `IP_CONTENT_SQL_CONNECTION` trước khi chạy `npm.cmd run test:content --prefix web`. Bộ kiểm tra nội dung buộc dùng `tempdb`.

Chạy thêm kiểm tra nâng cấp dữ liệu trên database QA có sẵn fixture của bản cũ, kiểm tra deadline dùng Windows Authentication và kiểm định runner trên host triển khai theo [README.md](../README.md) và [RUNNER.md](../RUNNER.md). Nếu thiếu SQL Server, Docker Linux, trình duyệt hoặc khóa OpenAI, ghi môi trường và bước tương ứng là `BLOCKED`.

Với bản publish chạy trên HTTPS loopback và database QA riêng, đặt `IP_BASE=https://127.0.0.1:5106` và `IP_BROWSER=chrome` nếu dùng Chrome đã cài, rồi chạy `node web/checks/staging.mjs`. Suite tạo và xóa một tài khoản kiểm thử, xác minh readiness, cookie, CSP, PDF và đo thời gian đọc ngân hàng. ASP.NET Core mặc định loại địa chỉ loopback khỏi chính sách HSTS. Kiểm tra header HSTS qua hostname staging thực tế.
