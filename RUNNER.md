# Giao tiếp với worker thực thi

API chính chỉ giao tiếp HTTP qua `RunnerGateway.cs`. Người dùng tạo yêu cầu có GUID ổn định, mã nguồn, chế độ `run` hoặc `submit`, phiên bản bài và đầu vào tùy chỉnh cho Run. Cookie, token CSRF và hạn mức 10 yêu cầu tạo job/phút được kiểm tra tại API. Chủ sở hữu lấy từ Identity. Worker nhận mã tài khoản trong đường dẫn và service token trong Authorization Bearer.

| Request đến worker | Phản hồi |
|---|---|
| GET /v1/capabilities | JSON với `protocol: 1`, `isolated: true` và `kinds` chứa coding hoặc sql đã được kiểm định |
| PUT /v1/owners/{owner}/jobs/{guid} | Body có slug, kind, version, testVersion, action, code, input. Tạo job bất biến và trả lại cùng job nếu owner, ID và nội dung trùng |
| GET /v1/owners/{owner}/jobs/{guid} | Trạng thái và kết quả của job thuộc owner |
| DELETE /v1/owners/{owner}/jobs/{guid} | Hủy job và trả trạng thái sau khi worker xử lý |
| GET /v1/owners/{owner}/jobs?slug=…&version=…&page=1&pageSize=10 | `items` và `total`, cùng phạm vi owner/bài/phiên bản, thời gian giảm dần |

Một job có id, slug, version, action, status và at. Các trường tùy chọn gồm output, columns, rows, passed, total, milliseconds. SQL dùng null JSON cho giá trị SQL NULL. Worker đối chiếu kiểu, dòng trùng và thứ tự dựa trên testVersion. UI hiển thị kết quả Run dạng bảng. Khi Submit, API chuyển verdict và số đếm của worker, đã loại output, cột và hàng của hidden case.

Trạng thái hợp lệ gồm queued, running, accepted, completed, compile_error, runtime_error, wrong_answer, timeout, memory_limit, output_limit, cancelled và failed. Cấu hình dùng HTTPS, cache handshake 10 giây, deadline mỗi request 4 giây, body phản hồi tối đa 256 KiB, tắt follow redirect. Gateway lưu owner, hash yêu cầu, trạng thái trợ giúp và phiên bản test trước khi gọi worker. Khi bật runner, API đối soát tối đa 16 job/lượt sau mỗi 15 giây, kể cả sau khi khởi động lại. Sau 5 phút, job worker xác nhận không tồn tại được ghi là lỗi hạ tầng. Lỗi liên lạc được thử lại. Trang tiến độ dùng verdict chấm trên phiên bản hiện hành. Chạy thử không ghi đè một verdict đã chấm.

## Điều kiện vận hành

### Ranh giới tin cậy cho worker V2

Code, stdout, stderr, dữ liệu nhập và mọi SQL do người học gửi đều không tin cậy. Gateway là bên duy nhất có service token. Bộ điều khiển worker giữ SQLite, bộ test riêng và quyền tạo container trên Docker host. Không cấp các quyền này vào container thí sinh. Mỗi ca chấm nhận đúng đầu vào của ca đó; bộ so sánh chạy ngoài container. Submit chỉ trả verdict và số đếm. Docker host dùng cho triển khai cần do người vận hành quản lý riêng vì lỗi kernel/runtime vẫn có thể ảnh hưởng các workload cùng host.

Worker cần giới hạn truy cập API theo owner, kích thước request, hàng đợi, thời gian, CPU, RAM, PID, file và output. Container vô danh tính người dùng ứng dụng, không mount thư mục host, không có socket Docker, không có cổng công khai. Kết quả và khóa idempotency phải tồn tại qua restart. Trước khi phục vụ lại, worker dọn các container còn sót mang nhãn cài đặt của chính nó. Ca SQL dùng instance tạm, đăng nhập ứng dụng với quyền tối thiểu và đọc kiểu cột từ driver. Không truyền chuỗi kết nối SQL của Interview Practice vào môi trường thực thi.

Bản bàn giao để runner tắt. Đã mở Docker Desktop và xác nhận Linux Engine 29.4.3 bằng docker info. Worker cần một môi trường dành riêng cho mã không tin cậy, quota CPU/RAM/PID/file/output/thời gian, mạng bị hạn chế và tài khoản quyền tối thiểu. Bộ chấm giữ expected output và hidden test ngoài vùng mã thí sinh đọc được. T-SQL cần database hoặc instance reset độc lập. API, SQL ứng dụng, secret và Docker socket phải ở ngoài môi trường chạy bài. Đặt cờ xác nhận cách ly sau khi kiểm thử các điều kiện này.

