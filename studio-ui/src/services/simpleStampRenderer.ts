/** Deliberately small timestamp presets, rendered identically on preview and exported pixels. */
import type {OrientationDeg,WatermarkConfig} from '../types/hnl';
import {watermarkFontFamily} from './watermarkFonts';
import {drawWatermarkLogo} from './watermarkLogo';
export const isSimpleStamp=(id:string)=>['simple-datetime','simple-date','simple-time','custom-stamp'].includes(id);
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
  if(config.templateId==='custom-stamp'){
    drawCustomStamp(ctx,W,H,config,logo);
    ctx.restore();return;
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

/** No Timemark-specific layout, editable text blocks with independent switches.
 * Preview and exported pixels use the same geometry so nothing jumps at save. */
export function customStampLines(config:WatermarkConfig):string[]{
 const lines:string[]=[];
 if(config.customShowDateTime!==false)lines.push(simpleStampText(config));
 if(config.customShowLocation!==false && config.locationSource!=='none'){
  if(config.locationText.trim())lines.push(config.locationText.trim());
  if(config.showCoordinates&&config.coordinates.trim())lines.push(config.coordinates.trim());
 }
 if(config.customShowNote!==false){
  if(config.customTitle.trim())lines.push(config.customTitle.trim());
  if(config.customNote.trim())lines.push(config.customNote.trim());
 }
 return lines;
}
function drawCustomStamp(ctx:CanvasRenderingContext2D,W:number,H:number,config:WatermarkConfig,logo?:HTMLImageElement|ImageBitmap){
 const lines=customStampLines(config).slice(0,5);
 if(!lines.length){drawWatermarkLogo(ctx,W,H,config,logo);return;}
 const fontSize=Math.max(9,Math.round(Math.min(W,H)*Math.max(10,config.fontSizePx)/390));
 const padding=Math.max(7,Math.round(fontSize*.58));
 const inset=Math.max(8,Math.min(W,H)*.025);
 const lineHeight=fontSize*1.33;
 const limit=Math.max(30,W-2*inset-2*padding);
 ctx.font=`600 ${fontSize}px ${watermarkFontFamily(config.fontKey)}`;
 const fitted=lines.map(line=>{
  let t=line;
  while(t.length>1&&ctx.measureText(t).width>limit)t=t.slice(0,-2).trimEnd()+'…';
  return t;
 });
 const blockWidth=Math.min(W-2*inset,Math.max(...fitted.map(t=>ctx.measureText(t).width))+2*padding);
 const blockHeight=lineHeight*fitted.length+padding*1.3;
 let x=inset,y=H-inset-blockHeight;
 switch(config.positionPreset){
  case 'top-left':y=inset;break;
  case 'top-right':x=W-inset-blockWidth;y=inset;break;
  case 'bottom-right':x=W-inset-blockWidth;break;
  case 'bottom-center':x=(W-blockWidth)/2;break;
  case 'custom': x=W*(config.customPos.xPct/100)-blockWidth/2;y=H*(config.customPos.yPct/100)-blockHeight/2;break;
 }
 x=Math.min(W-inset-blockWidth,Math.max(inset,x));
 y=Math.min(H-inset-blockHeight,Math.max(inset,y));
 ctx.save();
 if(config.bgOpacity>0){
  const r=Math.min(fontSize*.6,blockHeight/4);
  ctx.fillStyle=`rgba(5,14,25,${Math.min(.83,config.bgOpacity*.68)})`;
  ctx.beginPath();ctx.roundRect(x,y,blockWidth,blockHeight,r);ctx.fill();
 }
 ctx.textBaseline='middle';ctx.textAlign='left';
 ctx.fillStyle=config.textColor||'#ffffff';ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=Math.max(1,fontSize*.14);
 fitted.forEach((line,i)=>ctx.fillText(line,x+padding,y+padding*.65+lineHeight*(i+.5)));
 ctx.restore();
 drawWatermarkLogo(ctx,W,H,config,logo);
}
