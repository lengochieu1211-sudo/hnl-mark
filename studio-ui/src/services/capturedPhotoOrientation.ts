/**
 * A WebView video track can keep its sensor raster aspect even when the
 * handset turns. Unlike a native still camera, canvas.toBlob emits no EXIF
 * orientation. Normalize the captured *pixels* BEFORE storing the original.
 * Do NOT change the already-correct live watermark rotation.
 */
import type {OrientationDeg} from '../types/hnl';
import {normalizeStampAngle} from './stampOrientation';
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
 if(liveStampAngle===90||liveStampAngle===-90)return liveStampAngle;
 return physical===90?-90:physical===-90?90:90;
}
export function orientCapturedCanvas(input:HTMLCanvasElement,turn:OrientationDeg):HTMLCanvasElement{
 if(turn===0)return input;
 const quarter=turn===90||turn===-90;
 const canvas=document.createElement('canvas');
 canvas.width=quarter?input.height:input.width;
 canvas.height=quarter?input.width:input.height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Không thể căn hướng ảnh chụp');
 ctx.translate(canvas.width/2,canvas.height/2);
 ctx.rotate(turn*Math.PI/180);
 ctx.drawImage(input,-input.width/2,-input.height/2);
 return canvas;
}
