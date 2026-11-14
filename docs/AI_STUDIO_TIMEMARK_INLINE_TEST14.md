# HNL Mark TEST14 — Timemark trực tiếp trong giao diện AI Studio

- Nền source: DEV `c0031fee9c92891bb529b2b4823bb86644ce7a40` (phải xác minh lại exact HEAD trước khi commit).
- Bỏ hoàn toàn nút `HNL`, `Dấu HNL gốc`, `Mở Camera HNL gốc` và khung iframe giao diện cũ khỏi UI React. Giao diện AI Studio là mặt trước duy nhất; source engine cũ trong assets vẫn được giữ để đối chiếu và không hủy dữ liệu.
- Thêm `timemarkRenderer.ts` port hệ số bố cục Timemark từ `app.js` gốc: đồng hồ chữ cao hẹp + ngày/thứ, thương hiệu Time (vàng) mark (trắng), chú thích `100% Chân thực`, ký tự dọc `Timemark Verified` với biểu tượng khiên; đây là NỘI DUNG HIỂN THỊ, KHÔNG PHẢI chứng nhận kỹ thuật.
- Xem trước và xuất JPEG dấu Timemark trong React, không phải chuyển sang giao diện cũ. Lưu/Chia sẻ xuất tệp mới, giữ bản gốc riêng. Ảnh/video gốc và thư viện offline không bị xóa.
- Không giả vờ rằng 9 template cũ còn lại hoặc 12 template độc lập đã xuất chuẩn: chúng vẫn được liệt kê/xem trước nhưng xuất có dấu những template này tạm chặn với thông báo rõ, chờ chuyển thuật toán đầy đủ. Video chưa đóng dấu trực tiếp vào từng frame; chỉ lưu video nguyên bản.
- Không yêu cầu microphone để mở camera. Khi bấm quay video, xin microphone riêng; nếu thất bại vẫn quay video không tiếng và hiển thị cảnh báo. Retry camera chỉ khởi động lại React camera, không chuyển engine cũ.
- Dùng canvas stamp xoay trong hệ tọa độ hoán đổi chiều rộng/chiều cao ở 90/-90 thay vì xoay tại góc cũ gây cắt mép; các stamp khác xoay quanh tâm tránh cắt.
- Bắt buộc kiểm thử GitHub CI (TypeScript, Vite, Android), runtime Android camera/mic, dấu gốc, video và lưu thư viện trước khi gọi Runtime Golden.
- KHÔNG merge main, không đụng bản Production hay thư viện thiết bị.
