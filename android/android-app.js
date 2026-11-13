/* HNLMark Android-only bridge v2.4 — direct gallery, share sheet and fixed docks. */
(function(){
'use strict';
document.body.classList.add('hnl-android-apk');
const native=window.HNLAndroidBridge;
const el=q=>document.querySelector(q);
const goto=q=>{const t=el(q);if(t)t.scrollIntoView({behavior:'smooth',block:'start'});};
function gallery(){
 if(native?.openDeviceGallery)native.openDeviceGallery();
 else el('#photoInput')?.click();
}
const tabs={
 capture:()=>el('#openCamera')?.click(),
 library:gallery,
 stamp:()=>window.HNLAndroidSections?.reveal('#fontFamily')||goto('#fontFamily'),
 export:()=>window.HNLAndroidSections?.reveal('#apkPhotoActions')||goto('.export-panel')
};
function chooseTab(tab){(tabs[tab]||tabs.capture)();}
let physicalAngle=0;
function setDeviceOrientation(angle){
 const value=[0,90,180,270].includes(Number(angle))?Number(angle):0;
 const changed=value!==physicalAngle;
 physicalAngle=value;
 for(const a of [0,90,180,270])document.body.classList.toggle('hnl-angle-'+a,a===value);
 document.body.dataset.hnlAngle=String(value);
 if(changed)window.dispatchEvent(new CustomEvent('hnlmark:physical-orientation',{detail:{angle:value}}));
 window.HNLAndroidCameraLayout?.syncPreviewOrientation?.();
}
async function saveSlice(blob){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');
  reader.onerror=()=>reject(reader.error||Error('Không đọc được file'));
  reader.readAsDataURL(blob);
 });
}
let writing=false;
async function transfer(blob,filename,sharing){
 if(!native)throw Error('Chỉ hỗ trợ trong bản APK Android');
 if(writing)throw Error('Đang chuyển một tệp khác; hãy hoàn tất trước.');
 if(!(blob instanceof Blob)||!blob.size)throw Error('Tệp trống hoặc không hợp lệ');
 writing=true;let token='';
 try{
  const type=String(blob.type||'application/octet-stream'),name=String(filename||'HNLMark');
  token=sharing?native.beginShare(name,type):native.beginSave(name,type);
  if(!token)throw Error(sharing?'Không tạo được tệp chia sẻ tạm.':'Không lưu được file vào Downloads');
  const step=128*1024;
  for(let start=0;start<blob.size;start+=step){
   const b64=await saveSlice(blob.slice(start,Math.min(start+step,blob.size)));
   if(!(sharing?native.appendShare(token,b64):native.appendSave(token,b64)))throw Error('Không ghi được file');
   if(start%(step*8)===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  const ok=sharing?native.finishShare(token):native.finishSave(token);
  if(!ok)throw Error(sharing?'Không mở được bảng chia sẻ Android.':'Không hoàn tất được file');
  token='';return true;
 }catch(e){
  if(token){if(sharing)native.abortShare(token);else native.abortSave(token);}
  throw e;
 }finally{writing=false;}
}
const saveBlob=(blob,name)=>transfer(blob,name,false);
const shareBlob=(blob,name)=>transfer(blob,name,true);
function addShareAction(parent,id,label,fn){
 if(!parent||document.getElementById(id))return;
 const button=document.createElement('button');button.type='button';button.id=id;
 button.className='apk-share-action';button.setAttribute('aria-label',label);
 button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.9 7.4-4.4M8.2 13.1l7.4 4.4"/></svg><span>'+label+'</span>';
 button.addEventListener('click',async()=>{
  button.disabled=true;
  try{await fn();}
  catch(e){alert('Không chia sẻ được: '+(e.message||e));}
  finally{button.disabled=false;}
 });
 parent.appendChild(button);
}
function installActions(){
 addShareAction(el('.export-buttons'),'apkSharePhoto','Chia sẻ ảnh',()=>window.HNLPhotoBridge?.shareCurrent());
 addShareAction(el('.video-result-actions'),'apkShareVideo','Chia sẻ video',()=>window.HNLVideoStudio?.shareCurrent());
 // No verbose import note on APK. Native gallery button is self-explanatory.
}
installActions();
// When importing a video, do not pin an unrelated photo as the preview.
const videoPanel=el('#videoPanel');
function syncPreviewMode(){
 const editingVideo=Boolean(videoPanel&&!videoPanel.hidden);
 document.body.classList.toggle('hnl-android-video-editing',editingVideo);
}
if(videoPanel){
 new MutationObserver(syncPreviewMode).observe(videoPanel,{attributes:true,attributeFilter:['hidden']});
}
syncPreviewMode();
// Native picker results are served from a private, single-origin content URI
// token handler. Use the SAME unified import route as the web file input.
let mediaImportInProgress=false;
async function receivePickedMedia(items){
 if(mediaImportInProgress)throw new Error('Đang nhập ảnh/video khác');
 if(!Array.isArray(items)||!items.length)return;
 if(!window.HNLMediaImport?.acceptFiles){
  alert('Bộ xử lý thư viện chưa sẵn sàng. Hãy đóng mở lại HNLMark.');
  return;
 }
 mediaImportInProgress=true;
 try{
  const files=[];
  for(const item of items.slice(0,30)){
   if(!item?.url||!/^https:\/\/appassets\.androidplatform\.net\/picked\/[a-f0-9-]+$/.test(item.url))
    throw new Error('Đường dẫn tệp không hợp lệ.');
   const name=String(item.name||'HNLMark-media').slice(0,160);
   const mime=String(item.type||'application/octet-stream');
   const response=await fetch(item.url,{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw new Error('Không đọc được '+name+' từ thư viện máy ('+response.status+').');
   const blob=await response.blob();
   if(!blob.size)throw new Error('Tệp '+name+' rỗng hoặc không thể đọc.');
   files.push(new File([blob],name,{type:mime,lastModified:Date.now()}));
  }
  // Stop live preview before opening an imported image/video.
  if(document.body.classList.contains('hnl-camera-live'))
   el('#closeCamera')?.click();
  if(document.body.classList.contains('hnl-video-live'))
   el('#videoClose')?.click();
  await window.HNLMediaImport.acceptFiles(files);
 }catch(e){
  alert('Không chọn được ảnh/video: '+(e.message||e));
 }finally{
  mediaImportInProgress=false;
 }
}
// In the camera dock, the gallery icon must use the Android picker rather than
// showing only HNLMark's already-saved internal photo library.
for(const id of ['cameraLibrary','videoFileShortcut']){
 const button=el('#'+id);
 button?.addEventListener('click',event=>{
  if(!native?.openDeviceGallery)return;
  event.preventDefault();event.stopImmediatePropagation();
  gallery();
 },true);
}

const cameraState=()=>{
 if(!native)return;
 try{native.cameraState(document.body.classList.contains('hnl-camera-live')||document.body.classList.contains('hnl-video-live'));}
 catch(_){}
};
new MutationObserver(cameraState).observe(document.body,{attributes:true,attributeFilter:['class']});
cameraState();
setDeviceOrientation(matchMedia('(orientation:landscape)').matches?90:0);
window.HNLAndroidApp={chooseTab,openGallery:gallery,receivePickedMedia,saveBlob,shareBlob,setDeviceOrientation,getDeviceAngle:()=>physicalAngle,version:'2.5.8-test'};
})();
