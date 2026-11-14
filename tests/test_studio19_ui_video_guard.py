#!/usr/bin/env python3
"""TEST21 contracts; not a claim of real Xiaomi runtime coverage."""
from pathlib import Path
r=Path(__file__).resolve().parents[1]
read=lambda f:(r/f).read_text(encoding='utf-8')
home=read('studio-ui/src/components/home/HomeScreen.tsx')
export=read('studio-ui/src/components/export/ExportScreen.tsx')
logo=read('studio-ui/src/components/common/HnlBrandMark.tsx')
mark=read('studio-ui/src/services/timemarkRenderer.ts')
cam=read('studio-ui/src/components/camera/CameraApkScreen.tsx')
video=read('studio-ui/src/services/importedVideoStamp.ts')
sheet=read('studio-ui/src/components/export/ExportActionSheet.tsx')
for src in (home,export,logo):
 assert 'AndroidAdaptiveIconPreview' not in src and 'Nhận diện Logo & Android Adaptive Icon' not in src
assert 'Sao lưu & bảo vệ dữ liệu' in export
assert 'HnlLogoPlaceholder' in logo
assert 'FONT_FAMILIES:Record<WatermarkFontKey,string>' in read('studio-ui/src/services/watermarkFonts.ts')
assert 'prepareTimemarkFont(config.fontKey)' in mark
assert 'createTimemarkCode()' in cam and 'photoCode={previewCode}' in cam
assert 'photoCode?: string;' in read('studio-ui/src/components/watermark/WatermarkOverlay.tsx')
assert '`${cleanCode} Timemark Verified`' in mark and '${cleanCode}  |' not in mark
assert "shield(g,f*.68,'#ffffff')" in mark
assert 'orientationDeg:watermarkTurn, captureWatermark:' in cam
assert 'orientationDeg={watermarkTurn}' in cam
assert 'const orientation:OrientationDeg=stampOrientationRef.current;' in cam
assert 'timestamp,activeOrientation,photoCode' in read('studio-ui/src/services/stampedVideoCapture.ts')
assert 'MAX_EDGE=1280' in video and 'const FPS=15' in video
assert 'STALL_TIMEOUT_MS=12000' in video and 'window.clearInterval(stallInterval)' in video
assert 'AbortController' in sheet and 'Hủy xử lý' in sheet
assert 'await stampImportedVideo' in sheet and 'await onStampedMedia?.(it,blob,cfg)' in sheet
assert "applicationIdSuffix '.trial2528'" in read('android/app/build.gradle')
assert 'mipmap-anydpi-v26/ic_launcher.xml' not in str(list((r/'android/app/src/main/res/mipmap-anydpi-v26').glob('*'))) if (r/'android/app/src/main/res/mipmap-anydpi-v26').exists() else True
print('PASS: TEST21 removes icon QA; Timemark font/serial/rotation; imported-video bounds, stall detection, cancel')
