# HNLMark v2.2.0 — Mẫu dấu/Font, cắt ảnh đúng tỷ lệ, chất lượng ảnh/video & sửa xoay video (DEV)

- Source GitHub dev, không sửa main/production.
- Mẫu dấu bổ sung: Hiện đại, Kỹ thuật, Điện ảnh, Một dòng, Chỉ giờ, **Không dấu**. Không dấu thực sự không vẽ chữ/logo/mã. Mặc định giữ Timemark.
- Thêm font hệ thống, Trebuchet, Impact, Times New Roman, Courier New. Độ đậm và cỡ từng nhóm chữ điều chỉnh trên ảnh. Các font tùy độ sẵn có của máy, fallback theo hệ thống.
- Chuẩn hóa tỷ lệ cắt 1:1, 4:3, 3:4, 3:2, 2:3, 16:9, 9:16, 4:5, 5:4, 21:9, gốc hoặc tự do. Nút Tạo khung giữa, kéo theo tỷ lệ, lưu dưới dạng edit non-destructive.
- Ảnh: JPG 75/85/92/100%, PNG không giảm chất lượng JPEG; thêm 3000 và 3840px, không nâng độ phân giải gốc.
- Video: chọn giới hạn độ phân giải (720/1080/1440/2160 hoặc theo nguồn), bitrate 2.5–24 Mbps, 24/30/60 FPS (trình duyệt có thể giới hạn), dấu trên video mặc định 65% so với ảnh.
- Sửa hướng: dùng cùng phép quay đã kiểm tra của camera Ảnh để xử lý hướng ngang Video, phân biệt tư thế ngược khi cảm biến cho phép, nút lật 180° thủ công. Ghép khung hình và mọi dấu/giờ/logo vào canvas tạm rồi mới đưa vào canvas xuất; ghi hình giữ kích thước cố định và letterbox khi máy đổi hướng, tránh kéo dãn.
- **Chưa runtime golden:** kiểm thử cảm biến, ghi âm, video thực tế trên điện thoại; CI kiểm tra code/logic không thay thế thử máy. Video trên web không bảo đảm mức bitrate/fps mà trình duyệt có thể thay đổi.

# HNLMark v2.1.3 DEV — camera tối giản, sửa xoay ngược video

- **Source chuẩn** GitHub dev; không chỉnh main, không thay Vercel Production.
- Giữ một nút Chọn ảnh/video, một nút Mở camera. Camera dọc có thanh điều khiển 168px; ngang có cụm icon 108px ở cạnh phải; nút chụp/quay được cân tâm theo 3 cột.
- Thiết kế camera phương án A: màu tối, ít biểu tượng, nút chụp trắng/ghi hình đỏ, ảnh-video chuyển ngay trong camera; Full/Xoay/Đóng giảm kích thước; chụp liên tiếp vẫn hoạt động.
- **Sửa lỗi video xoay 180°**: tách `orientation.js`, tính góc xoay từ chiều khung nguồn, tư thế máy và hướng trái/phải. Sửa chiều ngang khi điện thoại bị khóa xoay (đổi quy tắc 90°/270°); xem trước và xuất video dùng cùng phép tính, khóa góc quay tại thời điểm bắt đầu ghi. Giữ khả năng xoay tay 90° khi thiết bị báo sai.
- Video nhập từ thiết bị giữ đúng góc nguồn trừ khi người dùng chọn xoay. Khôi phục biểu tượng phát/tạm dừng SVG và không hiện icon vô dụng.
- Thêm regression `tests/test_video_orientation.cjs`; chạy cùng static checks. **Chưa được thử camera và ghi file trên Android thực tế**, chưa Runtime Golden.
- Video có dấu không chứng minh nguồn gốc hoặc thời điểm ghi thực sự.

# HNLMark v2.1.2 — Một nút chọn ảnh/video, camera cân tâm theo cách sử dụng iPhone

