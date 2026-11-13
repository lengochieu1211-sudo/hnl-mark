/* HNLMark Android 2.5.1
 * APK-only progressive disclosure, one Save/Share entry point, and
 * physically rotated camera PREVIEW (not the bottom control dock).
 * Existing core buttons and callbacks remain authoritative.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const body=document.body;
const panels=[...document.querySelectorAll('.editor > .panel')];
function fold(panel,expanded){
 const content=panel.querySelector(':scope > .apk-fold-content');
 const button=panel.querySelector(':scope > .section-title > .apk-collapse-toggle');
 if(!content||!button)return;
 content.hidden=!expanded;
 button.setAttribute('aria-expanded',String(expanded));
 button.setAttribute('aria-label',(expanded?'Thu gọn ':'Mở rộng ')+(panel.querySelector('h2')?.textContent||'cài đặt'));
 panel.classList.toggle('apk-panel-expanded',expanded);
}
for(let i=0;i<panels.length;i++){
 const panel=panels[i],title=panel.querySelector(':scope > .section-title');
 if(!title||panel.querySelector('.apk-fold-content'))continue;
 const wrapper=document.createElement('div');wrapper.className='apk-fold-content';
 while(title.nextSibling)wrapper.appendChild(title.nextSibling);
 panel.appendChild(wrapper);
 const button=document.createElement('button');
 button.type='button';button.className='apk-collapse-toggle';
 button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
 title.appendChild(button);
 button.addEventListener('click',()=>fold(panel,wrapper.hidden));
 title.querySelector('h2')?.addEventListener('click',()=>fold(panel,wrapper.hidden));
 fold(panel,i===0);
}
function reveal(selector){
 const child=document.querySelector(selector);
 if(!child)return false;
 const panel=child.closest('.editor > .panel');
 if(panel)fold(panel,true);
 requestAnimationFrame(()=>{(panel||child).scrollIntoView({behavior:'smooth',block:'start'});});
 return true;
}
window.HNLAndroidSections={reveal,fold};
// Visible test-build marker: users can distinguish this parallel installation
// from the previous HNLMark even when Android's icon cache is stale.
const firstTitle=document.querySelector('.editor > .panel > .section-title');
if(firstTitle){
 const tag=document.createElement('small');
 tag.className='apk-test-version';tag.textContent='TEST v2.5.2';
 firstTitle.appendChild(tag);
}


const sheet=document.createElement('div');
sheet.className='apk-action-sheet';sheet.hidden=true;
sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');
sheet.innerHTML='<div class="apk-action-backdrop"></div><div class="apk-action-card">'+
 '<div class="apk-action-header"><strong>Lưu hoặc chia sẻ</strong><button type="button" class="apk-action-close" aria-label="Đóng menu">✕</button></div>'+
 '<div class="apk-action-options"></div></div>';
body.appendChild(sheet);
let restoreFocus=null;
function closeSheet(){
 if(sheet.hidden)return;
 sheet.hidden=true;body.classList.remove('apk-action-open');
 restoreFocus?.focus({preventScroll:true});
 restoreFocus=null;
}
sheet.querySelector('.apk-action-backdrop').addEventListener('click',closeSheet);
sheet.querySelector('.apk-action-close').addEventListener('click',closeSheet);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheet.hidden){e.preventDefault();closeSheet();}});
const icSave='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m-4-4 4 4 4-4M5 17v3h14v-3"/></svg>';
const icShare='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8 11 7.6-4.5M8 13l7.6 4.5"/></svg>';
function openSheet(kind,source){
 const isVideo=kind==='video',save=$(isVideo?'videoSave':'saveOne'),share=$(isVideo?'apkShareVideo':'apkSharePhoto');
 if(!save||save.disabled)return;
 restoreFocus=source;
 sheet.querySelector('.apk-action-header strong').textContent=isVideo?'Lưu hoặc chia sẻ video':'Lưu hoặc chia sẻ ảnh';
 const list=sheet.querySelector('.apk-action-options');list.replaceChildren();
 for(const item of [
  {label:'Lưu vào máy',desc:'Thư mục Tải xuống/HNLMark',icon:icSave,target:save},
  {label:'Chia sẻ sang ứng dụng khác',desc:'Zalo, Messenger, Drive…',icon:icShare,target:share}
 ]){
  const b=document.createElement('button');b.type='button';b.className='apk-action-option';
  b.disabled=!item.target||item.target.disabled;
  const art=document.createElement('span');art.className='apk-action-icon';art.innerHTML=item.icon;
  const label=document.createElement('span');label.className='apk-action-text';
  const strong=document.createElement('strong');strong.textContent=item.label;
  const small=document.createElement('small');small.textContent=item.desc;
  label.append(strong,small);b.append(art,label);
  b.addEventListener('click',()=>{closeSheet();item.target?.click();});
  list.appendChild(b);
 }
 sheet.hidden=false;body.classList.add('apk-action-open');
}
function addUnifiedAction(container,kind,id){
 if(!container||$(id))return;
 const primary=document.createElement('button');primary.type='button';
 primary.id=id;primary.className='apk-unified-action';
 primary.textContent='Lưu / Chia sẻ';
 primary.setAttribute('aria-haspopup','dialog');
 primary.addEventListener('click',()=>openSheet(kind,primary));
 container.prepend(primary);
 const save=$(kind==='video'?'videoSave':'saveOne');
 const sync=()=>{primary.disabled=!save||save.disabled;};
 sync();
 if(save)new MutationObserver(sync).observe(save,{attributes:true,attributeFilter:['disabled']});
}
addUnifiedAction(document.querySelector('.export-buttons'),'photo','apkPhotoActions');
addUnifiedAction(document.querySelector('.video-result-actions'),'video','apkVideoActions');

// Keep original save/share buttons in DOM because their callbacks own the
// actual rendering, share MIME and backup logic. Hide only their visual UI.
function updatePreview(){
 const angle=window.HNLAndroidApp?.getDeviceAngle?.()??0;
 const portrait=angle===0||angle===180;
 for(const [mode,stageId,canvasId,selector] of [
  ['photo','stage','previewCanvas','hnl-camera-live'],
  ['video',null,'videoCanvas','hnl-video-live']
 ]){
  const stage=mode==='photo'?$(stageId):document.querySelector('#videoStudio .video-canvas-wrap');
  const canvas=$(canvasId),active=body.classList.contains(selector);
  if(!stage||!canvas)continue;
  if(!active){
   canvas.classList.remove('apk-rotated-preview');
   canvas.style.removeProperty('--apk-preview-width');
   canvas.style.removeProperty('--apk-preview-height');
   canvas.style.removeProperty('--apk-preview-turn');
   continue;
  }
  const rect=stage.getBoundingClientRect();
  const w=canvas.width,h=canvas.height;
  if(!rect.width||!rect.height||!w||!h)continue;
  const viewW=portrait?rect.width:rect.height,viewH=portrait?rect.height:rect.width;
  const scale=Math.min(viewW/w,viewH/h);
  const displayW=Math.max(1,Math.floor(w*scale)),displayH=Math.max(1,Math.floor(h*scale));
  canvas.style.setProperty('--apk-preview-width',displayW+'px');
  canvas.style.setProperty('--apk-preview-height',displayH+'px');
  const rotate=angle===90?-90:angle===270?90:angle===180?180:0;
  canvas.style.setProperty('--apk-preview-turn',rotate+'deg');
  canvas.classList.toggle('apk-rotated-preview',rotate!==0);
 }
}
let frame=0;
function schedulePreview(){
 if(frame)return;
 frame=requestAnimationFrame(()=>{frame=0;updatePreview();});
}
window.addEventListener('hnlmark:physical-orientation',schedulePreview);
window.addEventListener('resize',schedulePreview);
new MutationObserver(schedulePreview).observe(body,{attributes:true,attributeFilter:['class']});
for(const [stage,canvas] of [
 [document.getElementById('stage'),document.getElementById('previewCanvas')],
 [document.querySelector('#videoStudio .video-canvas-wrap'),document.getElementById('videoCanvas')]
]){
 if(stage&&typeof ResizeObserver!=='undefined')new ResizeObserver(schedulePreview).observe(stage);
 if(canvas)new MutationObserver(schedulePreview).observe(canvas,{attributes:true,attributeFilter:['width','height']});
}
window.HNLAndroidCameraLayout&&(window.HNLAndroidCameraLayout.syncPreviewOrientation=schedulePreview);
schedulePreview();
})();