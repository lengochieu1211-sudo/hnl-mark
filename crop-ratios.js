/* Pure standard-aspect crop helpers for the HNLMark image editor. */
(function(root){
'use strict';
const RATIOS=Object.freeze({'1:1':1,'4:3':4/3,'3:4':3/4,'3:2':3/2,'2:3':2/3,'16:9':16/9,'9:16':9/16,'4:5':4/5,'5:4':5/4,'21:9':21/9});
function aspect(name,w,h){
 if(name==='original')return (w>0&&h>0)?w/h:null;
 return RATIOS[name]||null;
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function fromDrag(anchor,point,name,w,h){
 const ratio=aspect(name,w,h);
 if(!ratio)return {x1:clamp(anchor.x,0,1),y1:clamp(anchor.y,0,1),x2:clamp(point.x,0,1),y2:clamp(point.y,0,1)};
 const x1=clamp(anchor.x,0,1),y1=clamp(anchor.y,0,1);
 const dx=(clamp(point.x,0,1)-x1)*w,dy=(clamp(point.y,0,1)-y1)*h;
 const sx=dx<0?-1:1,sy=dy<0?-1:1;
 let cw=Math.max(Math.abs(dx),Math.abs(dy)*ratio),ch=cw/ratio;
 const maxW=(sx<0?x1:1-x1)*w,maxH=(sy<0?y1:1-y1)*h;
 const factor=Math.min(1,cw?maxW/cw:1,ch?maxH/ch:1);
 cw*=factor;ch*=factor;
 return{x1,y1,x2:clamp(x1+sx*cw/w,0,1),y2:clamp(y1+sy*ch/h,0,1)};
}
function center(name,w,h){
 const ratio=aspect(name,w,h);
 if(!ratio)return {x1:.05,y1:.05,x2:.95,y2:.95};
 const imageAspect=w/h;
 const rw=imageAspect>=ratio?(.9*ratio/imageAspect):.9;
 const rh=imageAspect>=ratio?.9:(.9*imageAspect/ratio);
 return{x1:(1-rw)/2,y1:(1-rh)/2,x2:(1+rw)/2,y2:(1+rh)/2};
}
const api=Object.freeze({RATIOS,aspect,fromDrag,center});
root.HNLCropRatio=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