- Source chỉ cập nhật nhánh `dev`; không thay `main`, production, projectId.
- Trên đầu trang dùng đúng một nút **Chọn ảnh / video** (`input accept=image/*,video/*`, multiple). Tệp được nhận dạng theo MIME/đuôi; ảnh vẫn đi vào bộ sửa ảnh/thư viện gốc, video đầu tiên được chuyển đến trình xử lý video. Nhiều video cùng lúc sẽ báo rõ chỉ xử lý từng video một.
- Duy trì đúng một nút **Mở camera**. Khi mở mặc định vào ẢNH; chuyển **ẢNH ↔ VIDEO** bằng thanh chế độ ngay trong camera giống nguyên tắc điều khiển của iPhone, không phải quay lại đầu trang.
- Cả Ảnh và Video sử dụng nút tròn chính ở **tâm chính xác** theo CSS grid 1fr / 70px / 1fr; hai biểu tượng Thư viện và Đổi camera cân xứng hai bên. Nút Ảnh màu trắng, nút Video màu đỏ và chuyển Dừng khi đang quay. Màn hình ngang (kể cả Android khóa xoay) dùng rail dọc bên phải, shutter căn theo tâm chiều ngang rail.
- Tùy chọn Full, xoay, đóng thành biểu tượng nhỏ; tránh nút phụ che ảnh. Vẫn giữ chế độ chụp liên tiếp và nhãn mã đứng có khiên dấu tích với màu cấu hình cũ.
- Xử lý video giữ nguyên theo MediaRecorder (WebM/MP4 tùy trình duyệt), âm thanh khi có quyền và hỗ trợ, không ghi đè video gốc. Video chưa lưu vẫn được cảnh báo trước khi bỏ.
- Đây là bản preview DEV, CI chỉ gồm syntax/static test; **chưa Runtime Golden trên Android/iOS thật**.

# HNLMark v2.1.1 — Ảnh/Video chung khu vực đầu, icon khiên dấu tích

- Nhánh DEV: gộp nút chế độ **Ảnh / Video** ngay panel đầu. Sau khi chọn, chỉ còn hai lựa chọn tại cùng vị trí: **Chụp ảnh / Quay video** và **Chọn ảnh / Chọn video từ máy**. Không phải kéo xuống một panel Video khác.
- Khi chọn Video, các nút khởi tạo vẫn ở trên; vùng chỉnh/xuất video chỉ hiện trong cùng panel nếu đang dùng Video. Chế độ Ảnh giữ nguyên thư viện ảnh, ZIP dự án và ảnh đang mở.
- Nếu video đã xuất nhưng chưa bấm Lưu, hiển thị xác nhận trước khi chuyển sang Ảnh hoặc chọn video khác. Không cho chuyển chế độ khi đang quay.
- Biểu tượng đầu dòng mã đứng bên phải đổi thành **tấm khiên có dấu tích**, giữ nguyên màu `serialColor` hiện có (mặc định trắng). Áp dụng cả ảnh và video qua chung bộ vẽ dấu Timemark.
- Chỉ cập nhật `dev`, không rollback `main`/Production. CI chỉ kiểm tra cú pháp và tài sản, chưa thay thế kiểm thử camera/âm thanh Android thật.

# HNLMark v2.1.0 — Video thử nghiệm và camera gọn hơn

## Video (DEV, chưa Runtime Golden)
- Chọn video MP4/WebM/MOV từ thiết bị, xem thử, thêm dấu giờ, ngày, logo và mã ảnh bằng bộ vẽ Timemark chung với ảnh.
- Chế độ quay video trực tiếp từ camera, mở được từ công cụ Video hoặc nút Video khi đang chụp ảnh.
- Ghi hình có dấu theo thời gian thực (canvas.captureStream + MediaRecorder); khi được cấp quyền, ghi kèm micro; nhập video hỗ trợ lấy lại âm thanh gốc khi trình duyệt cho phép.
- File gốc vẫn giữ nguyên; xuất bản mới dạng WebM hoặc MP4 tùy khả năng trình duyệt. Cần nhấn "Lưu video" sau khi kết thúc.
- Trên điện thoại nằm ngang, video có thanh điều khiển tách riêng ở bên phải, kể cả trường hợp khóa xoay mà có cảm biến hoạt động.
- Ngày giờ khi nhập video lấy từ ngày sửa của file và cộng thời gian phát; đây là nhãn người dùng có thể chỉnh, không phải xác thực nguồn gốc.
- Hiện chưa cắt ghép video, chưa đưa video vào ZIP lưu dự án ảnh, không có xử lý trên máy chủ. Video dài có thể tốn RAM và thời gian xử lý bằng đúng thời lượng video.
- Chưa kiểm chứng ghi âm, định dạng, xoay và mã hóa trên Android/iOS thực tế. Kiểm tra CI mã không tương đương Runtime Golden.

