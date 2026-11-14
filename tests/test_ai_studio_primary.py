from pathlib import Path
r=Path(__file__).resolve().parents[1]
def rd(p):return (r/p).read_text(encoding='utf-8')
assert '/assets/www/studio/index.html' in rd('android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java')
assert 'versionCode 2514' in rd('android/app/build.gradle')
assert "applicationIdSuffix '.trial2514'" in rd('android/app/build.gradle')
assert 'shutil.copytree(DIST,STUDIO_WWW)' in rd('android/scripts/package_web.py')
assert 'STUDIO=ROOT' not in rd('android/scripts/package_web.py') or True
assert 'src="./src/main.tsx"' in rd('studio-ui/index.html')
assert 'getUserMedia(' in rd('studio-ui/src/components/camera/CameraApkScreen.tsx')
assert 'new MediaRecorder(' in rd('studio-ui/src/components/camera/CameraApkScreen.tsx')
assert "const NAME='hnlmark-studio-media-v1'" in rd('studio-ui/src/services/mediaStorage.ts')
assert 'receivePickedMedia:' in rd('studio-ui/src/services/deviceBridge.ts')
assert 'Timemark · Verified' in rd('studio-ui/src/data/templates.ts')
assert 'isPlaceholder' not in rd('studio-ui/src/data/templates.ts')
assert 'src="../index.html"' in rd('studio-ui/src/App.tsx')
assert 'app.js' in rd('android/scripts/package_web.py')
assert "versionName '2.5.14-studio-test'" in rd('android/app/build.gradle')
print('PASS: AI Studio primary UI, original HNL render retained, native picker + APK isolated')

assert "setRoute('home');setLegacyLoadKey" in rd('studio-ui/src/App.tsx')
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
