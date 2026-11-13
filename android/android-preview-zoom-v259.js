/* HNLMark TEST 9 — view-only photo zoom and resizable preview; no image edits. */
(function(){
'use strict';
const body=document.body, viewer=document.querySelector('.workspace > .viewer'),
 stage=document.getElementById('stage'),canvas=document.getElementById('previewCanvas'),
 header=viewer?.querySelector('.viewer-top'),previous=document.getElementById('previewName');
if(!body.classList.contains('hnl-android-apk')||!viewer||!stage||!canvas||!header)return;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const tools=document.createElement('div');tools.className='apk-photo-preview-tools';
tools.innerHTML='<button type="button" class="apk-preview-minus" aria-label="Thu nhỏ xem trước">−</button>'+
 '<button type="button" class="apk-preview-reset" aria-label="Hiển thị vừa khung">100%</button>'+
 '<button type="button" class="apk-preview-plus" aria-label="Phóng to xem trước">+</button>'+
 '<button type="button" class="apk-preview-expand" aria-label="Mở rộng khung xem trước" aria-pressed="false">⤢</button>';
header.appendChild(tools);
const grip=document.createElement('div');grip.className='apk-photo-preview-resizer';grip.title='Kéo để tăng hoặc giảm chiều cao khung xem trước';
grip.setAttribute('role','separator');grip.setAttribute('aria-label','Kéo điều chỉnh độ cao khung xem trước');grip.setAttribute('aria-orientation','horizontal');
grip.tabIndex=0;grip.innerHTML='<span></span>';viewer.appendChild(grip);
let zoom=1,offsetX=0,offsetY=0,expanded=false,previousHeight=0,resizing=null;
const fingers=new Map();let initial=null,gesturing=false;
function usable(){return !body.classList.contains('hnl-camera-live')&&!body.classList.contains('hnl-android-video-editing');}
function limits(x,y,value){
 const r=stage.getBoundingClientRect(),c=canvas.getBoundingClientRect();
 const baseW=c.width/Math.max(zoom,.001),baseH=c.height/Math.max(zoom,.001);
 // Keep at least a central area in view; avoid moving a small image offscreen.
 const maxX=Math.max(0,(baseW*value-r.width)/2),maxY=Math.max(0,(baseH*value-r.height)/2);
 return {x:clamp(x,-maxX,maxX),y:clamp(y,-maxY,maxY)};
}
function paint(){
 if(!usable())return;
 const bounded=limits(offsetX,offsetY,zoom);offsetX=bounded.x;offsetY=bounded.y;
 canvas.style.transform='translate('+offsetX.toFixed(1)+'px,'+offsetY.toFixed(1)+'px) scale('+zoom.toFixed(3)+')';
 canvas.style.transformOrigin='50% 50%';
 tools.querySelector('.apk-preview-reset').textContent=Math.round(zoom*100)+'%';
 tools.querySelector('.apk-preview-minus').disabled=zoom<=1.001;
 tools.querySelector('.apk-preview-plus').disabled=zoom>=4;
}
function setZoom(value){zoom=clamp(value,1,4);if(zoom===1){offsetX=0;offsetY=0;}paint();}
function resetZoom(){fingers.clear();initial=null;gesturing=false;setZoom(1);}
function pos(e){return {x:e.clientX,y:e.clientY};}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function middle(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
stage.addEventListener('pointerdown',e=>{
 if(!usable()||e.pointerType!=='touch')return;
 fingers.set(e.pointerId,pos(e));
 if(fingers.size===2){
  const [a,b]=[...fingers.values()];
  initial={distance:Math.max(distance(a,b),4),center:middle(a,b),zoom,x:offsetX,y:offsetY};
  gesturing=true;
  e.preventDefault();e.stopPropagation();
 }
},true);
stage.addEventListener('pointermove',e=>{
 if(!usable()||!fingers.has(e.pointerId))return;
 fingers.set(e.pointerId,pos(e));
 if(fingers.size===2&&initial){
  const [a,b]=[...fingers.values()],center=middle(a,b);
  zoom=clamp(initial.zoom*distance(a,b)/initial.distance,1,4);
  offsetX=initial.x+(center.x-initial.center.x);
  offsetY=initial.y+(center.y-initial.center.y);
  paint();e.preventDefault();e.stopPropagation();
 }
},true);
function release(e){
 if(!fingers.has(e.pointerId))return;
 fingers.delete(e.pointerId);
 if(fingers.size<2)initial=null;
 if(!fingers.size)gesturing=false;
}
stage.addEventListener('pointerup',release,true);
stage.addEventListener('pointercancel',release,true);
stage.addEventListener('lostpointercapture',release,true);
for(const [selector,fn] of [
 ['.apk-preview-plus',()=>setZoom(zoom+.25)],
 ['.apk-preview-minus',()=>setZoom(zoom-.25)],
 ['.apk-preview-reset',resetZoom],
 ['.apk-preview-expand',()=>{
  if(!usable())return;
  const current=viewer.getBoundingClientRect().height;
  if(!expanded){previousHeight=current;setHeight(Math.min(innerHeight*.73,650));}
  else setHeight(previousHeight||Math.min(innerHeight*.32,252));
  expanded=!expanded;
  tools.querySelector('.apk-preview-expand').setAttribute('aria-pressed',String(expanded));
  paint();
 }]
])tools.querySelector(selector).addEventListener('click',fn);
function setHeight(h){
 const limit=Math.max(145,Math.min(innerHeight*.78,680));
 viewer.style.setProperty('--apk-photo-preview-height',Math.round(clamp(h,145,limit))+'px');
}
grip.addEventListener('pointerdown',e=>{
 if(!usable())return;
 resizing={pointer:e.pointerId,y:e.clientY,height:viewer.getBoundingClientRect().height};
 grip.setPointerCapture(e.pointerId);e.preventDefault();
});
grip.addEventListener('pointermove',e=>{
 if(!resizing||resizing.pointer!==e.pointerId)return;
 setHeight(resizing.height+e.clientY-resizing.y);expanded=false;
 tools.querySelector('.apk-preview-expand').setAttribute('aria-pressed','false');
 paint();
});
const endResize=e=>{if(resizing?.pointer===e.pointerId)resizing=null;};
grip.addEventListener('pointerup',endResize);grip.addEventListener('pointercancel',endResize);
grip.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){
 e.preventDefault();setHeight(viewer.getBoundingClientRect().height+(e.key==='ArrowDown'?24:-24));paint();
}});
stage.addEventListener('wheel',e=>{
 if(!usable()||!(e.ctrlKey||e.metaKey))return;
 e.preventDefault();setZoom(zoom*(e.deltaY>0?.90:1.1));
},{passive:false});
let lastName=previous?.textContent||'';
if(previous)new MutationObserver(()=>{
 const name=previous.textContent||'';
 if(name!==lastName){lastName=name;resetZoom();}
}).observe(previous,{childList:true,characterData:true,subtree:true});
new MutationObserver(()=>{if(!usable()){fingers.clear();initial=null;gesturing=false;canvas.style.removeProperty('transform');}
 else paint();}).observe(body,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',paint);
window.HNLPreviewZoom={isGesturing:()=>gesturing,getScale:()=>zoom,reset:resetZoom};
paint();
})();
