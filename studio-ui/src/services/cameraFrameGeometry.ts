/** Shared camera output framing. This crops pixels; CSS-only object-cover does not. */
import type {AspectRatioMode} from '../types/hnl';
export type CameraCrop={x:number;y:number;width:number;height:number};
export function outputAspect(mode:AspectRatioMode,width:number,height:number):number{
 if(!(width>0&&height>0))throw Error('Kích thước khung camera không hợp lệ');
 if(mode==='full')return width/height;
 if(mode==='1:1')return 1;
 const landscape=width>height;
 const ratio=mode==='16:9'?16/9:4/3;
 return landscape?ratio:1/ratio;
}
export function cameraCenterCrop(width:number,height:number,aspect:number):CameraCrop{
 if(!(width>0&&height>0&&aspect>0&&Number.isFinite(aspect)))throw Error('Tỷ lệ ảnh không hợp lệ');
 const source=width/height;
 if(source>aspect){const w=height*aspect;return{x:(width-w)/2,y:0,width:w,height};}
 const h=width/aspect;return{x:0,y:(height-h)/2,width,height:h};
}
export function cropCapturedCanvas(input:HTMLCanvasElement,mode:AspectRatioMode):HTMLCanvasElement{
 if(mode==='full')return input;
 const crop=cameraCenterCrop(input.width,input.height,outputAspect(mode,input.width,input.height));
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(crop.width));canvas.height=Math.max(1,Math.round(crop.height));
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Không thể cắt đúng tỷ lệ ảnh');
 ctx.drawImage(input,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);
 return canvas;
}
