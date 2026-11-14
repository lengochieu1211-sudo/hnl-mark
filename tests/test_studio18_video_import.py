#!/usr/bin/env python3
"""TEST22 source contracts: video preview & stamped export without destroying originals.
Static only: real Android decoder / MediaRecorder still requires runtime evidence.
"""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
read=lambda p:(R/p).read_text(encoding='utf-8')
app=read('studio-ui/src/App.tsx')
lib=read('studio-ui/src/components/library/LibraryScreen.tsx')
exp=read('studio-ui/src/components/export/ExportActionSheet.tsx')
exps=read('studio-ui/src/components/export/ExportScreen.tsx')
enc=read('studio-ui/src/services/importedVideoStamp.ts')
mark=read('studio-ui/src/services/timemarkRenderer.ts')
roll=read('studio-ui/src/components/library/CameraRollScreen.tsx')
cam=read('studio-ui/src/components/camera/CameraApkScreen.tsx')
backup=read('studio-ui/src/services/projectBackup.ts')
assert "item.kind==='video' ? <div" in lib
assert "lightboxItem.kind==='video' ? <video" in lib and 'controls playsInline preload="metadata"' in lib
assert "activeMedia.kind==='video'" in exps and '<video src={activeMedia.url} controls' in exps
assert 'stampImportedVideo(await getBlob(it)' in exp
assert "disabled={busy||targetItems.length!==1}" in exp
assert 'await onStampedMedia?.(it,blob,cfg)' in exp
assert '__hnlStudioExporting' in exp and '__hnlStudioExporting' in app
assert 'await storeMedia(updated)' in app and 'stampedBlob:stamped' in app
assert 'URL.createObjectURL(mediaFile)' in app and 'detectedType' in app
assert "!original.type.startsWith('video/')" in enc and "throw Error('Tệp được chọn không phải video hợp lệ.')" in enc
assert "video.addEventListener('loadedmetadata'" in enc
assert "video.addEventListener('ended'" in enc and "video.addEventListener('error'" in enc
assert 'const hasDuration=Number.isFinite(video.duration)' in enc
assert 'video.duration>MAX_DURATION_SECONDS' in enc
assert 'canvas.captureStream(FPS)' in enc and 'drawConfiguredStamp(ctx' in enc
assert 'createMediaElementSource(video)' in enc and 'createMediaStreamDestination()' in enc
assert 'new MediaRecorder(output' in enc and 'await completed' in enc
assert "slice(String(reader.result).lastIndexOf(',')+1)" in read('studio-ui/src/services/deviceBridge.ts')
assert "slice(String(reader.result).lastIndexOf(',')+1)" in read('android/android-app.js')
assert 'URL.revokeObjectURL(src)' in enc and 'video.remove()' in enc
assert 'stamp' in backup and '_stamped.${stampedBlob.type.startsWith' in backup
assert 'const cleanCode=rawCode.replace(/^HNL(?:[-_: ]+)/i' in mark
assert 'const baseline=clamp(y+firstH*.90' in mark
assert 'if(config.showLogo&&logo' not in mark
assert 'orientationDeg:0, captureWatermark:' in cam
assert 'const orientation:OrientationDeg=stampOrientationRef.current;' in cam
assert '<WatermarkOverlay config={watermarkConfig} orientationDeg={watermarkTurn}' in cam
assert 'drawConfiguredStamp(ctx,canvas.width,canvas.height,timestamp,activeOrientation,photoCode,logo)' in read('studio-ui/src/services/stampedVideoCapture.ts')
assert '<video key={active.id} src={active.url} playsInline controls' in roll
assert "versionCode 2530" in read('android/app/build.gradle')
assert "applicationIdSuffix '.trial2530'" in read('android/app/build.gradle')
print('PASS: TEST21 imported video player / stamping / audio / unknown WebM duration / backup / rotation')
