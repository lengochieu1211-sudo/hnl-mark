#!/usr/bin/env python3
"""Test 9 static contract: video lifecycle recovery and view-only APK controls."""
from pathlib import Path
r=Path(__file__).resolve().parents[1]
read=lambda x:(r/x).read_text(encoding='utf-8')
v=read('video.js');p=read('app.js');camera=read('camera-controls.js')
zoom=read('android/android-preview-zoom-v259.js');css=read('android/android-preview-zoom-v259.css')
polish=read('android/android-polish-v257.css');bundle=read('android/scripts/package_web.py')
assert "closeStudio().then(ok=>{if(!ok)return;selectedMedia='photo';updateMediaPicker();})" in v
assert 'cameraOpenGeneration' in v and 'generation!==cameraOpenGeneration' in v
assert "isVideoSelected:()=>selectedMedia==='video'" in v
assert 'window.HNLVideoStudio?.isVideoSelected?.()' in p
assert 'dock&&!apk' in camera and 'pointers.size===2&&pinchLength>0)' in camera
assert 'pinchInProgress' in camera and '!pinchInProgress' in camera
assert 'window.HNLPreviewZoom' in zoom and 'isGesturing' in zoom
assert 'touch-action:none' in css and 'apk-photo-preview-resizer' in css
assert '--apk-photo-preview-height' in css
assert 'preview-zoom-v259.css' in bundle and 'preview-zoom-v259.js' in bundle
assert 'grid-template-columns:repeat(2,minmax(0,1fr))' in polish
assert 'video-canvas-wrap::after{content:none' in polish
assert "versionCode 2524" in read('android/app/build.gradle')
assert "applicationIdSuffix '.trial2524'" in read('android/app/build.gradle')
print('PASS: video close/reopen flow, pinch camera, zoomable preview, crop/library alignment')
