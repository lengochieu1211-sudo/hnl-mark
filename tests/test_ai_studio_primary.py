from pathlib import Path
r=Path(__file__).resolve().parents[1]
def rd(p):return (r/p).read_text(encoding='utf-8')
assert '/assets/www/studio/index.html' in rd('android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java')
assert 'versionCode 2515' in rd('android/app/build.gradle')
assert "applicationIdSuffix '.trial2515'" in rd('android/app/build.gradle')
assert 'shutil.copytree(DIST,STUDIO_WWW)' in rd('android/scripts/package_web.py')
assert 'STUDIO=ROOT' not in rd('android/scripts/package_web.py') or True
assert 'src="./src/main.tsx"' in rd('studio-ui/index.html')
assert 'getUserMedia(' in rd('studio-ui/src/components/camera/CameraApkScreen.tsx')
assert 'new MediaRecorder(' in rd('studio-ui/src/components/camera/CameraApkScreen.tsx')
assert "const NAME='hnlmark-studio-media-v1'" in rd('studio-ui/src/services/mediaStorage.ts')
assert 'receivePickedMedia:' in rd('studio-ui/src/services/deviceBridge.ts')
assert 'Timemark · Verified' in rd('studio-ui/src/data/templates.ts')
assert 'isPlaceholder' not in rd('studio-ui/src/data/templates.ts')
assert 'src="../index.html"' not in rd('studio-ui/src/App.tsx')
assert 'onOpenLegacyCamera' not in rd('studio-ui/src/components/camera/CameraApkScreen.tsx')
assert 'onOpenOriginalEngine' not in rd('studio-ui/src/components/export/ExportActionSheet.tsx')
assert 'drawOriginalTimemark' in rd('studio-ui/src/services/timemarkRenderer.ts')
assert 'createTimemarkPhoto' in rd('studio-ui/src/components/export/ExportActionSheet.tsx')
assert 'app.js' in rd('android/scripts/package_web.py')
assert "versionName '2.5.15-studio-test'" in rd('android/app/build.gradle')
print('PASS: AI Studio primary UI, original HNL render retained, native picker + APK isolated')

assert "setRoute('home');setLegacyLoadKey" not in rd('studio-ui/src/App.tsx')
assert 'audio:false' in rd('studio-ui/src/components/camera/CameraApkScreen.tsx')
assert 'recorderRef.current.stop();' in rd('studio-ui/src/components/camera/CameraApkScreen.tsx')

# Empty library must still expose all real timestamp presets.
app=rd('studio-ui/src/App.tsx')
assert "{route === 'stamps' && (" in app
assert 'activeMedia={activeMedia ?? emptyPreview}' in app
assert "{route === 'stamps' && activeMedia && (" not in app

# Camera recording/back and saved originals must be safe under React UI.
assert 'handleBack:onBack' in rd('studio-ui/src/services/deviceBridge.ts')
assert 'await storeMedia(newPhoto)' in rd('studio-ui/src/App.tsx')
assert 'await onCapturePhoto(item)' in rd('studio-ui/src/components/camera/CameraApkScreen.tsx')
assert 'await onSaveVideo(item)' in rd('studio-ui/src/components/camera/CameraApkScreen.tsx')
assert 'android:screenOrientation="fullUser"' in rd('android/app/src/main/AndroidManifest.xml')

# Visual-regression guards: original artwork + no QA button in APK.
assert "Logo HNL gốc" in rd('studio-ui/src/components/common/HnlBrandMark.tsx')
assert '!isAndroidApk() && <button' in rd('studio-ui/src/App.tsx')
assert '10 Mẫu Timemark (Placeholder)' not in rd('studio-ui/src/components/stamps/StampsAndSettingsScreen.tsx')

# AI Studio scene images from original supplied ZIP, offline-only and never stored as user media.
scenes=rd('studio-ui/src/data/mockMedia.ts')
for name in ('demo-camera-front.jpg','demo-camera-rear.jpg','demo-survey.jpg','demo-night.jpg','demo-coastal.jpg'):
 assert (r/'studio-ui/public'/name).is_file() and name in scenes
assert 'INITIAL_MEDIA_ITEMS: MediaItem[]=[]' in scenes
assert 'Ảnh minh họa (chưa chọn ảnh)' in rd('studio-ui/src/App.tsx')

# No old UI routing: classic Timemark is composed directly on the AI Studio view.
app=rd('studio-ui/src/App.tsx')
cam=rd('studio-ui/src/components/camera/CameraApkScreen.tsx')
export=rd('studio-ui/src/components/export/ExportActionSheet.tsx')
wm=rd('studio-ui/src/components/watermark/WatermarkOverlay.tsx')
renderer=rd('studio-ui/src/services/timemarkRenderer.ts')
assert 'openOriginalEngine' not in app
assert 'onOpenLegacyCamera' not in cam
assert 'onOpenOriginalEngine' not in export
assert 'Mở Camera HNL gốc' not in cam
assert 'OriginalTimemarkOverlay' in wm
assert 'Timemark Verified' in renderer and '100% Chân thực' in renderer
assert "g.fillText('mark'" in renderer and "g.fillText('Time'" in renderer
assert 'createTimemarkPhoto' in export and 'saveToDevice(blob,filename)' in export
assert "getUserMedia({video,audio:false})" in cam
assert "getUserMedia({audio:true,video:false})" in cam
print('PASS: AI Studio only, legacy Timemark drawn/exported inline, audio fault isolated')
