# HNLMark DEV TEST v2.5.12 — AI Studio navy/gold UI (parallel TEST)

- Application ID: `vn.hnl.xaydung.hnlmark.trial2512`, independent from TEST11 and Production packages.
- Source: source ZIP at GitHub exact HEAD. Visual shell from supplied React prototype is ported into existing WebView HTML/CSS/JS.
- The REAL Timemark, Timemark Verified and independent timestamp presets remain unchanged; the prototype's placeholder templates are not used.
- Media processing, Android MediaStore saves, bridge, camera/video and storage are inherited without modifications other than the UI version marker.
- Physical device tests remain required before Runtime Golden. Never uninstall an older APK before ZIP export of its local library.

# HNLMark DEV TEST v2.5.11 — Original full-color icon restored

- APK icon now uses source RGB unmodified, crops only 19px of external white padding. No color key, tint or artificial sky-blue/navy overlay.
- Builds adaptive icon and legacy density-specific icons from the SAME original color pixels, like the resource density strategy of HNL QLTC.
- TEST 11 uses isolated package `vn.hnl.xaydung.hnlmark.trial2511`. Never uninstall older TEST before exporting its photo library ZIP.
- Media auto-save, camera, video, offline library and stamp presets are unchanged from TEST 10.
- Build/CI are not real Xiaomi/MIUI runtime verification; visually inspect launcher on device.


- Android photos captured by HNLMark: editable original remains in app IndexedDB; separately auto-save a stamped export to Pictures/HNLMark with MediaStore.Images, visible in phone gallery. Imported photos are not duplicated automatically. If auto-save fails, keep the editable original and show an explicit warning.
- Android camera video: auto-save finished recorded output in Movies/HNLMark with MediaStore.Video. Keep video result for retry on failure; do not close while a save is active. Video import/export still requires explicit Save.
- Manual image/video save goes to Pictures/HNLMark and Movies/HNLMark, respectively; ZIP/source exports remain in Downloads/HNLMark. No broad storage permission is required on Android 10+.
- TEST 10 uses an isolated install identifier vn.hnl.xaydung.hnlmark.trial2510; do not uninstall previous versions before backup.
- UI: clearer contrast for source-logo dark HNL text (light blue full-bleed launcher, no cream/white square border), compact preview zoom controls and elegant expand icon.
- Build and static checks alone are not device Runtime Golden; verify on a real phone for camera, video, gallery indexing, icon launcher, offline edits and backup.

# HNLMark TEST v2.5.9 — Video recover, touch zoom/focus, original logo matte, adjustable preview

- Development-only: exact HEAD governed by GitHub `dev`. TEST 9 package `vn.hnl.xaydung.hnlmark.trial259`, distinct offline library. Do not uninstall any current install before creating a complete ZIP backup from it.
- Video: close mode returns to photo preview, and opening camera again in Video mode goes to video camera; waiting `getUserMedia` calls are invalidated on close. Recorded output is scrolled into view for save/share.
- Photo/video camera: pinch **two fingers** 1–3x, tap to focus; remove permanently visible focus/zoom buttons from APK. If hardware zoom is unavailable, use explicit digital crop rendered into saved output (not the source file).
- APK photo viewer only: 100–400% preview zoom with +/- and two-finger pan; drag resize handle for greater/smaller preview viewport; no effect on original photo or stamped export. Single-finger dragging stamp remains available.
- Crop ratio and Create Center Frame controls are aligned to equal-width columns; HNL internal library button matches the first main media picker column.
- Video monitor: disable white corner/pseudo-element/grid overlays in preview; display CSS only, not encoded overlay.
- Launcher: original HNL source PNG is unchanged. Generate adaptive icon foreground with original HNL letter/camera pixels on a navy background, removing the cream/white exterior matte rather than shrinking a square white logo.
- Never mark Android Runtime Golden until real Android hardware evidence covers capture, rotate, repeat video, mic, zoom, picker, save/share and offline persistence.

# HNLMark TEST v2.5.8 — 12 mẫu dấu thời gian độc lập

