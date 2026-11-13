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
assert '.video-studio .video-ios-controls .video-icon[hidden]' in css
# New V2.2.0 preferences and crop settings must be complete DOM controls.
for name in ['cropRatio','cropCenter','videoResolution','videoBitrate','videoFps','videoStampSize','videoRotate180','quality','outputSize','outputFormat','fontFamily','fontWeight']:
    assert name in by_id, 'Missing control: '+name
assert html.count('data-preset="none"')==1
for style in ('clean','tech','cinema','compact','clock'):
    assert html.count('data-preset="'+style+'"')==1
for n in ('1:1','4:3','3:4','3:2','2:3','16:9','9:16','4:5','5:4','21:9'):
    assert '<option value="'+n+'">' in html
assert 'crop-ratios.js?v=2.2.0' in html
assert "if(config.preset==='none')return" in photo
assert 'function drawModernStamp(' in photo
assert "window.HNLCropRatio.fromDrag" in photo
assert "window.HNLCropRatio.center" in photo
assert "Number($('videoStampSize').value)/100" in video
assert "videoBitsPerSecond:Number($('videoBitrate').value)" in video
assert "canvas.captureStream(Number($('videoFps').value)" in video
assert "window.HNLVideoOrientation.videoTurn" in video
assert 'videoSettingsToggle' in by_id and 'videoQualityPanel' in by_id
assert 'toggleVideoSettings' in video and 'closeVideoSettings' in video
assert '.video-settings-button' in css
assert '.video-quality-panel' in css and '.crop-ratio-options' in css

# Camera UI regression reported on Android: VIDEO was 18px while ẢNH was 11px.
# The newer ID-targeting rules must take precedence over the legacy override.
import re
fix_css=css.split('/* v2.2.1 — mode labels and rotation icons:')[1]
assert '.camera-ios-modes #photoToVideo' in fix_css
assert '.video-ios-modes #videoPhotoMode' in fix_css
assert 'font-size:12px!important' in fix_css
assert 'font-size:10px!important' in fix_css
assert 'flex:0 0 64px!important' in fix_css
assert 'flex:0 0 45px!important' in fix_css
def button_icon(id):
    match=re.search(r'<button[^>]*\\bid="'+id+r'"[^>]*>(.*?)</button>', html, re.S)
    assert match, 'Missing camera rotate button '+id
    svg=re.search(r'<svg.*?</svg>',match.group(1), re.S)
    assert svg, 'SVG missing from '+id
    return svg.group(0)
photo_rotate=button_icon('rotateCameraOverlay')
video_rotate=button_icon('videoRotate')
assert photo_rotate==video_rotate, 'Photo and video rotate glyphs must match'
assert 'M21 12a9 9 0 1 1-9-9' in photo_rotate
assert 'M21 3v5h-5' in photo_rotate

print('PASS: one combined picker, symmetric photo/video shutter, modes and all V2.2 media controls and corrected icons')
