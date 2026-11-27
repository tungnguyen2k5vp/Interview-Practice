# Nguồn và quyền sử dụng

Manifest V3 kiểm kê 231 URL. 256 câu hỏi seed dùng 206 URL và nghiên cứu dùng 26 URL, cùng dùng chung trang tổng quan EF Core. ID `q-` dùng 12 ký tự hex đầu của SHA-256 trên toàn bộ URL UTF-8, gồm query và fragment. ID `r-` dùng tên cố định. Giữ riêng hai URL nếu seed ghi hai view, hai mục RFC hoặc hai đường dẫn khác nhau.

## Dấu vết kiểm tra

- `S25`, `S26`, `S27` ghi lại `checkedOn` lần lượt vào 25, 26 và 27/11/2026. Chẳng hạn `S25/27` cho biết cùng URL xuất hiện ở hai ngày. Mốc này đến từ seed. Ngân hàng V2 có biên bản kiểm định trước V3.
- `M27` ghi lần mở bằng công cụ duyệt web ngày 27/11/2026 có bằng chứng cho URL. Hai tin ITviec ghi rõ giới hạn của dữ liệu trả về. Với 11–13, chỉ ghi `M27` cho URL đã có bằng chứng cụ thể.
- Trình kiểm tra `node web/checks/content.mjs --sources` xác nhận phản hồi HTTP thành công qua HTTPS. URL có fragment vẫn giữ ID riêng dù máy chủ chỉ nhận đường dẫn trước fragment. Kết quả HTTP không kiểm tra được nội dung ngay tại fragment. `L27` ghi kết quả 206/206 URL của bộ kiểm tự động ngày 27/11/2026.
- `Động` chỉ nguồn trực tuyến chưa ghim ảnh chụp tài liệu hoặc commit. View như `.NET 10.0` hoặc `SQL Server 2022 (v16)` ghi phiên bản sản phẩm mà URL yêu cầu. Commit của các kho nghiên cứu chưa được ghi lại. Ngày RFC và kỳ học MIT OCW dùng bản phát hành đã xác định.

## Quyền, cách dùng và ghi nguồn

Bài tập, tình huống, câu hỏi, lựa chọn, giải thích, dữ liệu và test của dự án được tự biên soạn. Trường `source` trỏ tài liệu dùng để đối chiếu hành vi hoặc khái niệm. Các nguồn nghiên cứu đóng góp cách tổ chức chủ đề, thiết kế hoạt động và bối cảnh Việt Nam. Khi dẫn lại, ghi tên tác giả hoặc tổ chức, tiêu đề, URL và phiên bản phù hợp. Khi nhập tài liệu trong tương lai, kiểm tra giấy phép của từng tệp, giữ notice bắt buộc, ghi giấy phép và nêu phần chuyển ngữ hoặc chỉnh sửa. Quyền đối với nội dung bên thứ ba và nhãn hiệu vẫn do chủ sở hữu quy định.