- Branch DEV, kế thừa v2.5.7, không đổi main/Production.
- 12 mẫu mới trong nhóm mở rộng: Nhật ký thi công, Hồ sơ nghiệm thu, Ca làm việc, Dấu địa điểm, Ảnh khảo sát, Kỹ thuật xanh, Dải chân ảnh, Ảnh kỷ niệm, Đồng hồ LED, Du lịch, Góc tối giản, Thông tin ảnh.
- Mẫu mới render trực tiếp trong core app.js: ảnh/video xuất, thư viện ảnh đã lưu, font, cỡ chữ, ngày giờ và vị trí giữ chung một đường code. Không thêm nhãn Timemark Verified, không tuyên bố xác thực ảnh. Dữ liệu địa điểm chỉ lấy từ trường người dùng nhập, không giả GPS.
- Nhóm mẫu mở rộng có thể thu gọn trên màn hình nhỏ. Dữ liệu preset và ảnh cũ không chuyển đổi tự động, giữ nguyên kiểu dấu đã chọn.
- Bản APK debug thử mới có applicationId riêng `vn.hnl.xaydung.hnlmark.trial258`, nhãn HNLMark TEST 8. Không gỡ TEST cũ khi chưa sao lưu thư viện ZIP. Không Runtime Golden khi chưa có kiểm thử thiết bị.

# HNLMark TEST v2.5.7 — Launcher, Video, Zoom/Focus, Compact Form

- DEV only, TEST 7 riêng `vn.hnl.xaydung.hnlmark.trial257`; không thay TEST 6, production, app data.
- Tạo lại adaptive icon từ artwork HNL gốc tại vùng trung tâm an toàn; không làm cắt logo bởi mask mặc định Android. Không chỉnh asset gốc.
- Video ẩn lưới trên preview; không lưu lưới vào video. Các đường khác cần thử file thực tế để xác minh.
- Bảng video dùng modal có nền tối/scroll và nút Đóng, không nằm trong camera xoay.
- Zoom camera được điều khiển từ dock dưới cho cả Ảnh/Video. Ưu tiên zoom phần cứng WebView; nếu không có thì crop số 1–3x đồng nhất preview và file xuất, không thay tệp media gốc.
- Chạm preview để yêu cầu lấy nét; thêm nút lấy nét giữa khung. Nếu thiết bị không hỗ trợ focus points, chỉ hiển thị khung chọn điểm và camera tiếp tục AF mặc định; không cam kết khả năng lấy nét tay.
- Đưa cỡ chữ nhập/dropdown Android xuống 13px, option 12.5px và nhãn 12px.
- Rút ngắn chỉ số thư viện thành N ảnh trên APK, không xóa IndexedDB/ZIP.
- TEST và Android CI chỉ là static/build PASS, cần kiểm tra thiết bị thật, xoay 2 chiều, video âm thanh, ảnh chụp, offline, gallery và zoom. Không Runtime Golden.

# HNLMark TEST v2.5.6 — chọn ảnh/video qua Thư viện hoặc Files

- Nhánh DEV, tiếp tục từ exact HEAD d7dcecbb234e1692fb2230fb28984a246164e4a7; không thay main/Production.
- Khi chọn ảnh/video từ thanh dưới hoặc đầu trang APK, chọn nguồn: **Thư viện ảnh/video** (Android Photo Picker, có fallback) hoặc **Duyệt tệp trong máy** (ACTION_OPEN_DOCUMENT).
- Khi hủy chọn tệp qua WebView, giải phóng callback để có thể thử lại; thư viện native không làm mất tệp sẵn có.
- ZIP dự án vẫn mở trực tiếp Android Documents, không có menu media.
- TEST 6 cài song song bằng applicationId `vn.hnl.xaydung.hnlmark.trial256`, không gỡ hay ghi đè TEST 5. Thư viện offline của các bản TEST tách riêng.
- Phải thử trên Android thật: ảnh đơn/nhiều, video, Files, hủy rồi mở lại, xoay camera, lưu và chia sẻ. CI không phải Runtime Golden.

# HNLMark TEST v2.5.5 — logo APK không khung tối và rút gọn ghi chú