## Giao diện camera ảnh
- Giữ chức năng Ảnh hiện có, thu gọn thanh nút dọc và thanh phải ngang, thêm nút đổi sang Video.

# HNLMark v2.0.5 — Camera toàn màn hình, chụp liên tiếp và thư viện ảnh

**Trang chính:** https://hnl-photomark.vercel.app/

## Bản vá camera v2.0.5 – cụm điều khiển nằm bên phải khi quay ngang
- Khi điện thoại nằm ngang, thanh chụp thu gọn thành một cụm ở cạnh phải, nút chụp lớn và các biểu tượng Thư viện, Full, Đổi camera, Xoay, Đóng.
- Áp dụng cả khi thiết bị khóa xoay làm viewport vẫn dọc nhưng cảm biến nhận diện điện thoại nằm ngang. Các nút ở ngoài vùng ảnh, không che dấu thời gian.
- Giao diện đứng/dọc giữ nguyên; Full dùng giao diện đồng nhất, không thay đổi chiều ảnh được lưu.
- Sao lưu ZIP giờ gom mọi ảnh trong thư viện IndexedDB cùng ảnh đang mở; nếu không truy cập được thư viện, xuất ZIP chỉ ảnh đang mở và cảnh báo sao lưu chưa đầy đủ.
- Tên JPG/PNG khi xuất theo từng ảnh khớp định dạng của blob; khi bỏ ảnh đang chọn, trạng thái chọn và tuỳ chỉnh được đồng bộ.
- **Chưa kiểm thử trên thiết bị Android thực tế** (cảm biến, nút bấm khi khóa xoay, Full). Không xem kiểm tra mã hoặc mô phỏng là Runtime Golden.

## Bản vá camera v2.0.4 – tăng độ nhạy tự xoay
- Dùng `devicemotion.accelerationIncludingGravity.x/y` (trọng lực theo trục thiết bị) làm nguồn nhận hướng chính khi trình duyệt hỗ trợ; `deviceorientation.beta/gamma` làm dự phòng.
- Nhận dọc/ngang sớm hơn ngưỡng 55° cũ, 3 mẫu liên tiếp hoặc 2 mẫu ổn định từ 80 ms; giữ hướng gần góc 45° để hạn chế nhảy liên tục.
- Giữ cùng hệ tọa độ cho ảnh camera và dấu Timemark, kể cả khi bật Full trong trình duyệt khóa xoay.
- Trình duyệt iOS có thể yêu cầu quyền cảm biến khi bấm mở camera. Nếu cảm biến không có dữ liệu (ví dụ điện thoại đặt phẳng), dùng nút Xoay 90°.
- Đã thử bằng Chromium với cảm biến mô phỏng, **chưa xác nhận phần cứng Android thực tế**.

## Tính năng mới
- Chọn kiểu font chữ: hẹp theo mẫu, Arial, Roboto/hệ thống, Tahoma, Verdana, Georgia, monospace. Tùy chọn độ đậm.
- Chỉnh cỡ chữ riêng cho giờ, ngày/thứ, địa chỉ, nhãn Timemark/HNLMark tùy chỉnh, mã dọc. Tùy chỉnh màu chữ từng phần, ngoài màu chữ và màu nhấn toàn bộ có sẵn.
- Chỉnh sửa ảnh **trước khi đóng dấu**: khoanh vùng cắt, xoay trái/phải, chỉnh sáng/tương phản/bão hòa/ấm–lạnh.
- Khoanh vùng ảnh gốc cần xóa dấu ngày giờ/vật thể nhỏ: phương pháp vá từ ảnh lân cận (tự chọn hướng hoặc chọn trên/dưới/trái/phải), hoặc làm mờ. Nên chọn vùng rộng hơn chi tiết cần bỏ. Đây là thuật toán vá/nhân bản trên máy, **không phải xóa vật thể AI** và không đảm bảo phục hồi nền phức tạp.
- Có hoàn tác thao tác chỉnh ảnh cuối và khôi phục ảnh gốc. Bộ lọc màu đặt riêng theo ảnh, có thể áp dụng màu hiện tại cho tất cả ảnh.
- Chọn/chụp nhiều ảnh, EXIF, mã chữ–số riêng từng ảnh, logo HNL gốc, camera trực tiếp xoay dọc/ngang, nút ngoài vùng ảnh, xem trước và xuất JPG/PNG/ZIP giữ nguyên.

