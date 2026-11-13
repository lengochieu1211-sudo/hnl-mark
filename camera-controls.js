/* HNLMark camera controls v2.4.0
   Shared picture/video controls. Hardware focus/EV/zoom/torch only when
   supported by MediaStreamTrack; fallback brightness affects rendered frames.
   No claim of manual focus/EV when the browser rejects constraints. */
(function(root){
 'use strict';
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
 function create({stage,track,active,rotation}){
  if(!stage)throw Error('Missing camera stage');
  const box=document.createElement('div');
  box.className='hnl-camera-adjust';
  box.innerHTML='<div class="hnl-focus-ring" hidden><span>+</span></div>'+
   '<div class="hnl-camera-exposure" hidden><label for="hnlExposure_'+Math.random().toString(36).slice(2,7)+'">☀ <b>0.0</b></label><input type="range" min="-2" max="2" step=".1" value="0" aria-label="Điều chỉnh độ sáng EV"></div>'+
   '<div class="hnl-camera-quick" hidden><button type="button" class="hnl-zoom" hidden title="Thu phóng">1×</button><button type="button" class="hnl-torch" hidden title="Đèn hỗ trợ">⚡</button></div>';
  const ring=box.querySelector('.hnl-focus-ring');
  const exposure=box.querySelector('.hnl-camera-exposure');
  const slider=exposure.querySelector('input'),val=exposure.querySelector('b');
  const quick=box.querySelector('.hnl-camera-quick');
  const zoomBtn=box.querySelector('.hnl-zoom'),torchBtn=box.querySelector('.hnl-torch');
  stage.classList.add('hnl-has-camera-adjust');stage.appendChild(box);
  let caps={},brightness=0,hwExposure=false,zoom=1,torch=false,lastTap={x:.5,y:.5},destroyed=false;
  let shownAt=0, hideJob=0;const pointers=new Map();let pinchLength=0,pinchZoom=1;
  const getTrack=()=>typeof track==='function'?track():track;
  const isActive=()=>!destroyed&&(!active||active());
  function showRing(x,y){
   ring.hidden=false;
   ring.style.left=(x*100)+'%';ring.style.top=(y*100)+'%';
   exposure.hidden=false;shownAt=Date.now();
   clearTimeout(hideJob);hideJob=setTimeout(()=>{if(Date.now()-shownAt>3600){ring.hidden=true;exposure.hidden=true;}},4000);
  }
  function pos(e){
   const rect=stage.getBoundingClientRect();
   return{x:clamp((e.clientX-rect.left)/rect.width,0,1),y:clamp((e.clientY-rect.top)/rect.height,0,1)};
  }
  function rotatePoint(x,y){
   const angle=Number(rotation?.()||0);
   if(angle===90)return{x:y,y:1-x};
   if(angle===180)return{x:1-x,y:1-y};
   if(angle===270)return{x:1-y,y:x};
   return{x,y};
  }
  async function requestFocus(x,y){
   if(!isActive())return;
   showRing(x,y);lastTap={x,y};
   const t=getTrack();
   if(!t?.applyConstraints)return;
   const p=rotatePoint(x,y);
   // Camera support differs substantially across Android WebView versions.
   const trials=[];
   if(caps.pointsOfInterest)trials.push({pointsOfInterest:[p],focusMode:'single-shot'});
   if(Array.isArray(caps.focusMode)&&caps.focusMode.includes('single-shot'))
    trials.push({focusMode:'single-shot'});
   for(const constraints of trials){
    try{await t.applyConstraints({advanced:[constraints]});return;}catch(_){}
   }
  }
  async function setExposure(value){
   brightness=clamp(Number(value)||0,-2,2);
   val.textContent=(brightness>0?'+':'')+brightness.toFixed(1);
   const t=getTrack();hwExposure=false;
   if(t?.applyConstraints&&caps.exposureCompensation){
    const c=caps.exposureCompensation;
    const target=clamp(brightness,c.min,c.max);
    try{
     await t.applyConstraints({advanced:[{exposureCompensation:target}]});
     hwExposure=true;
    }catch(_){}
   }
  }
  async function setZoom(next){
   const t=getTrack();if(!caps.zoom||!t?.applyConstraints)return;
   zoom=clamp(next,caps.zoom.min,caps.zoom.max);
   try{await t.applyConstraints({advanced:[{zoom}]});zoomBtn.textContent=zoom.toFixed(1)+'×';}
   catch(_){zoomBtn.hidden=true;}
  }
  async function toggleTorch(){
   const t=getTrack();if(!caps.torch||!t?.applyConstraints)return;
   try{torch=!torch;await t.applyConstraints({advanced:[{torch}]});torchBtn.classList.toggle('on',torch);}
   catch(_){torch=false;torchBtn.hidden=true;}
  }
  function onDown(e){
   if(!isActive()||e.target.closest('.hnl-camera-adjust'))return;
   pointers.set(e.pointerId,pos(e));
   if(pointers.size===2){
    const [p,q]=[...pointers.values()];
    pinchLength=Math.hypot(p.x-q.x,p.y-q.y);pinchZoom=zoom;
   }
  }
  function onMove(e){
   if(!isActive()||!pointers.has(e.pointerId))return;
   pointers.set(e.pointerId,pos(e));
   if(pointers.size===2&&pinchLength>0&&caps.zoom){
    const [p,q]=[...pointers.values()];
    const factor=Math.hypot(p.x-q.x,p.y-q.y)/pinchLength;
    void setZoom(pinchZoom*factor);
   }
  }
  function onUp(e){
   if(!isActive())return;
   if(!pointers.has(e.pointerId))return;
   const count=pointers.size,p=pos(e);pointers.delete(e.pointerId);
   if(count===1&&e.type!=='pointercancel')void requestFocus(p.x,p.y);
   if(pointers.size===0)pinchLength=0;
  }
  function stopEvent(e){e.stopPropagation();}
  box.addEventListener('pointerdown',stopEvent);
  box.addEventListener('pointerup',stopEvent);
  slider.addEventListener('input',e=>void setExposure(e.target.value));
  zoomBtn.addEventListener('click',()=>void setZoom(zoom>=2?1:Math.min(2,caps.zoom?.max||1)));
  torchBtn.addEventListener('click',()=>void toggleTorch());
  stage.addEventListener('pointerdown',onDown);
  stage.addEventListener('pointermove',onMove);
  stage.addEventListener('pointerup',onUp);
  stage.addEventListener('pointercancel',onUp);
  const device=getTrack();
  try{caps=device?.getCapabilities?.()||{};}catch(_){}
  if(caps.zoom?.min!=null){
   zoom=caps.zoom.min<=1&&caps.zoom.max>=1?1:caps.zoom.min;
   zoomBtn.hidden=false;zoomBtn.textContent=zoom.toFixed(1)+'×';
  }
  if(caps.torch===true)torchBtn.hidden=false;
  quick.hidden=zoomBtn.hidden&&torchBtn.hidden;
  return {
   // No misleading "manual focus" unless hardware constraints succeeded;
   // visual focus ring is still useful for framing.
   getFilter:()=>hwExposure?'none':'brightness('+clamp(1+brightness*.16,.65,1.38)+')',
   setExposure,requestFocus,
   refreshCapabilities(){
    try{caps=getTrack()?.getCapabilities?.()||{};}catch(_){caps={};}
   },
   destroy(){
    destroyed=true;clearTimeout(hideJob);
    stage.removeEventListener('pointerdown',onDown);
    stage.removeEventListener('pointermove',onMove);
    stage.removeEventListener('pointerup',onUp);
    stage.removeEventListener('pointercancel',onUp);
    box.remove();
    stage.classList.remove('hnl-has-camera-adjust');
   }
  };
 }
 root.HNLCameraControls={create};
 if(typeof module!=='undefined'&&module.exports)module.exports={create};
})(typeof window!=='undefined'?window:globalThis);
