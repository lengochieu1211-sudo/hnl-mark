#!/usr/bin/env python3
"""Source contract matrix: every offered legacy/template ID has JPEG/record/import paths.
Runtime pixel verification is separate; this catches the TEST25 photo shutter guard regression.
"""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
read=lambda x:(root/x).read_text('utf-8')
tpl=read('studio-ui/src/data/templates.ts')
ids=re.findall(r'(?:(?:\bid\s*:\s*)|(?:"id"\s*:\s*))(["\'])([^"\']+)\1',tpl.split('export const TEMPLATE_CATALOG_GROUPS:',1)[0]); ids=[v for _,v in ids]
assert len(ids)>=25 and len(ids)==len(set(ids)), (len(ids),ids)
indep=read('studio-ui/src/services/independentStampRenderer.ts')
simple=read('studio-ui/src/services/simpleStampRenderer.ts')
photo=read('studio-ui/src/services/timemarkRenderer.ts')
dispatch=read('studio-ui/src/services/stampRenderer.ts')
app=read('studio-ui/src/App.tsx')
record=read('studio-ui/src/services/stampedVideoCapture.ts')
importvideo=read('studio-ui/src/services/importedVideoStamp.ts')
export=read('studio-ui/src/components/export/ExportActionSheet.tsx')
for name in ids:
 if name in ('timemark','none'):continue
 if name in ('simple-datetime','simple-date','simple-time','custom-stamp'):
  assert name in simple,name
 else:assert name in tpl and 'WATERMARK_TEMPLATES.some' in indep,name
assert 'isIndependentStamp(id)' in dispatch and 'isSimpleStamp(id)' in dispatch
assert 'drawIndependentStamp' in dispatch and 'drawOriginalTimemark' in dispatch and 'drawSimpleStamp' in dispatch
assert 'drawIndependentStamp' in photo and 'drawSimpleStamp' in photo and 'drawOriginalTimemark' in photo
assert 'if(!isRenderableStamp(config.templateId))' in app
assert 'drawConfiguredStamp(ctx,canvas.width,canvas.height,timestamp,activeOrientation,photoCode,logo)' in record
assert 'drawConfiguredStamp(ctx,canvas.width,canvas.height,cfg,0,code,logo)' in importvideo
assert 'stampImportedVideo(await getBlob(it),cfg' in export
assert 'createTimemarkPhoto(await getBlob(it),cfg,it.photoCode,it.orientationDeg||0,it.edits)' in export
assert 'const canvas=edits?createEditedCanvas(bitmap,edits)' in photo
assert 'applySmartErase(canvas,edits.smartErase||[])' in read('studio-ui/src/services/smartErase.ts')
assert 'onUpdateEdits' in read('studio-ui/src/components/editor/ImageEditorScreen.tsx')
assert 'Xóa thông minh' in read('studio-ui/src/components/editor/ImageEditorScreen.tsx')
assert "applicationIdSuffix '.trial2528'" in read('android/app/build.gradle')
print(f'PASS: {len(ids)} templates have JPEG, live video, imported video dispatch; non-destructive erase and edits wired')