## Kết luận từ ảnh người dùng
- Icon trước đây: logo nguồn 512px bị thu còn 196px trong foreground 432px và ghép lên nền navy #102C4B, tạo viền tối rất rộng. Đây là nguyên nhân trong code, không phải lỗi từ logo nguồn.
- Sửa: giữ ảnh gốc `hnl-logo-512.png` nguyên trạng, sử dụng ảnh đầy đủ làm bitmap nền adaptive icon. Foreground là lớp trong suốt; không tự tô thêm navy, không tạo khung, không cắt sửa nét HNL/camera vàng. Hệ thống Android chịu trách nhiệm mặt nạ icon tròn/vuông.
- Hai câu mô tả thư viện dài và câu “Ảnh sẽ xuất hiện tại đây…” không cần đứng thường trực trên APK; ẩn bằng CSS Android-only, không xóa tính năng sao lưu/khôi phục ZIP. Ngừng chèn thông báo “Chọn trực tiếp từ Thư viện máy…”.
- Chỉ APK; Web/PWA/logo gốc trong repository không thay đổi.
- Bản TEST riêng `vn.hnl.xaydung.hnlmark.trial255`, tên HNLMark TEST 5, tránh ghi đè/tháo app có dữ liệu vì khóa Debug không cố định.

## Cần kiểm tra runtime
- Launcher MIUI: icon trên màn hình chính, danh sách app, shortcut, dark/light mode; kiểm tra không còn khung xanh đậm ngoài.
- Hai ghi chú dài đã biến mất; upload ảnh/video, thư viện, sao lưu ZIP, cài dấu vẫn chạy.
- Không gọi Runtime Golden khi chưa có test thực tế; tuyệt đối không tháo gỡ app chứa dữ liệu.

# HNLMark TEST v2.5.4 — sửa không chọn được ảnh và video trên APK

## Kết quả audit
- Nút Thư viện máy của thanh điều hướng Android trước đây chỉ gọi `photoInput.click()` thông qua `evaluateJavascript`. Lệnh đó không có trusted user-gesture trong WebView nên bộ chọn tệp có thể bị chặn.
- Android 13+ Photo Picker trước đây dùng `ACTION_PICK_IMAGES` với `setType("*/*")`, không cần thiết khi chọn cả ảnh lẫn video và có thể không tương thích với ROM Android tùy biến.
- Bộ nhận file trước đây chỉ trả `ValueCallback<Uri[]>` cho input HTML; không có đường nhận riêng cho nút Thư viện máy thực sự.

## Sửa lỗi
- Nút native **Thư viện máy** gọi trực tiếp Activity Photo Picker. Trên Android 13+, không gán MIME `*/*` để Photo Picker cho chọn cả ảnh/video; có phương án dự phòng Android GET_CONTENT và OPEN_DOCUMENT.
- Chấp nhận cả URI đơn `data.getData()` và nhiều URI trong `ClipData`; kiểm tra scheme content, MIME image/video.
- Android tạo token ngẫu nhiên chứa URI đã chọn, phục vụ lại nội bộ trên nguồn `https://appassets.androidplatform.net/picked/<token>` bằng WebViewAssetLoader trong tối đa 20 phút. Không cần quyền đọc mọi ảnh và không lộ đường dẫn máy ra web công khai.
- WebView nhận tệp thành `File` và chuyển vào **chính hàm routeMediaFiles** đã được dùng cho ô chọn ảnh/video. Nút thumbnail ở camera Ảnh và Video cũng được nối với Photo Picker Android.
- Form chọn ZIP giữ ACTION_OPEN_DOCUMENT, không sửa quy trình nhập/khôi phục dự án.
- Nếu máy không có Photo Picker, mở Android Gallery/File picker thay thế.
- Không tự ghi gì vào thư viện gốc, không xóa ảnh. Lõi xử lý dấu, khung hình và camera đã có được giữ nguyên.

## Test/bàn giao
- Android Build và bộ kiểm tra mã nguồn phải PASS. Bắt buộc thử trên Android thật: nút Thư viện máy dưới đáy, nút Chọn ảnh/video trên form, chọn 1 ảnh, nhiều ảnh, 1 video, nhiều ảnh + video; đóng picker, từ chối quyền, quay lại camera.
- APK TEST có package mới `vn.hnl.xaydung.hnlmark.trial254` và tên **HNLMark TEST 4**, cài song song để không ảnh hưởng dữ liệu ở bản cũ. APK debug vẫn chưa Runtime Golden.
- Hiện chưa có thiết bị Android được điều khiển trực tiếp trong phiên này; không được báo lỗi đã hoàn toàn hết chỉ từ CI.
- GitHub main và Vercel Production không thay đổi.

# HNLMark Android v2.5.3 TEST – Sửa preview camera theo ảnh máy thật

