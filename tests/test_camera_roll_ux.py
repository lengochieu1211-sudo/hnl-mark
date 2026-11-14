from pathlib import Path
root=Path(__file__).resolve().parents[1]
read=lambda p:(root/p).read_text(encoding='utf-8')
app=read('studio-ui/src/App.tsx')
camera=read('studio-ui/src/components/camera/CameraApkScreen.tsx')
review=read('studio-ui/src/components/library/CameraRollScreen.tsx')
assert "route === 'review'" in app
assert 'onOpenLibrary={() => {setReviewMediaId(mediaItems[0]?.id' in app
assert 'data-hnl-camera-roll="true"' in review
assert 'aria-label="Quay lại camera"' in review
assert 'onTouchStart={handleStart}' in review and 'Math.abs(diff)>55' in review
assert 'max-h-full' in review and 'object-contain' in review
assert 'ordered.map((item,index)' in review
assert 'onClick={onOpenLibrary}' in camera
assert 'pickDeviceGallery();' not in camera
assert 'Đã lưu ${count} ảnh gốc vào thư viện HNL' not in camera
assert 'src={latestThumb}' in camera and 'DEMO_IMAGES.rearConstruction' not in camera.split('const latestThumb =',1)[1].split('const previewAspectStyle',1)[0]
assert 'Chọn ảnh / video từ máy' in app and 'onClick={()=>pickDeviceGallery()}' in app
assert "if(route==='review'){setRoute('camera');return true;}" in app
assert 'onOpenLegacyCamera' not in camera
print('PASS: thumbnail -> camera roll, real stored photos, swipe, thumbnails, no save-success toast, native picker preserved in library')

assert '<WatermarkOverlay config={watermarkConfig} orientationDeg={0} />' in camera
assert 'disabled={isRecording || isFinalizing}' in camera
print('PASS: watermark preview follows display naturally, no gallery during pending recording')

java=read('android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java')
assert 'if (s.destination.startsWith(Environment.DIRECTORY_DOWNLOADS + "/"))' in java
assert 'toast("Đã lưu vào " + s.destination);' in java  # Explicit ZIP download only.
assert 'const newestFirst=[...items].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));' in app
assert 'setMediaItems(newestFirst)' in app
print('PASS: no per-shutter Android Toast; newest captured photo first after library restart')
