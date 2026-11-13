"""HNLMark 2.1.1 regression: one first-panel media picker and shared badge."""
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
required = ['mediaModePhoto','mediaModeVideo','dropzone','photoInput',
            'videoPicker','videoFileInput','openCamera','openVideoCamera',
            'photoLibraryArea','videoPanel','videoStudio','videoResult',
            'photoToVideo','cameraControls']
assert all(name in by_id for name in required), [name for name in required if name not in by_id]
for name in ['mediaModePhoto','mediaModeVideo','dropzone','videoPicker','openCamera',
             'openVideoCamera','photoLibraryArea','videoPanel']:
    assert 'import-panel' in by_id[name][2], name + ' is not in first panel'
assert html.index('id="mediaModeVideo"') < html.index('id="photoLibraryArea"')
assert html.index('id="openVideoCamera"') < html.index('id="videoPanel"')
assert 'hidden' in by_id['videoPanel'][3]
assert 'hidden' in by_id['videoPicker'][3]
assert 'hidden' in by_id['openVideoCamera'][3]
assert 'id="videoPanel"' in html and 'class="panel video-panel"' not in html
assert 'updateMediaPicker()' in video and "selectedMedia='photo'" in video
assert "if(next==='photo'&&outputBlob&&!outputSaved" in video
assert "drawShieldCheck(g,f*1.2,config.serialColor)" in photo
assert 'HNLVideoBridge' in photo and 'drawStamp' in video
assert '.media-top-actions [hidden]' in css and '.video-studio[hidden]' in css
print('PASS: shared photo/video first-panel actions, hidden panels, output guard, unified shield badge')
