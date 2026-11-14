# HNL Mark — UI Prototype (`HNL-Mark-UI-Prototype`)

Bản thiết kế giao diện độc lập (UI Prototype) cho phần mềm **HNL Mark – Professional Camera & Timestamp**, ưu tiên trải nghiệm một tay trên điện thoại Android APK / WebView.

> **Lưu ý quan trọng**: Đây là giao diện mẫu tương tác (UI Prototype). Mọi thao tác chụp ảnh, quay video, xuất tệp vào bộ nhớ thiết bị và chia sẻ hệ thống trong bản này đều được **mô phỏng trực quan**. Không kết nối Firebase, không API key, không phụ thuộc CDN sau khi build và không chỉnh sửa repository Production.

## 1. Cấu trúc màn hình chính

- **Camera APK toàn màn hình (Màn hình khởi chạy mặc định)**:
  - Thanh công cụ mỏng trên cùng: Đóng (`×`), Lưới 3×3, Xoay thủ công (`0° / 90° / -90° / 180°` xử lý khi Android khóa xoay), Tỷ lệ khung (`4:3`, `16:9`, `1:1`, `Full`), Popup chất lượng Video (`720p / 1080p / 4K`, `24 / 30 / 60 FPS`, `Chuẩn / Cao / Tối đa`).
  - Khung ngắm lớn thích ứng, chạm để lấy nét (focus reticle tự ẩn), chụm 2 ngón hoặc cuộn chuột để zoom (chỉ báo zoom tự ẩn), watermark trực tiếp đúng hướng xoay.
  - Cụm nút chụp cố định dưới đáy (hoặc cạnh phải khi thiết bị xoay ngang thực sự): Thư viện (trái), Nút chụp/quay (giữa), Đổi camera trước/sau (phải), chuyển `ẢNH / VIDEO` và `Chụp liên tiếp`.
  - Màn hình Xem lại Video sau khi dừng quay và nút `Mở lại video` sau khi đóng.
- **Trang chính HNL Mark**: Khung xem trước có tay nắm kéo tăng/giảm chiều cao, nút `Chọn ảnh / video` căn thẳng cột với `Thư viện HNL Mark`, nút `Mở camera`, và các chức năng phụ thu gọn bằng Accordion.
- **Thư viện HNL Mark**: Lưới / Danh sách, tìm kiếm, sắp xếp, chọn nhiều mục, phân biệt `Đã lưu dự án` và `Ảnh mới chọn`, Lightbox xem ảnh lớn & sửa trực tiếp dấu thời gian, sao lưu / khôi phục JSON, cùng bộ chuyển kiểm thử 4 trạng thái (`Có ảnh`, `Trống`, `Đang tải`, `Lỗi`).
- **Bộ 22 mẫu dấu & Tùy chỉnh dấu + Chỉnh sửa ảnh**:
  - 10 slot `Timemark 01 – 10 (Placeholder)` bảo toàn chỗ ghép 1:1 từ nhánh `dev`.
  - 12 mẫu HNL độc lập có thumbnail trực quan cập nhật tức thì.
  - 11 nhóm cài đặt Accordion gọn (13–14px).
  - Trình chỉnh sửa ảnh không phá hủy bản gốc (zoom 2 ngón, kéo thay đổi chiều cao khung xem, cắt tỷ lệ + `Tạo khung giữa`, xoay/lật, sáng/tương phản/màu sắc, kéo thả trực tiếp vị trí watermark).
- **Xuất & Chia sẻ**: Một nút `Lưu / Chia sẻ` mở Action Sheet (`Lưu vào máy`, `Chia sẻ`, `Xuất nhiều ảnh`, `Sao lưu dự án ZIP`, `Tải Source ZIP & Tài liệu bàn giao`) với đủ trạng thái Đang xuất, Thành công và Lỗi mô phỏng.

## 2. Cách chạy dự án cục bộ

```bash
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`.

Để build tĩnh (không phụ thuộc CDN, font và ảnh demo đã đóng gói nội bộ):

```bash
npm run build
npm run preview
```

## 3. Tài liệu bàn giao đi kèm

- `docs/UI_HANDOFF.md`: Mô tả chi tiết design tokens, typography, spacing, safe area và giải phẫu từng màn hình.
- `docs/INTEGRATION_MAP.md`: Bảng đối chiếu thành phần giao diện với luồng chức năng HNL Mark nhánh `dev`.
- `docs/WEBVIEW_PORTING_GUIDE.md`: Hướng dẫn chuyển đổi module React/CSS sang HTML5 + CSS3 + JavaScript thuần cho Android WebView.
- `docs/TEST_REPORT.md`: Báo cáo kiểm thử 8 kích thước màn hình, xoay ngang, bàn phím Android và danh sách tính năng mô phỏng.
