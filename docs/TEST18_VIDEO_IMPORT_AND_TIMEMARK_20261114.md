# HNL Mark STUDIO TEST18 — video nhập và chuẩn hóa Timemark

Source chuẩn: lengochieu1211-sudo/hnl-mark, branch dev, dựa exact HEAD 0fbd507e366d9ccba8c1f00e84ac18c46c4d7c31 (TEST17).

## Đã patch trên DEV
- Chọn video từ Android Photo Picker/Files: nhận dạng MP4, WebM khi MIME không chính xác.
- Video trong Thư viện, xem lớn, chỉnh dấu, Xuất: hiển thị player thật với controls/playsInline, không dùng img src=video.
- Sửa Base64 JNI transfer: tách header Data URL bằng dấu phẩy cuối của MIME (dùng indexOf), không split phẩy bên trong `video/webm;codecs=vp8,opus`; tránh file gửi Android hỏng.
- File video có sẵn: xử lý bằng video decode -> Canvas có Timemark -> MediaRecorder tạo bản video mới. AudioContext nối tiếng gốc vào output khi WebView hỗ trợ. Media Recorder báo lỗi nếu codec không hỗ trợ. Nếu metadata WebM thiếu duration, vẫn phát đến ended với thời gian an toàn tối đa.
- Bản gốc và stampedBlob lưu riêng; ZIP backup có file stamped .webm/.mp4, khôi phục MIME tương ứng.
- Tạm thời giới hạn video nhập 5 phút để tránh tràn RAM trên điện thoại cũ; nếu vượt quá, không xóa hoặc sửa tệp gốc.
- Timemark gốc bỏ logo HNL, mã dọc bỏ tiền tố HNL-, căn caption bên phải chung baseline với cụm giờ/ngày/thứ bên trái; bản xuất chỉ vẽ dấu ở góc 0° của khung hình, không áp lại góc cảm biến gây ngược 180°.
- Icon TEST17 giữ nguyên, không sửa asset hay launcher mask.
- APK TEST18 độc lập trial2518; không gỡ TEST15/16/17, không ảnh hưởng main/PROD.

## Test và hạn chế
- Kiểm tra tĩnh test_studio18_video_import.py: source player, nhập MIME, bản xuất, audio, fallback duration, video backup, orientation.
- CI Static / APK Build / Full Source / Emulator: phải xác minh kết quả tại exact HEAD sau commit.
- Chưa chứng minh runtime playback/export trên Redmi thật. Phải dùng video có tiếng, MP4 H.264/AAC & WebM VP8, chọn từ Android Picker, phát xem, xuất Timemark, dùng trình phát Gallery/Photos xem kết quả, so sánh audio, kiểm tra xoay 4 hướng.
- `Timemark Verified` và `100% Chân thực` chỉ là nhãn hiển thị; không phải chứng thực kỹ thuật.
