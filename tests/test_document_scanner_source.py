#!/usr/bin/env python3
"""HNL Mark scanner TEST20: source/contract regression, not device runtime PASS."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
read=lambda p:(root/p).read_text(encoding='utf-8')
app=read('studio-ui/src/App.tsx')
engine=read('studio-ui/src/services/documentScanner.ts')
ui=read('studio-ui/src/components/scanner/DocumentScannerScreen.tsx')
route=read('studio-ui/src/types/hnl.ts')
mark=read('studio-ui/src/components/watermark/WatermarkOverlay.tsx')
assert "'scanner'" in route and "route === 'scanner'" in app
assert 'Quét tài liệu / CCCD' in app and '<DocumentScannerScreen' in app
for marker in ['createScannerPdf','squareToQuadrilateral','flattenDocument','validCorners','suggestDocumentEdges',
               'indexedDB.open','original:Blob','processed?:Blob','Promise<void>(resolve=>setTimeout(resolve,0))',
               'detectDocumentEdges','/DCTDecode','%%EOF','/MediaBox']:
    assert marker in engine, marker
for marker in ['Chụp quét','Chọn nhiều ảnh','Làm phẳng & lưu bản scan','Đen trắng','Giấy trắng',
               'Chưa phân loại','Đổi tên thư mục','Xóa thư mục (giữ ảnh)','Kéo thả ảnh',
               'Hai ảnh cạnh nhau','Xuất PDF','Lưu ảnh / ZIP','Sao lưu ZIP','Khôi phục ZIP',
               'onPointerMove={handlePointerMove}','putScan(p)','await putScan(next)']:
    assert marker in ui, marker
assert "const generatedPhotoCode = timemarkCode ||" in mark and "photoCode: timemarkCode" in mark
assert "const photoCode = `${config.photoCodePrefix}" not in mark
assert not any(s in app for s in ['cloudinary','document-scan.googleapis.com'])
print('PASS: offline scanner routes, perspective/filters, four-corner UI, PDF, folder/ZIP, safe source persistence')
