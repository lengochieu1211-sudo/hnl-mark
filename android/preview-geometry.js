/* HNLMark Android: geometry for a physically rotated preview, independent
   from photo/video encoding. Never crop the captured file or timestamp bitmap.
   Both picture and movie camera reuse exactly the same computation. */
(function(root){
'use strict';
const ANGLES=[0,90,180,270];
function calculate({stageWidth,stageHeight,canvasWidth,canvasHeight,angle=0,view='large'}={}){
 const values=[stageWidth,stageHeight,canvasWidth,canvasHeight].map(Number);
 if(values.some(x=>!Number.isFinite(x)||x<=0))return null;
 const [sw,sh,cw,ch]=values;
 angle=ANGLES.includes(Number(angle))?Number(angle):0;
 const turned=angle===90||angle===270;
 const visualW=turned?ch:cw,visualH=turned?cw:ch;
 const fit=Math.min(sw/visualW,sh/visualH);
 const cover=Math.max(sw/visualW,sh/visualH);
 // Cover the preview when only modest edge trimming is needed. Large
 // aspect differences stay "contain" so stamps at photo edges remain visible.
 const ratio=cover/fit;
 const scale=view==='large'&&ratio<=1.65?cover:fit;
 const width=Math.max(1,Math.round(cw*scale));
 const height=Math.max(1,Math.round(ch*scale));
 const boundsW=turned?height:width,boundsH=turned?width:height;
 return {
  width,height,boundsWidth:boundsW,boundsHeight:boundsH,scale,angle,mode:scale===fit?'fit':'cover',
  cropX:Math.max(0,(boundsW-sw)/boundsW),cropY:Math.max(0,(boundsH-sh)/boundsH)
 };
}
const api=Object.freeze({calculate});
root.HNLPreviewGeometry=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
