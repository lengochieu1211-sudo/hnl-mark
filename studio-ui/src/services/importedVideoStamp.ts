/** Render a user-picked video to a NEW stamped file without changing the original.
 * Video is decoded by the browser, encoded in real time via CanvasCapture/MediaRecorder.
 * Audio is routed through Web Audio into the output MediaStream, never to the speakers.
 * Unsupported codecs, permissions or media durations cause an explicit error.
 */
import type {WatermarkConfig} from '../types/hnl';
import {drawOriginalTimemark} from './timemarkRenderer';

const MAX_DURATION_SECONDS=300; // Guard against exhausting a mobile device's RAM.
const LOAD_TIMEOUT_MS=15000;
const FPS=25;
function localDate(date:Date){
 const two=(v:number)=>String(v).padStart(2,'0');
 return `${date.getFullYear()}-${two(date.getMonth()+1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}

export async function stampImportedVideo(
 original:Blob,config:WatermarkConfig,code:string,
 onProgress?:(percent:number)=>void,signal?:AbortSignal,
):Promise<Blob>{
 if(!original.size||!original.type.startsWith('video/'))throw Error('Tệp được chọn không phải video hợp lệ.');
 if(!['timemark','none'].includes(config.templateId))throw Error('Hãy chọn mẫu Timemark trước khi chèn vào video.');
 if(typeof MediaRecorder==='undefined'||typeof HTMLCanvasElement.prototype.captureStream!=='function')
   throw Error('Android WebView chưa hỗ trợ mã hóa video có dấu. Tệp gốc vẫn được giữ nguyên.');
 const candidate=['video/webm;codecs=vp8,opus','video/webm;codecs=vp8','video/webm','video/mp4'];
 const mime=candidate.find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime)throw Error('Thiết bị không hỗ trợ codec để xuất video có dấu.');
 const src=URL.createObjectURL(original);
 const video=document.createElement('video');
 video.style.cssText='position:fixed;left:-2px;top:-2px;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1';
 document.body.appendChild(video);
 video.src=src;video.playsInline=true;video.preload='auto';video.autoplay=false;
 video.muted=false;video.volume=1;
 let audio:AudioContext|null=null;
 let drawingStream:MediaStream|null=null;
 let recorder:MediaRecorder|null=null;
 let frame=0;let watchdog=0;
 let stopRequested=false;
 try{
   await new Promise<void>((resolve,reject)=>{
     if(signal?.aborted){reject(Error('Đã hủy xử lý video.'));return;}
     const timeout=window.setTimeout(()=>finish(Error('Không đọc được video (quá thời gian). Hãy thử MP4 H.264/AAC.')),LOAD_TIMEOUT_MS);
     const finish=(error?:Error)=>{
       window.clearTimeout(timeout);
       video.removeEventListener('loadedmetadata',ok);
       video.removeEventListener('error',fail);
       if(error)reject(error);else resolve();
     };
     const ok=()=>finish();
     const fail=()=>finish(Error('Android không giải mã được video này. Hãy thử tệp MP4 H.264/AAC hoặc WebM VP8.'));
     video.addEventListener('loadedmetadata',ok,{once:true});
     video.addEventListener('error',fail,{once:true});
     video.load();
   });
   // Some valid VP8 WebM captures have no finite duration metadata; ended still works.
   const hasDuration=Number.isFinite(video.duration)&&video.duration>0;
   if(hasDuration&&video.duration>MAX_DURATION_SECONDS)
     throw Error('Video quá 5 phút. Hãy cắt thành đoạn ngắn hơn để xuất an toàn trên điện thoại.');
   if(signal?.aborted)throw Error('Đã hủy xử lý video.');
   const canvas=document.createElement('canvas');
   canvas.width=video.videoWidth;canvas.height=video.videoHeight;
   if(!canvas.width||!canvas.height)throw Error('Video không có khung hình hợp lệ.');
   const ctx=canvas.getContext('2d',{alpha:false});
   if(!ctx)throw Error('Không tạo được bộ xử lý khung hình.');
   const render=()=>{
     if(video.readyState<2)return;
     ctx.drawImage(video,0,0,canvas.width,canvas.height);
     if(config.templateId==='timemark'){
       // Imported video keeps its selected time and chosen Timemark configuration.
       const stampedTime=config.dateTimeIso || localDate(new Date());
       drawOriginalTimemark(ctx,canvas.width,canvas.height,{...config,dateTimeIso:stampedTime},0,code);
     }
   };
   render();
   drawingStream=canvas.captureStream(FPS);
   const tracks=[...drawingStream.getVideoTracks()];
   if(!tracks.length)throw Error('Không tạo được đường hình video xuất.');
   // Explicit audio route: do not quietly remove an existing video's sound.
   if(typeof AudioContext!=='undefined'){
     audio=new AudioContext();
     const input=audio.createMediaElementSource(video);
     const destination=audio.createMediaStreamDestination();
     input.connect(destination); // Only to the recording stream; no speaker loopback.
     tracks.push(...destination.stream.getAudioTracks());
     await audio.resume();
   }else{
     const captured=(video as HTMLVideoElement & {captureStream?:()=>MediaStream}).captureStream?.();
     if(captured)tracks.push(...captured.getAudioTracks());
   }
   const output=new MediaStream(tracks);
   const pieces:Blob[]=[];
   const completed=new Promise<Blob>((resolve,reject)=>{
     const r=new MediaRecorder(output,{mimeType:mime,videoBitsPerSecond:4_000_000});
     recorder=r;
     r.ondataavailable=e=>{if(e.data?.size)pieces.push(e.data);};
     r.onerror=()=>reject(Error('Bộ mã hóa dừng bất thường. Video gốc được giữ nguyên.'));
     r.onstop=()=>{
       if(signal?.aborted){reject(Error('Đã hủy xuất video.'));return;}
       if(!video.ended && !stopRequested){reject(Error('Đoạn video bị dừng trước khi hoàn tất.'));return;}
       const blob=new Blob(pieces,{type:r.mimeType||mime});
       if(!blob.size)reject(Error('Video xuất rỗng, không lưu hoặc chia sẻ.'));
       else resolve(blob);
     };
     r.start(1000);
   });
   const paint=()=>{
     if(video.ended||signal?.aborted)return;
     render();
     if(hasDuration)onProgress?.(Math.max(0,Math.min(99,Math.round(video.currentTime/video.duration*100))));
     frame=window.requestAnimationFrame(paint);
   };
   const playbackDone=new Promise<void>((resolve,reject)=>{
     const ended=()=>{video.removeEventListener('ended',ended);video.removeEventListener('error',error);resolve();};
     const error=()=>{video.removeEventListener('ended',ended);video.removeEventListener('error',error);reject(Error('Không phát được video đã nhập. Không thể chèn dấu.'));};
     video.addEventListener('ended',ended,{once:true});video.addEventListener('error',error,{once:true});
   });
   try{
     void playbackDone.catch(()=>{});
     await video.play();
     paint();
     const timedOut=new Promise<never>((_,reject)=>{
       watchdog=window.setTimeout(()=>reject(Error('Quá thời gian xuất video. Tệp gốc vẫn còn nguyên.')),hasDuration?Math.round(video.duration*1500+15000):MAX_DURATION_SECONDS*1000+15000);
     });
     await Promise.race([playbackDone,timedOut]);
     if(signal?.aborted)throw Error('Đã hủy xuất video.');
     render();
     stopRequested=true;
     if(recorder?.state==='recording')recorder.stop();
     const blob=await completed;
     onProgress?.(100);
     return blob;
   }catch(e){
     if(recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch{}}
     void completed.catch(()=>{});
     throw e;
   }
 }finally{
   if(frame)window.cancelAnimationFrame(frame);
   if(watchdog)window.clearTimeout(watchdog);
   video.pause();video.removeAttribute('src');video.load();video.remove();
   if(recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch{}}
   drawingStream?.getTracks().forEach(t=>t.stop());
   if(audio)void audio.close().catch(()=>{});
   URL.revokeObjectURL(src);
 }
}
