#!/usr/bin/env python3
"""TEST17 cross-module safety contracts; Android device QA still mandatory."""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
read=lambda p:(R/p).read_text(encoding='utf-8')
cam=read('studio-ui/src/components/camera/CameraApkScreen.tsx')
app=read('studio-ui/src/App.tsx')
exp=read('studio-ui/src/components/export/ExportActionSheet.tsx')
video=read('studio-ui/src/services/stampedVideoCapture.ts')
storage=read('studio-ui/src/services/mediaStorage.ts')
backup=read('studio-ui/src/services/projectBackup.ts')
icon=read('android/scripts/make_launcher_icon.py')
assert 'createStampedVideoCapture(' in cam
assert 'canvas.captureStream(fps)' in video and 'drawOriginalTimemark(ctx' in video
assert 'new MediaStream([...capture.stream.getVideoTracks()' in cam
assert 'getUserMedia({audio:true,video:false})' in cam
assert 'recorder.pause()' in cam and 'recorder.resume()' in cam
assert "aria-label={isPaused?'Tiếp tục quay video':'Tạm dừng quay video'}" in cam
assert 'track.applyConstraints' in cam and 'pointsOfInterest' in cam
assert 'Bù sáng tại điểm chạm' in cam and 'brightness(${exposureFactor})' in cam
assert 'orientationDeg:isLandscapeViewport?0:orientationDeg' in cam
assert 'createTimemarkPhoto(newPhoto.rawBlob' in app
assert 'saveToDevice(item.stampedBlob' in app
assert 'await storeMedia(newPhoto)' in app  # Commit original first.
assert 'isStamped:stampConfig.templateId' in cam
assert "if(!it.isStamped)throw Error('Video cũ" in exp
assert 'Lưu ảnh / video có dấu vào máy' in exp and 'Chia sẻ ảnh / video có dấu' in exp
assert 'Tệp gốc và sao lưu · Tùy chọn nâng cao' in exp
assert 'stampedBlob:item.stampedBlob' in storage
assert 'stampedName' in backup and "zip.file(stampedName,stampedBlob" in backup
assert 'LEGACY_RATIO = 0.98' in icon and 'BACKGROUND_RGB' not in icon
assert 'versionCode 2517' in read('android/app/build.gradle')
assert "applicationIdSuffix '.trial2517'" in read('android/app/build.gradle')
print('PASS: TEST17 stamped photo/video, protected originals, pause/resume, spot metering and icon')
