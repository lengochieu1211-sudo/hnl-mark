/** Optional user-controlled watermark logo. The HNL APK launcher icon is NOT touched. */
import type {WatermarkConfig} from '../types/hnl';
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
export function logoEnabled(config:WatermarkConfig):boolean{
 return config.templateId==='timemark'?!!config.timemarkLogoEnabled:!!config.showLogo;
}
export function logoSrc(config:WatermarkConfig):string {
 const custom=config.logoImageDataUrl;
 return custom&&/^data:image\/(png|jpeg|webp);base64,/i.test(custom)&&custom.length<=400000
   ? custom:'./hnl-logo-192.png';
}
/** Decodes a logo for canvas output. Never alters the original file. */
export function loadWatermarkLogo(config:WatermarkConfig):Promise<HTMLImageElement|undefined>{
 if(!logoEnabled(config)||typeof Image==='undefined')return Promise.resolve(undefined);
 return new Promise(resolve=>{
   const im=new Image();let finished=false;
   const done=(image?:HTMLImageElement)=>{if(finished)return;finished=true;im.onload=null;im.onerror=null;resolve(image);};
   im.onload=()=>done(im);im.onerror=()=>done();im.src=logoSrc(config);
 });
}
export type LogoGeometry={x:number;y:number;w:number;h:number};
export function logoGeometry(width:number,height:number,config:WatermarkConfig,sourceWidth:number,sourceHeight:number):LogoGeometry{
 const size=clamp(Number(config.logoSizePct)||12,4,30)*Math.min(width,height)/100;
 const ratio=sourceWidth>0&&sourceHeight>0?sourceWidth/sourceHeight:1;
 const w=ratio>=1?size:size*ratio,h=ratio>=1?size/ratio:size;
 const pad=Math.max(5,Math.min(width,height)*.025);
 const p=config.logoPosition||'top-right';
 let x=width-pad-w/2,y=pad+h/2;
 if(p==='top-left'){x=pad+w/2;y=pad+h/2;}
 else if(p==='bottom-left'){x=pad+w/2;y=height-pad-h/2;}
 else if(p==='bottom-right'){x=width-pad-w/2;y=height-pad-h/2;}
 else if(p==='bottom-center'){x=width/2;y=height-pad-h/2;}
 else if(p==='custom'){
   x=width*clamp(Number(config.logoCustomPos?.xPct)||50,0,100)/100;
   y=height*clamp(Number(config.logoCustomPos?.yPct)||15,0,100)/100;
 }
 return {x:clamp(x,w/2,width-w/2)-w/2,y:clamp(y,h/2,height-h/2)-h/2,w,h};
}
export function drawWatermarkLogo(ctx:CanvasRenderingContext2D,width:number,height:number,config:WatermarkConfig,logo?:HTMLImageElement|ImageBitmap):void{
 if(!logo||!logoEnabled(config)||logo.width<=0||logo.height<=0)return;
 const {x,y,w,h}=logoGeometry(width,height,config,logo.width,logo.height);
 ctx.save();ctx.shadowColor='rgba(0,0,0,.40)';ctx.shadowBlur=Math.min(width,height)*.003;
 ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(w,h)*.24);ctx.clip();
 ctx.drawImage(logo,x,y,w,h);ctx.restore();
}
/** Convert a selected image into a small self-contained asset for offline preview/export. */
export async function normalizeWatermarkLogo(file:File):Promise<string>{
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Logo cần là PNG, JPG hoặc WebP.');
 if(file.size>2*1024*1024)throw Error('Logo vượt 2 MB; hãy chọn ảnh nhỏ hơn.');
 const bitmap=await createImageBitmap(file);
 try{
   const scale=Math.min(1,360/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Không xử lý được ảnh logo.');
   ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   let data=canvas.toDataURL('image/png');
   if(data.length>280000)data=canvas.toDataURL('image/webp',.88);
   if(data.length>280000)throw Error('Logo quá phức tạp; hãy chọn ảnh nhỏ hơn để có thể lưu offline.');
   return data;
 }finally{bitmap.close();}
}
