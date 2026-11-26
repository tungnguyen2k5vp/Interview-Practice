# Tiến độ triển khai

Thư mục `Interview Practice` mới trong workspace `D:\ReactJS`, độc lập với các ứng dụng kề bên.

| Phần | Khảo sát ban đầu | Công việc P0 | Tệp chính |
| --- | --- | --- | --- |
| Hạ tầng | .NET SDK 10 và Node 24 có sẵn. SQL Server 2022 phản hồi qua Windows Authentication. | API cùng origin, Identity, EF migration, React/Vite và quy trình chạy local. | `server/Program.cs`, `server/Data.cs`, `web/vite.config.ts` |
| Nội dung | Brief có phạm vi và ví dụ. | Bộ nội dung độc lập và quản trị phiên bản cho câu hỏi, đáp án, rubric. | `server/Content/`, `server/Catalog.cs` |
| Dữ liệu học | Dự án mới. | Nháp có khóa phiên bản, nộp bất biến, bản sửa, lịch sử, ôn tập và ghi chú. | `server/Practice.cs`, `web/src/Practice.tsx` |
| Phỏng vấn | Có thông số và hai chế độ trong brief. | Lưu kế hoạch và trạng thái tại server, đồng hồ theo deadline, báo cáo theo nguồn. | `server/Interviews.cs`, `web/src/Interview.tsx` |
| Coding và SQL | Docker daemon chưa chạy. | Đề, editor, dataset, ví dụ, lời giải và nháp. UI phản ánh trạng thái thực thi. | `server/Content/exercises.json`, `web/src/Exercises.tsx` |

Thứ tự triển khai là ngân hàng → tự luyện/ôn → mock → editor và tổng quan → kiểm thử trên SQL Server và Chromium.

## Trạng thái bàn giao

| Giai đoạn | Đã triển khai | Còn lại hoặc giới hạn |
| --- | --- | --- |
| P0 | 44 câu Việt–Anh qua tám chủ đề. Tự luyện có nháp, gợi ý, lịch sử phiên bản, tự đánh giá, bản cải thiện, bookmark, ôn và ghi chú. Có 3 bộ mock và 2 chế độ, dashboard, tiến độ, hồ sơ, quản trị nội dung, export/xóa dữ liệu và 12 bài có editor. | Nháp mất mạng tiếp tục sau khi có kết nối trong tab và hồ sơ trình duyệt đã dùng. Phần mobile được kiểm tra qua Chromium giả lập. |
| P1 | Nhận xét AI cho lượt đã nộp, có trích dẫn và rubric theo phiên bản. Kế hoạch cơ bản dùng ưu tiên, phút mỗi ngày, số ngày mỗi tuần và bỏ lịch một ngày. | OpenAI thật cần khóa và model. Mock dùng câu đào sâu biên soạn sẵn. Runner C#/SQL, bài theo JD, lịch ôn thích ứng, import hàng loạt và quản trị bộ test nâng cao chưa triển khai. |
| P2 | — | Voice interview, coding đa ngôn ngữ, PWA/offline đầy đủ, hệ thống nâng cao và tích hợp tài khoản ngoài. |

## Kết quả kiểm tra ngày 25/11/2026

| Lệnh hoặc phạm vi | Kết quả |
| --- | --- |
| npm.cmd run build --prefix web | TypeScript và build Vite thành công. CodeMirror tải từ chunk riêng. |
| npm.cmd run lint --prefix web | ESLint thành công. |
| dotnet build server --no-restore | 0 cảnh báo, 0 lỗi. |
| dotnet tool run dotnet-ef migrations has-pending-model-changes --project server --no-build | Mô hình trùng migration cuối. Cả hai migration đã áp trên SQL Server 2022. Seed lặp lại giữ 44 câu xuất bản và lịch sử. |
| npm.cmd run test:content --prefix web | 31 ca đạt, 0 lỗi và 0 bỏ qua. Có 25 ví dụ/test C# và 6 truy vấn SQL kiểm tra kiểu và kết quả. |
| npm.cmd run test:e2e --prefix web với SQL Server QA | 13 nhóm đạt, 0 lỗi và 0 bỏ qua ở cả hai lần chạy. Một lần tắt AI, một lần dùng fixture loopback. Có phục hồi nháp, hai tab, hai tài khoản, CSRF, lịch sử rubric, pause/deadline của mock, ôn lại theo chủ đề phiên trước, editor và dữ liệu cá nhân. |
| Giao diện và điều hướng | Đã quan sát ảnh 1440, 768 và 360 px, điều hướng menu/dialog bằng bàn phím, kiểm tra isComposing bằng sự kiện tổng hợp và thao tác editor. Chưa kiểm tra bàn phím/IME trên điện thoại thật hoặc Safari/Firefox. |
| Impeccable | Detector trả về danh sách rỗng. Review ảnh thực hiện trực tiếp vì công cụ reviewer riêng báo lỗi tên model. |

Ảnh từ bản dựng được lưu trong [desktop](.impeccable/review/desktop.png), [tablet](.impeccable/review/tablet.png), [mobile](.impeccable/review/mobile.png) và [editor mobile](.impeccable/review/mobile-editor.png). Các ảnh ghi lại giao diện trong lần chạy QA.

Các ca về giới hạn CPU/RAM/output, hủy cây tiến trình, cách ly mạng/máy chủ và bảo mật hidden test phụ thuộc runner. Các ca thực thi đó chưa chạy. QA dùng provider AI nội bộ.
