#!/usr/bin/env python3
"""Regression: APK-only 2.5.9 UI/camera affordances and adaptive safe-zone."""
from pathlib import Path
from PIL import Image
import sys
root=Path(__file__).resolve().parents[1]
s=lambda file:(root/file).read_text(encoding='utf-8')
assert "versionName '2.5.14-studio-test'" in s('android/app/build.gradle')
assert "applicationIdSuffix '.trial2514'" in s('android/app/build.gradle')
assert 'dock&&!apk' in s('camera-controls.js')
assert 'getDigitalZoom' in s('camera-controls.js')
assert 'drawSource' in s('app.js') and 'drawSource' in s('video.js')
assert 'apk-video-quality-open' in s('video.js')
assert '.apk-select-option' in s('android/android-polish-v257.css')
assert 'grid.hidden=true' in s('android/android-camera-v25.js')
assert "!select.closest('#videoQualityPanel')" in s('android/android-select-v25.js')
fg=Image.open(root/'android/app/src/main/res/drawable/hnlmark_foreground.png').convert('RGBA')
assert fg.size==(432,432)
# TEST 13 uses an inset, pixel-faithful image; transparent OUTSIDE the source,
# never selectively transparent white/silver pixels inside the original art.
assert fg.getchannel('A').getbbox() == (106,106,326,326)
assert fg.getpixel((0,0))[3]==0 and fg.getpixel((431,431))[3]==0
assert fg.getpixel((216,216))[3]==255
print('PASS: MIUI safe adaptive icon, photo/video zoom crop, compact APK controls')
