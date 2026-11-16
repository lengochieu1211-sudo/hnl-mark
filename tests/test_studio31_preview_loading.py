#!/usr/bin/env python3
"""TEST31: gallery must not get stuck in loading preview on Android WebView."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
text=(root/'studio-ui/src/components/watermark/PhotoPreview.tsx').read_text('utf8')
assert 'const needsProcessing=' in text
assert 'if(needsProcessing){' in text, 'Unedited images must skip canvas JPEG conversion'
assert 'const originalUrl=media.rawBlob?URL.createObjectURL(media.rawBlob):media.url;' in text
assert 'setPhoto({key,url:originalUrl,width:0,height:0,original});' in text
assert 'setPending(false);' in text
assert 'role="alert"' in text and 'Thử lại' in text
assert 'onLoad={handleLoaded}' in text
assert 'objectFit:ready?' in text and 'fittedW' in text and 'fittedH' in text
assert 'if(!original)throw Error' in text, 'Do not double stamp exported JPEG if original missing'
assert 'URL.revokeObjectURL(originalUrl)' in text
print('PASS TEST31 original-first preview, skip unneeded processing, recoverable fallback')
