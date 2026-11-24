#!/usr/bin/env python3
"""TEST30 source regression; runtime and actual Xiaomi validation remain separate."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def read(name):return (root/name).read_text('utf-8')
preview=read('studio-ui/src/components/watermark/PhotoPreview.tsx')
editor=read('studio-ui/src/components/editor/ImageEditorScreen.tsx')
assert "media.rawBlob||await(await fetch(media.url)).blob()" in preview
assert 'createEditorPreview(source,processingEdits,false,compact?480:1440)' in preview
assert 'filter:photoFilterCss(edits)' in preview
assert 'photoFilterCss(edits)' in editor
assert 'mediaWatermarkConfig({...config,...media.captureWatermark,...media.watermarkOverride},media)' in preview
assert 'fittedW' in preview and 'fittedH' in preview
assert 'structureKey=JSON.stringify' in editor
assert '[media.id,media.rawBlob,structureKey]' in editor
assert "filter:activeTab==='erase'?'none'" in editor
assert 'containerRef={imageRectRef}' in editor
assert 'onLoad={e=>{const w=e.currentTarget.naturalWidth' in editor
for path in ['components/home/HomeScreen.tsx','components/stamps/StampsAndSettingsScreen.tsx','components/library/LibraryScreen.tsx','components/library/CameraRollScreen.tsx','components/export/ExportScreen.tsx']:
 assert '<PhotoPreview' in read('studio-ui/src/'+path),path
orientation=read('studio-ui/src/services/capturedPhotoOrientation.ts')
assert 'capturedPhotoTurn(' in orientation and 'orientCapturedCanvas(' in orientation
cam=read('studio-ui/src/components/camera/CameraApkScreen.tsx')
assert 'capturedPhotoTurn(canvas.width,canvas.height,' in cam
assert 'const output=cropCapturedCanvas(orientCapturedCanvas(canvas,quarter),aspectRatio)' in cam
assert 'orientationDeg:0, captureWatermark:' in cam
assert '<PhotoPreview compact media={latestItem}' in cam
assert 'resolveStampOrientation(angle,screen)' in cam # live stamp logic unchanged
__import__('version_contract').assert_build_identity()
print('PASS TEST30 instant image color via CSS, non-destructive shared preview on 5 screens, photo-pixel orientation')
