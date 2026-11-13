/* HNLMark video studio v2.1.3: local capture/import, stamped video, optional audio. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const panel=$('videoPanel'), studio=$('videoStudio'), canvas=$('videoCanvas'), ctx=canvas?.getContext('2d',{alpha:false});
const media=$('videoMedia'), output=$('videoOutput');
const qualityPanel=$('videoQualityPanel');
if(!panel||!studio||!canvas||!ctx||!media||!output)return;
let mode='none', cameraStream=null, sourceUrl='', outputUrl='', outputBlob=null;
let file=null, rotation=0, recorder=null, chunks=[], raf=0, exportStream=null, micStream=null;
let recordingStart=0, recordingDate=null, importDate=null, recordingName='', recordingMime='', recordingMode='';
let videoCode='', isBusy=false, audioContext=null, audioSource=null, audioDestination=null, fallbackNoAudio=false;
let physicalPortrait=null, physicalSide=1, physicalInverted=false, initialPortraitBetaSign=null, candidate='', samples=0, fixedTurn=null;
let lastMotionAt=0,lastOrientationAt=0,lastOrientationSide=0;
const workCanvas=document.createElement('canvas'),workCtx=workCanvas.getContext('2d',{alpha:false});
let selectedMedia='photo',outputSaved=true;
function updateMediaPicker(){
 const video=selectedMedia==='video';
 $('photoLibraryArea').hidden=video;
 $('videoPanel').hidden=!video;
 $('photoCount').hidden=video;
 // Opening the camera and selecting a file always remain in the SAME top row.
}
async function chooseMedia(next){
 if(next===selectedMedia){updateMediaPicker();return true;}
 if(recorder?.state==='recording'){message('Hãy dừng quay hoặc xuất video trước khi chuyển chế độ.');return false;}
 if(next==='photo'&&outputBlob&&!outputSaved&&!window.confirm('Video vừa tạo chưa được lưu xuống máy. Vẫn chuyển sang Ảnh và bỏ bản xuất này?'))return false;
 if(next==='video'&&window.HNLVideoBridge?.photoCameraActive())$('closeCamera')?.click();
 if(next==='photo')await closeStudio();
 selectedMedia=next;updateMediaPicker();
 return true;
}
const message=text=>{$('videoStatus').textContent=text;};
const supportsCapture=()=>!!window.MediaRecorder&&typeof canvas.captureStream==='function';
const mimeType=()=>{
 const options=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm','video/mp4'];
 return options.find(t=>MediaRecorder.isTypeSupported(t))||'';
};
const extFor=type=>type.includes('mp4')?'mp4':'webm';
const makeVideoCode=()=>{
 const buf=new Uint8Array(15);if(crypto?.getRandomValues)crypto.getRandomValues(buf);else buf.forEach((_,i)=>buf[i]=Math.random()*256);
 return [...buf].map(x=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[x%36]).join('');
};
function closeVideoSettings(){
 if(qualityPanel?.parentElement===studio)panel.insertBefore(qualityPanel,studio);
 studio.classList.remove('video-settings-open');
 $('videoSettingsToggle').setAttribute('aria-expanded','false');
}
function toggleVideoSettings(){
 if(mode!=='camera'||!studio.classList.contains('video-open'))return;
 const show=!studio.classList.contains('video-settings-open');
 if(show){
  qualityPanel.hidden=false;studio.appendChild(qualityPanel);
  studio.classList.add('video-settings-open');
 }else closeVideoSettings();
 $('videoSettingsToggle').setAttribute('aria-expanded',String(show));
}
function syncButtons(){
 const active=mode==='camera'||mode==='file';
 const rec=!!recorder&&recorder.state==='recording';
 studio.hidden=mode==='none';
 $('videoRecord').hidden=!active||rec;$('videoStop').hidden=!rec;
 $('videoSettingsToggle').hidden=mode!=='camera';
 $('videoFlip').hidden=mode!=='camera';$('videoPlayPause').hidden=mode!=='file'||rec;
 $('videoSave').disabled=!outputBlob;
 const buttonLabel=mode==='file'?'Xuất video có dấu':'Quay video';
 $('videoRecord').setAttribute('aria-label',buttonLabel);
 const label=$('videoRecord').querySelector('.video-button-label');
 if(label)label.textContent=mode==='file'?'↓ Xuất video có dấu':'● Quay video';
 studio.classList.toggle('video-camera-mode',mode==='camera');
 studio.classList.toggle('video-file-mode',mode==='file');
 $('videoRotate').disabled=false;$('videoRotate180').disabled=false;$('videoFlip').disabled=rec;
 for(const id of ['videoResolution','videoBitrate','videoFps'])$(id).disabled=rec;
 const play=$('videoPlayPause'),paused=media.paused;
 play.setAttribute('aria-label',paused?'Phát video':'Tạm dừng video');
 play.title=paused?'Phát video':'Tạm dừng video';
 play.innerHTML=paused
  ?'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M8 5 19 12 8 19Z"/></svg>'
  :'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
 $('videoStudio').classList.toggle('is-recording',rec);
 $('videoCameraMode').hidden=true;
 $('videoFileMode').hidden=true;
 $('videoFileShortcut').hidden=mode==='file';
 $('videoElapsed').hidden=!rec;
}
function setPhysical(candidateName){
 if(!candidateName||mode!=='camera')return;
 if(candidateName!==candidate){candidate=candidateName;samples=1;return;}
 samples++;if(samples<3)return;
 const portrait=candidateName==='portrait',side=candidateName==='right'?1:-1;
 if(physicalPortrait!==portrait||physicalSide!==side){physicalPortrait=portrait;physicalSide=side;applyPhysicalLayout();}
}
function physicalMotion(e){
 if(mode!=='camera'||!e.accelerationIncludingGravity)return;
 const {x,y}=e.accelerationIncludingGravity;if(!Number.isFinite(x)||!Number.isFinite(y))return;
 const ax=Math.abs(x),ay=Math.abs(y);if(Math.hypot(x,y)<3.5)return;
 lastMotionAt=performance.now();
 if(ax>ay*1.12&&ax>3.3){
  const gammaSign=lastOrientationAt&&lastMotionAt-lastOrientationAt<1800?lastOrientationSide:0;
  setPhysical((gammaSign||Math.sign(x))>=0?'right':'left');
 }else if(ay>ax*1.12&&ay>3.3)setPhysical('portrait');
}
function physicalOrientation(e){
 if(mode!=='camera'||!Number.isFinite(e.gamma)||!Number.isFinite(e.beta))return;
 const g=Math.abs(e.gamma),b=Math.abs(e.beta),now=performance.now();
 if(g>24){lastOrientationSide=Math.sign(e.gamma);lastOrientationAt=now;}
 if(b>45&&b>g*1.35){
  const sign=Math.sign(e.beta);
  if(initialPortraitBetaSign===null)initialPortraitBetaSign=sign;
  physicalInverted=sign!==initialPortraitBetaSign;
 }
 // Gravity is more stable than beta/gamma on Android while locked.
 if(lastMotionAt&&now-lastMotionAt<1600)return;
 if(g>=28&&g>b*1.12)setPhysical(e.gamma>=0?'right':'left');
 else if(b>=28&&b>g*1.12)setPhysical('portrait');
}
function devicePortrait(){return matchMedia('(orientation: portrait)').matches;}
function effectivePortrait(){return physicalPortrait??devicePortrait();}
function applyPhysicalLayout(){
 const landscape=!effectivePortrait(),locked=landscape&&devicePortrait();
 studio.classList.toggle('video-landscape',landscape);
 studio.classList.toggle('video-locked-left',locked&&physicalSide>=0);
 studio.classList.toggle('video-locked-right',locked&&physicalSide<0);
}
function drawFrame(){
 if(mode==='none')return;
 const w=media.videoWidth,h=media.videoHeight;
 if(w&&h&&media.readyState>=2){
  const portrait=mode==='camera'?effectivePortrait():h>=w;
  const turn=window.HNLVideoOrientation.videoTurn({
   mode,rawWidth:w,rawHeight:h,portrait,side:physicalSide,
   inverted:mode==='camera'&&physicalInverted,manual:rotation
  });
  const flip=turn===90||turn===270;
  const choice=$('videoResolution').value,limit=choice==='original'?Infinity:Number(choice);
  const scale=Math.min(1,limit/Math.min(w,h),3840/Math.max(w,h));
  const sourceWidth=flip?h:w,sourceHeight=flip?w:h;
  const W=Math.max(2,Math.round(sourceWidth*scale/2)*2);
  const H=Math.max(2,Math.round(sourceHeight*scale/2)*2);
  if(workCanvas.width!==W||workCanvas.height!==H){workCanvas.width=W;workCanvas.height=H;}
  const g=workCtx;
  g.fillStyle='#000';g.fillRect(0,0,W,H);g.save();
  if(turn===90){g.translate(W,0);g.rotate(Math.PI/2);g.drawImage(media,0,0,H,W);}
  else if(turn===270){g.translate(0,H);g.rotate(-Math.PI/2);g.drawImage(media,0,0,H,W);}
  else if(turn===180){g.translate(W,H);g.rotate(Math.PI);g.drawImage(media,0,0,W,H);}
  else g.drawImage(media,0,0,W,H);
  g.restore();
  const date=mode==='file'?new Date(importDate.getTime()+(media.currentTime||0)*1000):new Date();
  try{window.HNLVideoBridge?.drawStamp(g,W,H,date,videoCode,Number($('videoStampSize').value)/100);}
  catch(e){if(!studio.dataset.stampError){studio.dataset.stampError='1';message('Không vẽ được dấu video: '+e.message);}}
  // Keep encoding dimensions fixed. When rotated mid-recording, letterbox
  // the ENTIRE composed image including overlays; never stretch.
  if(!recorder||recorder.state==='inactive'){
   if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  }
  const ow=canvas.width,oh=canvas.height;
  ctx.fillStyle='#000';ctx.fillRect(0,0,ow,oh);
  const fit=Math.min(ow/W,oh/H),dw=Math.round(W*fit),dh=Math.round(H*fit);
  ctx.drawImage(workCanvas,Math.round((ow-dw)/2),Math.round((oh-dh)/2),dw,dh);
 }
 if(recorder?.state==='recording'){
  const sec=Math.floor((performance.now()-recordingStart)/1000);
  $('videoElapsed').textContent='● REC '+String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
 }
 raf=requestAnimationFrame(drawFrame);
}
function frameLoop(){cancelAnimationFrame(raf);raf=requestAnimationFrame(drawFrame);}
function stopCameraTracks(){
 if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
 if(micStream){micStream.getTracks().forEach(t=>t.stop());micStream=null;}
}
function resetFileUrl(){if(sourceUrl)URL.revokeObjectURL(sourceUrl);sourceUrl='';}
function clearOutput(){
 outputSaved=true;outputBlob=null;output.pause();output.removeAttribute('src');output.load();if(outputUrl)URL.revokeObjectURL(outputUrl);outputUrl='';
 $('videoResult').hidden=true;syncButtons();
}
async function closeStudio(){
 if(recorder&&recorder.state==='recording'){message('Dừng quay trước khi đóng camera.');return;}
 closeVideoSettings();
 media.pause();media.srcObject=null;media.removeAttribute('src');media.load();
 stopCameraTracks();resetFileUrl();clearOutput();
 mode='none';physicalPortrait=null;physicalInverted=false;initialPortraitBetaSign=null;rotation=0;lastMotionAt=0;lastOrientationAt=0;lastOrientationSide=0;fixedTurn=null;
 studio.classList.remove('video-open','video-landscape','video-locked-left','video-locked-right');
 document.body.classList.remove('hnl-video-live');cancelAnimationFrame(raf);raf=0;
 message('Chọn video hoặc mở camera để bắt đầu.');syncButtons();
}
async function openCamera(){
 if(isBusy||recorder?.state==='recording')return;
 if(!await chooseMedia('video'))return;
 if(window.HNLVideoBridge?.photoCameraActive()){$('closeCamera')?.click();}
 await closeStudio();
 if(!navigator.mediaDevices?.getUserMedia){message('Trình duyệt không hỗ trợ camera trực tiếp.');return;}
 try{
  const requested=Number($('videoResolution').value)||1080,rate=Number($('videoFps').value)||30;
  cameraStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:Math.round(requested*16/9)},height:{ideal:requested},frameRate:{ideal:rate}}});
  media.srcObject=cameraStream;media.muted=true;media.playsInline=true;await media.play();
  mode='camera';videoCode=makeVideoCode();rotation=0;physicalPortrait=null;physicalSide=1;physicalInverted=false;initialPortraitBetaSign=null;candidate='';lastMotionAt=0;lastOrientationAt=0;lastOrientationSide=0;samples=0;fixedTurn=null;
  studio.classList.add('video-open');document.body.classList.add('hnl-video-live');applyPhysicalLayout();frameLoop();syncButtons();
  message('Camera video đã mở. Nhấn Quay video để bắt đầu. Có thể ghi âm nếu cấp quyền micro.');
 }catch(e){stopCameraTracks();message('Không mở được camera video: '+(e.message||e));}
}
async function importVideo(selected){
 if(!selected||recorder?.state==='recording')return;
 if(!await chooseMedia('video'))return;
 if(outputBlob&&!outputSaved&&!window.confirm('Video đang tạo chưa được lưu. Chọn video khác và bỏ bản xuất này?'))return;
 if(!selected.type.startsWith('video/')&&!/\.(mp4|webm|mov|m4v|ogv)$/i.test(selected.name)){message('Hãy chọn tệp video MP4, WebM hoặc MOV mà trình duyệt hỗ trợ.');return;}
 await closeStudio();file=selected;importDate=new Date(selected.lastModified||Date.now());
 sourceUrl=URL.createObjectURL(selected);media.src=sourceUrl;media.muted=false;media.playsInline=true;
 mode='file';videoCode=makeVideoCode();rotation=0;physicalInverted=false;fixedTurn=null;
 try{
  await new Promise((resolve,reject)=>{
   media.addEventListener('loadedmetadata',resolve,{once:true});media.addEventListener('error',()=>reject(Error('Định dạng video chưa được hỗ trợ trên thiết bị.')),{once:true});
   media.load();
  });
  studio.classList.add('video-open');applyPhysicalLayout();frameLoop();syncButtons();
  message('Đã chọn '+selected.name+'. Xem thử hoặc chọn Xuất video có dấu. Video gốc không thay đổi.');
  studio.scrollIntoView({behavior:'smooth',block:'center'});
 }catch(e){await closeStudio();message(e.message);}
}
async function sourceAudioTracks(){
 fallbackNoAudio=false;
 if(mode==='camera'){
  try{micStream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});return micStream.getAudioTracks();}
  catch(_){fallbackNoAudio=true;return [];}
 }
 // Reuse the original audio stream where supported. If absent, WebAudio
 // can route HTMLMediaElement audio into the output without uploading it.
 try{const stream=media.captureStream?.();if(stream?.getAudioTracks().length)return stream.getAudioTracks();}catch(_){}
 try{
  audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();
  audioSource=audioSource||audioContext.createMediaElementSource(media);
  audioDestination=audioDestination||audioContext.createMediaStreamDestination();
  if(!audioSource.__hnlConnected){audioSource.connect(audioDestination);audioSource.__hnlConnected=true;}
  await audioContext.resume();return audioDestination.stream.getAudioTracks();
 }catch(_){fallbackNoAudio=true;return [];}
}
async function startRecording(){
 if(!supportsCapture()){message('Trình duyệt này không hỗ trợ ghi video có dấu bằng MediaRecorder/canvas.captureStream.');return;}
 if(recorder?.state==='recording'||isBusy||!['file','camera'].includes(mode))return;
 const mime=mimeType();if(!mime){message('Không có định dạng video tương thích để xuất trên trình duyệt này.');return;}
 isBusy=true;
 try{
  clearOutput();
  if(mode==='file'){
   media.pause();media.currentTime=0;
   await new Promise(resolve=>{if(media.seeked||Math.abs(media.currentTime)<.05)setTimeout(resolve,60);else media.addEventListener('seeked',resolve,{once:true});});
   media.muted=false;await media.play();
  }
  // Set the initial output dimensions; do not freeze subsequent orientation.
  const rawPortrait=media.videoHeight>=media.videoWidth;
  const intendedPortrait=mode==='camera'?effectivePortrait():rawPortrait;
  fixedTurn=window.HNLVideoOrientation.videoTurn({
   mode,rawWidth:media.videoWidth,rawHeight:media.videoHeight,
   portrait:intendedPortrait,side:physicalSide,manual:rotation
  });
  // Give video frames a full paint before capturing, and preserve the
  // same rendered time/logo as the live preview.
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const audioTracks=await sourceAudioTracks();
  const visual=canvas.captureStream(Number($('videoFps').value)||30);
  exportStream=new MediaStream([...visual.getVideoTracks(),...audioTracks]);
  recordingMode=mode;recordingDate=new Date();
  recordingName=mode==='file'?(file?.name||'Video').replace(/\.[^.]+$/,''):'HNLMark_Camera_'+recordingDate.toISOString().replace(/[T:.Z]/g,'-');
  recordingMime=mime;chunks=[];
  recorder=new MediaRecorder(exportStream,{mimeType:mime,videoBitsPerSecond:Number($('videoBitrate').value)||5000000});
  recorder.addEventListener('dataavailable',e=>{if(e.data?.size)chunks.push(e.data);});
  recorder.addEventListener('error',e=>message('Lỗi ghi video: '+(e.error?.message||'MediaRecorder')));
  recorder.addEventListener('stop',finishRecording,{once:true});
  recorder.start(1000);recordingStart=performance.now();studio.classList.add('is-recording');
  if(fallbackNoAudio)message('Đang ghi video KHÔNG có âm thanh: micro/nguồn âm thanh không khả dụng.');
  else message(mode==='camera'?'Đang quay video có dấu và âm thanh…':'Đang xuất video có dấu theo thời lượng thực…');
  syncButtons();
 }catch(e){fixedTurn=null;message('Không thể bắt đầu video: '+(e.message||e));if(exportStream)exportStream.getVideoTracks().forEach(t=>t.stop());exportStream=null;stopMicOnly();}
 finally{isBusy=false;}
}
function stopMicOnly(){if(micStream){micStream.getTracks().forEach(t=>t.stop());micStream=null;}}
function stopRecording(){
 if(recorder?.state==='recording'){
  recorder.stop();$('videoStop').disabled=true;message('Đang hoàn tất video…');
 }
}
async function finishRecording(){
 closeVideoSettings();
 const result=new Blob(chunks,{type:recorder?.mimeType||recordingMime});chunks=[];
 if(exportStream)exportStream.getVideoTracks().forEach(t=>t.stop());exportStream=null;stopMicOnly();recorder=null;
 fixedTurn=null;$('videoStop').disabled=false;studio.classList.remove('is-recording');
 media.pause();if(recordingMode==='camera'){media.srcObject=null;stopCameraTracks();mode='none';document.body.classList.remove('hnl-video-live');}
 else mode='file';
 if(result.size){
  outputSaved=false;outputBlob=result;outputUrl=URL.createObjectURL(result);output.src=outputUrl;
  $('videoResult').hidden=false;
  $('videoSavedFormat').textContent=extFor(result.type||recordingMime).toUpperCase()+' · '+(result.size/1048576).toFixed(1)+' MB';
  message('Đã tạo video có dấu. Chọn Lưu video để tải về máy'+(fallbackNoAudio?' (không có âm thanh).':'.'));
 }else message('Video trống; hãy thử quay lại.');
 syncButtons();
}
function saveResult(){
 if(!outputBlob||!outputUrl)return;
 const ext=extFor(outputBlob.type||recordingMime);
 const name=recordingName+'_Timemark_'+videoCode+'.'+ext;
 if(window.HNLAndroidApp?.saveBlob){
  message('Đang lưu video vào Tải xuống/HNLMark…');
  window.HNLAndroidApp.saveBlob(outputBlob,name)
   .then(()=>{outputSaved=true;message('Đã lưu video trong Tải xuống/HNLMark.');})
   .catch(e=>message('Không lưu được video: '+(e.message||e)));
  return;
 }
 const a=document.createElement('a');a.href=outputUrl;a.download=name;
 document.body.appendChild(a);a.click();a.remove();outputSaved=true;
 message('Đã gửi yêu cầu tải video. Kiểm tra thư mục Tải xuống.');
}
function switchToPhoto(){
 const wasLive=mode==='camera';
 chooseMedia('photo').then(ok=>{if(ok&&wasLive)$('openCamera')?.click();}).catch(err=>message(err.message));
}
$('videoSettingsToggle').addEventListener('click',toggleVideoSettings);
$('videoFileShortcut').addEventListener('click',()=>{if(recorder?.state==='recording'){message('Dừng quay trước khi chọn file.');return;}$('photoInput').click();});
$('photoToVideo').addEventListener('click',()=>{openCamera().catch(err=>message(err.message));});
$('videoRecord').addEventListener('click',()=>startRecording().catch(err=>message(err.message)));
$('videoStop').addEventListener('click',stopRecording);
$('videoSave').addEventListener('click',saveResult);
$('videoClose').addEventListener('click',()=>{if(outputBlob&&!outputSaved&&!window.confirm('Video chưa được lưu xuống máy. Đóng và bỏ bản xuất này?'))return;closeStudio().catch(err=>message(err.message));});
$('videoFlip').addEventListener('click',async()=>{
 if(recorder?.state==='recording'){message('Không đổi camera khi đang quay.');return;}
 if(mode==='camera'){
  const current=cameraStream?.getVideoTracks()[0]?.getSettings()?.facingMode;
  if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());
  try{
   const face=current==='user'?'environment':'user';
   const req=Number($('videoResolution').value)||1080,rate=Number($('videoFps').value)||30;
   cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:face},width:{ideal:Math.round(req*16/9)},height:{ideal:req},frameRate:{ideal:rate}},audio:false});
   media.srcObject=cameraStream;await media.play();frameLoop();
  }catch(e){message('Không đổi được camera: '+e.message);}
 }
});
$('videoRotate').addEventListener('click',()=>{rotation=(rotation+90)%360;message('Đã xoay video '+rotation+'°. Hình và dấu xoay cùng nhau.');});
$('videoRotate180').addEventListener('click',()=>{rotation=(rotation+180)%360;message('Đã lật 180°: hình và dấu thời gian xoay cùng nhau.');});
$('videoStampSize').addEventListener('input',()=>{$('videoStampSizeValue').textContent=$('videoStampSize').value+'%';});
$('videoPlayPause').addEventListener('click',()=>{
 if(media.paused)media.play().catch(e=>message('Không mở video: '+e.message));else media.pause();
 syncButtons();
});
$('videoPhotoMode').addEventListener('click',switchToPhoto);
$('videoDiscard').addEventListener('click',clearOutput);
media.addEventListener('ended',()=>{if(recorder?.state==='recording'&&recordingMode==='file')stopRecording();syncButtons();});
media.addEventListener('play',syncButtons);media.addEventListener('pause',syncButtons);
window.addEventListener('devicemotion',physicalMotion);window.addEventListener('deviceorientation',physicalOrientation);
window.addEventListener('resize',applyPhysicalLayout);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&recorder?.state==='recording')stopRecording();});
window.addEventListener('pagehide',()=>{if(recorder?.state==='recording')recorder.stop();stopCameraTracks();});
window.HNLVideoStudio={importVideo:(file)=>importVideo(file),openCamera:()=>openCamera(),getMode:()=>mode};
updateMediaPicker();syncButtons();
})();
