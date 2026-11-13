#!/usr/bin/env python3
"""HNLMark Android 2.4 static security, camera and UI audit, run in CI."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
r=lambda path:(root/path).read_text(encoding="utf-8")
java=r("android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java")
manifest=r("android/app/src/main/AndroidManifest.xml")
ui=r("android/android-ui.css")
bridge=r("android/android-app.js")
web=r("android/app/src/main/assets/www/index.html")
controls=r("camera-controls.js")
controls_css=r("camera-controls.css")
photo=r("app.js")
video=r("video.js")
workflow=r(".github/workflows/android-apk.yml")
gradle=r("android/app/build.gradle")
for token in ("WebViewAssetLoader","addJavascriptInterface",
              "onPermissionRequest","onShowFileChooser",
              "MediaStore.ACTION_PICK_IMAGES","ACTION_GET_CONTENT",
              "ACTION_OPEN_DOCUMENT","MediaStore.Downloads",
              "FileProvider.getUriForFile","Intent.ACTION_SEND",
              "FLAG_GRANT_READ_URI_PERMISSION","cameraState(",
              "screenAngle()","onConfigurationChanged"):
    assert token in java,token
for fn in ("beginShare","appendShare","finishShare","abortShare",
           "beginSave","appendSave","finishSave","abortSave"):
    assert fn in java,fn
assert "setAllowFileAccess(false)" in java
assert 'trusted(req.getUrl())' in java
assert "android.permission.CAMERA" in manifest
assert "android.permission.RECORD_AUDIO" in manifest
assert "android:usesCleartextTraffic=\"false\"" in manifest
assert "android:exported=\"false\"" in manifest
assert "fileprovider" in manifest
assert "share_paths.xml" in str(list((root/"android/app/src/main/res/xml").glob("share_paths.xml")))
assert "android:screenOrientation=\"portrait\"" in manifest
assert "versionCode 2503" in gradle and "versionName '2.5.3-test'" in gradle
assert "androidx.core:core:" in gradle
for token in ("chooseTab","shareBlob","saveBlob","setDeviceOrientation",
              "apkSharePhoto","apkShareVideo","openGallery","photoInput"):
    assert token in bridge,token
assert "128*1024" in bridge
assert "readAsDataURL" in bridge
assert "MutationObserver" in bridge
assert "window.HNLPhotoBridge" in photo
assert "window.HNLVideoStudio" in video
assert "shareCurrent" in photo and "shareCurrent" in video
assert "HNLCameraControls.create" in photo and "HNLCameraControls.create" in video
assert "cameraControls?.getFilter()" in photo
assert "cameraControls?.getFilter()" in video
for capability in ("pointsOfInterest","focusMode","exposureCompensation","zoom","torch","applyConstraints"):
    assert capability in controls,capability
assert "hnl-focus-ring" in controls_css
assert "hnl-camera-exposure" in controls_css
assert "hnl-camera-quick" in controls_css
assert "body.hnl-android-apk.hnl-camera-live" in ui
assert "body.hnl-android-apk.hnl-video-live" in ui
assert "hnl-landscape-dock" in ui
assert "video-locked-left" in ui
assert "order:2!important" in ui
assert "flex-direction:column!important" in ui
assert "grid-template-columns:minmax(0,1fr) 62px minmax(0,1fr)" in ui
assert "rotate(-90deg)" in ui and "rotate(90deg)" in ui
assert "ShareSession" in java and "cache-path" in r("android/app/src/main/res/xml/share_paths.xml")
assert "android-ui.css" in web
assert "camera-controls.js" in web
assert "camera-controls.css" in web
assert "android-app.js" in web
for asset in ("app.js","video.js","orientation.js","style.css","camera-controls.js","camera-controls.css","hnl-logo-192.png"):
    assert (root/"android/app/src/main/assets/www"/asset).is_file(),asset
assert "upload-artifact" in workflow and "assembleDebug" in workflow
assert "node --check camera-controls.js" in workflow
# Native shell regression: title/OFFLINE bar removed, never reintroduce.
assert 'chromeHeader' not in java
assert 'TextView offline' not in java
assert 'setChromeVisible(!active)' in java
assert 'app.addView(chromeTabs, new LinearLayout.LayoutParams(-1, dp(61)))' in java
assert 'app.addView(web, new LinearLayout.LayoutParams(-1, 0, 1f))' in java
assert 'View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR' in java

# Photo preview must remain above scrolling editing form, except live camera.
assert 'workspace > .viewer' in ui
assert 'order:-1!important;position:sticky!important;top:0!important' in ui
assert '.viewer #previewCanvas' in ui and '.viewer #cameraArea #stage' in ui
assert '.hnl-camera-live .workspace > .viewer' in ui
assert 'scroll-margin-top:clamp(190px,34dvh,272px)' in ui
assert 'hnl-android-video-editing' in ui
assert "function syncPreviewMode()" in bridge
assert "attributeFilter:['hidden']" in bridge
assert "version:'2.5.3-test'" in bridge

# User-reported Android camera + form + launcher regressions (v2.5).
camera_ui=r("android/android-camera-v25.css")
camera_js=r("android/android-camera-v25.js")
select_ui=r("android/android-select-v25.css")
select_js=r("android/android-select-v25.js")
launcher=r("android/scripts/make_launcher_icon.py")
for token in ('OrientationEventListener','lastPhysicalAngle','cameraOrientationListener',
              'setTextZoom(100)'):
    assert token in java,token
assert 'cameraOrientationListener.enable()' in java
assert 'cameraOrientationListener.disable()' in java
assert 'android:icon="@mipmap/ic_launcher"' in manifest
assert '@mipmap/ic_launcher' in manifest
assert 'android:screenOrientation="portrait"' in manifest
assert "Image.open(source).convert('RGBA')" in launcher
assert "foreground.save(drawable/'hnlmark_foreground.png')" in launcher
assert (root/"android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml").exists()
assert 'hnlmark_icon_bg' in r("android/app/src/main/res/values/colors.xml")
for token in ('apk-camera-topbar','apk-grid-toggle','syncCameraToolbar',
              'wrapModeLabels','apk-rotate-label'):
    assert token in camera_js,token
for token in ('order:0!important','order:1!important','order:2!important',
              'grid-template-columns:minmax(0,1fr) 76px minmax(0,1fr)',
              '#shutterButton','video-record-symbol','video-stop-symbol'):
    assert token in camera_ui,token
assert 'apk-select-sheet' in select_js and 'apk-select-source' in select_js
assert "select.dispatchEvent(new Event('change',{bubbles:true}))" in select_js
assert 'font-size:14px!important' in select_ui
for file in ('android-camera-v25.css','android-camera-v25.js',
             'android-select-v25.css','android-select-v25.js',
             'android-ux-v251.css','android-ux-v251.js'):
    assert (root/"android/app/src/main/assets/www"/file).exists(),file
assert (root/"android/app/src/main/res/drawable/hnlmark_foreground.png").exists()
assert (root/"android/app/src/main/res/drawable/hnlmark_icon.png").exists()

# v2.5.1: Android launcher, orientation, camera shutter and compact UX.
ux=r("android/android-ux-v251.js")
uxcss=r("android/android-ux-v251.css")
camera_core=r("android/android-camera-v25.js")
assert "subject.thumbnail((196,196)" in launcher
assert "getDeviceAngle" in bridge and "hnlmark:physical-orientation" in bridge
assert "nativeAngle=window.HNLAndroidApp?.getDeviceAngle?.()" in photo
assert "function androidPhysicalPose()" in video
assert "effectiveSide()" in video and "effectiveInverted()" in video
assert "window.HNLAndroidCameraLayout?.syncPreviewOrientation?.()" in bridge
assert "window.HNLAndroidCameraLayout" in camera_core
assert "apk-fold-content" in ux and "apk-collapse-toggle" in ux
assert "window.HNLAndroidSections={reveal,fold}" in ux
assert "apkPhotoActions" in ux and "apkVideoActions" in ux
assert "Lưu hoặc chia sẻ" in ux and "openSheet(kind,source)" in ux
assert "window.HNLAndroidApp?.getDeviceAngle?.()" in ux
assert "updatePreview()" in ux and "hnlmark:physical-orientation" in ux
assert "apk-rotated-preview" in uxcss and "--apk-preview-turn" in uxcss
assert "#videoRecord .video-record-symbol" in uxcss
assert "#videoStop .video-stop-symbol" in uxcss
assert 'android-ux-v251.js' in web and 'android-ux-v251.css' in web
assert "node --check android/android-ux-v251.js" in workflow
assert "applicationIdSuffix '.trial253'" in gradle
assert "HNLMark TEST 3" in gradle
assert 'android:label="@string/hnlmark_application_name"' in manifest
assert "TEST v2.5.3" in ux
assert "#cameraArea #stage #previewCanvas.apk-rotated-preview" in uxcss
assert ".video-canvas-wrap #videoCanvas.apk-rotated-preview" in uxcss

# v2.5.3: top-bar preview enlargement in photo and video without export crop.
geom=r("android/preview-geometry.js")
preview_css=r("android/android-preview-v253.css")
assert "window.HNLPreviewGeometry?.calculate" in ux
assert "apkPreviewModes={photo:'large',video:'large'}" in ux
assert "apk-geometry-preview" in ux and "apk-preview-toggle" in ux
assert "mode:scale===fit?'fit':'cover'" in geom
assert "ratio<=1.65?cover:fit" in geom
assert "#cameraArea #stage #previewCanvas.apk-geometry-preview" in preview_css
assert ".video-canvas-wrap #videoCanvas.apk-geometry-preview" in preview_css
assert "preview-geometry.js" in web and "android-preview-v253.css" in web
assert "node tests/test_android_preview_geometry.cjs" in workflow
for name in ("preview-geometry.js","android-preview-v253.css"):
    assert (root/"android/app/src/main/assets/www"/name).is_file(),name

print("PASS: offline assets, Photo Picker, FileProvider direct share, safe bridge,")
print("      focus/EV/zoom/torch capability gates and bottom-fixed rotating icons")
