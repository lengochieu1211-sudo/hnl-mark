import {enhanceRows} from './smartErase';
import type {PhotoEnhance} from './smartErase';
export const LIVE_HD_MAX_EDGE=480;
export const LIVE_HD_FRAME_MS=100;
export function liveHDSize(w:number,h:number){
 if(w<=0||h<=0)return {width:0,height:0};
 const scale=Math.min(1,LIVE_HD_MAX_EDGE/Math.max(w,h));
 return {width:Math.max(1,Math.round(w*scale)),height:Math.max(1,Math.round(h*scale))};
}
/** Bounded CPU preview, not a second camera stream or full-resolution recorder. */
export function startLivePhotoEnhance(video:HTMLVideoElement,canvas:HTMLCanvasElement,edits:Required<PhotoEnhance>,exposure:number,onError:()=>void){
 let timer=0,stopped=false,lastFrame=-1,output:ImageData|null=null;
 canvas.style.visibility='hidden';
 const context=canvas.getContext('2d',{willReadFrequently:true});
 const stop=()=>{stopped=true;window.clearTimeout(timer);canvas.style.visibility='hidden';};
 if(!context){onError();return stop;}
 const frame=()=>{
   if(stopped)return;
   try{
     if(document.hidden){canvas.style.visibility='hidden';lastFrame=-1;}
     else if(video.readyState>=2&&video.videoWidth&&video.videoHeight&&video.currentTime!==lastFrame){
       const {width,height}=liveHDSize(video.videoWidth,video.videoHeight);
       if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;output=null;}
       context.filter=`brightness(${exposure})`;
       context.drawImage(video,0,0,width,height);
       context.filter='none';
       const source=context.getImageData(0,0,width,height);
       if(!output)output=context.createImageData(width,height);
       enhanceRows(source.data,width,height,0,height,output.data,edits);
       context.putImageData(output,0,0);
       canvas.style.visibility='visible';
       lastFrame=video.currentTime;
     }
     else if(video.readyState<2){canvas.style.visibility='hidden';lastFrame=-1;}
     timer=window.setTimeout(frame,LIVE_HD_FRAME_MS);
   }catch{stop();onError();}
 };
 frame();return stop;
}
