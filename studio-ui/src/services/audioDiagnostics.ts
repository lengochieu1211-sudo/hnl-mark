/** Differentiate microphone permission from hardware/Android WebView failures.
 * Never claim that a mic is denied merely because getUserMedia threw. */
export function describeMicFailure(error:unknown):string{
 const name=error&&typeof error==='object'&&'name' in error?String(error.name):'';
 switch(name){
 case 'NotAllowedError':case 'PermissionDeniedError':return 'Quyền micro đang bị từ chối hoặc bị chặn trong hệ thống. Kiểm tra quyền Micro của HNL Mark.';
 case 'NotFoundError':case 'DevicesNotFoundError':return 'Không tìm thấy micro đầu vào trên thiết bị.';
 case 'NotReadableError':case 'TrackStartError':return 'Android WebView không khởi tạo được nguồn micro. Đây có thể là lỗi định tuyến âm thanh của WebView, không có nghĩa micro đang bị ứng dụng khác chiếm dụng. Hãy thử lại micro trên APK mới.';
 case 'AbortError':return 'Android ngắt kết nối micro khi đang khởi tạo. Hãy thử quay lại.';
 case 'OverconstrainedError':return 'Micro không đáp ứng cấu hình yêu cầu của trình duyệt.';
 case 'SecurityError':return 'WebView chặn truy cập micro trong môi trường hiện tại.';
 default:return 'Không khởi tạo được micro ('+(name||String(error)||'không rõ lý do')+'). Hãy kiểm tra thiết bị và thử lại.';
 }
}