## Thứ tự xử lý

Ảnh gốc trong bộ nhớ → cắt/xoay/vá vùng → chỉnh màu → vẽ dấu HNLMark → xuất file mới. File ảnh ban đầu không bị ghi đè. Thao tác cắt/xoay/vá lưu theo từng ảnh và được tái hiện ở độ phân giải xuất, không dùng bản xem trước thu nhỏ để làm nguồn xuất.

**Hướng dẫn:** tải ảnh → phần “Chỉnh ảnh gốc” chọn một công cụ (Cắt/Vá) → kéo vùng trực tiếp trên ảnh ở khung xem trước → bấm Áp dụng → chọn kiểu chữ/cỡ chữ/màu → xuất ảnh. Khi đang khoanh vùng, dấu trên ảnh tạm ẩn để dễ nhìn nền.

## Giới hạn và lưu ý
- Không có chứng thực nguồn gốc ảnh: mã HNLMark chỉ để quản lý và phân biệt ảnh, không chứng minh thời điểm chụp thực tế.
- Vá/nhân bản ảnh cục bộ cho vùng nhỏ và nền đơn giản. Xóa người hoặc vật thể lớn trên nền chi tiết có thể còn dấu vết; muốn AI inpainting chất lượng cao cần một giải pháp/model chuyên biệt.
- Ảnh lớn có thể tốn nhiều RAM và thời gian xử lý trên thiết bị. Khi làm hàng loạt nên chia theo đợt.
- Canvas xuất ảnh có thể không giữ nguyên EXIF. Ảnh vẫn xử lý cục bộ trên trình duyệt.
- Camera thực tế cần thiết bị hỗ trợ và quyền camera trên trang HTTPS. Kiểm tra trên điện thoại thật vì độ tương thích tùy máy.
- Dự án Vercel hiện có `hnl-photomark`, không thay domain hoặc dự án.

## Kiểm thử tại thời điểm phát hành
- `node --check app.js`: đạt.
- Chromium: font/màu/cỡ chữ, cắt, xoay, chỉnh màu, vá chọn nguồn, hoàn tác, JPG/ZIP, mã riêng khi thêm trùng ảnh: đạt, không có lỗi JS.
- Camera mô phỏng dọc/ngang, vùng nút không phủ ảnh, chụp lại, ZIP: đạt.
- Kiểm tra trên thiết bị Android thật còn cần thực hiện.

## Sửa lỗi tự xoay camera trên điện thoại khóa xoay màn hình – v1.8

- Nhận trạng thái dọc/ngang từ cảm biến vật lý `deviceorientation` (khi trình duyệt cho phép). Không chỉ dựa vào viewport/screen.orientation.
- Nếu cảm biến không cung cấp dữ liệu hữu ích, có nút **Xoay ảnh + dấu 90°** trong thanh điều khiển camera. Xoay video và toàn bộ lớp dấu trên chung canvas, **không xoay CSS riêng**.
- Cùng một hàm hướng camera cho khung xem trước và ảnh gốc chụp xuất JPG; logo/ngày/giờ/mã không lệch khỏi ảnh.
- Cầm camera chĩa gần thẳng xuống đất khiến dữ liệu trọng lực không phân biệt dọc/ngang; lúc này thao tác xoay 90° là cách tin cậy.
- Dấu được tạo bởi HNLMark, không chứng minh ảnh chưa bị chỉnh sửa.


