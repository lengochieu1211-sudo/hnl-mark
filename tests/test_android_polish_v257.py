#!/usr/bin/env python3
"""Regression: APK-only 2.5.9 UI/camera affordances and adaptive safe-zone."""
from pathlib import Path
from PIL import Image
import sys
root=Path(__file__).resolve().parents[1]
s=lambda file:(root/file).read_text(encoding='utf-8')
assert "versionName '2.5.10-test'" in s('android/app/build.gradle')
assert "applicationIdSuffix '.trial2510'" in s('android/app/build.gradle')
assert 'dock&&!apk' in s('camera-controls.js')
assert 'getDigitalZoom' in s('camera-controls.js')
assert 'drawSource' in s('app.js') and 'drawSource' in s('video.js')
assert 'apk-video-quality-open' in s('video.js')
assert '.apk-select-option' in s('android/android-polish-v257.css')
assert 'grid.hidden=true' in s('android/android-camera-v25.js')
assert "!select.closest('#videoQualityPanel')" in s('android/android-select-v25.js')
fg=Image.open(root/'android/app/src/main/res/drawable/hnlmark_foreground.png').convert('RGBA')
assert fg.size==(432,432)
assert all(55<=v<=377 for v in fg.getchannel('A').getbbox()),fg.getchannel('A').getbbox()
assert fg.getpixel((0,0))[3]==0
assert fg.getchannel('A').getbbox()[2]-fg.getchannel('A').getbbox()[0]>=280
print('PASS: launcher adaptive safe-zone, photo/video zoom crop, compact APK controls')
