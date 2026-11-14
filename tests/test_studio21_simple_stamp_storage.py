#!/usr/bin/env python3
"""TEST22 source contract: simple stamps, EXIF/GPS choice, true codec and SAF folder."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
read=lambda p:(root/p).read_text(encoding='utf-8')
tpl=read('studio-ui/src/data/templates.ts')
wm=read('studio-ui/src/components/watermark/WatermarkOverlay.tsx')
ui=read('studio-ui/src/components/stamps/StampsAndSettingsScreen.tsx')
types=read('studio-ui/src/types/hnl.ts')
photo=read('studio-ui/src/services/timemarkRenderer.ts')
simple=read('studio-ui/src/services/simpleStampRenderer.ts')
importvideo=read('studio-ui/src/services/importedVideoStamp.ts')
camera=read('studio-ui/src/components/camera/CameraApkScreen.tsx')
native=read('android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java')
for stamp in ('simple-datetime','simple-date','simple-time'):
 assert f"id:'{stamp}'" in tpl
assert "group:'simple'" in tpl and "WatermarkGroup = 'timemark-legacy' | 'hnl-independent' | 'simple'" in types
assert 'SimpleStampOverlay' in wm and 'drawSimpleStamp' in simple
assert 'drawSimpleStamp(ctx,canvas.width,canvas.height,config,orientation,logo)' in photo
assert 'drawSimpleStamp(ctx,canvas.width,canvas.height,timestamp,activeOrientation,logo)' in read('studio-ui/src/services/stampedVideoCapture.ts')
assert 'drawSimpleStamp(ctx,canvas.width,canvas.height,cfg,0,logo)' in importvideo
assert 'Chỉ ngày / giờ (3)' in ui and 'Vị trí chữ dấu thời gian' in ui
assert "locationSource: 'manual'" in tpl and 'readPhotoExifGps(mediaFile)' in read('studio-ui/src/App.tsx')
assert 'getCurrentPosition' in read('studio-ui/src/services/watermarkLocation.ts')
assert 'GPS từ ảnh đã chọn' in ui and 'Lấy GPS từ điện thoại' in ui
assert 'ACCESS_FINE_LOCATION' in read('android/app/src/main/AndroidManifest.xml')
assert 'onGeolocationPermissionsShowPrompt' in native
assert 'supportedVideoMime(watermarkConfig.videoFormat' in camera
assert 'supportedVideoMime(config.videoFormat' in importvideo
assert 'video/mp4' in read('studio-ui/src/services/videoFormat.ts')
assert 'ACTION_OPEN_DOCUMENT_TREE' in native and 'takePersistableUriPermission' in native
assert 'DocumentsContract.createDocument' in native and 's.mediaStore' in native
assert 'chooseSaveLocation' in ui and 'Chọn thư mục / thẻ SD' in ui
assert "applicationIdSuffix '.trial2524'" in read('android/app/build.gradle')
print('PASS: TEST21 three minimal actual renderers, EXIF/manual/GPS modes, codec validation, Android SAF chosen-folder writing')
