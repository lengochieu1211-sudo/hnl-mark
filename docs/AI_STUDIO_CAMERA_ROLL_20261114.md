# HNL Mark TEST14 — Camera roll (14/11/2026)

## Yêu cầu người dùng
- Chạm ảnh thu nhỏ sau khi chụp => xem lại ngay ảnh/video đã chụp, giống thư viện camera hệ thống; không gọi chọn ảnh thiết bị.
- Không hiện thông báo `Đã lưu X ảnh gốc vào thư viện HNL` sau từng lần bấm chụp. Vẫn phải báo lỗi nếu IndexedDB hoặc MediaStore không lưu được.
- Không có nút quay về camera engine/giao diện cũ. AI Studio làm UI chính; Timemark gốc do lớp renderer tích hợp trong React vẽ và xuất.

## Patch
- `CameraApkScreen.tsx`: thumbnail cuối là item thật, nhấn mở onOpenLibrary (camera roll); hình trống dùng icon, không dùng demo giả làm ảnh chụp. Không toast khi chụp thành công. Chặn xem lại lúc đang quay hoặc đang hoàn tất lưu. Trả về preview sau video được lưu, truy cập video bằng camera roll. Dấu preview ở 0° theo viewport thật để tránh đảo/cắt do xoay hai lần.
- `CameraRollScreen.tsx`: màn hình xem ảnh/video riêng toàn màn hình, vuốt trái/phải, dải thumbnail, pinch zoom ảnh, phát video, trở lại camera, nút sửa dấu/lưu-chia sẻ, nút xem thư viện đầy đủ. Media lấy từ IndexedDB đã commit qua App; không tự ghi đè, xoá hay tạo tệp.
- `App.tsx` / `types/hnl.ts`: route `review` độc lập camera và native picker. Khi quay lại camera sẽ mở stream lại, không dùng `pickDeviceGallery` cho ảnh thu nhỏ. Đưa `Chọn ảnh / video từ máy` vào Thư viện. Hỗ trợ file input HTML fallback nếu chạy web.
- `tests/test_camera_roll_ux.py`: regression tĩnh ghi nhận. CI TypeScript/build/APK sau patch bắt buộc PASS mới công bố APK.

## Trạng thái kiểm chứng
Kiểm tra source/regression tĩnh tại local PASS. Android runtime trên Redmi thật và MediaStore thực tế vẫn PENDING. Không tự ý update main/production, không gỡ bản cũ hoặc xoá dữ liệu.


BỔ SUNG 14/11/2026 — UX chụp ảnh:
- Native MainActivity.finishSession không còn Toast “Đã lưu vào Pictures/HNLMark” hoặc Movies/HNLMark mỗi lần camera tự lưu. Lưu ZIP ở Downloads/HNLMark vẫn có thông báo xác nhận.
- React loadMedia() sắp xếp mới nhất theo createdAt trước khi đưa ảnh ra ô thumbnail, kể cả sau khởi động lại APK.
- Chụp xong vẫn ở camera; bấm thumbnail vào CameraRollScreen, vuốt trái/phải, xem ảnh lớn + dải ảnh dưới, có nút Trở về camera.
- Lỗi ghi IndexedDB/MediaStore vẫn được báo riêng. Không xóa/ghi đè dữ liệu cũ.
