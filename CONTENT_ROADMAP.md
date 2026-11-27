# Lộ trình biên tập V3

## Ma trận 1.000 câu

Các chỉ tiêu trong brief cộng thành 1.060; mức trình độ cộng thành 1.000. Để kiểm kê theo một mục tiêu chính cho mỗi câu, phân bổ lại tỷ lệ từng lĩnh vực theo 1.000/1.060, lấy phần nguyên rồi chia các suất lẻ cho phần dư lớn nhất. Giữ 11 topic hiển thị để các lần làm cũ, mock, bookmark và roadmap vẫn dùng cùng ID. Trong quota Collections/LINQ dành 15 suất cho thuật toán dựa trên cấu trúc dữ liệu. Các tag phụ có thể giao nhau.

| Lĩnh vực biên tập | Brief | Mục tiêu duy nhất | Topic trong ứng dụng |
|---|---:|---:|---|
| C# cơ bản |80|76|csharp|
| Advanced C# |70|66|csharp|
| OOP, SOLID |65|61|oop|
| Collections, LINQ và cấu trúc dữ liệu |60|57|linq, algorithms|
| Async, thread, concurrency |65|61|linq, csharp|
| CLR, GC, performance |45|43|csharp|
| ASP.NET Core |100|94|aspnet|
| HTTP, REST, networking |60|57|aspnet, systems|
| EF Core |70|66|efcore|
| SQL Server, database |90|85|sql|
| Xác thực và bảo mật |50|47|aspnet|
| Design Patterns |45|42|oop|
| Kiến trúc phần mềm |45|42|systems, oop|
| Unit và integration testing |35|33|testing|
| Git, Docker, CI/CD |35|33|delivery|
| Cache, message queue |35|33|systems|
| System Design |40|38|systems|
| HR, hành vi, dự án |70|66|behavioral, testing|
| **Tổng** |**1.060**|**1.000**| |

| Intern | Fresher | Junior | Middle | Senior |
|---:|---:|---:|---:|---:|
|200|250|300|170|80|

## Mốc nghiệm thu

| Mốc | Sản phẩm | Điều kiện |
|---|---|---|
| Audit, nghiên cứu | Baseline SQL/seed, đối chiếu nền tảng, JD, giấy phép | Nguồn lỗi có trạng thái riêng |
| Foundation | Concept, alias, tiên quyết, import idempotent, validator | Không có orphan, vòng lặp, key sai hoặc lịch sử bị thay |
| Core | 250–300 câu, ưu tiên ba trình độ đầu | Kiểm tra cả hai ngôn ngữ, đối chiếu rubric; snippet C#/SQL khớp runtime |
| Expanded | Khoảng 500 câu | Bù coverage theo domain; mỗi batch có mục tiêu khác biệt và review |
| Practical | 200 C#, 150 T-SQL, 80 debugging, 60 review, 40 design, 40 project | Test reference và edge case; chỉ bật chạy khi worker được kiểm chứng |
| Advanced | Tiến tới 1.000 câu, 50 preset | Bổ sung tình huống Middle/Senior, không đếm bản dịch hay biến thể gần trùng |
| Integration | Câu, bài áp dụng, mock, roadmap và lịch ôn | Bằng chứng độc lập theo đúng người và version |
| Production | Search phân trang, quản trị, kiểm thử | Dữ liệu trước/sau, bàn phím, màn hình hẹp, Chrome và SQL Server |

## Quy trình một batch

1. Chọn khoảng trống từ báo cáo độ phủ. Mỗi đề ghi một quyết định hoặc hành vi quan sát được mà người học cần giải thích. Tra slug cũ và cả các mục tiêu tương tự bằng tiếng Anh.
2. Tạo file theo chủ đề. Câu viết có bài vận dụng trong `knowledge-checks-batch-*.json`. Bản nháp của biên tập viên nhập qua admin, không đặt bản chưa đạt vào seed xuất bản. Nêu nguồn, phiên bản công nghệ, ngày, ví dụ, đáp án ngắn, lý do, bẫy, hai gợi ý, follow-up và rubric.
3. Kiểm tra VI và EN có cùng giả định, đáp án đúng, ràng buộc và lượng thông tin. Với câu tình huống, thử bảo vệ từng distractor và làm rõ điều kiện khiến chỉ key được chấp nhận. Đối chiếu phần kiến thức với tài liệu gốc.
4. Chạy `node web/checks/content.mjs` trên SQL Server, `node web/checks/content.mjs --sources` để kiểm tra URL. Với bài thực thi, chạy thêm bộ catalog private trên Docker theo RUNNER.md. Lưu expected có nguồn gốc xác định và so cả kiểu dữ liệu/thứ tự. Không dùng AI review như kết quả thực thi.
5. Đi từ nháp qua hàng chờ và xác nhận thẩm định trong admin. Bản công khai cũ tiếp tục phục vụ tới khi biên tập viên xuất bản bản mới. Dùng slug cũ cho revision, chụp version trong phiên học và không dùng import để ghi đè lịch sử.
6. Khi phát hành seed mới, chính working tree đã kiểm định là lô xuất bản. CI chạy lại tests trên database riêng. Kiểm đếm production tách riêng các sửa đổi riêng của từng admin. Nội dung ngừng xuất bản vẫn giữ revision cũ cho lịch sử.
