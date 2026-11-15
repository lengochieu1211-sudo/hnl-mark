import assert from 'node:assert/strict';
import {
 scannerPointAtPointer,scannerCornerWithOffset,scannerLoupeImageRect,scannerLoupeViewportPosition,
 SCANNER_LOUPE_IMAGE_SIZE,SCANNER_LOUPE_OUTER_SIZE
} from '../studio-ui/src/services/scannerMagnifier.ts';

const near=(a,b,name)=>assert.ok(Math.abs(a-b)<1e-9,`${name} ${a} != ${b}`);
let scenarios=0;
for(const rect of [
 {left:13,top:122,width:320,height:480}, // vertical page and scroll offset
 {left:120,top:90,width:480,height:240}, // landscape page
 {left:24,top:46,width:101,height:510}, // extremely narrow paper
 {left:0,top:0,width:300,height:300}, // square
]){
 for(const x of [.001,.02,.11,.5,.82,.98,.999])for(const y of [.001,.03,.42,.73,.975,.999]){
  const touch={clientX:rect.left+x*rect.width,clientY:rect.top+y*rect.height};
  const p=scannerPointAtPointer(touch,rect);
  near(p.x,x,'normalized x');near(p.y,y,'normalized y');
  const draw=scannerLoupeImageRect(p,rect.width,rect.height);
  near((SCANNER_LOUPE_IMAGE_SIZE/2-draw.left)/draw.width,x,'crosshair x');
  near((SCANNER_LOUPE_IMAGE_SIZE/2-draw.top)/draw.height,y,'crosshair y');
  near(draw.width/rect.width,4.5,'zoom x');near(draw.height/rect.height,4.5,'zoom y');
  // Large 4-corner touch handle must not jump when fingertip lands off-center.
  const offset={x:.03,y:-.035};
  const drag=scannerCornerWithOffset(touch,rect,offset);
  near(drag.x,Math.max(.001,Math.min(.999,x+offset.x)),'preserve x offset');
  near(drag.y,Math.max(.001,Math.min(.999,y+offset.y)),'preserve y offset');
  scenarios++;
 }
}
for(const [w,h] of [[320,640],[360,740],[854,393],[740,360],[1200,800]]){
 for(const x of [0,1,w/2,w-1,w])for(const y of [0,1,h/2,h-1,h]){
  const v=scannerLoupeViewportPosition({clientX:x,clientY:y},w,h);
  assert.ok(v.left>=8&&v.left+SCANNER_LOUPE_OUTER_SIZE<=w-8,'loupe must stay within screen x');
  assert.ok(v.top>=8&&v.top+SCANNER_LOUPE_OUTER_SIZE<=h-8,'loupe must stay within screen y');
  scenarios++;
 }
}
// The old CSS background-position algorithm pulled border samples toward the center:
// at x=.02 and 4.5x zoom, the apparent crosshair sampled ~12.7% not 2%.
const oldCssSample=(x,zoom)=>((.5+(zoom-1)*x)/zoom);
assert.ok(Math.abs(oldCssSample(.02,4.5)-.02)>.10,'regression must cover the original edge-offset bug');
console.log(`PASS TEST36 scanner magnifier: ${scenarios} geometry/viewport combinations; 4.5x, all corners, aspect ratios, offset touch, no clip`);
