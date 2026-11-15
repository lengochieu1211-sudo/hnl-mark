#!/usr/bin/env python3
"""Regression of TEST39 media preservation, native capture and safe delete behavior.
Source contract only: file bytes and Android Camera app require runtime testing."""
from pathlib import Path
r=Path(__file__).resolve().parents[1]
read=lambda p:(r/p).read_text(encoding='utf8')
storage=read('studio-ui/src/services/mediaStorage.ts')
app=read('studio-ui/src/App.tsx')
lib=read('studio-ui/src/components/library/LibraryScreen.tsx')
cam=read('studio-ui/src/components/camera/CameraApkScreen.tsx')
scan=read('studio-ui/src/components/scanner/DocumentScannerScreen.tsx')
native=read('android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java')
xml=read('android/app/src/main/res/xml/share_paths.xml')
assert "indexedDB.open(NAME,2)" in storage
assert "db.createObjectStore(TRASH,{keyPath:'id'})" in storage
for mark in ("db.transaction([STORE,TRASH],'readwrite')",'trash.put({...row,deletedAt}',
             'active.delete(id);','active.add(original);','trash.delete(id);',
             'row.deletedAt>=RETENTION_MS','export async function restoreTrashedMedia'):
 assert mark in storage,mark
assert 'listTrashedMedia' in app and 'restoreTrashedMedia' in app
assert 'onRestoreTrash={handleRestoreTrash}' in app and 'onPurgeExpiredTrash={handlePurgeExpiredTrash}' in app
assert 'Thùng rác / Khôi phục' in lib and 'Dọn các tệp quá 7 ngày' in lib
assert 'window.confirm' in lib and 'onRestoreTrash([it.id])' in lib
assert 'formattedPhotoSerial(watermarkConfig.photoCodePrefix' in cam
assert 'formattedPhotoSerial(watermarkConfig.photoCodePrefix' in app
assert 'photoCodeSeq:nextPhotoSerialSequence' in app
assert 'idCardPrintSize:twoPerPage&&idCardPrintSize' in scan
assert 'In CCCD đúng kích thước 85,60 × 53,98 mm' in scan
assert 'MediaStore.ACTION_IMAGE_CAPTURE' in native and 'params.isCaptureEnabled()' in native
assert 'pendingScanCaptureUri' in native and 'FileProvider.getUriForFile' in native
assert 'pendingScanCaptureFile.length()>0' in native
assert 'hnlmark_scan_capture' in xml
print('PASS TEST39 source: reversible 7-day trash, serial code, real native camera fallback, physical CCCD size')
