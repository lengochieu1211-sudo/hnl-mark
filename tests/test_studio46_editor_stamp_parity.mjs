import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {editedRasterSize,paintStampPreview} from '../studio-ui/src/services/stampPreviewGeometry.ts';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const editor=read('studio-ui/src/components/editor/ImageEditorScreen.tsx');
const photo=read('studio-ui/src/components/watermark/PhotoPreview.tsx');
const overlay=read('studio-ui/src/components/watermark/WatermarkOverlay.tsx');
const renderer=read('studio-ui/src/services/timemarkRenderer.ts');
// The photo editor must not force 'custom' when the user chose a classic corner.
assert.doesNotMatch(editor,/config=\{\{\s*\.\.\.watermarkConfig,\s*positionPreset:\s*['"]custom['"]\s*\}\}/);
assert.match(editor,/config=\{watermarkConfig\}/);
assert.match(editor,/editedRasterSize\(sourceSize\.width,sourceSize\.height,edits\)/);
assert.match(editor,/referenceSize=\{stampReferenceSize\}/);
assert.match(editor,/photoCode=\{media\.photoCode\}/);
assert.match(editor,/orientationDeg=\{media\.orientationDeg\|\|0\}/);
assert.match(photo,/editedRasterSize\(originalSize\.width,originalSize\.height,edits\)/);
assert.match(overlay,/config\.templateId === 'timemark'/);
assert.match(renderer,/case 'custom'/);
for(const [width,height,cropRatio,rotationDeg,expectWidth,expectHeight] of [
 [3024,4032,'free',0,3024,4032],
 [3024,4032,'1:1',0,3024,3024],
 [4032,3024,'3:4',0,2268,3024],
 [4032,3024,'free',90,3024,4032],
 [3024,4032,'16:9',180,3024,1701],
 [3024,4032,'free',270,4032,3024],
]){
 const raster=editedRasterSize(width,height,{cropRatio,rotationDeg});
 assert.deepEqual(raster,{width:expectWidth,height:expectHeight});
}
// The same source pixels at different editor sizes produce identical normalized
// coordinates and no X/Y stretching. Test landscape and portrait editor frames.
globalThis.window={devicePixelRatio:2};
for(const [w,h,W,H] of [[300,400,3024,4032],[360,480,3024,4032],[400,300,4032,3024],[800,600,4032,3024]]){
 let matrix=null,drawn=null;
 const canvas={getContext:()=>({setTransform:(...args)=>{matrix=args;}})};
 paintStampPreview(canvas,{clientWidth:w,clientHeight:h},{width:W,height:H},(_ctx,rw,rh)=>{drawn={width:rw,height:rh};});
 assert.deepEqual(drawn,{width:W,height:H});
 assert.equal(matrix[0],matrix[3]);
 assert.equal(matrix[1],0);assert.equal(matrix[2],0);
 assert.ok(Math.abs(matrix[4])<1e-7&&Math.abs(matrix[5])<1e-7);
}
console.log('PASS TEST46: editor preserves stamp preset, output raster geometry and nonstretched preview');
