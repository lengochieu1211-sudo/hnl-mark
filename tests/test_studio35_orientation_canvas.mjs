import assert from 'node:assert/strict';
import {capturedPhotoTurn,orientCapturedCanvas,orientedFrameSize} from '../studio-ui/src/services/capturedPhotoOrientation.ts';
import {resolveStampOrientation} from '../studio-ui/src/services/stampOrientation.ts';
const cases=[
  {name:'portrait',w:720,h:1280,p:0,d:0,angle:0,dims:[720,1280]},
  {name:'landscape-right-locked',w:720,h:1280,p:90,d:0,angle:90,dims:[1280,720]},
  {name:'landscape-left-locked',w:720,h:1280,p:270,d:0,angle:-90,dims:[1280,720]},
  {name:'landscape-right-auto',w:1280,h:720,p:90,d:270,angle:0,dims:[1280,720]},
  {name:'landscape-left-auto',w:1280,h:720,p:270,d:90,angle:0,dims:[1280,720]},
];
const priorDocument=globalThis.document;
try{
  const contexts=[];
  globalThis.document={createElement(tag){assert.equal(tag,'canvas');const operations=[];const canvas={width:0,height:0,getContext(){return {translate(...args){operations.push(['translate',...args]);},rotate(v){operations.push(['rotate',v]);},drawImage(...args){operations.push(['drawImage',...args]);}}}};contexts.push({canvas,operations});return canvas;}};
  for(const c of cases){
    const live=resolveStampOrientation(c.p,c.d);
    const angle=capturedPhotoTurn(c.w,c.h,c.p,live);
    assert.equal(angle,c.angle,c.name);
    const dims=orientedFrameSize(c.w,c.h,angle);
    assert.deepEqual([dims.width,dims.height],c.dims,c.name);
    const src={width:c.w,height:c.h};
    const output=orientCapturedCanvas(src,angle);
    if(angle===0){assert.equal(output,src);continue;}
    assert.equal(output.width,dims.width);
    assert.equal(output.height,dims.height);
    const trace=contexts.at(-1).operations;
    assert.equal(trace[0][0],'translate',c.name);
    assert.ok(Math.abs(trace[1][1]-angle*Math.PI/180)<1e-10,c.name);
    assert.equal(trace[2][0],'drawImage',c.name);
    assert.equal(trace[2][1],src,c.name);
  }
}finally{globalThis.document=priorDocument;}
console.log('PASS TEST35: 5 non-180 orientation cases; canvas transform and encoded dimensions; physical 180 still requires device calibration');
