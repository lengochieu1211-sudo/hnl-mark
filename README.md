# HNLMark v1.9.0 — Chỉnh ảnh gốc và chữ đóng dấu

**Trang chính:** https://hnl-photomark.vercel.app/

## Tính năng mới
- Chọn kiểu font chữ: hẹp theo mẫu, Arial, Roboto/hệ thống, Tahoma, Verdana, Georgia, monospace. Tùy chọn độ đậm.
- Chỉnh cỡ chữ riêng cho giờ, ngày/thứ, địa chỉ, nhãn HNLMark, mã dọc. Tùy chỉnh màu chữ từng phần, ngoài màu chữ và màu nhấn toàn bộ có sẵn.
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


### Mobile v1.9.0
- Hướng dẫn camera rút còn một câu, thao tác nhanh theo thanh điều hướng mobile.
- Khi chụp camera mở dạng màn hình riêng, nút nằm ngoài khung ảnh.
- Khi trình duyệt bị khóa dọc nhưng cảm biến báo máy nghiêng ngang, xoay toàn bộ giao diện camera (bao gồm hình, dấu, điều khiển) theo hướng mắt người xem.
- Xuất JPG dùng pixel gốc đã xoay đúng trong canvas, không phụ thuộc CSS của trình xem.
- Mặc định camera hiển thị bình thường nếu không có dữ liệu cảm biến; có nút xoay thủ công 90°.