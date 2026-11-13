#!/usr/bin/env python3
"""CI guard: secure offline APK, complete bridge and its own mobile UI."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
read=lambda rel:(root/rel).read_text(encoding="utf-8")
java=read("android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java")
ui=read("android/android-ui.css")
bridge=read("android/android-app.js")
manifest=read("android/app/src/main/AndroidManifest.xml")
workflow=read(".github/workflows/android-apk.yml")
web=read("android/app/src/main/assets/www/index.html")
for token in ("WebViewAssetLoader","addJavascriptInterface","onPermissionRequest",
              "onShowFileChooser","ACTION_OPEN_DOCUMENT","MediaStore.Downloads",
              "Tải xuống/HNLMark","FLAG_FULLSCREEN","shouldInterceptRequest"):
    assert token in java,token
assert "setAllowFileAccess(false)" in java
assert "trusted(req.getUrl())" in java
assert "request.grant(webResources.toArray(new String[0]))" in java
assert 'android:usesCleartextTraffic="false"' in manifest
assert "android:screenOrientation=\"fullSensor\"" in manifest
assert "android.permission.CAMERA" in manifest and "android.permission.RECORD_AUDIO" in manifest
assert "HNLAndroidApp" in bridge and "saveBlob(blob,filename)" in bridge
assert "192*1024" in bridge and "readAsDataURL" in bridge
assert "MutationObserver" in bridge
assert "hnl-android-apk" in ui and "camera-area.hnl-capture-screen" in ui
assert "android-ui.css" in web and "android-app.js" in web
assert "upload-artifact" in workflow and "assembleDebug" in workflow
for asset in ("app.js","video.js","orientation.js","style.css","hnl-logo-192.png"):
    assert (root/"android/app/src/main/assets/www"/asset).is_file(),asset
print("PASS: offline WebView origin, native Android UI, camera/mic, file picker, chunked download, CI")
