import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {paintStampPreview} from '../studio-ui/src/services/stampPreviewGeometry.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const camera=read('studio-ui/src/components/camera/CameraApkScreen.tsx');
const original=read('studio-ui/src/components/watermark/OriginalTimemarkOverlay.tsx');
const photo=read('studio-ui/src/components/watermark/PhotoPreview.tsx');
const video=read('studio-ui/src/services/stampedVideoCapture.ts');
assert.match(camera,/<WatermarkOverlay config=\{watermarkConfig\} orientationDeg=\{watermarkTurn\}\s+photoCode=\{capturePreviewCode\}\/>/);
assert.doesNotMatch(camera,/cameraStampReference|previewRasterTurn|framedRaster/);
assert.doesNotMatch(camera,/referenceSize=\{cameraStampReference\}/);
assert.match(original,/paintStampPreview\(canvas,parent,referenceSize/);
assert.match(photo,/referenceSize=\{referenceSize\}/);
assert.match(video,/ctx\.scale\(fillScale,fillScale\)/);
globalThis.window={devicePixelRatio:2};
for(const [w,h] of [[360,640],[640,360],[393,873],[873,393],[800,600]]){
 const calls=[];const ctx={setTransform:(...args)=>calls.push(args)};
 const canvas={getContext:()=>ctx};let pw=0,ph=0;
 paintStampPreview(canvas,{clientWidth:w,clientHeight:h},undefined,(_ctx,width,height)=>{pw=width;ph=height;});
 assert.equal(pw,w);assert.equal(ph,h);
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],calls[0][3],'never stretch timestamp in landscape');
 assert.equal(calls[0][1],0);assert.equal(calls[0][2],0);
 assert.equal(canvas.width,w*2);assert.equal(canvas.height,h*2);
}
console.log('PASS TEST45: classic TEST35 viewfinder, nonstretched 0/90/180; export unchanged');
