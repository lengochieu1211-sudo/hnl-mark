import assert from 'node:assert/strict';
import {scannerLiveContainRect,scannerLiveSourceCrop,scannerLiveQuadDelta,scannerLiveBlendQuad}
 from '../studio-ui/src/services/scannerLiveEdges.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`not close ${a} and ${b}`);
let scenarios=0;
for(const [viewportW,viewportH] of [[360,740],[720,360],[390,844],[300,300],[854,393]]){
 for(const [rawW,rawH] of [[1920,1080],[1080,1920],[2560,1920],[1920,2560]]){
  const c=scannerLiveContainRect(viewportW,viewportH,rawW,rawH);
  assert.ok(c);close(c.left+c.width/2,viewportW/2);close(c.top+c.height/2,viewportH/2);
  close(c.width/c.height,rawW/rawH);
  assert.ok(c.left>=0&&c.top>=0&&c.left+c.width<=viewportW+1e-8&&c.top+c.height<=viewportH+1e-8);
  for(const zoom of [1,1.5,2,4]){
   const crop=scannerLiveSourceCrop(rawW,rawH,zoom);
   close(crop.left+crop.width/2,rawW/2);close(crop.top+crop.height/2,rawH/2);
   close(crop.width,rawW/zoom);close(crop.height,rawH/zoom);
   // The screen position of a source point after CSS zoom equals the
   // position of that point in the cropped image drawn in object-contain rect.
   for(const t of [.25,.42,.5,.64,.75]){
    const sourceX=crop.left+crop.width*t;
    const screenViaCss=c.left+c.width/2+(sourceX/rawW-.5)*c.width*zoom;
    const screenViaCrop=c.left+c.width*t;
    close(screenViaCss,screenViaCrop);
   }
   scenarios++;
  }
 }
}
const q=[{x:.1,y:.1},{x:.9,y:.1},{x:.9,y:.9},{x:.1,y:.9}];
const tiny=q.map(p=>({x:p.x+.01,y:p.y-.01}));
assert.ok(scannerLiveQuadDelta(q,tiny)<.085);
assert.ok(scannerLiveQuadDelta(q,[{x:.3,y:.3},{x:.7,y:.3},{x:.7,y:.7},{x:.3,y:.7}])>.085);
const blend=scannerLiveBlendQuad(q,tiny,.5);close(blend[0].x,.105);close(blend[0].y,.095);
assert.equal(scannerLiveContainRect(0,100,1920,1080),null);
assert.throws(()=>scannerLiveSourceCrop(0,1080,2));
console.log(`PASS TEST40 Live Edge: ${scenarios} contain/crop/zoom geometry cases + stable quad confidence math`);
