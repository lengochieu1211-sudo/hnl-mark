# HNLMark Android v2.4.0-dev — Native gallery, direct share, bottom dock & camera adjustment

## UX: riêng cho APK, không áp sang Web
- Không đổi thuật toán Web Production hoặc giao diện Web đã phát hành.
- Thanh điều khiển camera luôn ở **phía dưới** cho cả dọc và ngang, đúng yêu cầu người sử dụng. Nút chụp/quay nằm giữa, thư viện bên trái, đổi camera bên phải; icon **xoay tại vị trí** khi máy xoay 90°/270°, không chuyển sang thanh phải. Giữ thanh nút không trùm nội dung preview.
- Bộ màu APK: xanh navy `#102C4B`, xanh chính `#2866C0`, vàng `#ECC049`, bề mặt trắng và nền xám xanh `#F1F4F8`. Chỉ tạo styles trong `android/android-ui.css`, không ảnh hưởng `style.css` của web.
- Sắp xếp điều hướng native Chụp / Thư viện máy / Cài dấu / Xuất. Tự ẩn header và tab khi camera toàn màn hình; khởi động ứng dụng KHÔNG tự yêu cầu quyền camera.

## Thư viện thiết bị
- Android 13+ dùng Photo Picker hệ thống để chọn ảnh/video trực tiếp. Android 10–12 dùng System Content Picker; dự án ZIP giữ Document Picker.
- Không yêu cầu quyền truy cập tất cả file hay đọc toàn bộ ảnh. Dự án IndexedDB riêng của APK, không tự đồng bộ với Chrome.
- Có thể chọn ảnh/video trong bộ nhớ máy mà không phải xuất hoặc sao chép vào Downloads trước.

## Chia sẻ trực tiếp
- Nút riêng trong APK chia sẻ ảnh/video sau khi đã chèn dấu. Tạo bản xuất tạm riêng tư trong cache, rồi dùng ACTION_SEND + FileProvider để chọn Zalo, Messenger, Drive, v.v.
- **Không phải nhấn Lưu về Downloads trước**. Việc chia sẻ vẫn cần tạo file tạm riêng tư, tự xóa file cũ sau 48 giờ; app khác nhận URI được cấp quyền đọc cho nội dung đã chọn.
- Xuất về Tải xuống/HNLMark vẫn giữ. Truyền dữ liệu từ WebView sang native theo các khối 128KiB.

## Camera: giống nguyên tắc thao tác iPhone, có giới hạn WebView
- Chạm lên khung hình để hiển thị ô lấy nét/đo sáng. Nếu MediaStreamTrack hỗ trợ `pointsOfInterest`, `focusMode` thì gửi yêu cầu lấy nét phần cứng.
- Chỉnh sáng bằng slider EV: ưu tiên `exposureCompensation` của camera; nếu không có, dùng bộ lọc độ sáng khi dựng ảnh/video (không phải phơi sáng quang học thực).
- Zoom và đèn trợ sáng chỉ hiện khi thiết bị/trình duyệt công bố hỗ trợ qua `getCapabilities()`; không hứa tất cả máy hỗ trợ.
- Ghi video giữ logic xoay/dấu thời gian hiện hành; cần thử cảm biến trên máy thật để xác nhận lỗi đảo 180° đã hết.

## An toàn / kiểm chứng
- APK chạy offline bằng `WebViewAssetLoader`, không cấp native JS bridge cho trang ngoài origin.
- File chia sẻ dùng FileProvider với thư mục cache cụ thể, không dùng URI `file://` hay quyền lưu trữ rộng.
- CI chạy cú pháp JS, audit tĩnh Android, Gradle assembleDebug, tạo SHA256.
- Bắt buộc thử trên Android thực: camera dọc/ngang hai hướng, khóa xoay, focus, EV, zoom, flash, âm thanh, mở thư viện, Zalo share, ZIP export/restore, bảo toàn dữ liệu.
- Chưa được coi là Runtime Golden nếu chỉ CI PASS.
- APK Debug ký bằng debug key; có thể không thể cài đè build cũ, phải sao lưu ZIP trước khi gỡ.