| Mã | Quyền và phạm vi sử dụng trong dự án |
| --- | --- |
| MS-LEARN | Đối chiếu hành vi kỹ thuật và dẫn link. Điều khoản của Microsoft Learn và nguồn tương ứng áp dụng theo trang, tệp và tài sản. Giấy phép của `dotnet/docs` chỉ mô tả kho đó. [Microsoft Learn Terms of Use](https://learn.microsoft.com/en-us/legal/termsofuse) |
| DOCS-CODE | Kho `dotnet/docs` dùng CC BY 4.0 cho tài liệu và MIT cho mã. Nội dung dùng để tra cứu. Nếu tái sử dụng phần thuộc CC BY, ghi công, dẫn giấy phép và nêu thay đổi. Với mã MIT, giữ copyright và permission notice khi phân phối. [LICENSE](https://github.com/dotnet/docs/blob/main/LICENSE) · [LICENSE-CODE](https://github.com/dotnet/docs/blob/main/LICENSE-CODE) |
| MIT | Kho được ghi nhận cấp phép MIT. Chỉ tra cứu, dẫn nguồn. Bản sao hoặc phần đáng kể nếu dùng sau cần giữ copyright và permission notice. [Exercism C#](https://github.com/exercism/csharp) · [in-hemantgupta](https://github.com/in-hemantgupta/dotnet-interview-questions/blob/main/LICENSE) · [ASP.NET Core](https://github.com/dotnet/aspnetcore/blob/main/LICENSE.txt) · [EF Core](https://github.com/dotnet/efcore/blob/main/LICENSE.txt) |
| CC-BY | System Design Primer ghi CC BY 4.0. Hiện chỉ tham khảo cấu trúc. Khi dùng lại tài sản nằm trong phạm vi cấp phép, ghi tác giả, nguồn và giấy phép, đồng thời nêu chỉnh sửa. [LICENSE.txt](https://github.com/donnemartin/system-design-primer/blob/master/LICENSE.txt) |
| OWASP | Cheat Sheet Series dùng CC BY-SA 4.0. Chỉ đối chiếu hướng dẫn phòng vệ. Bản chuyển thể được chia sẻ phải đáp ứng attribution và ShareAlike. [OWASP LICENSE](https://github.com/OWASP/CheatSheetSeries/blob/master/LICENSE.md) |
| RFC | Tra cứu tiêu chuẩn, dẫn số RFC và mục. Quy định tái sử dụng văn bản chuẩn và code component theo IETF Trust Legal Provisions. [IETF Trust Legal Provisions](https://trustee.ietf.org/license-info/) |
| DOCKER | Tra cứu Docker Docs. Kho tài liệu ghi Apache-2.0. Khi định tái sử dụng, xem giấy phép và notice của tài liệu cụ thể. [docker/docs LICENSE](https://github.com/docker/docs/blob/main/LICENSE) |
| GH-DOC | Tra cứu GitHub Docs. Kho công bố CC BY 4.0 cho nội dung tài liệu và MIT cho mã trong phạm vi đã liệt kê. [github/docs licensing](https://github.com/github/docs/blob/main/README.md#license) |
| GIT | Đối chiếu trang hướng dẫn lệnh. Kho Git ghi GPL v2 và các ngoại lệ theo tệp. Xác minh tệp nguồn nếu định phân phối lại nội dung. [Git COPYING](https://github.com/git/git/blob/master/COPYING) |
| XUNIT | Tra cứu hướng dẫn và mã quy tắc analyzer. Kho nội dung xUnit.net công bố Apache-2.0. [xUnit.net LICENSE](https://github.com/xunit/xunit.net/blob/main/LICENSE.txt) |
| GOV | Dẫn trang hướng dẫn phỏng vấn. Điều khoản ghi Open Government Licence v3.0 trừ phần có ghi chú khác. [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) |
| OCW | Tra cứu bài giảng MIT OCW. Điều khoản chung ghi CC BY-NC-SA 4.0, với ngoại lệ theo tài liệu. [MIT OpenCourseWare Terms of Use](https://ocw.mit.edu/pages/privacy-and-terms-of-use/) |
| PUBLIC | Dẫn trang hướng dẫn công khai. Chưa ghi nhận giấy phép tái sử dụng cho nội dung được dẫn. |
| OBS | Quan sát tính năng, thứ tự học hoặc cách trình bày trên trang công khai. Giới hạn phạm vi sử dụng ở mô tả tự viết và link. |
| UNKNOWN | Trang kho công khai có thể đọc. Giấy phép chưa được xác minh, chỉ dẫn link và ghi nhận quan sát. |
| JD | Tin tuyển dụng công khai dùng để gợi bối cảnh định tính. Chưa ghi nhận giấy phép tái sử dụng. Dẫn URL của tin, giữ ngày truy cập và trạng thái bản lưu hoặc trang đã đóng. |

## Nguồn ngân hàng câu hỏi

Cột phạm vi liệt kê mọi slug trỏ trực tiếp tới URL. Với nguồn tổng quan, slug cho biết chủ điểm mà seed dùng để đối chiếu.

### C# và .NET

| ID | Nguồn | Phạm vi qua slug câu hỏi | Phiên bản nguồn | Kiểm tra | Quyền |
| --- | --- | --- | --- | --- | --- |
| q-9e5dd3e2dcf3 | [AuthorizationOptions.FallbackPolicy](https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.authorization.authorizationoptions.fallbackpolicy?view=aspnetcore-10.0) | aspnet-fallback-require-authenticated | ASP.NET Core 10.0 | S27 · L27 | MS-LEARN |
| q-a2cba8589010 | [NullLogger](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.abstractions.nulllogger?view=net-10.0) | pattern-null-logger | .NET 10.0 | S27 · L27 | MS-LEARN |
| q-4c3b2946a27a | [Array](https://learn.microsoft.com/en-us/dotnet/api/system.array?view=net-10.0) | array-binary-missing | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-f48697847317 | [ArrayPool&lt;T&gt;.Return](https://learn.microsoft.com/en-us/dotnet/api/system.buffers.arraypool-1.return?view=net-10.0) | pool-return-after-consumer | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-097dcf7ef7b3 | [ConcurrentDictionary&lt;TKey, TValue&gt;.GetOrAdd](https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentdictionary-2.getoradd?view=net-10.0) | concurrent-cache-factory | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-e756559e3701 | [Dictionary&lt;TKey, TValue&gt;.TryGetValue](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2.trygetvalue) | dictionary-tryget-default | Động | S26 · L27 | MS-LEARN |
| q-04b40f09869f | [Dictionary&lt;TKey, TValue&gt;](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2?view=net-10.0) | dict-tryadd-original | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-605dbe8771d2 | [HashSet&lt;T&gt;.Add](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.hashset-1.add) | hashset-add-result | Động | S26 · L27 | MS-LEARN |
| q-4a9f11dd6cfa | [HashSet&lt;T&gt;](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.hashset-1?view=net-10.0) | hashset-symmetric | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-ade5d495f0c7 | [LinkedList&lt;T&gt;](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlist-1?view=net-10.0) | linked-splice | .NET 10.0 | S25 · L27 | MS-LEARN |
| q-bbb0df33b7af | [List&lt;T&gt;.AsReadOnly](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.asreadonly?view=net-10.0) | oop-readonly-view-live | .NET 10.0 | S27 · L27 | MS-LEARN |
| q-0bb3ebcc0ff0 | [List&lt;T&gt;.Enumerator](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.enumerator) | enumerator-copy | Động | S26 · L27 | MS-LEARN |
| q-e9f11c9ac3a3 | [List&lt;T&gt;](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1?view=net-10.0) | list-removeall-count | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-2fe31c11dede | [Queue&lt;T&gt;](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.queue-1) | queue-peek-dequeue | Động | S26 · L27 | MS-LEARN |
| q-b77cb3957ff4 | [InsufficientExecutionStackException](https://learn.microsoft.com/en-us/dotnet/api/system.insufficientexecutionstackexception?view=net-10.0) | tree-height | .NET 10.0 | S25 · L27 | MS-LEARN |
| q-a472e8a6ec71 | [Int32.TryParse](https://learn.microsoft.com/en-us/dotnet/api/system.int32.tryparse) | tryparse-zero | Động | S26 · L27 | MS-LEARN |
| q-2a5209f6d2e7 | [GZipStream](https://learn.microsoft.com/en-us/dotnet/api/system.io.compression.gzipstream?view=net-10.0) | pattern-decorator-compressed-stream | .NET 10.0 | S27 · L27 | MS-LEARN |
| q-321a892d90fa | [StreamReader constructor](https://learn.microsoft.com/en-us/dotnet/api/system.io.streamreader.-ctor) | dispose-ownership | Động | S26 · L27 | MS-LEARN |
| q-cea2fce98eb8 | [Enumerable.Aggregate](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.aggregate?view=net-10.0) | linq-aggregate-seed-empty | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-83c4738ac5e8 | [Enumerable.All](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.all) | linq-any-empty | Động | S26 · L27 | MS-LEARN |
| q-a0305c04ff8b | [Enumerable.Chunk](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.chunk?view=net-10.0) | linq-chunk-tail-size | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-9a9dde8e0921 | [Enumerable.ExceptBy](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.exceptby?view=net-10.0) | linq-exceptby-key-first | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-1b6109e78132 | [Enumerable.FirstOrDefault](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.firstordefault) | linq-first-default | Động | S26 · L27 | MS-LEARN |
| q-fb09b7e92a0e | [Enumerable.GroupBy](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.groupby?view=net-10.0) | linq-groupby-comparer-first-key | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-d12d8e1d36a9 | [Enumerable.GroupJoin](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.groupjoin?view=net-10.0) | linq-groupjoin-unmatched | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-04439d7a579e | [Enumerable.MaxBy](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.maxby) | linq-maxby-revision | Động | S26 · L27 | MS-LEARN |
| q-c4b629b79f43 | [Enumerable.OfType](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.oftype?view=net-10.0) | linq-oftype-mixed-cells | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-936755275a7b | [Enumerable.SelectMany](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.selectmany) | linq-selectmany-lines | Động | S26 · L27 | MS-LEARN |
| q-43d6f229a909 | [Enumerable.SequenceEqual](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.sequenceequal?view=net-10.0) | linq-sequenceequal-order | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-b80707beb1f0 | [Enumerable.SingleOrDefault](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.singleordefault?view=net-10.0) | linq-single-duplicate-invariant | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-e92e19a36e6c | [Enumerable.SkipWhile](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.skipwhile?view=net-10.0) | linq-skipwhile-prefix | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-a47d41e2f990 | [Enumerable.ThenBy](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.thenby) | linq-order-tiebreak | Động | S26 · L27 | MS-LEARN |
| q-1d234fded481 | [Enumerable.ToDictionary](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.todictionary?view=net-10.0) | linq-todictionary-equivalent-keys | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-e8028c1bce03 | [Enumerable.ToLookup](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.tolookup?view=net-10.0) | linq-lookup-missing-key | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-6ec4f3b9aa51 | [Enumerable.Union](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.union) | linq-union-concat | Động | S26 · L27 | MS-LEARN |
| q-8b2e0a824a6a | [Enumerable.Zip](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.zip?view=net-10.0) | linq-zip-shortest-input | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-aba904c7e631 | [Math.Round](https://learn.microsoft.com/en-us/dotnet/api/system.math.round) | round-to-even | Động | S26 · L27 | MS-LEARN |
| q-b20d52eb8e92 | [Span&lt;T&gt;](https://learn.microsoft.com/en-us/dotnet/api/system.span-1) | span-alias-slice | Động | S26 · L27 | MS-LEARN |
| q-f6244e901147 | [String.Split](https://learn.microsoft.com/en-us/dotnet/api/system.string.split?view=net-10.0) | split-trim-empty | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-8a939c10ab64 | [StringComparer.OrdinalIgnoreCase](https://learn.microsoft.com/en-us/dotnet/api/system.stringcomparer.ordinalignorecase) | ordinal-key-lookup | Động | S26 · L27 | MS-LEARN |
| q-adfa810fbf49 | [CancellationTokenSource.CreateLinkedTokenSource](https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource.createlinkedtokensource?view=net-10.0) | linked-cancel-direction | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-9cb458ef2296 | [Interlocked.CompareExchange](https://learn.microsoft.com/en-us/dotnet/api/system.threading.interlocked.compareexchange) | interlocked-compareexchange | Động | S26 · L27 | MS-LEARN |
| q-95544b73fcb5 | [SemaphoreSlim.WaitAsync](https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim.waitasync) | semaphore-release | Động | S26 · L27 | MS-LEARN |
| q-a4a0bc94598a | [SemaphoreSlim.WaitAsync](https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim.waitasync?view=net-10.0) | semaphore-timeout-no-permit | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-8f9b4a5b9fd2 | [Parallel.ForEachAsync](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.parallel.foreachasync?view=net-10.0) | parallel-loop-io-limit | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-9163cfe1d7a0 | [Task.WaitAsync](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.waitasync) | task-waitasync | Động | S26 · L27 | MS-LEARN |
| q-975881a35e64 | [Task.WhenAll](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.whenall?view=net-10.0) | whenall-fault-precedence | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-3e5508ceecec | [Task.WhenAny](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.whenany?view=net-10.0) | whenany-faulted-winner | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-552f3bad9260 | [TaskCompletionSource&lt;TResult&gt;](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.taskcompletionsource-1?view=net-10.0) | task-bridge-duplicate-completion | .NET 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-35f5e0ac6772 | [Architectural principles for modern web apps](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles) | pattern-factory-provider-selection | Động | S27 · L27 | MS-LEARN |
| q-7aa0023dd3ec | [Common web application architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures) | arch-layer-deployment, arch-dependency-inversion | Động | S27 · M27 · L27 | MS-LEARN |
| q-670d7cb49890 | [Diagnose ThreadPool starvation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-threadpool-starvation) | threadpool-blocking-await | Động | S27 · M27 · L27 | MS-LEARN |
| q-c23c3f2f5d6f | [.NET channels](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels) | channel-backpressure-wait | Động | S27 · M27 · L27 | MS-LEARN |
| q-efd8ccbf9e80 | [Dependency injection in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection) | di-keyed | Động | S26 · L27 | MS-LEARN |
| q-a1ad02e2aecc | [IHttpClientFactory in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory) | aspnet-httpclient-named | Động | S27 · L27 | MS-LEARN |
| q-500198fc4318 | [Use scoped services in a .NET BackgroundService](https://learn.microsoft.com/en-us/dotnet/core/extensions/scoped-service) | di-scope-worker | Động | S26 · L27 | MS-LEARN |
| q-4d3c18b44d28 | [Unit testing best practices](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices) | test-public-behavior-refactor, test-order-independent, test-assert-business-outcome | Động | S27 · M27 · L27 | MS-LEARN |
| q-da3aed3ab19a | [.NET unit test code coverage](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-code-coverage) | test-coverage-oracle | Động | S27 · M27 · L27 | MS-LEARN |
| q-96d731e625c2 | [Asynchronous programming in C#](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/) | async-io, cancellation, when-all | Động | S25 · L27 | MS-LEARN |
| q-398b950b6e8d | [Async return types](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-return-types) | worker-async-task-contract | Động | S27 · M27 · L27 | MS-LEARN |
| q-d7512fe5bbe9 | [C# object-oriented programming](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/) | invariants, interface-abstract, inheritance-lsp, composition-discounts, testable-clock | Động | S25 · L27 | MS-LEARN |
| q-7e0a8870bc6d | [Polymorphism](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/polymorphism) | oop-virtual-base-reference | Động | S27 · L27 | MS-LEARN |
| q-fba3de0e8ba8 | [The C# type system](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/) | value-reference, record-equality, nullable-contract, exceptions-boundary, generics-gc | Động | S25 · L27 | MS-LEARN |
| q-c6cada2802b4 | [C# tuple types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-tuples) | tuple-swap-snapshot | Động | S27 · M27 · L27 | MS-LEARN |
| q-d7e35ab801fa | [C# init accessor](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/init) | oop-init-mutable-reference | Động | S27 · L27 | MS-LEARN |
| q-0423ff5e18ef | [C# sealed modifier](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/sealed) | oop-sealed-one-override | Động | S27 · L27 | MS-LEARN |
| q-df9939d911fd | [Arithmetic operators](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/arithmetic-operators) | integer-division, negative-remainder | Động | S26/27 · M27 · L27 | MS-LEARN |
| q-575b74430de3 | [C# bitwise and shift operators](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/bitwise-and-shift-operators) | mask-clear-bit | Động | S27 · M27 · L27 | MS-LEARN |
| q-000be6cffe66 | [Boolean logical operators](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/boolean-logical-operators) | short-circuit-guard, nullable-and-logic | Động | S26/27 · M27 · L27 | MS-LEARN |
| q-863bcbda5260 | [C# default value expressions](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/default) | generic-default-per-type | Động | S27 · M27 · L27 | MS-LEARN |
| q-dfaf7258d4d8 | [C# equality operators](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/equality-operators) | object-string-equality-static-type | Động | S27 · M27 · L27 | MS-LEARN |
| q-35d1b2f384a1 | [Lambda expressions](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/lambda-expressions) | closure-for | Động | S26 · L27 | MS-LEARN |
| q-360d58249e96 | [Null coalescing operator](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/null-coalescing-operator) | nullable-coalesce-zero, coalesce-assign-once | Động | S26/27 · M27 · L27 | MS-LEARN |
| q-bbdb03f23929 | [Patterns](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns) | nullable-pattern-zero, pattern-empty-tail | Động | S26/27 · M27 · L27 | MS-LEARN |
| q-16f4c41558c2 | [C# checked and unchecked statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/checked-and-unchecked) | integer-widen-after | Động | S27 · M27 · L27 | MS-LEARN |
| q-6eebe1eb5fc3 | [Exception handling statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/exception-handling-statements) | finally-on-return | Động | S26 · L27 | MS-LEARN |
| q-1c791ce05adc | [C# lock statement](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/lock) | counter-gate-private-lock | Động | S27 · M27 · L27 | MS-LEARN |
| q-c38f67962366 | [Language Integrated Query (LINQ)](https://learn.microsoft.com/en-us/dotnet/csharp/linq/) | deferred-execution | Động | S25 · L27 | MS-LEARN |
| q-8b5e49f8681b | [Using delegates](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/delegates/using-delegates) | multicast-return | Động | S26 · L27 | MS-LEARN |
| q-da4a4a06e104 | [How to subscribe to and unsubscribe from events](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/events/how-to-subscribe-to-and-unsubscribe-from-events) | event-publisher-keeps-subscriber | Động | S27 · M27 · L27 | MS-LEARN |
| q-c370db08faba | [C# constraints on type parameters](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/constraints-on-type-parameters) | generic-constraint-create | Động | S27 · M27 · L27 | MS-LEARN |
| q-1eb6fa9ee9d8 | [Explicit interface implementation](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/interfaces/explicit-interface-implementation) | oop-explicit-interface-collision | Động | S27 · L27 | MS-LEARN |
| q-320292ec7458 | [Strings](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/strings/) | string-replace-result | Động | S26 · L27 | MS-LEARN |
| q-6d8ea4b91387 | [Boxing and unboxing](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing) | box-snapshot | Động | S26 · L27 | MS-LEARN |
| q-ee61b00dd056 | [C# indices and ranges](https://learn.microsoft.com/en-us/dotnet/csharp/tutorials/ranges-indexes) | array-range-copy, range-end-exclusive | Động | S26 · L27 | MS-LEARN |
| q-6509f254b0b8 | [WPF commanding overview](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/advanced/commanding-overview) | pattern-command-shared-action | Động | S27 · L27 | MS-LEARN |
| q-5f71274c3649 | [.NET collections and data structures](https://learn.microsoft.com/en-us/dotnet/standard/collections/) | hash-frequency, two-pointers, sliding-window, binary-search-boundary, graph-shortest | Động | S25 · L27 | MS-LEARN |
| q-1805c1982f30 | [Observer design pattern](https://learn.microsoft.com/en-us/dotnet/standard/events/observer-design-pattern) | pattern-observer-unsubscribe | Động | S27 · L27 | MS-LEARN |
| q-d6264bbd7e79 | [.NET garbage collection fundamentals](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals) | gc-cache-reachable-root | Động | S27 · M27 · L27 | MS-LEARN |
| q-2ccc8ed26fbc | [Implement the DisposeAsync pattern](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-disposeasync) | async-dispose-flush | Động | S27 · M27 · L27 | MS-LEARN |
| q-2b76e48c7081 | [.NET large object heap](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/large-object-heap) | loh-repeated-large-buffers | Động | S27 · M27 · L27 | MS-LEARN |
| q-e5f802a98e29 | [Covariance and contravariance in generics](https://learn.microsoft.com/en-us/dotnet/standard/generics/covariance-and-contravariance) | generic-variance-readonly-view | Động | S27 · M27 · L27 | MS-LEARN |
| q-4bf3fed283de | [System.Text.Json property naming and values](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties) | json-property-name-overrides-policy | Động | S27 · M27 · L27 | MS-LEARN |
| q-73763d627ecb | [System.Text.Json property ignore conditions](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/ignore-properties) | json-ignore-null-keeps-zero | Động | S27 · M27 · L27 | MS-LEARN |
| q-743ab4519657 | [System.Text.Json unmapped JSON members](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/missing-members) | json-unmapped-property-policy | Động | S27 · M27 · L27 | MS-LEARN |
| q-198927a59a48 | [System.Text.Json required properties](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/required-properties) | json-required-present-null | Động | S27 · M27 · L27 | MS-LEARN |
| q-86d703b0b69d | [Cancellation in managed threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads) | try-finally-cancel | Động | S26 · L27 | MS-LEARN |

### ASP.NET Core

| ID | Nguồn | Phạm vi qua slug câu hỏi | Phiên bản nguồn | Kiểm tra | Quyền |
| --- | --- | --- | --- | --- | --- |
| q-e9487760946b | [ASP.NET Core fundamentals](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/?view=aspnetcore-10.0) | options-validation, api-pagination-idempotency, logs-correlation, cache-design | ASP.NET Core 10.0 | S25 · L27 | MS-LEARN |
| q-30c0e075672b | [Dependency injection in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection?view=aspnetcore-10.0) | di-lifetimes | ASP.NET Core 10.0 | S25 · L27 | MS-LEARN |
| q-72b04818d99a | [File providers](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/file-providers?view=aspnetcore-10.0) | pattern-composite-file-provider | ASP.NET Core 10.0 | S27 · L27 | MS-LEARN |
| q-675ee9a38cf2 | [ASP.NET Core middleware](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/?view=aspnetcore-10.0) | middleware-order | ASP.NET Core 10.0 | S25 · L27 | MS-LEARN |
| q-96144bf9bc25 | [Filters in Minimal API apps](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/min-api-filters?view=aspnetcore-10.0) | aspnet-minimal-filter-shortcircuit | ASP.NET Core 10.0 | S27 · L27 | MS-LEARN |
| q-a234bcde546e | [Routing](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/routing?view=aspnetcore-10.0) | aspnet-route-constraint-selection, aspnet-minimal-route-groups | ASP.NET Core 10.0 | S27 · L27 | MS-LEARN |
| q-c41b77cc06c8 | [Health checks](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks?view=aspnetcore-10.0) | aspnet-health-ready-live | ASP.NET Core 10.0 | S27 · L27 | MS-LEARN |
| q-5701d26de241 | [ASP.NET Core behind proxy servers and load balancers](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0) | aspnet-proxy-https-scheme | ASP.NET Core 10.0 | S27 · L27 | MS-LEARN |
| q-b119f9347a3a | [Test ASP.NET Core controller logic](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/testing?view=aspnetcore-10.0) | test-http-binding | ASP.NET Core 10.0 | S27 · M27 · L27 | MS-LEARN |
| q-3d67a93e0108 | [Model binding in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/mvc/models/model-binding?view=aspnetcore-10.0) | aspnet-source-route-query | ASP.NET Core 10.0 | S27 · L27 | MS-LEARN |
| q-9f3a76b18a8c | [Configure JWT bearer authentication](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-jwt-bearer-authentication?view=aspnetcore-10.0) | aspnet-jwt-audience-binding | ASP.NET Core 10.0 | S27 · L27 | MS-LEARN |
| q-7e524cbb4f73 | [Policy-based authorization in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies?view=aspnetcore-10.0) | aspnet-policy-all-requirements | ASP.NET Core 10.0 | S27 · L27 | MS-LEARN |
| q-085b586c06a7 | [Resource-based authorization in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resource-based?view=aspnetcore-10.0) | resource-authorization | ASP.NET Core 10.0 | S25 · L27 | MS-LEARN |
| q-7cfd014b4986 | [Enable cross-origin requests in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/cors?view=aspnetcore-10.0) | aspnet-cors-not-authorize | ASP.NET Core 10.0 | S27 · L27 | MS-LEARN |
| q-bd322155a9e3 | [Integration tests in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0) | test-first-redirect, test-host-replace-mailer, test-boundary | ASP.NET Core 10.0 | S25/27 · M27 · L27 | MS-LEARN |
| q-b6bb7b432f41 | [ASP.NET Core Web API · automatic HTTP 400 responses](https://learn.microsoft.com/en-us/aspnet/core/web-api/?view=aspnetcore-10.0#automatic-http-400-responses) | aspnet-apicontroller-modelstate | ASP.NET Core 10.0 | S27 · L27 | MS-LEARN |

### EF Core

| ID | Nguồn | Phạm vi qua slug câu hỏi | Phiên bản nguồn | Kiểm tra | Quyền |
| --- | --- | --- | --- | --- | --- |
| q-1e6cc0f83816 | [EF Core documentation](https://learn.microsoft.com/en-us/ef/core/) | dbcontext-unit-of-work, n-plus-one, migration-rollout, optimistic-concurrency | Động | S25 · M27 · L27 | MS-LEARN |
| q-8d7cc4c45067 | [EF Core entity entries · Find and FindAsync](https://learn.microsoft.com/en-us/ef/core/change-tracking/entity-entries#find-and-findasync) | ef-find-local | Động | S27 · M27 · L27 | MS-LEARN |
| q-c26f81dafc60 | [DbContext lifetime, configuration and initialization](https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration) | ef-context-parallel | Động | S27 · M27 · L27 | MS-LEARN |
| q-812170311153 | [Applying EF Core migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying) | expand-contract | Động | S26 · L27 | MS-LEARN |
| q-d2f4f998a019 | [Managing EF Core migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/managing) | ef-review-rename-migration | Động | S27 · M27 · L27 | MS-LEARN |
| q-b5545d9ad7da | [EF Core indexes](https://learn.microsoft.com/en-us/ef/core/modeling/indexes) | ef-index-prefix | Động | S27 · M27 · L27 | MS-LEARN |
| q-c17eedf0772c | [EF Core foreign and principal keys](https://learn.microsoft.com/en-us/ef/core/modeling/relationships/foreign-and-principal-keys) | ef-relationship-principal-code | Động | S27 · M27 · L27 | MS-LEARN |
| q-d7d35da3e09a | [EF Core many-to-many relationships](https://learn.microsoft.com/en-us/ef/core/modeling/relationships/many-to-many) | ef-enrollment-payload | Động | S27 · M27 · L27 | MS-LEARN |
| q-f85335775282 | [EF Core value conversions](https://learn.microsoft.com/en-us/ef/core/modeling/value-conversions) | ef-enum-provider-string | Động | S27 · M27 · L27 | MS-LEARN |
| q-c49f4d79442b | [Efficient querying](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying) | enumerable-queryable, ef-projection, slow-api | Động | S25 · L27 | MS-LEARN |
| q-e0fe107f891d | [EF Core client and server evaluation](https://learn.microsoft.com/en-us/ef/core/querying/client-eval) | ef-client-predicate-translation | Động | S27 · M27 · L27 | MS-LEARN |
| q-b467a32003ac | [EF Core global query filters](https://learn.microsoft.com/en-us/ef/core/querying/filters) | ef-soft-delete-named-filter | Động | S27 · M27 · L27 | MS-LEARN |
| q-14c1749ab38e | [Pagination in EF Core](https://learn.microsoft.com/en-us/ef/core/querying/pagination) | sql-keyset-tie, ef-keyset-back | Động | S26/27 · M27 · L27 | MS-LEARN |
| q-33f5f704295b | [EF Core eager loading of related data](https://learn.microsoft.com/en-us/ef/core/querying/related-data/eager) | ef-filtered-include | Động | S27 · M27 · L27 | MS-LEARN |
| q-64ad20643129 | [EF Core explicit loading of related data](https://learn.microsoft.com/en-us/ef/core/querying/related-data/explicit) | ef-count-navigation-query | Động | S27 · M27 · L27 | MS-LEARN |
| q-0a379f23a22d | [EF Core single and split queries](https://learn.microsoft.com/en-us/ef/core/querying/single-split-queries) | ef-sibling-cartesian | Động | S27 · M27 · L27 | MS-LEARN |
| q-111e9b4e77f6 | [EF Core tracking and no-tracking queries](https://learn.microsoft.com/en-us/ef/core/querying/tracking) | ef-identity-resolution | Động | S26 · L27 | MS-LEARN |
| q-ffb6413c2223 | [EF Core ExecuteUpdate and ExecuteDelete](https://learn.microsoft.com/en-us/ef/core/saving/execute-insert-update-delete) | ef-bulk-stale | Động | S27 · M27 · L27 | MS-LEARN |
| q-a054d827fa8a | [Using transactions in EF Core](https://learn.microsoft.com/en-us/ef/core/saving/transactions) | ef-single-roundtrip | Động | S27 · M27 · L27 | MS-LEARN |
| q-cb4ce774e532 | [Choosing an EF Core testing strategy](https://learn.microsoft.com/en-us/ef/core/testing/choosing-a-testing-strategy) | ef-provider-test | Động | S27 · M27 · L27 | MS-LEARN |
| q-ccff7213f902 | [Testing EF Core against production database systems](https://learn.microsoft.com/en-us/ef/core/testing/testing-with-the-database) | test-db-reload-proof, test-db-explicit-transaction | Động | S27 · M27 · L27 | MS-LEARN |

### SQL Server và thiết kế dữ liệu

| ID | Nguồn | Phạm vi qua slug câu hỏi | Phiên bản nguồn | Kiểm tra | Quyền |
| --- | --- | --- | --- | --- | --- |
| q-de7d71efc18c | [Description of database normalization basics](https://learn.microsoft.com/en-us/previous-versions/troubleshoot/microsoft-365/microsoft-365-apps/access/database-normalization-description) | sql-repeating-contacts, sql-transitive-department | Động | S27 · M27 · L27 | MS-LEARN |
| q-e2a259d2c91b | [SQL Server collation and Unicode support](https://learn.microsoft.com/en-us/sql/relational-databases/collations/collation-and-unicode-support?view=sql-server-ver16) | sql-case-insensitive-code | SQL Server 2022 (v16) | S27 · M27 · L27 | MS-LEARN |
| q-af1f04a2096e | [Create filtered indexes](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/create-filtered-indexes?view=sql-server-ver16) | sql-filter-open-subset | SQL Server 2022 (v16) | S27 · M27 · L27 | MS-LEARN |
| q-57ad5450d6fb | [Joins](https://learn.microsoft.com/en-us/sql/relational-databases/performance/joins) | sql-filter-null-side | Động | S26 · L27 | MS-LEARN |
| q-0274e81e45c4 | [Primary and foreign key constraints](https://learn.microsoft.com/en-us/sql/relational-databases/tables/primary-and-foreign-key-constraints?view=sql-server-ver16) | sql-parent-delete-action, sql-fk-index-implicit, sql-constraints | SQL Server 2022 (v16) | S25/27 · M27 · L27 | MS-LEARN |
| q-629ea4e17315 | [Specify computed columns in a table](https://learn.microsoft.com/en-us/sql/relational-databases/tables/specify-computed-columns-in-a-table?view=sql-server-ver16) | sql-derived-column | SQL Server 2022 (v16) | S27 · M27 · L27 | MS-LEARN |
| q-ab39991c746f | [Specify default values for columns](https://learn.microsoft.com/en-us/sql/relational-databases/tables/specify-default-values-for-columns?view=sql-server-ver16) | sql-default-explicit-null | SQL Server 2022 (v16) | S27 · M27 · L27 | MS-LEARN |
| q-abf923ec411c | [Unique constraints and check constraints](https://learn.microsoft.com/en-us/sql/relational-databases/tables/unique-constraints-and-check-constraints?view=sql-server-ver16) | sql-check-unknown | SQL Server 2022 (v16) | S27 · M27 · L27 | MS-LEARN |
| q-ed963dbe396b | [Char and varchar (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/data-types/char-and-varchar-transact-sql?view=sql-server-ver16) | sql-utf-eight-bytes | SQL Server 2022 (v16) | S27 · M27 · L27 | MS-LEARN |
| q-b7df44622106 | [Aggregate functions (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/functions/aggregate-functions-transact-sql?view=sql-server-ver16) | count-distinct-null, avg-int-scale | SQL Server 2022 (v16) | S27 · M27 · L27 | MS-LEARN |
| q-5bb3bc62bad2 | [Analytic functions (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/functions/analytic-functions-transact-sql?view=sql-server-ver16) | sql-lead-default | SQL Server 2022 (v16) | S27 · M27 · L27 | MS-LEARN |
| q-bedbf557b736 | [COUNT (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/functions/count-transact-sql) | sql-count-null | Động | S26 · L27 | MS-LEARN |
| q-b2f696bedaa2 | [Date and time data types and functions (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/functions/date-and-time-data-types-and-functions-transact-sql?view=sql-server-ver16) | date-boundaries-minute, month-end-renewal, eomonth-offset | SQL Server 2022 (v16) | S27 · M27 · L27 | MS-LEARN |
| q-50f8db41c506 | [LAG (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/functions/lag-transact-sql) | sql-lag-gap | Động | S26 · L27 | MS-LEARN |
| q-6ddbc8bc5306 | [Mathematical functions (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/functions/mathematical-functions-transact-sql?view=sql-server-ver16) | sql-negative-floor, sql-round-away | SQL Server 2022 (v16) | S27 · M27 · L27 | MS-LEARN |
| q-a6ed604b63bf | [RANK (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/functions/rank-transact-sql) | sql-rank-gap | Động | S26 · L27 | MS-LEARN |
| q-06c5477e98cc | [String functions (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/functions/string-functions-transact-sql?view=sql-server-ver16) | len-pad, charindex-origin, concat-null-label, replace-occurrences | SQL Server 2022 (v16) | S27 · M27 · L27 | MS-LEARN |
| q-6c18d34d66f0 | [SUM (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/functions/sum-transact-sql) | sql-coalesce-aggregate | Động | S26 · L27 | MS-LEARN |
| q-32b913619229 | [BETWEEN (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/between-transact-sql) | sql-between-boundary | Động | S26 · L27 | MS-LEARN |
| q-71bd2a15378c | [EXISTS (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/exists-transact-sql) | sql-exists-empty-projection | Động | S26 · L27 | MS-LEARN |
| q-e0f5cf9a9cb2 | [IN (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/in-transact-sql) | sql-anti-join-null | Động | S26 · L27 | MS-LEARN |
| q-b73882ff8256 | [NULLIF (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/nullif-transact-sql) | sql-nullif-ratio | Động | S26 · L27 | MS-LEARN |
| q-e870bd0f627c | [Set operators union (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/set-operators-union-transact-sql) | sql-union-all-count | Động | S26 · L27 | MS-LEARN |
| q-61b47b60f6f8 | [Transact-SQL language reference](https://learn.microsoft.com/en-us/sql/t-sql/language-reference?view=sql-server-ver16) | join-duplicates, sql-null, window-order, index-plan, isolation-deadlock | SQL Server 2022 (v16) | S25 · L27 | MS-LEARN |
| q-57df5eb0099a | [Select having (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-having-transact-sql) | sql-having-groups | Động | S26 · L27 | MS-LEARN |
| q-d58c2752cc21 | [With common table expression (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/queries/with-common-table-expression-transact-sql) | sql-cte-visible-columns | Động | S26 · L27 | MS-LEARN |
| q-9f8603f1debb | [Alter table table constraint (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-table-table-constraint-transact-sql?view=sql-server-ver16) | sql-paired-foreign-key | SQL Server 2022 (v16) | S27 · M27 · L27 | MS-LEARN |
| q-19b699e8cc6d | [Create table transact SQL identity property](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-table-transact-sql-identity-property?view=sql-server-ver16) | sql-identity-rollback-gap | SQL Server 2022 (v16) | S27 · M27 · L27 | MS-LEARN |

### Chuẩn HTTP

| ID | Nguồn | Phạm vi qua slug câu hỏi | Phiên bản nguồn | Kiểm tra | Quyền |
| --- | --- | --- | --- | --- | --- |
| q-8ff679957243 | [RFC 9110 §10.2.3 · Retry-After](https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3) | http-retry-after | 2022-06 | S26 · L27 | RFC |
| q-f2ac3f5135ec | [RFC 9110 §12.5.1 · Accept](https://www.rfc-editor.org/rfc/rfc9110#section-12.5.1) | http-content-type-accept | 2022-06 | S26 · L27 | RFC |
| q-595073e7cb72 | [RFC 9110 §12.5.5 · Vary](https://www.rfc-editor.org/rfc/rfc9110#section-12.5.5) | http-vary-language | 2022-06 | S27 · L27 | RFC |
| q-8807df0841ca | [RFC 9110 §13.1.1 · If-Match](https://www.rfc-editor.org/rfc/rfc9110#section-13.1.1) | http-etag-edit | 2022-06 | S26 · L27 | RFC |
| q-db1ebc20ffd2 | [RFC 9110 §15.3.2 · 201 Created](https://www.rfc-editor.org/rfc/rfc9110#section-15.3.2) | http-created-location | 2022-06 | S26 · L27 | RFC |
| q-0b24224f5d04 | [RFC 9110 §15.3.5 · 204 No Content](https://www.rfc-editor.org/rfc/rfc9110#section-15.3.5) | http-no-content-write | 2022-06 | S27 · L27 | RFC |
| q-c2f28f7414a1 | [RFC 9110 §15.3.7 · 206 Partial Content](https://www.rfc-editor.org/rfc/rfc9110#section-15.3.7) | http-range-resume-download | 2022-06 | S27 · L27 | RFC |
| q-04986eafe053 | [RFC 9110 §15.4.5 · 304 Not Modified](https://www.rfc-editor.org/rfc/rfc9110#section-15.4.5) | http-304-validation | 2022-06 | S26 · L27 | RFC |
| q-b303619c45bc | [RFC 9110 §15.4.8 · 307 Temporary Redirect](https://www.rfc-editor.org/rfc/rfc9110#section-15.4.8) | http-redirect-preserve-post | 2022-06 | S27 · L27 | RFC |
| q-5ad87674ff06 | [RFC 9110 §15.5.14 · 413 Content Too Large](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.14) | http-content-too-large | 2022-06 | S27 · L27 | RFC |
| q-037b1fd8b8ef | [RFC 9110 §15.5.16 · 415 Unsupported Media Type](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.16) | http-media-type-rejected | 2022-06 | S27 · L27 | RFC |
| q-9cfa2d1d8ca0 | [RFC 9110 §15.5.2 · 401 Unauthorized](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.2) | http-auth-challenge | 2022-06 | S26 · L27 | RFC |
| q-b56cee43c9d4 | [RFC 9110 §15.5.6 · 405 Method Not Allowed](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.6) | http-method-allow | 2022-06 | S27 · L27 | RFC |
| q-818740859a3d | [RFC 9110 §9.2.1 · Safe methods](https://www.rfc-editor.org/rfc/rfc9110#section-9.2.1) | http-safe-preview | 2022-06 | S27 · L27 | RFC |
| q-1ada6a7fed95 | [RFC 9110 §9.2.2 · Idempotent methods](https://www.rfc-editor.org/rfc/rfc9110#section-9.2.2) | http-delete-repeat-effect | 2022-06 | S27 · L27 | RFC |
| q-9a6911ce5b63 | [RFC 9110 §9.3.2 · HEAD](https://www.rfc-editor.org/rfc/rfc9110#section-9.3.2) | http-head-body | 2022-06 | S26 · L27 | RFC |
| q-39b91252eafe | [RFC 9111 §5.2.2.4 · no-cache response directive](https://www.rfc-editor.org/rfc/rfc9111#section-5.2.2.4) | http-cache-revalidate-use | 2022-06 | S27 · L27 | RFC |
| q-f2e9afebad00 | [RFC 9111 §5.2.2.7 · private response directive](https://www.rfc-editor.org/rfc/rfc9111#section-5.2.2.7) | http-private-browser-cache | 2022-06 | S27 · L27 | RFC |
| q-0cd6bf9913b8 | [RFC 9457 §3.1 · Problem details members](https://www.rfc-editor.org/rfc/rfc9457#section-3.1) | http-problem-type-machine | 2023-07 | S27 · L27 | RFC |

### Kiến trúc, tooling, kiểm thử và phỏng vấn

| ID | Nguồn | Phạm vi qua slug câu hỏi | Phiên bản nguồn | Kiểm tra | Quyền |
| --- | --- | --- | --- | --- | --- |
| q-cd8bc4a53d00 | [Microsoft Careers interview tips](https://careers.microsoft.com/v2/global/en/hiring-tips/interview-tips) | project-star | Động | S25 · L27 | PUBLIC |
| q-54347ec891b9 | [Microsoft Careers interview tips](https://careers.microsoft.com/v2/global/en/hiring-tips/interview-tips.html) | behavioral-disagreement | Động | S26 · L27 | PUBLIC |
| q-341ad40b8cb5 | [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/) | docker-multi-runtime | Động | S27 · M27 · L27 | DOCKER |
| q-c53a92954616 | [Optimize Docker build cache](https://docs.docker.com/build/cache/optimize/) | docker-restore-layer | Động | S27 · M27 · L27 | DOCKER |
| q-7d4675617251 | [Dockerfile reference · HEALTHCHECK](https://docs.docker.com/reference/dockerfile/#healthcheck) | docker-health-state | Động | S27 · M27 · L27 | DOCKER |
| q-98d50433f1b1 | [About issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/about-issues) | qa-repro-handoff | Động | S27 · M27 · L27 | GH-DOC |
| q-3c4781ef4d3b | [About pull request reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews) | pr-review-dialogue | Động | S27 · M27 · L27 | GH-DOC |
| q-5f35350e3539 | [About readmes](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) | portfolio-first-run | Động | S27 · M27 · L27 | GH-DOC |
| q-b99853bbdea2 | [git-bisect](https://git-scm.com/docs/git-bisect) | git-bisect-signal | Động | S27 · M27 · L27 | GIT |
| q-31e240e817fa | [git-cherry-pick](https://git-scm.com/docs/git-cherry-pick) | git-hotfix-pick | Động | S27 · M27 · L27 | GIT |
| q-49c19fcf7136 | [git-diff](https://git-scm.com/docs/git-diff) | git-stage-hunk | Động | S27 · M27 · L27 | GIT |
| q-ad3d46f7428a | [git-restore](https://git-scm.com/docs/git-restore) | git-restore-staged | Động | S27 · M27 · L27 | GIT |
| q-b29b55358cc0 | [gitignore](https://git-scm.com/docs/gitignore) | git-ignore-tracked | Động | S27 · M27 · L27 | GIT |
| q-24b7fbeeca34 | [Transactional Outbox with Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/architecture/databases/guide/transactional-outbox-cosmos) | outbox-commit | Động | S26 · L27 | MS-LEARN |
| q-914523cf8743 | [Anti corruption layer](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer) | pattern-adapter-partner-tracking | Động | S27 · L27 | MS-LEARN |
| q-d83252839f46 | [Cache-Aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside) | cache-invalidation | Động | S26 · L27 | MS-LEARN |
| q-9ae0aba00ad4 | [Pipes and Filters pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/pipes-and-filters) | arch-pipeline-contract | Động | S27 · M27 · L27 | MS-LEARN |
| q-dfd815168ef8 | [Queue-Based Load Leveling pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling) | arch-queue-burst | Động | S27 · M27 · L27 | MS-LEARN |
| q-38552082dfaf | [Undo Git changes in Azure Repos](https://learn.microsoft.com/en-us/azure/devops/repos/git/undo) | git-revert-shared | Động | S26 · L27 | MS-LEARN |
| q-98c44dd56b5e | [The STAR method](https://nationalcareers.service.gov.uk/careers-advice/interview-advice/the-star-method) | intern-intro-evidence, incident-honest-outcome | Động | S27 · M27 · L27 | GOV |
| q-dc1980dea80f | [Dynamic Programming I · Fibonacci and shortest paths](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/resources/lecture-19-dynamic-programming-i-fibonacci-shortest-paths/) | dp-minimum-coins | Fall 2011 | S25 · L27 | OCW |
| q-b71cd17425a8 | [User stories](https://www.atlassian.com/agile/project-management/user-stories) | outsourcing-acceptance | Động | S27 · M27 · L27 | PUBLIC |
| q-48c0e013e4e2 | [Getting started with xUnit.net v3](https://xunit.net/docs/getting-started/v3/getting-started) | test-theory-boundary-rows | xUnit.net v3 | S27 · M27 · L27 | XUNIT |
| q-ca1ca00f4a9b | [Sharing context between xUnit.net tests](https://xunit.net/docs/shared-context) | test-fixture-lifetime | Động | S27 · M27 · L27 | XUNIT |
| q-8a4eb0031dd7 | [xUnit2021 · async assertions must be awaited](https://xunit.net/xunit.analyzers/rules/xUnit2021) | test-awaited-assertion | Động | S27 · M27 · L27 | XUNIT |

## Nguồn nghiên cứu

Mục đích và các giới hạn của từng lần truy cập nằm trong [COMPETITIVE_RESEARCH.md](COMPETITIVE_RESEARCH.md).

| ID | Nguồn | Phạm vi | Phiên bản | Truy cập | Quyền |
| --- | --- | --- | --- | --- | --- |
| r-bool-net | [bool.dev · .NET Quiz](https://bool.dev/learn/dotnet-interview-questions) | Ma trận chủ đề và cấp độ, tổ chức phiên quiz. | Trang động | M27 | OBS |
| r-meetassist-net | [MeetAssist · C# and .NET](https://meetassist.io/interview-questions/csharp-dotnet) | Cách dùng follow-up trong tình huống .NET. | Trang động | M27 | OBS |
| r-exercism-csharp-track | [Exercism · C# Track](https://exercism.org/tracks/csharp) | Liên kết concept với bài tập và mentoring. | Trang động | M27 | OBS |
| r-exercism-csharp-repo | [Exercism C#](https://github.com/exercism/csharp) | Cấu trúc track và cách chia bài tập, giữ phạm vi LICENSE của repo. | Kho động, chưa ghim commit | M27 | MIT |
| r-leetcode-interview-150 | [Top Interview 150](https://leetcode.com/studyplan/top-interview-150/) | Phạm vi lộ trình DSA và thời lượng chuẩn bị. | Trang động | M27 | OBS |
| r-leetcode-sql-50 | [SQL 50](https://leetcode.com/studyplan/top-sql-50/) | Phạm vi lộ trình SQL. Dùng đề, dữ liệu và kết quả tự thiết kế. | Trang động | M27 | OBS |
| r-roadmap-aspnet | [ASP.NET Core Developer Roadmap](https://roadmap.sh/aspnet-core) | Lộ trình ASP.NET Core qua text view. Từng cạnh của canvas chưa được kiểm tra. | Trang động | M27 | OBS |
| r-roadmap-backend | [Backend Developer Roadmap](https://roadmap.sh/backend) | Tổ chức tài nguyên theo vai trò backend. | Trang động | M27 | OBS |
| r-roadmap-questions | [Roadmap Questions](https://roadmap.sh/questions) | Điểm vào để luyện theo từng lĩnh vực. | Trang động | M27 | OBS |
| r-hello-interview-design | [Hello Interview · System Design in a Hurry](https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction) | Khung trình bày và đánh đổi trong nội dung công khai. Phần Premium ngoài phạm vi. | Trang động | M27 | OBS |
| r-sqlbolt | [SQLBolt · Interactive Tutorial](https://sqlbolt.com/) | Thứ tự chủ điểm SQL và trang đầu kiểm tra bằng Playwright. | Trang động | M27 | OBS |
| r-stefanthecode-net | [StefanTheCode · .NET interview questions](https://github.com/StefanTheCode/dotnet_interview_questions) | Rà taxonomy từ README. Endpoint giấy phép chưa xác minh. | Kho động, chưa ghim commit | M27 | UNKNOWN |
| r-hemantgupta-net | [in-hemantgupta · .NET interview questions](https://github.com/in-hemantgupta/dotnet-interview-questions) | Ý định đánh giá và phân cấp câu hỏi từ README. | Kho động, chưa ghim commit | M27 | MIT |
| r-system-design-primer | [System Design Primer](https://github.com/donnemartin/system-design-primer) | Tổ chức chủ đề, trade-off và tự kiểm tra. Liên kết ngoài có điều khoản riêng. | Kho động, chưa ghim commit | M27 | CC-BY |
| r-ms-dotnet | [.NET documentation](https://learn.microsoft.com/en-us/dotnet/) | Mục lục runtime, API và hướng dẫn tác vụ. | Trang động | M27 | MS-LEARN |
| r-ms-csharp | [C# documentation](https://learn.microsoft.com/en-us/dotnet/csharp/) | Mục lục quy tắc ngôn ngữ và phiên bản C#. | Trang động | M27 | MS-LEARN |
| r-ms-aspnet | [ASP.NET Core documentation](https://learn.microsoft.com/en-us/aspnet/core/) | Mục lục ASP.NET Core. Các câu có view riêng ghi phiên bản ở bảng trên. | Trang mặc định động | M27 | MS-LEARN |
| q-1e6cc0f83816 | [EF Core documentation](#ef-core) dùng chung | Mục lục query, tracking và persistence. | Trang động | M27 | MS-LEARN |
| r-ms-sql | [Microsoft SQL documentation](https://learn.microsoft.com/en-us/sql/) | Mục lục SQL và xác định nhánh SQL Server 2022. | Trang động | M27 | MS-LEARN |
| r-ms-azure-architecture | [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/) | Mẫu thiết kế và ràng buộc kiến trúc. | Trang động | M27 | MS-LEARN |
| r-dotnet-docs-repo | [.NET Docs source](https://github.com/dotnet/docs) | Đối chiếu nguồn tài liệu, quy tắc riêng cho văn bản và mã. | Kho động, chưa ghim commit | M27 | DOCS-CODE |
| r-aspnetcore-repo | [ASP.NET Core source](https://github.com/dotnet/aspnetcore) | Tra cứu triển khai sau khi chọn bản phù hợp. | Kho động, chưa ghim commit | M27 | MIT |
| r-efcore-repo | [EF Core source](https://github.com/dotnet/efcore) | Đối chiếu hành vi provider với tài liệu. | Kho động, chưa ghim commit | M27 | MIT |
| r-owasp-cheatsheets | [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | Tham khảo chủ đề kiểm quyền và cấu hình phòng vệ. | Trang động, chưa ghim commit | M27 | OWASP |
| r-itviec-dts | [Digital Technology Solutions · Junior Backend Developer](https://itviec.com/it-jobs/junior-backend-developer-net-c-digital-technology-solutions-jsc-2351) | Bối cảnh .NET, SQL, phối hợp QA và hỗ trợ triển khai. | Tin động | M27 qua bản lưu · mở lại HTTP 410 | JD |
| r-itviec-pixelz | [Pixelz · Junior/Middle Software Engineer](https://itviec.com/it-jobs/junior-middle-software-engineer-net-pixelz-5431?lab_feature=employer_job) | Ngữ cảnh tuyển dụng .NET tại Việt Nam. | Tin động | M27 · tình trạng tuyển dụng chưa xác minh | JD |