### Mobile v2.0.4
- Hướng dẫn camera rút còn một câu, thao tác nhanh theo thanh điều hướng mobile.
- Khi chụp camera mở dạng màn hình riêng, nút nằm ngoài khung ảnh.
- Khi trình duyệt bị khóa dọc nhưng cảm biến báo máy nghiêng ngang, xoay toàn bộ giao diện camera (bao gồm hình, dấu, điều khiển) theo hướng mắt người xem.
- Xuất JPG dùng pixel gốc đã xoay đúng trong canvas, không phụ thuộc CSS của trình xem.
- Mặc định camera hiển thị bình thường nếu không có dữ liệu cảm biến; có nút xoay thủ công 90°.


## 2.0.0 – Camera toàn màn hình, chụp liên tiếp, sửa lại ảnh
- Nút **Chụp liên tiếp** bật mặc định: mỗi lần chụp lưu bản gốc và mã riêng trong thư viện thiết bị, camera không đóng. Tắt để xem lại từng ảnh.
- **Thư viện**: xem ảnh chụp từ ứng dụng hoặc ảnh tải lên, sửa ngày giờ, font, màu, logo, crop và xuất lại. Ảnh lưu trên IndexedDB trong trình duyệt; không phải máy chủ hay bộ sưu tập Android.
- **Sao lưu dự án ZIP** có ảnh gốc, logo riêng (nếu đã tải lên) và JSON thiết lập; **Mở dự án** để chỉnh lại khi đổi máy/xóa dữ liệu web.
- JPG đã đóng dấu chỉ có thể gỡ dấu sạch nếu có bản gốc cùng mã trong thư viện hoặc tệp dự án; file JPG đơn lẻ không lưu đủ thông tin để khôi phục nền.
- Kiểu TimeMark cho phép nhãn **Timemark** tùy chỉnh, không phải xác thực/ứng dụng TimeMark chính thức.

## 2.0.1 – Đồng bộ nhãn Timemark ở mọi góc ảnh
- Chữ góc phải dưới và nhãn đứng cạnh mã ảnh bên phải thống nhất hiển thị **Timemark**.
- Dòng phụ dưới nhãn hiển thị **100% Chân thực** (chỉ là văn bản do người dùng tùy chỉnh; không phải chứng thực tính nguyên gốc).
- Tự chuyển những giá trị mặc định cũ `HNLMark`/`Ảnh đã chỉnh sửa` trong thiết lập lưu trên trình duyệt, thư viện từng ảnh, ảnh xuất JPG/ZIP và dự án ZIP; giữ nguyên nhãn tùy chỉnh khác.
- Không thay đổi biểu tượng logo HNL, tên ứng dụng, dự án GitHub/Vercel, dữ liệu ảnh gốc.

## Thay đổi v2.0.4
- Dấu góc phải dưới: `Timemark` viết liền; chữ **Time** màu nhấn, **mark** màu trắng. Dòng phụ giữ `100% Chân thực`.
- Nhãn dọc cạnh mã ảnh hiển thị `Timemark Verified`; đây chỉ là dòng chữ tùy chỉnh, không phải chứng nhận xác thực hình ảnh hoặc mã xác minh do TimeMark phát hành. Cấu hình cũ có `HNLMark` hoặc `Time Mark` được chuẩn hóa khi mở lại.
- Tên ứng dụng HNLMark không đổi.

## Camera Full v2.0.4 – xoay ảnh và ẩn nút dự phòng
- Chế độ Full sử dụng fullscreen toàn tài liệu thay vì fullscreen trực tiếp phần tử camera, nên không đánh mất `transform` khi điện thoại khóa xoay dọc nhưng cảm biến báo cầm ngang.
- Chuyển dọc ↔ ngang, vào Full và thoát Full không làm đổi góc giữa khung camera, lớp dấu và các nút điều khiển. Cùng một hàm vẽ camera cho preview và ảnh JPG chụp.
- “Camera hệ thống (dự phòng)” được ẩn mặc định và khi camera web mở thành công. Chỉ hiện khi trình duyệt thiếu `getUserMedia` hoặc camera mở lỗi/từ chối quyền.
- Đã bổ sung kiểm thử camera giả lập: Full khi khóa xoay, ảnh chụp ngang, chế độ Full ở dọc, không hỗ trợ camera và quyền bị từ chối. Trên máy thật còn phải xác minh cách Chrome / WebView cung cấp `deviceorientation`.