## Đối chiếu ảnh lỗi người dùng (13/11/2026)
- Ảnh khi cầm dọc: preview hiển thị đúng nội dung, nút chụp/đổi camera nằm dưới.
- Ảnh khi cầm ngang: do Activity cố định bố cục dọc, preview bị thu nhỏ đáng kể và có các khoảng đen thừa phía trên/dưới. Lỗi nằm ở phép `contain` cho canvas đã xoay, không phải ở nút chụp.
- Tái tạo bộ test hình học theo 4 kích thước màn hình, 4 tỷ lệ ảnh, 4 góc xoay.
- APK dùng `HNLPreviewGeometry.calculate` chung cho Ảnh và Video: mặc định **khung lớn** (chỉ phủ kín khung khi tỷ lệ lệch không quá 1.65 lần), còn chế độ **toàn bộ** hiển thị trọn viền ảnh. Cả hai chỉ thay đổi hiển thị trong camera; ảnh/video xuất và chữ Timemark giữ nguyên dữ liệu.
- Thêm biểu tượng thay đổi khung xem trước ngay trên thanh công cụ, nút chụp/quay và các nhãn vẫn cố định dưới đáy.
- CSS mới `android-preview-v253.css` có độ ưu tiên cao hơn các bộ chọn cũ; không tự sửa thuật toán cảm biến/MediaRecorder.

## Dữ liệu và cài đặt
- Build TEST khác package `vn.hnl.xaydung.hnlmark.trial253` và nhãn `HNLMark TEST 3`, **cài song song** với bản thử trước để không phải xóa thư viện cũ do chữ ký debug APK thay đổi.
- Bản TEST có dữ liệu riêng; không tự chuyển dữ liệu sang bản cũ. Đừng xóa bản HNLMark/HNLMark TEST đang chứa ảnh trước khi sao lưu dự án ZIP.
- Phát hành lâu dài vẫn cần keystore ổn định riêng và kiểm thử camera thực tế trên Android; CI PASS chưa phải Runtime Golden.
- Web Production và GitHub main giữ nguyên.

# HNLMark Android v2.5.1 DEV — Audit sửa lỗi giao diện và xuất file

- **Adaptive icon:** logo HNL gốc được giữ nguyên, chỉ thu nhỏ vào vùng an toàn tròn của Android (432px foreground, artwork tối đa 196px). Không cắt chữ HNL, máy ảnh vàng hoặc đường lượn của logo. Tự kiểm tra alpha bbox khi build.
- **Xoay handset / chữ chèn:** Android OrientationEventListener là nguồn tham chiếu đầu vào APK; `getDeviceAngle()` được dùng trong cả camera ảnh, video và UI. Hình camera và chữ/dấu được dựng cùng hướng trong canvas xuất. Chỉ khung xem trước có thể xoay để người cầm ngang nhìn đúng, toolbar luôn cố định phía dưới. Các nhãn ẢNH/VIDEO xoay trong nút; text phụ quá dài được ẩn khi xoay tránh chen chúc.
- **Nút video:** vòng 74px, tâm đỏ 52px hoặc nút Stop vuông 24px; tuyệt đối căn chính giữa tại cùng vị trí trong khung chụp. Chế độ chọn video từ máy dùng nút hành động dạng dài riêng thay vì vòng tròn camera.
- **Một nút Lưu / Chia sẻ:** chỉ APK. Bấm sẽ có menu gọn: Lưu vào Tải xuống/HNLMark hoặc chia sẻ đến Zalo/Messenger/Drive qua Android FileProvider (không cần lưu Downloads). Giữ nút Xuất tất cả ZIP trong phần Xuất ảnh.
- **Thu gọn cài đặt:** các nhóm Ảnh & Video, Mẫu dấu thời gian, Ngày và giờ, Thông tin, Kiểu dáng, Chỉnh ảnh gốc, Xuất ảnh. Mặc định chỉ mở nhóm Ảnh & Video, bấm tiêu đề/mũi tên để mở; thanh Cài dấu/Xuất tự mở đúng nhóm. Không xóa hoặc tái tạo các form có ID, không tác động dữ liệu người dùng.
- **Không ảnh hưởng Web Production:** chỉ thay logic native-guarded ở `app.js`/`video.js` và UI trong `android/`. Exact DEV HEAD được ghi lại qua GitHub.
- **Chưa Runtime Golden:** CI/build không chứng minh hết lỗi vật lý. Bắt buộc kiểm tra trên Android thật với portrait, landscape hai bên, đảo 180°, xem lại video, mở/đóng accordion, lưu/chia sẻ, adaptive icon launcher tròn/vuông.

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

