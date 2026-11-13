/* HNLMark Android 2.5 — bottom-fixed stock-camera layout.
   The underlying camera / recording and image-processing handlers stay intact. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const body=document.body;
const specs=[
 {type:'photo',root:$('cameraArea'),toolbar:$('cameraControls'),utility:document.querySelector('#cameraControls .camera-utilities'),header:null,anchor:document.querySelector('#cameraControls .camera-shutter-row'),canvas: $('stage')},
 {type:'video',root:$('videoStudio'),toolbar:document.querySelector('#videoStudio .video-ios-controls'),utility:document.querySelector('#videoStudio .video-ios-utilities'),header:document.querySelector('#videoStudio .video-control-header'),anchor:document.querySelector('#videoStudio .video-ios-shutter-row'),canvas:document.querySelector('#videoStudio .video-canvas-wrap')}
].filter(s=>s.root&&s.toolbar&&s.utility&&s.anchor&&s.canvas);
for(const spec of specs){
 const top=document.createElement('div');
 top.className='apk-camera-topbar';
 top.setAttribute('aria-label','Công cụ camera');
 const grid=document.createElement('button');
 grid.type='button';grid.className='apk-grid-toggle';
 grid.setAttribute('aria-label','Bật/tắt lưới căn khung hình');
 grid.setAttribute('aria-pressed','false');
 grid.title='Lưới căn khung';
 grid.innerHTML='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>';
 grid.addEventListener('click',()=>{
  const enabled=spec.canvas.classList.toggle('apk-grid-enabled');
  grid.classList.toggle('is-on',enabled);
  grid.setAttribute('aria-pressed',String(enabled));
 });
 const utilitySlot=document.createElement('div');utilitySlot.className='apk-top-utility-slot';
 top.append(utilitySlot,grid);
 spec.root.insertBefore(top,spec.root.firstChild);
 spec.top=top;spec.slot=utilitySlot;spec.grid=grid;
}
function syncCameraToolbar(){
 for(const spec of specs){
  const active=body.classList.contains(spec.type==='photo'?'hnl-camera-live':'hnl-video-live');
  spec.root.classList.toggle('apk-native-camera-mode',active);
  if(active){
   if(spec.utility.parentElement!==spec.slot)spec.slot.prepend(spec.utility);
   if(spec.header&&spec.header.parentElement!==spec.top)spec.top.prepend(spec.header);
  }else{
   if(spec.utility.parentElement!==spec.toolbar)spec.toolbar.insertBefore(spec.utility,spec.anchor);
   if(spec.header&&spec.header.parentElement!==spec.toolbar)spec.toolbar.insertBefore(spec.header,spec.utility);
   spec.canvas.classList.remove('apk-grid-enabled');
   spec.grid.classList.remove('is-on');spec.grid.setAttribute('aria-pressed','false');
  }
 }
}
function wrapModeLabels(){
 for(const selector of ['#cameraControls .camera-ios-modes > span','#cameraControls .camera-ios-modes > button',
 '#videoStudio .video-ios-modes > span','#videoStudio .video-ios-modes > button']){
  const target=document.querySelector(selector);
  if(!target||target.querySelector('.apk-rotate-label'))continue;
  const label=target.textContent.trim();
  const span=document.createElement('span');span.className='apk-rotate-label';span.textContent=label;
  target.textContent='';target.appendChild(span);
 }
}
wrapModeLabels();
syncCameraToolbar();
new MutationObserver(syncCameraToolbar).observe(body,{attributes:true,attributeFilter:['class']});
window.HNLAndroidCameraLayout={sync:syncCameraToolbar};
})();
