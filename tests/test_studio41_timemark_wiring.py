from pathlib import Path
root=Path(__file__).resolve().parents[1]
read=lambda p:(root/p).read_text('utf8')
cam=read('studio-ui/src/components/camera/CameraApkScreen.tsx')
app=read('studio-ui/src/App.tsx')
renderer=read('studio-ui/src/services/timemarkRenderer.ts')
serial=read('studio-ui/src/services/timemarkSerial.ts')
assert 'captureStampCode(' in cam and 'captureStampCode(' in app
assert 'photoCode:i===0?capturePreviewCode:captureStampCode(' in cam
assert 'const photoCode=capturePreviewCode' in cam
assert 'photoCode={capturePreviewCode}' in cam
assert 'visibleTimemarkCode(codeOverride,date.getTime(),config.photoCodeSeq)' in renderer
assert ".padEnd(14,'0')" not in renderer
assert "templateId==='timemark'||!showPhotoCode" in serial
assert 'createTimemarkCode()' in cam and 'createTimemarkCode()' in app
print('PASS TEST41: photo/video preview, burst, import, vertical Timemark use TEST36-style IDs')
