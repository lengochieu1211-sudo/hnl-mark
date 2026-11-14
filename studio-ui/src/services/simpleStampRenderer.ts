/** Deliberately small timestamp presets, rendered identically on preview and exported pixels. */
import type {OrientationDeg,WatermarkConfig} from '../types/hnl';
import {watermarkFontFamily} from './watermarkFonts';
import {drawWatermarkLogo} from './watermarkLogo';
export const isSimpleStamp=(id:string)=>['simple-datetime','simple-date','simple-time'].includes(id);
const pad=(x:number)=>String(x).padStart(2,'0');
export function simpleStampText(config:WatermarkConfig):string{
 const raw=new Date(config.dateTimeIso);
 const d=Number.isFinite(raw.getTime())?raw:new Date();
 const date=`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
 const seconds=config.dateFormat==='DD/MM/YYYY HH:mm:ss'?':'+pad(d.getSeconds()):'';
 const time=`${pad(d.getHours())}:${pad(d.getMinutes())}${seconds}`;
 return config.templateId==='simple-date'?date:config.templateId==='simple-time'?time:
  config.dateFormat==='HH:mm · DD/MM/YYYY'?`${time} · ${date}`:
  config.dateFormat==='YYYY-MM-DD HH:mm'?`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${time}`:`${date}  ${time}`;
}
/** All placement and font size are proportional to the actual output canvas. */
export function drawSimpleStamp(ctx:CanvasRenderingContext2D,width:number,height:number,
 config:WatermarkConfig,orientation:OrientationDeg=0,logo?:HTMLImageElement|ImageBitmap):void{
 if(!isSimpleStamp(config.templateId)||width<=0||height<=0)return;
 ctx.save();
 let W=width,H=height;
 if(orientation===90||orientation===-90){
   W=height;H=width;
   ctx.translate(width/2,height/2);ctx.rotate(orientation*Math.PI/180);ctx.translate(-W/2,-H/2);
 }else if(orientation===180){
   ctx.translate(width,height);ctx.rotate(Math.PI);
 }
 const text=simpleStampText(config);
 let size=Math.max(9,Math.round(Math.min(W,H)*Math.max(10,config.fontSizePx)/400));
 const padX=Math.max(7,W*.026),padY=Math.max(7,H*.026);
 ctx.textBaseline='middle';ctx.font=`600 ${size}px ${watermarkFontFamily(config.fontKey)}`;
 let w=ctx.measureText(text).width;
 // A long date must fit a narrow locked-rotation viewport without clipping.
 if(w>W-2*padX){size=Math.max(6,Math.floor(size*(W-2*padX)/w));ctx.font=`600 ${size}px ${watermarkFontFamily(config.fontKey)}`;w=ctx.measureText(text).width;}
 const preset=config.positionPreset;
 let x=padX,y=H-padY-size/2;
 if(preset==='top-left'||preset==='top-right')y=padY+size/2;
 if(preset==='top-right'||preset==='bottom-right')x=W-padX-w;
 if(preset==='bottom-center')x=(W-w)/2;
 if(preset==='custom'){
  x=W*(config.customPos.xPct/100)-w/2;
  y=H*(config.customPos.yPct/100);
 }
 x=Math.max(padX,Math.min(W-padX-w,x));
 y=Math.max(padY+size/2,Math.min(H-padY-size/2,y));
 if(config.bgOpacity>0){
   ctx.fillStyle=`rgba(5,14,25,${Math.min(.75,config.bgOpacity*.46)})`;
   ctx.fillRect(Math.max(0,x-size*.35),y-size*.72,Math.max(0,Math.min(W-(x-size*.35),w+size*.7)),size*1.45);
 }
 ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=Math.max(2,size*.18);
 ctx.fillStyle=config.textColor||'#ffffff';ctx.fillText(text,x,y);
 drawWatermarkLogo(ctx,W,H,config,logo);
 ctx.restore();
}
