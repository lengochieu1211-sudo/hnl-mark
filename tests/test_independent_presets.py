#!/usr/bin/env python3
from pathlib import Path
import re
p=Path(__file__).resolve().parents[1]
html=(p/'index.html').read_text(encoding='utf-8')
js=(p/'app.js').read_text(encoding='utf-8')
css=(p/'style.css').read_text(encoding='utf-8')
styles=['site-log','inspection','shift','geo','survey','blueprint','bottom-strip','memory','led','journey','corner','metadata']
assert len(styles)==12
for s in styles:
    assert html.count('data-preset="'+s+'"')==1,s
    assert re.search(r"'"+re.escape(s)+r"'",js),s
assert 'drawIndependentStamp(g,W,H,p)' in js
assert 'INDEPENDENT_PRESETS.has(config.preset)' in js
assert 'if(config.showFooter && style!==\'bottom-strip\')drawIndependentFooter' in js
assert 'ID '+"'+photoSerial(p)" in js
assert '<details id="presetExtra"' in html
assert '.preset-extra>summary' in css
assert 'versionCode 2511' in (p/'android/app/build.gradle').read_text()
print('PASS: 12 independent photo/video timestamp presets, legacy path preserved')
