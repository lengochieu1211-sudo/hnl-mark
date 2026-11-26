import {enhanceRowsV2} from './smartErase.ts';
import type {PhotoEnhance} from './smartErase.ts';
export const LIVE_HD_MAX_EDGE=720;
export const LIVE_HD_FRAME_MS=83;
export type LiveHDSettings={edits:Required<PhotoEnhance>;exposure:number;zoom:number};
export function liveHDGeometry(w:number,h:number,zoom:number,cap=LIVE_HD_MAX_EDGE){
 const z=Math.max(1,Math.min(5,Number.isFinite(zoom)?zoom:1));
 const sw=w/z,sh=h/z;
 const scale=Math.min(1,cap/Math.max(sw,sh));
 return {sx:(w-sw)/2,sy:(h-sh)/2,sw,sh,width:Math.max(1,Math.round(sw*scale)),height:Math.max(1,Math.round(sh*scale))};
}
/** One bounded preview loop: current settings are sampled without restarting.
 * Crop zoom before downsampling; mirror remains CSS, same as raw viewfinder. */
export function startLivePhotoEnhance(video:HTMLVideoElement,canvas:HTMLCanvasElement,getSettings:()=>LiveHDSettings,onError:()=>void){
 let timer=0,stopped=false,lastFrame=-1,lastKey='',output:ImageData|null=null,cap=LIVE_HD_MAX_EDGE,slow=0,fast=0;
 canvas.style.visibility='hidden';
 const context=canvas.getContext('2d',{willReadFrequently:true});
 const stop=()=>{stopped=true;window.clearTimeout(timer);canvas.style.visibility='hidden';};
 if(!context){onError();return stop;}
 const frame=()=>{
   if(stopped)return;
   const start=performance.now();
   try{
     const settings=getSettings(),key=JSON.stringify(settings);
     if(document.hidden||video.readyState<2||!video.videoWidth||!video.videoHeight){canvas.style.visibility='hidden';lastFrame=-1;lastKey='';}
     else if(video.currentTime!==lastFrame||key!==lastKey){
       const {sx,sy,sw,sh,width,height}=liveHDGeometry(video.videoWidth,video.videoHeight,settings.zoom,cap);
       if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;output=null;}
       context.filter=`brightness(${settings.exposure})`;
       context.drawImage(video,sx,sy,sw,sh,0,0,width,height);
       context.filter='none';
       const source=context.getImageData(0,0,width,height);
       if(!output)output=context.createImageData(width,height);
       enhanceRowsV2(source.data,width,height,0,height,output.data,settings.edits);
       context.putImageData(output,0,0);
       canvas.style.visibility='visible';lastFrame=video.currentTime;lastKey=key;
       const cost=performance.now()-start;
       if(cost>45){slow++;fast=0;if(slow>=3){cap=Math.max(360,cap-120);slow=0;}}
       else if(cost<22){fast++;slow=0;if(fast>=20){cap=Math.min(LIVE_HD_MAX_EDGE,cap+120);fast=0;}}
       else{slow=0;fast=0;}
     }
     timer=window.setTimeout(frame,document.hidden?250:Math.max(16,LIVE_HD_FRAME_MS-(performance.now()-start)));
   }catch{stop();onError();}
 };
 frame();return stop;
}
