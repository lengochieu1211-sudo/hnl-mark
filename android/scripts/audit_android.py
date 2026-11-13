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
assert "android:screenOrientation=\"fullSensor\"" in manifest
assert "versionCode 2401" in gradle and "versionName '2.4.1-dev'" in gradle
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
assert "version:'2.4.1-dev'" in bridge

print("PASS: offline assets, Photo Picker, FileProvider direct share, safe bridge,")
print("      focus/EV/zoom/torch capability gates and bottom-fixed rotating icons")