### Chạy worker trên máy QA hoặc staging

Worker chạy Node 24 trên host có Docker Linux với seccomp. SQLite WAL lưu queue, request hash và kết quả. Mỗi lần xử lý có một job đang chạy, tối đa 32 job đang chờ hoặc chạy. Hạn mức theo owner là 10 job/phút. Dữ liệu cần lưu bền nằm ở IP_WORKER_STATE. Giữ thư mục này, bộ test riêng và khóa TLS ngoài thư mục web và giới hạn quyền truy cập của hệ điều hành.

Từ gốc repo, chuẩn bị các image. SQL Server Developer dành cho môi trường phát triển và kiểm thử.

```powershell
docker pull mcr.microsoft.com/dotnet/sdk:10.0
docker pull mcr.microsoft.com/mssql/server:2022-latest
dotnet publish worker/sql-reader -c Release -p:UseAppHost=false -o .artifacts/sql-reader
docker build -f worker/sql-reader/Dockerfile -t interview-practice-sql-reader:1 .artifacts/sql-reader
npm.cmd run build --prefix web
powershell -NoProfile -File web/checks/worker.ps1
```

Lệnh cuối dùng OpenSSL để tạo chứng chỉ QA một ngày, chỉ API QA tin chứng chỉ này. Nó tạo bộ đề riêng cho 22 phiên bản, chạy kiểm định Docker, khởi động worker HTTPS trên 5099 và API trên 5098, dùng Chrome để nộp C# rồi đối chiếu submission T-SQL ngay cả sau khi đóng trang. Chứng chỉ hệ thống và tài khoản cá nhân không tham gia. Để chạy mọi lời giải tham khảo qua worker, đặt IP_WORKER_TESTS tới bộ test riêng rồi chạy `node worker/check.mjs --catalog`.

Máy staging cần cấu hình biến môi trường trước khi khởi động.

| Biến | Giá trị |
| --- | --- |
| IP_WORKER_STATE | Thư mục bền vững có quyền ghi. Một instance điều khiển giữ khóa độc quyền. |
| IP_WORKER_TESTS | Đường dẫn JSON riêng. Khởi tạo đúng một lần bằng `node worker/prepare-tests.mjs <đường-dẫn-tệp-mới>`. Giữ nguyên bộ test cho cùng testVersion. |
| IP_WORKER_TOKEN | Chuỗi bí mật ngẫu nhiên ít nhất 32 ký tự, cùng giá trị với Runner__Token của API. |
| IP_WORKER_CERT, IP_WORKER_KEY | Chứng chỉ và khóa TLS dạng PEM dành cho worker. |
| IP_WORKER_KINDS | Mặc định coding,sql. Có thể chọn coding hoặc sql khi chỉ triển khai một runtime. |
| Runner__Endpoint, Runner__CaFile | Endpoint HTTPS chính xác. Đặt CaFile khi dùng CA riêng. Cấu hình chỉ ảnh hưởng kết nối worker. |

Chạy `node worker/check.mjs --attest` với cấu hình đã chuẩn bị. Worker đối chiếu ID image đã cài với biên bản kiểm định trước khi phục vụ bằng `node worker/service.mjs`. Chỉ đặt `Runner__IsolationVerified=true` trên API của môi trường đã nghiệm thu. Listener mặc định dùng loopback. Khi triển khai trên host tách biệt, đặt reverse proxy TLS dành riêng trước listener và giới hạn nguồn truy cập tới API gateway.

C# có 1 CPU, RAM 384 MiB, tối đa 64 PID, tmpfs 64 MiB và 12 giây mỗi ca. C# Run nhận danh sách đối số JSON tương ứng chữ ký. SQL dùng instance mới cho từng lần chạy, 2 CPU, RAM 3 GiB, tmpfs riêng, login chỉ dùng tempdb, timeout lệnh 4 giây. SQL Run dùng dataset công khai hoặc lệnh chuẩn bị tùy chỉnh với cùng login hạn chế. Mỗi job có hạn 150 giây. Khi Submit, SQL tham khảo và SQL của thí sinh chạy ở hai instance khác nhau. [Giới hạn tài nguyên Docker](https://docs.docker.com/engine/containers/resource_constraints/)
