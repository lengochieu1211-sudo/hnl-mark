#!/usr/bin/env python3
"""Regression for real Android media collections and automatic on-device saves.

Static source checks complement (not replace) physical device MediaStore/runtime tests.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda file:(ROOT/file).read_text(encoding='utf-8')
java=read('android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java')
photo=read('app.js')
video=read('video.js')
bridge=read('android/android-app.js')
manifest=read('android/app/src/main/AndroidManifest.xml')
assert 'MediaStore.Images.Media.EXTERNAL_CONTENT_URI' in java
assert 'MediaStore.Video.Media.EXTERNAL_CONTENT_URI' in java
assert 'MediaStore.Downloads.EXTERNAL_CONTENT_URI' in java
assert 'Environment.DIRECTORY_PICTURES + "/HNLMark"' in java
assert 'Environment.DIRECTORY_MOVIES + "/HNLMark"' in java
assert 'Environment.DIRECTORY_DOWNLOADS + "/HNLMark"' in java
assert 'mime.split(";", 2)[0].trim()' in java
assert 'MediaStore.MediaColumns.IS_PENDING, 1' in java
assert 'MediaStore.MediaColumns.IS_PENDING, 0' in java
assert 'getContentResolver().delete(s.uri, null, null)' in java
assert 'android.permission.WRITE_EXTERNAL_STORAGE' not in manifest
assert 'const cameraDeviceSaveAttempted=new Set()' in photo
assert 'function autoSaveCameraPhoto(p)' in photo
assert photo.count('autoSaveCameraPhoto(photos.find(p=>p.serialCode===code));')==2
assert 'await window.HNLAndroidApp.saveBlob(blob,outputName(p,blob));' in photo
assert 'p.deviceSaved=true;' in photo and 'cameraDeviceSaveAttempted.delete(key)' in photo
assert 'await download(blob,outputName(p,blob))' in photo
assert 'await download(zip,' in photo
assert "function persistVideoResult(){" in video
assert "recordingMode==='camera'&&window.HNLAndroidApp?.saveBlob" in video
assert "void persistVideoResult().catch(()=>{})" in video
assert 'if(videoSaveTask)' in video
assert 'if(outputBlob===blob)outputSaved=true' in video
assert 'const saveBlob=(blob,name)=>enqueueTransfer(blob,name,false);' in bridge
assert 'transferQueue=next.catch(()=>{})' in bridge
assert "versionCode 2525" in read('android/app/build.gradle')
assert "applicationIdSuffix '.trial2525'" in read('android/app/build.gradle')
assert "HNLMark STUDIO 25" in read('android/app/build.gradle')
print('PASS: TEST10 source paths and automatic camera photo/video public media saves')
