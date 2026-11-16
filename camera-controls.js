/* HNLMark camera controls v2.4.0
   Shared picture/video controls. Hardware focus/EV/zoom/torch only when
   supported by MediaStreamTrack; fallback brightness affects rendered frames.
   No claim of manual focus/EV when the browser rejects constraints. */
(function(root){
 'use strict';
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
 function create({stage,track,active,rotation,dock}){
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
  let hwZoom=false, zoomMax=3;
  // APK uses two-finger pinch + tap-to-focus, not a permanent slider/icon dock.
  const apk=typeof document!=='undefined'&&document.body.classList.contains('hnl-android-apk');
  const dockBar=dock&&!apk?document.createElement('div'):null;
  if(dockBar){
   dockBar.className='hnl-camera-dock-adjust';
   dockBar.innerHTML='<button type="button" class="hnl-focus-center" aria-label="Chạm để lấy nét giữa khung">◎ <span>Lấy nét</span></button>'+
    '<button type="button" class="hnl-zoom-minus" aria-label="Giảm zoom">−</button>'+
    '<input type="range" class="hnl-zoom-slider" min="1" max="3" step="0.1" value="1" aria-label="Zoom camera" />'+
    '<output class="hnl-zoom-readout">1.0×</output>'+
    '<button type="button" class="hnl-zoom-plus" aria-label="Tăng zoom">+</button>';
   dock.appendChild(dockBar);
   quick.hidden=true;
  }
  let shownAt=0, hideJob=0;const pointers=new Map();let pinchLength=0,pinchZoom=1,pinchInProgress=false;
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
  function syncZoom(){
   zoomBtn.textContent=zoom.toFixed(1)+'×';
   if(!dockBar)return;
   const input=dockBar.querySelector('.hnl-zoom-slider');
   input.max=String(zoomMax);input.value=String(zoom);
   dockBar.querySelector('.hnl-zoom-readout').textContent=zoom.toFixed(1)+'×';
   dockBar.dataset.zoomMode=hwZoom?'camera':'digital';
   dockBar.querySelector('.hnl-zoom-readout').title=hwZoom?'Zoom camera':'Zoom số (crop ảnh/video)';
  }
  async function setZoom(next){
   if(!isActive())return;
   const target=clamp(Number(next)||1,1,zoomMax),t=getTrack();
   if(hwZoom&&t?.applyConstraints){
    try{await t.applyConstraints({advanced:[{zoom:target}]});}
    catch(_){hwZoom=false;zoomMax=3;}
   }
   zoom=target;syncZoom();
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
    pinchLength=Math.hypot(p.x-q.x,p.y-q.y);pinchZoom=zoom;pinchInProgress=true;
   }
  }
  function onMove(e){
   if(!isActive()||!pointers.has(e.pointerId))return;
   pointers.set(e.pointerId,pos(e));
   if(pointers.size===2&&pinchLength>0){
    const [p,q]=[...pointers.values()];
    const factor=Math.hypot(p.x-q.x,p.y-q.y)/pinchLength;
    void setZoom(pinchZoom*factor);
   }
  }
  function onUp(e){
   if(!isActive())return;
   if(!pointers.has(e.pointerId))return;
   const count=pointers.size,p=pos(e);pointers.delete(e.pointerId);
   if(count===1&&!pinchInProgress&&e.type!=='pointercancel')void requestFocus(p.x,p.y);
   if(pointers.size===0){pinchLength=0;pinchInProgress=false;}
  }
  function stopEvent(e){e.stopPropagation();}
  box.addEventListener('pointerdown',stopEvent);
  box.addEventListener('pointerup',stopEvent);
  slider.addEventListener('input',e=>void setExposure(e.target.value));
  zoomBtn.addEventListener('click',()=>void setZoom(zoom>=2?1:Math.min(2,zoomMax)));
  if(dockBar){
   dockBar.querySelector('.hnl-zoom-slider').addEventListener('input',e=>void setZoom(e.target.value));
   dockBar.querySelector('.hnl-zoom-minus').addEventListener('click',()=>void setZoom(zoom-.5));
   dockBar.querySelector('.hnl-zoom-plus').addEventListener('click',()=>void setZoom(zoom+.5));
   dockBar.querySelector('.hnl-focus-center').addEventListener('click',()=>void requestFocus(.5,.5));
  }
  torchBtn.addEventListener('click',()=>void toggleTorch());
  stage.addEventListener('pointerdown',onDown);
  stage.addEventListener('pointermove',onMove);
  stage.addEventListener('pointerup',onUp);
  stage.addEventListener('pointercancel',onUp);
  const device=getTrack();
  try{caps=device?.getCapabilities?.()||{};}catch(_){}
  if(caps.zoom?.max>=1.1&&getTrack()?.applyConstraints){
   hwZoom=true;zoomMax=Math.min(3,caps.zoom.max);zoom=1;
  }else{hwZoom=false;zoomMax=3;zoom=1;}
  zoomBtn.hidden=Boolean(dockBar)||apk;
  syncZoom();
  if(caps.torch===true)torchBtn.hidden=false;
  quick.hidden=Boolean(dockBar)||(zoomBtn.hidden&&torchBtn.hidden);
  return {
   // No misleading "manual focus" unless hardware constraints succeeded;
   // visual focus ring is still useful for framing.
   getFilter:()=>hwExposure?'none':'brightness('+clamp(1+brightness*.16,.65,1.38)+')',
   setExposure,requestFocus,setZoom,
   getDigitalZoom:()=>hwZoom?1:zoom,
   refreshCapabilities(){
    try{caps=getTrack()?.getCapabilities?.()||{};}catch(_){caps={};}
    hwZoom=Boolean(caps.zoom?.max>=1.1&&getTrack()?.applyConstraints);
    zoomMax=hwZoom?Math.min(3,caps.zoom.max):3;
    zoom=1;syncZoom();
   },
   destroy(){
    destroyed=true;clearTimeout(hideJob);
    stage.removeEventListener('pointerdown',onDown);
    stage.removeEventListener('pointermove',onMove);
    stage.removeEventListener('pointerup',onUp);
    stage.removeEventListener('pointercancel',onUp);
    box.remove();dockBar?.remove();
    stage.classList.remove('hnl-has-camera-adjust');
   }
  };
 }
 root.HNLCameraControls={create};
 if(typeof module!=='undefined'&&module.exports)module.exports={create};
})(typeof window!=='undefined'?window:globalThis);
