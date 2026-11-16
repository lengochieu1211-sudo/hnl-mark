'use strict';
const assert=require('node:assert/strict');
const {calculate}=require('../android/preview-geometry.js');
for(const stage of [[393,623],[360,510],[430,780],[691,938]]){
 for(const content of [[1920,1080],[1080,1920],[1280,720],[720,1280]]){
  for(const angle of [0,90,180,270]){
   for(const view of ['large','fit']){
    const g=calculate({stageWidth:stage[0],stageHeight:stage[1],canvasWidth:content[0],canvasHeight:content[1],angle,view});
    assert(g&&g.width>0&&g.height>0);
    const aspect=g.width/g.height,target=content[0]/content[1];
    assert(Math.abs(aspect-target)<.015,'no distorted aspect');
    assert.equal(g.boundsWidth,angle%180?g.height:g.width);
    assert.equal(g.boundsHeight,angle%180?g.width:g.height);
    if(view==='fit'){
     assert(g.boundsWidth<=stage[0]+1&&g.boundsHeight<=stage[1]+1,'fit cannot crop');
    }else if(g.mode==='cover'){
     assert(g.boundsWidth>=stage[0]-1&&g.boundsHeight>=stage[1]-1,'cover fills viewport');
     assert(Math.max(g.cropX,g.cropY)<.40,'avoid severe corner clipping');
    }
   }
  }
 }
}
const landscape=calculate({stageWidth:393,stageHeight:623,canvasWidth:1920,canvasHeight:1080,angle:90});
assert.equal(landscape.mode,'cover');
assert(landscape.boundsWidth>=393&&landscape.boundsHeight>=623);
const opposite=calculate({stageWidth:393,stageHeight:623,canvasWidth:1920,canvasHeight:1080,angle:270});
assert.equal(opposite.mode,'cover');
const full=calculate({stageWidth:393,stageHeight:623,canvasWidth:1920,canvasHeight:1080,angle:90,view:'fit'});
assert(full.boundsWidth<=394&&full.boundsHeight<=624);
assert.equal(calculate({stageWidth:0,stageHeight:600,canvasWidth:1080,canvasHeight:1920}),null);
console.log('PASS: Android portrait/landscape preview large/fit geometry 4 screens × 4 sources × 4 angles');
