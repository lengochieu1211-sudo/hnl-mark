/**
 * A WebView video track can keep its sensor raster aspect even when the
 * handset turns. Unlike a native still camera, canvas.toBlob emits no EXIF
 * orientation. Normalize the captured *pixels* BEFORE storing the original.
 * Do NOT change the already-correct live watermark rotation.
 */
import type {OrientationDeg} from '../types/hnl';
import {normalizeStampAngle} from './stampOrientation.ts';
export function capturedPhotoTurn(width:number,height:number,physicalAngle:number,liveStampAngle:OrientationDeg):OrientationDeg{
 if(width===height||width<=0||height<=0)return 0;
 const physical=normalizeStampAngle(physicalAngle);
 const wantsLandscape=physical===90||physical===-90;
 const isLandscape=width>height;
 if(isLandscape===wantsLandscape){
  // Keep an already correctly laid-out raster untouched. A prior release
  // rotated only the text, producing a sideways tag on portrait JPEGs.
  return 0;
 }
 // Redmi/WebView may expose sensor-oriented pixels even though the live
 // watermark was counter-rotated correctly on screen. In that case pixels
 // must turn opposite the stamp; otherwise saved JPEGs invert by 180 degrees.
 if(liveStampAngle===90||liveStampAngle===-90)return -liveStampAngle as OrientationDeg;
 return physical===90?90:physical===-90?-90:90;
}
export function orientedFrameSize(width:number,height:number,turn:OrientationDeg):{width:number;height:number}{
 const quarter=turn===90||turn===-90;
 return {width:quarter?height:width,height:quarter?width:height};
}
export function orientCapturedCanvas(input:HTMLCanvasElement,turn:OrientationDeg):HTMLCanvasElement{
 if(turn===0)return input;
 const dimensions=orientedFrameSize(input.width,input.height,turn);
 const canvas=document.createElement('canvas');
 canvas.width=dimensions.width;
 canvas.height=dimensions.height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Không thể căn hướng ảnh chụp');
 ctx.translate(canvas.width/2,canvas.height/2);
 ctx.rotate(turn*Math.PI/180);
 ctx.drawImage(input,-input.width/2,-input.height/2);
 return canvas;
}
