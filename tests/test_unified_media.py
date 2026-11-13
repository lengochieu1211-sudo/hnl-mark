"""HNLMark 2.1.2 regression: ONE import button and centered photo/video shutter."""
from html.parser import HTMLParser
from pathlib import Path
from collections import Counter

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'style.css').read_text(encoding='utf-8')
photo = (root / 'app.js').read_text(encoding='utf-8')
video = (root / 'video.js').read_text(encoding='utf-8')

class Inspect(HTMLParser):
    VOID = {'input','img','link','meta','br','hr','source','area','base','embed','param','wbr'}
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
        self.ids = []
    def handle_starttag(self, tag, attrs):
        props = dict(attrs)
        if props.get('id'):
            self.ids.append((props['id'], tag, set(' '.join(x[1].get('class') or '' for x in self.stack).split()), props))
        if tag not in self.VOID:
            self.stack.append((tag, props))
    def handle_endtag(self, tag):
        if tag in self.VOID: return
        if not self.stack or self.stack[-1][0] != tag:
            self.errors.append((tag, self.stack[-1][0] if self.stack else None))
        elif self.stack:
            self.stack.pop()

doc = Inspect();doc.feed(html)
assert not doc.errors and not doc.stack, (doc.errors,doc.stack[-5:])
counts = Counter(item[0] for item in doc.ids)
assert all(count == 1 for count in counts.values()), counts
by_id = {item[0]:item for item in doc.ids}
required = ['dropzone','photoInput','openCamera','photoLibraryArea','videoPanel',
            'videoStudio','videoResult','photoToVideo','videoPhotoMode',
            'cameraControls','videoRecord','videoStop','shutterButton',
            'cameraLibrary','flipCamera','videoFileShortcut','videoFlip']
assert all(name in by_id for name in required), [name for name in required if name not in by_id]
for name in ['dropzone','photoInput','openCamera','photoLibraryArea','videoPanel']:
    assert 'import-panel' in by_id[name][2], name + ' must be in first panel'
assert 'multiple' in by_id['photoInput'][3]
assert 'image/*' in by_id['photoInput'][3]['accept']
assert 'video/*' in by_id['photoInput'][3]['accept']
assert 'Chọn ảnh / video' in html
assert 'Mở camera' in html
assert html.index('id="openCamera"') < html.index('id="photoLibraryArea"')
assert 'hidden' in by_id['videoPanel'][3]
for old in ('mediaModePhoto','mediaModeVideo','videoPicker','openVideoCamera','videoFileInput'):
    assert old not in by_id, 'Redundant picker or camera button: '+old
assert html.index('id="cameraLibrary"') < html.index('id="shutterButton"') < html.index('id="flipCamera"')
assert html.index('id="videoFileShortcut"') < html.index('id="videoRecord"') < html.index('id="videoFlip"')
assert 'grid-template-columns:minmax(0,1fr) 70px minmax(0,1fr)' in css
assert 'grid-column:2!important;grid-row:1!important' in css
assert 'camera-ios-modes' in html and 'video-ios-modes' in html
assert "window.HNLVideoStudio={importVideo:" in video
assert "routeMediaFiles(files)" in photo
assert "if(next==='photo'&&outputBlob&&!outputSaved" in video
assert "drawShieldCheck(g,f*1.2,config.serialColor)" in photo
assert 'HNLVideoBridge' in photo and 'drawStamp' in video
assert '.media-combined-actions' in css
print('PASS: one combined picker, symmetric photo/video shutter, modes and existing badge')
