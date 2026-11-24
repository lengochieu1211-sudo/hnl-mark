import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PHOTO_FILTERS,photoFilterCss} from '../studio-ui/src/services/smartErase.ts';
const neutral={brightness:100,contrast:100,saturation:100};
const baseline=photoFilterCss(neutral);
assert.equal(PHOTO_FILTERS.length,13);
assert.equal(new Set(PHOTO_FILTERS.map(x=>x.id)).size,13);
for(const p of PHOTO_FILTERS){
 assert.equal(photoFilterCss({...neutral,photoFilter:p.id,filterStrength:0}),baseline);
 if(p.id!=='original')assert.notEqual(photoFilterCss({...neutral,photoFilter:p.id,filterStrength:100}),baseline);
}
assert.equal(photoFilterCss({...neutral,photoFilter:'unknown'}),baseline);
assert.match(photoFilterCss({...neutral,photoFilter:'mono',filterStrength:50}),/grayscale\(50%\)/);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const editor=read('studio-ui/src/components/editor/ImageEditorScreen.tsx'),preview=read('studio-ui/src/components/watermark/PhotoPreview.tsx'),render=read('studio-ui/src/services/timemarkRenderer.ts');
assert.ok(editor.includes('photoFilterCss(edits)')&&preview.includes('photoFilterCss(edits)'));
assert.ok(editor.includes("photoFilter:'original',filterStrength:0")&&preview.includes("photoFilter:'original',filterStrength:0"));
assert.ok(render.indexOf('createEditedCanvas(bitmap,edits)')<render.lastIndexOf('drawOriginalTimemark('));
assert.equal(PHOTO_FILTERS[1].id,'hnl-vd3');
assert.match(photoFilterCss({...neutral,photoFilter:'hnl-vd3',filterStrength:100}),/contrast\(123%\).*saturate\(125%\)/);
console.log('PASS: 13 offline photo presets, intensity, legacy fallback, preview/export wiring');
