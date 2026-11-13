# HNLMark Android 2.5.0 DEV — Camera bố trí theo ảnh mẫu + UI chữ nhỏ + adaptive icon

## Android camera (không đổi web)
- Android Activity khóa bố cục **portrait** để cụm điều khiển không chuyển từ dưới lên bên phải khi xoay thiết bị.
- Android OrientationEventListener đọc tư thế thực và thông báo cho WebView: **chỉ xoay SVG, chữ ẢNH/VIDEO ngay trong nút**, không xoay thanh điều khiển.
- Ba vùng luôn tách: công cụ nền đen phía trên, preview camera chiếm vùng giữa, phần chọn chế độ rồi hàng thumbnail — nút chụp/quay — đổi camera phía dưới. Nút quay đỏ/stop căn tâm cùng vị trí với nút chụp trắng.
- Các nút phía trên đều có hành vi: Full (trên APK ẩn vì đã Full), xoay 90°, đóng camera, bật/tắt lưới căn hình. Các điều khiển lấy nét, EV, zoom, flash chỉ xuất hiện khi hỗ trợ.
- Để tránh sửa core Web, script `android-camera-v25.js` chỉ di chuyển các DOM nút hiện có sang top bar khi camera live; trả về đúng chỗ khi đóng/chỉnh video từ máy. Giữ nguyên các event listener và thuật toán xuất.

## Form & dropdown
- Giảm cỡ chữ nhập 15px, placeholder 14px, cố định WebView textZoom=100.
- Các select trong editor dùng dropdown nhỏ riêng (Android-only) 14px; giá trị gốc vẫn nằm ở select thật và phát sự kiện change, giữ tương thích bộ xử lý.
- Giữ điều hướng APK Chụp/Thư viện máy/Cài dấu/Xuất cố định đáy và preview ảnh ghim trên đầu ở màn biên tập.

## Launcher icon
- Logo JPEG/PNG gốc vẫn giữ nguyên trong repo, không vẽ lại hoặc đổi màu.
- Build script chỉ bỏ **vùng nền trắng ngoài cùng** được nối tới biên ảnh, tạo foreground trong suốt và adaptive icon có nền navy, không còn khung trắng vuông quanh icon APK.
- Web/PWA logo nguồn không bị thay đổi.

## Test bắt buộc
- CI: kiểm tra syntax JS, audit Android, build APK, checksum SHA-256.
- Điện thoại Android thật: thử dọc/ngang trái/ngang phải; xem nút giữ góc dưới; icon xoay tại chỗ; chụp/quay/stop/review/video file; dropdown không che preview; icon màn hình chính; Photo Picker/Share/ZIP.
- Build Debug không phải Runtime Golden, không sửa Production, không mất dữ liệu người dùng. Sao lưu ZIP trước khi gỡ/cài lại APK Debug có chữ ký khác.

# HNLMark Android v2.4.1-dev — Ghim preview trên đầu, giữ thanh điều hướng phía đáy

## Thay đổi riêng APK
- Bỏ hoàn toàn native header xanh đậm có logo/tên HNLMark/OFFLINE; logo ứng dụng ngoài màn hình và icon tài nguyên giữ nguyên.
- Trên màn hình chỉnh dấu, preview ảnh được đưa lên đầu và ghim khi cuộn form. Xem ảnh khác qua hai nút điều hướng phía dưới preview. Giữ vùng xem trước nhỏ gọn, không phủ lên ô nhập.
- Bốn nút native **Chụp / Thư viện máy / Cài dấu / Xuất** luôn cố định bên dưới vùng cuộn; không bị cuộn mất cùng biểu mẫu.
- Màn hình chụp ảnh và quay video vẫn có bố cục toàn màn hình cùng cụm nút chụp/quay ở cạnh dưới, kể cả khi xoay ngang. Không ghim preview thu nhỏ chồng lên camera.
- Khi chọn Video từ thư viện, preview ảnh cũ tạm ẩn để không gây nhầm với video đang xử lý.
- Giữ nguyên màu giao diện APK, logo đã chốt, Photo Picker, chia sẻ trực tiếp, lấy nét/độ sáng/zoom và xử lý ảnh/video.
- Chỉnh font trong form về 16px và placeholder 14px để dễ đọc mà không phóng to bất thường; chỉ áp dụng APK.

## Phạm vi kiểm tra
- Android compile Debug + JS/Python static audit.
- Cần thử thực tế Android: ghim preview khi cuộn dài; chuyển ẢNH/VIDEO; portrait và landscape; bàn phím khi nhập liệu; nút điều hướng dưới; camera Full; nhập/thư viện; tải/chia sẻ file.
- Không rollback/không thay GitHub `main` hay Web Production.
- APK Debug có thể không cài đè được vì khóa ký khác lần build trước. Sao lưu dự án .ZIP trước khi gỡ.

---
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

