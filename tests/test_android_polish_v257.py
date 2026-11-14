#!/usr/bin/env python3
"""Regression: APK-only 2.5.9 UI/camera affordances and adaptive safe-zone."""
from pathlib import Path
from PIL import Image
import sys
root=Path(__file__).resolve().parents[1]
s=lambda file:(root/file).read_text(encoding='utf-8')
assert "versionName '2.5.12-ui-test'" in s('android/app/build.gradle')
assert "applicationIdSuffix '.trial2512'" in s('android/app/build.gradle')
assert 'dock&&!apk' in s('camera-controls.js')
assert 'getDigitalZoom' in s('camera-controls.js')
assert 'drawSource' in s('app.js') and 'drawSource' in s('video.js')
assert 'apk-video-quality-open' in s('video.js')
assert '.apk-select-option' in s('android/android-polish-v257.css')
assert 'grid.hidden=true' in s('android/android-camera-v25.js')
assert "!select.closest('#videoQualityPanel')" in s('android/android-select-v25.js')
fg=Image.open(root/'android/app/src/main/res/drawable/hnlmark_foreground.png').convert('RGBA')
assert fg.size==(432,432)
# TEST 11 uses an opaque, full-bleed original image. An alpha-cutout would
# remove the bright silver L, ivory highlights and camera lens.
assert fg.getchannel('A').getextrema()==(255,255)
assert fg.getpixel((0,0))[:3]==(255,255,255)
print('PASS: full-color adaptive launcher, photo/video zoom crop, compact APK controls')
