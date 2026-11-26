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

Trạng thái hợp lệ gồm queued, running, accepted, completed, compile_error, runtime_error, wrong_answer, timeout, cancelled và failed. Cấu hình dùng HTTPS, cache handshake 10 giây, deadline mỗi request 4 giây, body phản hồi tối đa 256 KiB, tắt follow redirect. Worker chịu trách nhiệm lưu lịch sử, thực hiện hủy/timeout và dọn tài nguyên, kể cả khi caller rời trang.

## Điều kiện vận hành

Bản bàn giao để runner tắt. Docker daemon trên máy kiểm thử chưa chạy. Worker cần một môi trường dành riêng cho mã không tin cậy, quota CPU/RAM/PID/file/output/thời gian, mạng bị hạn chế và tài khoản quyền tối thiểu. Bộ chấm giữ expected output và hidden test ngoài vùng mã thí sinh đọc được. T-SQL cần database hoặc instance reset độc lập. API, SQL ứng dụng, secret và Docker socket phải ở ngoài môi trường chạy bài. Đặt cờ xác nhận cách ly sau khi kiểm thử các điều kiện này.

Repo đã kiểm thử trạng thái worker vắng mặt và validation phía gateway. Thực thi thật, so sánh hai submission, hủy tiến trình và giới hạn tài nguyên của worker còn chờ môi trường. [Giới hạn tài nguyên Docker](https://docs.docker.com/engine/containers/resource_constraints/)
