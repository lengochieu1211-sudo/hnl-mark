# HNLMark v2.0.4 — Camera toàn màn hình, chụp liên tiếp và thư viện ảnh

**Trang chính:** https://hnl-photomark.vercel.app/

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