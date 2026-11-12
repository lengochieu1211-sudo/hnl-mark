# HNLMark – Source v2.0.4 (public repository)

- GitHub repository: `lengochieu1211-sudo/hnl-mark` (Public)
- Production site: https://hnl-photomark.vercel.app/
- The existing production deployment is **not linked to this repository yet**.
- Static site, entry file: `index.html`.
- Branches: `main` for reviewed stable release, `dev` for ongoing work.
- Before linking Vercel Git integration, verify the existing Vercel project and review impact. Do not create a duplicate project or overwrite Production automatically.
- Do not commit `.env` files, service account keys, private photographs, tokens or backups containing secrets.
- GitHub Public exposes source including HNL logo assets to anyone; no open-source license is granted unless the owner explicitly adds one.


## Phát hành v2.0.4
- Chạy `node --check app.js` và `python3 -m compileall -q tests` trước khi cập nhật.
- Kiểm tra thư viện trình duyệt, chụp liên tiếp, chế độ xem lại từng ảnh, xuất JPG/ZIP và mở lại dự án.
- Trang Production dùng dự án Vercel `hnl-photomark` hiện có; việc đẩy GitHub không có nghĩa Vercel đã được liên kết tự động.

## Bản vá v2.0.4
- Chữ góc phải dưới `Timemark` với phần **mark** màu trắng; chuẩn hóa nhãn cũ và đồng bộ preview/ảnh xuất.

- Chữ đứng dọc ở mép phải hiển thị `Timemark Verified`; nhãn góc phải dưới vẫn `Timemark` hai màu + `100% Chân thực`. Đây không phải xác nhận chính thức.

- v2.0.4: Fix Full rotation lock by fullscreening document root; conditional camera system fallback.

## 2.0.4 patch scope
- Camera orientation only: accelerationIncludingGravity fusion, lower tilt threshold, hysteresis, optional iOS sensor permission.
- No Firebase, GitHub branch redesign or Vercel project changes.
- Release dev, verify, then fast-forward main; deploy to same Vercel project using existing inline route.