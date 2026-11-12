/* HNLMark video studio v2.1.0: local capture/import, stamped video, optional audio. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const panel=$('videoPanel'), studio=$('videoStudio'), canvas=$('videoCanvas'), ctx=canvas?.getContext('2d',{alpha:false});
const media=$('videoMedia'), output=$('videoOutput');
if(!panel||!studio||!canvas||!ctx||!media||!output)return;
let mode='none', cameraStream=null, sourceUrl='', outputUrl='', outputBlob=null;
let file=null, rotation=0, recorder=null, chunks=[], raf=0, exportStream=null, micStream=null;
let recordingStart=0, recordingDate=null, importDate=null, recordingName='', recordingMime='', recordingMode='';
let videoCode='', isBusy=false, audioContext=null, audioSource=null, audioDestination=null, fallbackNoAudio=false;
let physicalPortrait=null, physicalSide=1, candidate='', samples=0, fixedTurn=null;
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
function syncButtons(){
 const active=mode==='camera'||mode==='file';
 const rec=!!recorder&&recorder.state==='recording';
 $('videoRecord').hidden=!active||rec;$('videoStop').hidden=!rec;
 $('videoFlip').hidden=mode!=='camera';$('videoPlayPause').hidden=mode!=='file'||rec;
 $('videoSave').disabled=!outputBlob;
 $('videoRecord').textContent=mode==='file'?'● Xuất video có dấu':'● Quay video';
 $('videoRotate').disabled=rec;$('videoFlip').disabled=rec;
 $('videoPlayPause').textContent=media.paused?'▶ Xem thử':'Ⅱ Tạm dừng';
 $('videoStudio').classList.toggle('is-recording',rec);
 $('videoCameraMode').hidden=mode!=='camera';
 $('videoFileMode').hidden=mode!=='file';
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
 if(ax>ay*1.16&&ax>3.6)setPhysical(x>=0?'right':'left');
 else if(ay>ax*1.16&&ay>3.6)setPhysical('portrait');
}
function physicalOrientation(e){
 if(mode!=='camera'||!Number.isFinite(e.gamma)||!Number.isFinite(e.beta))return;
 const g=Math.abs(e.gamma),b=Math.abs(e.beta);
 if(g>35&&g>b*1.2)setPhysical(e.gamma>=0?'right':'left');
 else if(b>35&&b>g*1.2)setPhysical('portrait');
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
  const mismatch=(h>=w)!==portrait;
  const base=mismatch?(portrait?90:(physicalSide>=0?90:270)):0;
  const turn=fixedTurn===null?(base+rotation)%360:fixedTurn,flip=turn===90||turn===270;
  const max=Math.min(1,1920/Math.max(w,h)),width=Math.max(1,Math.round((flip?h:w)*max)),height=Math.max(1,Math.round((flip?w:h)*max));
  // Dimensions are fixed during recording to prevent MediaRecorder renegotiation.
  if(!recorder||recorder.state==='inactive'){
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  }
  const W=canvas.width,H=canvas.height;
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  ctx.save();
  if(turn===90){ctx.translate(W,0);ctx.rotate(Math.PI/2);ctx.drawImage(media,0,0,H,W);}
  else if(turn===270){ctx.translate(0,H);ctx.rotate(-Math.PI/2);ctx.drawImage(media,0,0,H,W);}
  else if(turn===180){ctx.translate(W,H);ctx.rotate(Math.PI);ctx.drawImage(media,0,0,W,H);}
  else ctx.drawImage(media,0,0,W,H);
  ctx.restore();
  const t=mode==='file'?new Date(importDate.getTime()+(media.currentTime||0)*1000):new Date();
  try{window.HNLVideoBridge?.drawStamp(ctx,W,H,t,videoCode);}catch(e){if(!studio.dataset.stampError){studio.dataset.stampError='1';message('Không hiển thị được dấu video: '+e.message);}}
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
 outputBlob=null;output.pause();output.removeAttribute('src');output.load();if(outputUrl)URL.revokeObjectURL(outputUrl);outputUrl='';
 $('videoResult').hidden=true;syncButtons();
}
async function closeStudio(){
 if(recorder&&recorder.state==='recording'){message('Dừng quay trước khi đóng camera.');return;}
 media.pause();media.srcObject=null;media.removeAttribute('src');media.load();
 stopCameraTracks();resetFileUrl();clearOutput();
 mode='none';physicalPortrait=null;rotation=0;fixedTurn=null;
 studio.classList.remove('video-open','video-landscape','video-locked-left','video-locked-right');
 document.body.classList.remove('hnl-video-live');cancelAnimationFrame(raf);raf=0;
 message('Chọn video hoặc mở camera để bắt đầu.');syncButtons();
}
async function openCamera(){
 if(isBusy||recorder?.state==='recording')return;
 if(window.HNLVideoBridge?.photoCameraActive()){$('closeCamera')?.click();}
 await closeStudio();
 if(!navigator.mediaDevices?.getUserMedia){message('Trình duyệt không hỗ trợ camera trực tiếp.');return;}
 try{
  cameraStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});
  media.srcObject=cameraStream;media.muted=true;media.playsInline=true;await media.play();
  mode='camera';videoCode=makeVideoCode();rotation=0;physicalPortrait=null;physicalSide=1;candidate='';samples=0;
  studio.classList.add('video-open');document.body.classList.add('hnl-video-live');applyPhysicalLayout();frameLoop();syncButtons();
  message('Camera video đã mở. Nhấn Quay video để bắt đầu. Có thể ghi âm nếu cấp quyền micro.');
 }catch(e){stopCameraTracks();message('Không mở được camera video: '+(e.message||e));}
}
async function importVideo(selected){
 if(!selected||recorder?.state==='recording')return;
 if(!selected.type.startsWith('video/')&&!/\.(mp4|webm|mov|m4v|ogv)$/i.test(selected.name)){message('Hãy chọn tệp video MP4, WebM hoặc MOV mà trình duyệt hỗ trợ.');return;}
 await closeStudio();file=selected;importDate=new Date(selected.lastModified||Date.now());
 sourceUrl=URL.createObjectURL(selected);media.src=sourceUrl;media.muted=false;media.playsInline=true;
 mode='file';videoCode=makeVideoCode();rotation=0;
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
  // Freeze output orientation when recording begins, like a phone camera.
  const rawPortrait=media.videoHeight>=media.videoWidth;
  const intendedPortrait=mode==='camera'?effectivePortrait():rawPortrait;
  fixedTurn=((rawPortrait!==intendedPortrait?(intendedPortrait?90:(physicalSide>=0?90:270)):0)+rotation)%360;
  // Give video frames a full paint before capturing, and preserve the
  // same rendered time/logo as the live preview.
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const audioTracks=await sourceAudioTracks();
  const visual=canvas.captureStream(25);
  exportStream=new MediaStream([...visual.getVideoTracks(),...audioTracks]);
  recordingMode=mode;recordingDate=new Date();
  recordingName=mode==='file'?(file?.name||'Video').replace(/\.[^.]+$/,''):'HNLMark_Camera_'+recordingDate.toISOString().replace(/[T:.Z]/g,'-');
  recordingMime=mime;chunks=[];
  recorder=new MediaRecorder(exportStream,{mimeType:mime,videoBitsPerSecond:3500000});
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
 const result=new Blob(chunks,{type:recorder?.mimeType||recordingMime});chunks=[];
 if(exportStream)exportStream.getVideoTracks().forEach(t=>t.stop());exportStream=null;stopMicOnly();recorder=null;
 fixedTurn=null;$('videoStop').disabled=false;studio.classList.remove('is-recording');
 media.pause();if(recordingMode==='camera'){media.srcObject=null;stopCameraTracks();mode='none';document.body.classList.remove('hnl-video-live');}
 else mode='file';
 if(result.size){
  outputBlob=result;outputUrl=URL.createObjectURL(result);output.src=outputUrl;
  $('videoResult').hidden=false;
  $('videoSavedFormat').textContent=extFor(result.type||recordingMime).toUpperCase()+' · '+(result.size/1048576).toFixed(1)+' MB';
  message('Đã tạo video có dấu. Chọn Lưu video để tải về máy'+(fallbackNoAudio?' (không có âm thanh).':'.'));
 }else message('Video trống; hãy thử quay lại.');
 syncButtons();
}
function saveResult(){
 if(!outputBlob||!outputUrl)return;
 const ext=extFor(outputBlob.type||recordingMime);
 const a=document.createElement('a');a.href=outputUrl;a.download=recordingName+'_Timemark_'+videoCode+'.'+ext;document.body.appendChild(a);a.click();a.remove();
 message('Đã gửi yêu cầu tải video. Kiểm tra thư mục Tải xuống.');
}
function switchToPhoto(){
 if(recorder?.state==='recording'){message('Dừng quay trước khi chuyển sang Ảnh.');return;}
 closeStudio().then(()=>$('openCamera')?.click());
}
$('videoFileInput').addEventListener('change',e=>{const selected=e.target.files?.[0];e.target.value='';importVideo(selected).catch(err=>message(err.message));});
$('openVideoCamera').addEventListener('click',()=>{openCamera().catch(err=>message(err.message));});
$('photoToVideo').addEventListener('click',()=>{openCamera().catch(err=>message(err.message));});
$('videoRecord').addEventListener('click',()=>startRecording().catch(err=>message(err.message)));
$('videoStop').addEventListener('click',stopRecording);
$('videoSave').addEventListener('click',saveResult);
$('videoClose').addEventListener('click',()=>closeStudio());
$('videoFlip').addEventListener('click',async()=>{
 if(recorder?.state==='recording'){message('Không đổi camera khi đang quay.');return;}
 if(mode==='camera'){
  const current=cameraStream?.getVideoTracks()[0]?.getSettings()?.facingMode;
  if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());
  try{
   const face=current==='user'?'environment':'user';
   cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:face}},audio:false});
   media.srcObject=cameraStream;await media.play();frameLoop();
  }catch(e){message('Không đổi được camera: '+e.message);}
 }
});
$('videoRotate').addEventListener('click',()=>{
 if(recorder?.state==='recording'){message('Không đổi hướng trong lúc ghi; dừng trước khi xoay.');return;}
 rotation=(rotation+90)%360;message('Đã xoay khung video '+rotation+'°.');
});
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
syncButtons();
})();
