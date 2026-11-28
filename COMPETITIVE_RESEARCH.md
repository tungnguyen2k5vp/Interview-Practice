# Nghiên cứu nội dung · 27/11/2026

## Bổ sung V4 · học tương tác và thực hành dự án

Các trang dưới đây đã mở ngày 27/11/2026 bằng công cụ web. NeetCode trả trang gần như rỗng trong text browser; Playwright sau khi chạy JavaScript hiển thị được danh mục, roadmap và trang giới thiệu khóa học. Phạm vi quan sát là trang công khai. Các luồng bên trong tài khoản, chấm bài và nội dung trả phí chưa được xác minh trong lần nghiên cứu này.

| Nguồn thực sự mở | Quan sát và cách áp dụng |
|---|---|
| [Frontend Mentor](https://www.frontendmentor.io/) | Có bài theo thiết kế và bài theo đặc tả sản phẩm, phản hồi sau nộp. Mini project .NET cần hợp đồng và tiêu chí nghiệm thu có thể kiểm tra, kèm bài review; nội dung và tài sản tự biên soạn. |
| [Codewars](https://www.codewars.com/) | Trang mô tả kata, kiểm tra bằng test và so sánh cách giải sau hoàn thành. Thêm mutant sai có chủ đích để đo khả năng bắt lỗi, cùng giải thích trade-off sau khi nộp. |
| [NeetCode](https://neetcode.io/) | Trang có thứ tự chủ đề từ array/hash tới graph và DP, các mục có phần giải thích dạng video. Dùng quan hệ tiên quyết rõ ràng và một đường tiếp tục học. Thống kê trên trang là tuyên bố của nhà cung cấp. |
| [DataLemur](https://datalemur.com/) | Danh sách SQL thể hiện chủ đề và độ khó ngay trong bảng. Dùng dataset có ngữ cảnh và edge case; đáp án của dự án giữ dialect SQL Server 2022. |
| [SQLZoo](https://sqlzoo.net/) | Có chuỗi bài theo thao tác, bài quiz và nhiều dataset. Một số phần DDL hướng dẫn MySQL nên cần đối chiếu riêng T-SQL trước khi áp dụng. |
| [Brilliant](https://brilliant.org/) | Trang công khai mô tả học qua tương tác và phản hồi khi làm bài. Bài học của dự án cần yêu cầu dự đoán hoặc giải thích trước khi mở phần đối chiếu, rồi chuyển sang một tình huống khác. |
| [Anki](https://apps.ankiweb.net/) | Trình bày lịch ôn và tùy chỉnh thời gian thẻ. Tiếp tục dùng scheduler hiện có và bằng chứng độc lập theo ngày. Chưa kiểm thử cài đặt hay đồng bộ Anki. |
| [Pramp](https://www.pramp.com/) | Trang cho biết các phiên mới chuyển sang Aced Practice từ tháng 7/2024. Dùng hoạt động trình bày lời giải và phản hồi theo vai trò; chưa kiểm thử buổi ghép cặp thật. |
| [Microsoft Learn](https://learn.microsoft.com/) | Có điểm vào tài liệu, hướng dẫn tác vụ và đào tạo. Dẫn lại section hỗ trợ chính xác mệnh đề của bài, ghi riêng nguồn đã đọc và URL chỉ kiểm HTTP. |
| [Refactoring.Guru](https://refactoring.guru/) | Kết nối refactoring, code smell và design patterns. Dùng tình huống trước/sau với lý do thay đổi, tránh chấm theo việc thuộc tên pattern. |
| [Design Gurus](https://www.designgurus.io/) | Trang tách vòng coding, system design và behavioral; ví dụ tiêu chí nêu ràng buộc trước kiến trúc. Preset nên xác định kỹ năng và ngân sách thời gian, không suy rộng bối cảnh tuyển dụng FAANG sang Việt Nam. |

Exercism C#, roadmap ASP.NET Core và Hello Interview đã có quan sát phù hợp trong V3 bên dưới; lần này tiếp tục áp dụng kết quả đó. Các trang bổ sung dùng để nghiên cứu cấu trúc hoạt động, không có nội dung đề/test/hình được tái sử dụng. Chưa xác minh giấy phép chuyển thể cho các trang thương mại. Anki có mã nguồn mở nhưng bài học và thẻ cộng đồng có thể mang điều khoản riêng; V4 không nhập deck hay mã Anki.

Áp dụng ở checkpoint Phase 1–2 ngày 28/11/2026: 95 lời giải sai có chủ đích đã bị test Docker bắt; 25 preset có mức và quỹ thời gian cụ thể, dùng bộ chọn gọn thay cho danh sách card dài. Mẫu interactive lesson, mini project và nhật ký lỗi vẫn là định hướng cho phase tiếp theo, chưa được tính như tính năng hoàn thành.

Mở trực tiếp các trang công khai bằng trình duyệt web. Dùng thêm Playwright để đọc trang đầu SQLBolt. Quan sát dưới đây giới hạn ở nội dung trả về trong phiên, gồm bản lưu khi trang tuyển dụng đã đóng. Không đăng nhập, thu thập dữ liệu cá nhân, tải bộ đề, sao chép editorial hay test.

| Trang đã truy cập | Quan sát, giới hạn và cách áp dụng |
|---|---|
| [bool.dev · .NET Quiz](https://bool.dev/learn/dotnet-interview-questions) | Ô topic × level mở phiên luyện, có giải thích sau đáp án. Tách độ bao phủ khỏi bằng chứng hiểu lâu dài. Không dùng điểm lần đầu làm chuẩn mastery. |
| [MeetAssist · C# and .NET](https://meetassist.io/interview-questions/csharp-dotnet) | Phần hướng dẫn phân biệt định nghĩa với giải thích tình huống web và dữ liệu. Dùng follow-up yêu cầu lập luận; mẫu do nền tảng công bố không đại diện cho tuyển dụng Việt Nam. |
| [Exercism · C# Track](https://exercism.org/tracks/csharp) | Concept có bài luyện cụ thể và mentoring. Liên kết một concept với các bằng chứng khác nhau. Sản phẩm hiện chấm bằng runner và rubric. |
| [Exercism C#](https://github.com/exercism/csharp) | Track tách hướng dẫn đóng góp và bài theo thư mục. Áp dụng batch nhỏ, kiểm thử reference; giữ dữ liệu đề và test của dự án tự biên soạn. |
| [Top Interview 150](https://leetcode.com/studyplan/top-interview-150/) | Trang giới thiệu phạm vi, thời gian chuẩn bị và editorial. Học cách nêu mục tiêu và quỹ thời gian; DSA chỉ là một phần của vòng .NET. |
| [SQL 50](https://leetcode.com/studyplan/top-sql-50/) | Lộ trình SQL cơ bản đến trung cấp có kích thước và thời gian hữu hạn. Tự thiết kế dataset, kiểm định T-SQL thật trước khi dùng. |
| [ASP.NET Core Developer Roadmap](https://roadmap.sh/aspnet-core) | Bản đồ theo vai trò giúp chọn điểm bắt đầu. Text view xác nhận loại lộ trình, chưa xác minh từng cạnh trên canvas. |
| [Backend Developer Roadmap](https://roadmap.sh/backend) | Trang mô tả nhiệm vụ backend và tài nguyên theo vai trò. Giữ học phần HTTP, database, delivery; chỉ đưa công nghệ phù hợp vào mục tiêu .NET. |
| [Roadmap Questions](https://roadmap.sh/questions) | Có điểm vào riêng để luyện câu hỏi theo lĩnh vực. Giữ một ngân hàng có đường dẫn lọc theo concept, tránh nhân bản câu. |
| [Hello Interview · System Design in a Hurry](https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction) | Đi từ khung trình bày tới concept, công nghệ, pattern rồi phân tích đề. Dùng constraint và trade-off trong rubric; chưa đánh giá phần Premium. |
| [SQLBolt · Interactive Tutorial](https://sqlbolt.com/) | Mục lục chuyển từ SELECT tới JOIN và tổng hợp. Trình duyệt Playwright mở được trang bài học. Tách bài đọc kết quả khỏi bài viết query; không mặc định dialect của ví dụ là T-SQL. |
| [StefanTheCode · .NET interview questions](https://github.com/StefanTheCode/dotnet_interview_questions) | README cho phép duyệt các mục hỏi đáp. Dùng để rà taxonomy; mỗi câu của dự án phải có tình huống, nguồn và mục tiêu đánh giá riêng. |
| [in-hemantgupta · .NET interview questions](https://github.com/in-hemantgupta/dotnet-interview-questions) | Tác giả ghi rõ mức Fresher đến Senior và điều interviewer muốn đánh giá. Dùng mục tiêu quan sát được làm tiêu chí rubric; tránh biến nhận định tác giả thành chuẩn tuyển dụng. |
| [System Design Primer](https://github.com/donnemartin/system-design-primer) | Repo kết hợp câu thiết kế, đánh đổi và thẻ Anki. Chuyển ý tưởng tự kiểm tra sang recall hiện có. Các liên kết ngoài có quyền riêng. |
| [.NET documentation](https://learn.microsoft.com/en-us/dotnet/) | Phân biệt hướng dẫn runtime, API và hướng dẫn tác vụ. |
| [C# documentation](https://learn.microsoft.com/en-us/dotnet/csharp/) | Đối chiếu quy tắc ngôn ngữ và phiên bản. |
| [ASP.NET Core documentation](https://learn.microsoft.com/en-us/aspnet/core/) | Trang mặc định có thể chuyển sang bản mới. Dùng view aspnetcore-10.0 cho bài của dự án. |
| [EF Core documentation](https://learn.microsoft.com/en-us/ef/core/) | Tách query, tracking và persistence để soát trade-off. |
| [Microsoft SQL documentation](https://learn.microsoft.com/en-us/sql/) | Chọn SQL Server 2022; chạy expected output trên SQL Server bên cạnh tra cứu tài liệu. |
| [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/) | Đối chiếu các ràng buộc và mẫu thiết kế; tránh bắt buộc nhà cung cấp cloud trong rubric. |
| [.NET Docs source](https://github.com/dotnet/docs) | Có thể truy vết thay đổi tài liệu và kiểm tra giấy phép tách biệt. |
| [ASP.NET Core source](https://github.com/dotnet/aspnetcore) | Dùng làm nguồn tra cứu triển khai sau khi xác định đúng bản. |
| [EF Core source](https://github.com/dotnet/efcore) | Đối chiếu hành vi provider với docs tương ứng. |
| [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | Danh mục hướng dẫn phòng vệ cho phép chọn chủ đề kiểm quyền và kiểm tra cấu hình. |
| [Digital Technology Solutions · Junior Backend Developer](https://itviec.com/it-jobs/junior-backend-developer-net-c-digital-technology-solutions-jsc-2351) | Bản web lưu nêu .NET, SQL, phối hợp test và hỗ trợ sau triển khai. Lần mở lại trả 410. Dùng làm bối cảnh giao tiếp với QA, không suy tần suất. |
| [Pixelz · Junior/Middle Software Engineer](https://itviec.com/it-jobs/junior-middle-software-engineer-net-pixelz-5431?lab_feature=employer_job) | Không dùng để xác nhận tin còn tuyển hoặc rút kết luận thị trường. |

## Quyết định cho ngân hàng Việt Nam

Ưu tiên tình huống đọc hợp đồng API, báo cáo SQL, diễn giải thay đổi giữa dev và QA trước khi mở rộng Senior. Bài SQL mới dùng giá trị và kết quả tự thiết kế. Tìm viết tắt theo concept và giữ đường quay lại phiên luyện. Mốc thời gian của study plan phải phụ thuộc thời lượng người học chọn. Tin tuyển dụng là gợi ý biên tập định tính. Chưa có mẫu đủ để công bố tỷ lệ câu xuất hiện trong phỏng vấn.

## Quyền và giới hạn

Các trang thương mại chỉ phục vụ quan sát taxonomy và trải nghiệm. Kho Exercism có LICENSE MIT; riêng trang track và tài nguyên liên kết không được suy rộng giấy phép. Đã đọc LICENSE MIT của in-hemantgupta, phần License cuối README của Primer sau khi đường dẫn /LICENSE trả 404, LICENSE và LICENSE-CODE của dotnet/docs, LICENSE.txt của ASP.NET Core và EF Core, LICENSE.md của OWASP. Repo StefanTheCode chưa tìm thấy LICENSE trên trang repo, endpoint giấy phép chưa xác minh được. Bảng [SOURCES.md](SOURCES.md) ghi phạm vi và attribution.
