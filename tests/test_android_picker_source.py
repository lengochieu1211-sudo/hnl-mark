#!/usr/bin/env python3
"""Fail CI if Android photo/video picker contracts regress again."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
java=(root/"android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java").read_text(encoding="utf-8")
app=(root/"android/android-app.js").read_text(encoding="utf-8")
web=(root/"app.js").read_text(encoding="utf-8")
assert java.count("REQ_NATIVE_GALLERY")>=3
assert java.count("REQ_FILES")>=3
assert 'new Intent(MediaStore.ACTION_PICK_IMAGES)' in java
assert 'pick.setType("*/*")' not in java
assert "getPickedUris(resultCode,data)" in java
assert "getClipData()" in java
assert "new JSONArray()" in java
assert '"content".equalsIgnoreCase(uri.getScheme())' in java
assert 'addPathHandler("/picked/"' in java
assert "openDeviceGallery();" in java
assert '"library".equals(command)' in java
assert "window.HNLAndroidApp?.receivePickedMedia(" in java
assert "HNLMediaImport.acceptFiles(files)" in app
assert "window.HNLMediaImport={acceptFiles:(files)=>routeMediaFiles(files)}" in web
assert "document.getElementById('photoInput')" not in java
assert "showMediaSourceDialog(REQ_FILES,multiple,isZip)" in java
assert "showMediaSourceDialog(REQ_NATIVE_GALLERY,true,false)" in java
assert "startDocumentPicker(requestCode,multiple,false)" in java
assert "cancelPendingFileChooser(requestCode)" in java
assert '"Duyệt tệp trong máy"' in java
print("PASS: gallery native tab + web input + image/video mixed picker + safe URI transport")
