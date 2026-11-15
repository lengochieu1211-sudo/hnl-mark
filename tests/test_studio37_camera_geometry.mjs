import assert from 'node:assert/strict';
import {cameraCenterCrop,outputAspect,cropCapturedCanvas} from '../studio-ui/src/services/cameraFrameGeometry.ts';
import {capturedPhotoTurn,orientedFrameSize} from '../studio-ui/src/services/capturedPhotoOrientation.ts';
import {resolveStampOrientation} from '../studio-ui/src/services/stampOrientation.ts';
let scenarios=0;
for(const [w,h] of [[1920,1080],[1080,1920],[800,800],[720,1280],[4032,3024]]){
 for(const mode of ['full','1:1','4:3','16:9']){
  const aspect=outputAspect(mode,w,h),crop=cameraCenterCrop(w,h,aspect);
  assert.ok(crop.x>=0&&crop.y>=0&&crop.x+crop.width<=w+1e-8&&crop.y+crop.height<=h+1e-8);
  assert.ok(Math.abs(crop.width/crop.height-aspect)<1e-8);
  assert.ok(Math.abs(crop.x*2+crop.width-w)<1e-8);
  assert.ok(Math.abs(crop.y*2+crop.height-h)<1e-8);
  scenarios++;
 }
}
for(const [physical,display,turn] of [[0,0,0],[90,0,90],[270,0,-90],[180,0,180],[180,180,0]]){
 const stamp=resolveStampOrientation(physical,display);
 const result=capturedPhotoTurn(720,1280,physical,stamp);
 assert.equal(result,turn,`Physical ${physical} display ${display}`);
 assert.ok(orientedFrameSize(720,1280,result).width>0);
 scenarios++;
}
const ctx=[];const saved=globalThis.document;
try{
 globalThis.document={createElement(name){assert.equal(name,'canvas');const canvas={width:0,height:0,getContext(){return {drawImage(...args){ctx.push(args);}}}};return canvas;}};
 for(const [w,h,mode] of [[1920,1080,'4:3'],[1080,1920,'16:9'],[1280,720,'1:1']]){
  const out=cropCapturedCanvas({width:w,height:h},mode);
  assert.ok(out.width>0&&out.height>0);
  assert.ok(Math.abs(out.width/out.height-outputAspect(mode,w,h))<.005);
  assert.equal(ctx.at(-1).length,9);
  scenarios++;
 }
}finally{globalThis.document=saved;}
console.log(`PASS TEST37: ${scenarios} camera crop/180 sensor+display cases; preview ratio must still be verified on real phone`);
