# HNLMark Android – Native APK Developer Preview 2.3.0

## Thiết kế
- Lõi xử lý ảnh/video lấy từ **cùng commit dev** trong repo này.
- Gói tài nguyên web vào APK, chạy offline qua WebViewAssetLoader `https://appassets.androidplatform.net/assets/www/index.html` (không tải ứng dụng từ Vercel).
- Native Activity: thanh tiêu đề Android + điều hướng 4 mục Chụp/Thư viện/Cài dấu/Xuất; khi vào camera, tự ẩn hai thanh.
- CSS Android chuyên biệt chỉ dùng trong APK. Không can thiệp CSS web Production.
- Android file picker (ACTION_OPEN_DOCUMENT) nhận ảnh/video/ZIP, không xin quyền đọc toàn bộ bộ nhớ.
- Camera/micro chỉ yêu cầu quyền khi WebView thực sự cần.
- Video/ảnh/ZIP xuất theo từng khối 192 KiB từ JS vào MediaStore, thư mục `Tải xuống/HNLMark`, tránh truyền Base64 toàn bộ video vào một lần.
- Dữ liệu và thư viện IndexedDB nằm riêng trong storage của APK; không tự chia sẻ với Chrome. **Phải xuất ZIP ở bản web và Mở dự án ZIP trong APK** nếu muốn chuyển dữ liệu.
- APK debug dùng khóa debug của GitHub runner; **không bảo đảm cập nhật đè giữa các lượt build**. Muốn phát hành ổn định cần keystore release riêng và backup trước khi gỡ bản debug.

## Giới hạn và test bắt buộc
1. Cài APK trên Android 10+; kiểm tra mở ứng dụng không cần mạng sau cài.
2. Chụp ảnh dọc, ngang trái/phải và sau khi khóa xoay; hình và dấu nằm đúng chiều.
3. Quay video 5–20s có âm thanh, xem lại và lưu; xác minh không đảo 180 độ.
4. Chọn ảnh/video nhiều loại; xuất JPG, PNG, ZIP, WebM/MP4; kiểm tra `Tải xuống/HNLMark`.
5. Đóng/mở lại, kiểm tra ảnh gốc trong thư viện, các chỉnh sửa đã lưu và khôi phục ZIP.
6. Thử từ chối quyền camera/micro; không văng ứng dụng, không cho trang ngoài sử dụng bridge.
7. Kiểm tra giao diện dọc/ngang/điện thoại màn hình nhỏ. Chưa được xem là Runtime Golden khi chưa thử đủ.

Build từ GitHub Actions: Workflow `HNLMark Android APK (DEV)` trên nhánh `dev`. Debug artifact có tên `HNLMark-Android-DEV-APK`. **Không merge main, không cập nhật Vercel Production**.
