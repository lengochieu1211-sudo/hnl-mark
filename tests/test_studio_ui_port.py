#!/usr/bin/env python3
"""Static regression for the AI Studio UI shell — does not claim Android runtime."""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
read=lambda p:(R/p).read_text(encoding='utf-8')
html=read('index.html')
js=read('hnl-studio-ui.js')
css=read('hnl-studio-ui.css')
bundler=read('android/scripts/package_web.py')
core=read('app.js')
gradle=read('android/app/build.gradle')
assert 'hnl-studio-ui.js?v=20261114' in html
assert 'hnl-studio-ui.css?v=20261114' in html
assert '"hnl-studio-ui.css", "hnl-studio-ui.js"' in bundler
assert 'HNLStudioUI' in js and 'syncVideoPanel' in js
assert "body.dataset.hnlStudioVideo" in js
assert 'data-hnl-studio-video="on"' in css
assert 'Timemark Verified' in core and 'Timemark' in core
assert 'tm-01' not in js and 'Placeholder' not in js
assert 'body.hnl-studio-ui.hnl-android-apk .workspace > .viewer' in css
assert "versionName '2.5.19-studio-test'" in gradle
assert "applicationIdSuffix '.trial2519'" in gradle
print("PASS: Studio UI real-engine connections, video visibility, Timemark preservation, TEST13 isolation")
