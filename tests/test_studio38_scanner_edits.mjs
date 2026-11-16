import assert from 'node:assert/strict';
import {scanPointAfterOps,scanQuadAfterOp,scanAffine,scanOrientedSize,normalizeScanOps,safeScanOps,adjustScanRgb,DEFAULT_SCAN_COLOR} from '../studio-ui/src/services/scannerEdits.ts';
const base=[{x:.12,y:.09},{x:.89,y:.11},{x:.9,y:.9},{x:.1,y:.88}];
const unit=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
let cases=0;
for(const op of ['cw','ccw','flip-h','flip-v']){
 const corners=scanQuadAfterOp(base,op);
 assert.equal(corners.length,4);
 assert.ok(corners.every(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1));
 for(let n=0;n<4;n++){
  const m=scanPointAfterOps(base[n],[op]);
  assert.ok(corners.some(p=>Math.hypot(p.x-m.x,p.y-m.y)<1e-10));
 }
 cases++;
}
const ops=['cw','cw','flip-h','ccw','flip-v','cw','flip-h','cw','flip-v','ccw'];
for(let i=0;i<ops.length;i++){
 const history=ops.slice(0,i+1);
 const simple=normalizeScanOps(history);
 assert.ok(simple.length<=2,'canonical transform must be finite');
 for(const p of unit){const a=scanPointAfterOps(p,history),b=scanPointAfterOps(p,simple);assert.deepEqual(a,b);}
 const size=scanOrientedSize(1280,720,simple);
 const affine=scanAffine(1280,720,simple);
 for(const p of unit){
  const expected=scanPointAfterOps(p,simple);
  const px=p.x*1280,py=p.y*720;
  assert.ok(Math.abs((affine[0]*px+affine[2]*py+affine[4])/size.width-expected.x)<1e-9);
  assert.ok(Math.abs((affine[1]*px+affine[3]*py+affine[5])/size.height-expected.y)<1e-9);
 }
 cases++;
}
assert.deepEqual(safeScanOps(['bad','cw','cw','cw','cw']),[]);
assert.deepEqual(adjustScanRgb(40,120,200,DEFAULT_SCAN_COLOR).map(Math.round),[40,120,200]);
const dark=adjustScanRgb(80,80,80,{brightness:50,contrast:100,saturation:100});
assert.ok(dark[0]<80);
const gray=adjustScanRgb(80,120,200,{brightness:100,contrast:100,saturation:0});
assert.ok(Math.abs(gray[0]-gray[1])<1e-9&&Math.abs(gray[1]-gray[2])<1e-9);
console.log(`PASS TEST38 Scanner orientation/color: ${cases} transform matrices, pixel geometry and non-destructive edit model`);
