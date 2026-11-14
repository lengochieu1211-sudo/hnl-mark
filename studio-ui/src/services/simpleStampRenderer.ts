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
 config:WatermarkConfig,_orientation:OrientationDeg=0,logo?:HTMLImageElement|ImageBitmap):void{
 if(!isSimpleStamp(config.templateId)||width<=0||height<=0)return;
 const text=simpleStampText(config),size=Math.max(9,Math.round(Math.min(width,height)*Math.max(10,config.fontSizePx)/400));
 const padX=Math.max(7,width*.026),padY=Math.max(7,height*.026);
 ctx.save();ctx.textBaseline='middle';ctx.font=`600 ${size}px ${watermarkFontFamily(config.fontKey)}`;
 const w=ctx.measureText(text).width;
 const preset=config.positionPreset;
 let x=padX,y=height-padY-size/2;
 if(preset==='top-left'||preset==='top-right')y=padY+size/2;
 if(preset==='top-right'||preset==='bottom-right')x=width-padX-w;
 if(preset==='bottom-center')x=(width-w)/2;
 if(preset==='custom'){
  x=width*(config.customPos.xPct/100)-w/2;
  y=height*(config.customPos.yPct/100);
 }
 x=Math.max(padX,Math.min(width-padX-w,x));
 y=Math.max(padY+size/2,Math.min(height-padY-size/2,y));
 if(config.bgOpacity>0){
   ctx.fillStyle=`rgba(5,14,25,${Math.min(.75,config.bgOpacity*.46)})`;
   ctx.fillRect(Math.max(0,x-size*.35),y-size*.72,Math.min(width-(x-size*.35),w+size*.7),size*1.45);
 }
 ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=Math.max(2,size*.18);
 ctx.fillStyle=config.textColor||'#ffffff';ctx.fillText(text,x,y);
 ctx.restore();
 drawWatermarkLogo(ctx,width,height,config,logo);
}
