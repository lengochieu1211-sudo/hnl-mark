'use strict';
const assert=require('node:assert/strict');
const {aspect,fromDrag,center,RATIOS}=require('../crop-ratios.js');
const near=(a,b,eps=.008)=>assert.ok(Math.abs(a-b)<=eps,`${a} vs ${b}`);
for(const name of Object.keys(RATIOS)){
 for(const [w,h] of [[1080,1920],[1920,1080],[640,480],[4000,3000]]){
  const r=center(name,w,h);
  const actual=((r.x2-r.x1)*w)/((r.y2-r.y1)*h);
  near(actual,aspect(name,w,h),.0001);
  for(const v of Object.values(r))assert.ok(v>=0&&v<=1);
  for(const delta of [[.3,.4],[-.3,-.4],[.6,-.7],[-.7,.6]]){
   const box=fromDrag({x:.5,y:.5},{x:.5+delta[0],y:.5+delta[1]},name,w,h);
   const w1=Math.abs(box.x2-box.x1)*w,h1=Math.abs(box.y2-box.y1)*h;
   near(w1/h1,aspect(name,w,h),.0001);
   for(const v of Object.values(box))assert.ok(v>=0&&v<=1);
  }
 }
}
const original=center('original',1920,1080);
near((original.x2-original.x1)*1920/((original.y2-original.y1)*1080),1920/1080,.00001);
assert.deepEqual(center('free',1000,800),{x1:.05,y1:.05,x2:.95,y2:.95});
console.log('PASS: crop 11 standard ratios and unconstrained/original; drag bounded in 4 source aspect ratios');
