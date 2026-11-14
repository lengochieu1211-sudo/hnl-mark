#!/usr/bin/env python3
"""Regression: APK-only 2.5.9 UI/camera affordances and adaptive safe-zone."""
from pathlib import Path
from PIL import Image
import sys
root=Path(__file__).resolve().parents[1]
s=lambda file:(root/file).read_text(encoding='utf-8')
assert "versionName '2.5.17-studio-test'" in s('android/app/build.gradle')
assert "applicationIdSuffix '.trial2517'" in s('android/app/build.gradle')
assert 'dock&&!apk' in s('camera-controls.js')
assert 'getDigitalZoom' in s('camera-controls.js')
assert 'drawSource' in s('app.js') and 'drawSource' in s('video.js')
assert 'apk-video-quality-open' in s('video.js')
assert '.apk-select-option' in s('android/android-polish-v257.css')
assert 'grid.hidden=true' in s('android/android-camera-v25.js')
assert "!select.closest('#videoQualityPanel')" in s('android/android-select-v25.js')
# HNL QLTC-style transparent mipmap, no dark/white adaptive background.
assert not (root/'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml').exists()
for density,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    fg=Image.open(root/f'android/app/src/main/res/mipmap-{density}/ic_launcher.png').convert('RGBA')
    assert fg.size==(size,size)
    assert fg.getpixel((0,0))[3]==0 and fg.getpixel((size-1,size-1))[3]==0
    assert fg.getpixel((size//2,size//2))[3]==255
print('PASS: QLTC-style no-border icon, photo/video zoom crop, compact APK controls')
