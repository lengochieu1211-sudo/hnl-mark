import assert from 'node:assert/strict';
import {startLivePhotoEnhance,liveHDGeometry} from '../studio-ui/src/services/livePhotoEnhance.ts';
import {enhanceRowsV2,resolvePhotoEnhance,PHOTO_FILTERS} from '../studio-ui/src/services/smartErase.ts';
assert.deepEqual(liveHDGeometry(3840,2160,5),{sx:1536,sy:864,sw:768,sh:432,width:720,height:405});
assert.deepEqual(liveHDGeometry(1920,1080,5),{sx:768,sy:432,sw:384,sh:216,width:384,height:216});
assert.equal(liveHDGeometry(2160,3840,5).height,720);
let tick=0,cost=50,seq=0,draw=0,errors=0,lastArgs,throwDraw=false;
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>tick}});
const timers=new Map();
globalThis.window={setTimeout(fn){timers.set(++seq,fn);return seq;},clearTimeout(id){timers.delete(id);}};
globalThis.document={hidden:false};
const video={readyState:2,videoWidth:3840,videoHeight:2160,currentTime:1};
const ctx={filter:'none',drawImage(...args){if(throwDraw)throw Error('fake draw failure');draw++;lastArgs=args.slice(1);},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4).fill(128)};},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){tick+=cost;}};
const canvas={style:{},width:0,height:0,getContext:()=>ctx};
let settings={edits:resolvePhotoEnhance({enhance:{skinSmooth:10}}),exposure:1,zoom:1};
const next=()=>{assert.equal(timers.size,1);const [k,f]=timers.entries().next().value;timers.delete(k);f();};
const advance=()=>{video.currentTime++;next();};
const stop=startLivePhotoEnhance(video,canvas,()=>settings,()=>errors++);
assert.equal(draw,1);assert.equal(canvas.style.visibility,'visible');assert.equal(canvas.width,720);
next();assert.equal(draw,1);
settings={...settings,zoom:5};next();assert.equal(draw,2);assert.equal(lastArgs[2],768);assert.equal(lastArgs[3],432);
settings={...settings,edits:resolvePhotoEnhance({enhance:{skinSmooth:100}})};next();assert.equal(draw,3);
advance();assert.equal(canvas.width,600); // three costly frames lower preview cap, not the saved image
cost=0;for(let i=0;i<21;i++)advance();assert.equal(canvas.width,720);
document.hidden=true;const oldDraw=draw;next();assert.equal(draw,oldDraw);assert.equal(canvas.style.visibility,'hidden');
document.hidden=false;next();assert.equal(canvas.style.visibility,'visible');
video.readyState=1;next();assert.equal(canvas.style.visibility,'hidden');
video.readyState=2;next();assert.equal(canvas.style.visibility,'visible');
throwDraw=true;advance();assert.equal(errors,1);assert.equal(timers.size,0);assert.equal(canvas.style.visibility,'hidden');stop();
const noContext=startLivePhotoEnhance(video,{style:{},getContext:()=>null},()=>settings,()=>errors++);assert.equal(errors,2);noContext();
let seed=19;for(const [w,h] of [[1,1],[3,5],[2000,7],[3840,5]]){
 const pixels=new Uint8ClampedArray(w*h*4);for(let i=0;i<pixels.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels[i]=seed>>>24;}
 const original=pixels.slice();
 for(const p of PHOTO_FILTERS){const e=resolvePhotoEnhance({photoFilter:p.id}),a=new Uint8ClampedArray(pixels.length),b=new Uint8ClampedArray(pixels.length);
  enhanceRowsV2(pixels,w,h,0,h,a,e);
  for(let y=0;y<h;y+=2){const n=Math.min(2,h-y);enhanceRowsV2(pixels,w,h,y,n,b.subarray(y*w*4,(y+n)*w*4),e);}
  assert.deepEqual(a,b);for(let i=3;i<a.length;i+=4)assert.equal(a[i],pixels[i]);}
 assert.deepEqual(pixels,original);
}
console.log('PASS TEST75 runtime mock: zoom crop, one loop, adaptive cap, slider refresh, hidden/resume, failure cleanup; 100 row-chunk parity checks');
