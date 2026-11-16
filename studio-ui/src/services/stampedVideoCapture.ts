/** Real-time video watermark raster, stabilized to the session's initial output aspect.
 * The camera sensor/display orientation is independent from a manual stamp rotation.
 */
import type {AspectRatioMode,OrientationDeg, WatermarkConfig} from '../types/hnl';
import {prepareTimemarkFont} from './timemarkRenderer';
import {loadWatermarkLogo} from './watermarkLogo';
import {drawConfiguredStamp,isRenderableStamp} from './stampRenderer';
import {capturedPhotoTurn,orientedFrameSize} from './capturedPhotoOrientation';
import {cameraCenterCrop,outputAspect} from './cameraFrameGeometry';

type StampedCapture={stream:MediaStream;stop:()=>void;width:number;height:number};

/** `orientation` is the automatic sensor/display residual, NEVER the manual stamp button.
 * `physicalAngle` may update while recording. Canvas dimensions remain fixed for the codec.
 */
export async function createStampedVideoCapture(
 video:HTMLVideoElement,
 config:WatermarkConfig,
 orientation:OrientationDeg|(()=>OrientationDeg),
 physicalAngle:number|(()=>number),
 photoCode:string,
 lens:'front'|'rear',
 zoom:number,
 brightness:number,
 desiredFps:number,
 aspectMode:AspectRatioMode='full'
):Promise<StampedCapture>{
 if(!isRenderableStamp(config.templateId))throw Error('Không tìm thấy bộ xuất video cho mẫu dấu này.');
 if(video.videoWidth<=0||video.videoHeight<=0||video.readyState<2)throw Error('Khung hình camera chưa sẵn sàng để ghi dấu.');
 const getStampAngle=()=>typeof orientation==='function'?orientation():orientation;
 const getPhysicalAngle=()=>typeof physicalAngle==='function'?physicalAngle():physicalAngle;
 const startTurn=capturedPhotoTurn(video.videoWidth,video.videoHeight,getPhysicalAngle(),getStampAngle());
 const initial=orientedFrameSize(video.videoWidth,video.videoHeight,startTurn);
 const firstCrop=cameraCenterCrop(initial.width,initial.height,outputAspect(aspectMode,initial.width,initial.height));
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(firstCrop.width));
 canvas.height=Math.max(1,Math.round(firstCrop.height));
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx||typeof canvas.captureStream!=='function')throw Error('WebView không hỗ trợ quay video có dấu trực tiếp (CanvasCapture).');
 await prepareTimemarkFont(config.fontKey);
 const logo=await loadWatermarkLogo(config);
 const fps=Math.min(30,Math.max(15,desiredFps));
 let active=true,frameId=0,previousFrame=0;
 const frame=(now:number)=>{
  if(!active)return;
  frameId=window.requestAnimationFrame(frame);
  if(now-previousFrame<1000/fps)return;
  previousFrame=now;
  if(video.readyState<2||!video.videoWidth||!video.videoHeight)return;
  const rawWidth=video.videoWidth,rawHeight=video.videoHeight;
  // Re-evaluate sensor angle every frame. If device rotates mid-recording,
  // keep a fixed encoder canvas and CENTER CROP rather than stretching video.
  const turn=capturedPhotoTurn(rawWidth,rawHeight,getPhysicalAngle(),getStampAngle());
  const oriented=orientedFrameSize(rawWidth,rawHeight,turn);
  const fillScale=Math.max(canvas.width/oriented.width,canvas.height/oriented.height);
  const cropZoom=Math.max(1,Math.min(5,zoom));
  ctx.save();
  ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.translate(canvas.width/2,canvas.height/2);
  ctx.scale(fillScale,fillScale);
  ctx.rotate(turn*Math.PI/180);
  if(lens==='front')ctx.scale(-1,1);
  const srcW=rawWidth/cropZoom,srcH=rawHeight/cropZoom;
  ctx.filter=`brightness(${brightness})`;
  ctx.drawImage(video,(rawWidth-srcW)/2,(rawHeight-srcH)/2,srcW,srcH,
   -rawWidth/2,-rawHeight/2,rawWidth,rawHeight);
  ctx.restore();
  if(config.templateId!=='none'){
    const timestamp=config.autoTime?{...config,dateTimeIso:toLocalTime(new Date())}:config;
    drawConfiguredStamp(ctx,canvas.width,canvas.height,timestamp,0,photoCode,logo);
  }
 };
 const stream=canvas.captureStream(fps);
 frame(performance.now());
 return {stream,width:canvas.width,height:canvas.height,stop:()=>{
  active=false;window.cancelAnimationFrame(frameId);
  stream.getTracks().forEach(track=>track.stop());
 }};
}
function toLocalTime(date:Date):string{
 const pad=(n:number)=>String(n).padStart(2,'0');
 return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
