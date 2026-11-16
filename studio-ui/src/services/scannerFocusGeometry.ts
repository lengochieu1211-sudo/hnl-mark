/** Get the real pixel location inside an object-contain camera preview.
 * The video element bounding rect may already reflect CSS digital zoom.
 * Avoid reporting focus when a finger touches a letterbox instead of pixels.
 */
export type ScannerFocusRect={left:number;top:number;width:number;height:number};
export function scannerTapOnVideo(
 pointer:{clientX:number;clientY:number},videoRect:ScannerFocusRect,
 rawWidth:number,rawHeight:number
):{x:number;y:number}|null{
 if(videoRect.width<=0||videoRect.height<=0||rawWidth<=0||rawHeight<=0)return null;
 const scale=Math.min(videoRect.width/rawWidth,videoRect.height/rawHeight);
 const displayW=rawWidth*scale,displayH=rawHeight*scale;
 const left=videoRect.left+(videoRect.width-displayW)/2;
 const top=videoRect.top+(videoRect.height-displayH)/2;
 const x=(pointer.clientX-left)/displayW;
 const y=(pointer.clientY-top)/displayH;
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>1||y>1)return null;
 return {x,y};
}
