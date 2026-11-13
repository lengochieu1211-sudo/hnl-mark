/* APK-only bridge: UI coordination and chunked media exports to Downloads/HNLMark.
   No JS bridge is exposed to arbitrary remote pages by MainActivity. */
(function(){
'use strict';
document.body.classList.add('hnl-android-apk');
const native=window.HNLAndroidBridge;
function el(q){return document.querySelector(q);}
function goto(selector){
 const target=el(selector);
 if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
}
const tabs=Object.freeze({
 capture:()=>{const btn=el('#openCamera');if(btn)btn.click();},
 library:()=>{const btn=el('#openLibrary');if(btn)btn.click();else goto('.import-panel');},
 stamp:()=>goto('.editor .panel:nth-child(5)'),
 export:()=>goto('.export-panel')
});
function chooseTab(tab){(tabs[tab]||tabs.capture)();}
function saveSlice(blob){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');
  reader.onerror=()=>reject(reader.error||Error('Không đọc được đoạn video'));
  reader.readAsDataURL(blob);
 });
}
let saving=false;
async function saveBlob(blob,filename){
 if(!native)throw Error('Chỉ hỗ trợ trong bản Android');
 if(saving)throw Error('Đang lưu một file khác. Hãy hoàn tất trước.');
 if(!(blob instanceof Blob))throw Error('Dữ liệu không hợp lệ');
 saving=true;
 let token='';
 try{
  token=native.beginSave(String(filename||'HNLMark'),String(blob.type||'application/octet-stream'));
  if(!token)throw Error('Không tạo được file trong Tải xuống/HNLMark');
  const step=192*1024;
  for(let start=0,i=0;start<blob.size;start+=step,i++){
   const b64=await saveSlice(blob.slice(start,Math.min(blob.size,start+step)));
   if(!native.appendSave(token,b64))throw Error('Lỗi ghi dữ liệu video/ảnh');
   if((i%12)===0)await new Promise(r=>setTimeout(r,0));
  }
  if(!native.finishSave(token))throw Error('Không hoàn tất được file');
  token='';
  return true;
 }catch(e){
  if(token)native.abortSave(token);
  throw e;
 }finally{saving=false;}
}
const cameraState=()=>{
 if(!native)return;
 try{native.cameraState(document.body.classList.contains('hnl-camera-live')||document.body.classList.contains('hnl-video-live'));}
 catch(_){}
};
new MutationObserver(cameraState).observe(document.body,{attributes:true,attributeFilter:['class']});
cameraState();
window.HNLAndroidApp={chooseTab,saveBlob,version:'2.3.0-dev'};
})();
