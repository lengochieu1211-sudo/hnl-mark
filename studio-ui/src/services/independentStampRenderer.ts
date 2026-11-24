/**
 * Pixel renderer for all HNL independent and legacy layouts.
 * Uses the same geometry for camera preview, still export, live video and
 * imported-video re-encoding; never alters original media bytes.
 * Timemark TM-01 is deliberately excluded and remains pixel-identical.
 */
import type {OrientationDeg,WatermarkConfig,WatermarkTemplate} from '../types/hnl';
import {WATERMARK_TEMPLATES} from '../data/templates';
import {watermarkFontFamily} from './watermarkFonts';
import {drawWatermarkLogo} from './watermarkLogo';

export const isIndependentStamp=(id:string):boolean=>
  WATERMARK_TEMPLATES.some(t=>t.id===id && t.id!=='timemark' && t.id!=='none' &&
    !['simple-datetime','simple-date','simple-time','custom-stamp'].includes(t.id));

function safeDate(iso:string){const d=new Date(iso);return Number.isNaN(d.getTime())?new Date():d;}
const two=(v:number)=>String(v).padStart(2,'0');
function dateParts(config:WatermarkConfig){
 const d=safeDate(config.dateTimeIso);
 const date=`${two(d.getDate())}/${two(d.getMonth()+1)}/${d.getFullYear()}`;
 const time=`${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
 if(config.dateFormat==='YYYY-MM-DD HH:mm'){
   const iso=`${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}`;
   return {date:iso,time:time.slice(0,5),full:`${iso} ${time.slice(0,5)}`};
 }
 if(config.dateFormat==='HH:mm · DD/MM/YYYY')return {date,time:time.slice(0,5),full:`${time.slice(0,5)} · ${date}`};
 return {date,time,full:`${date} ${time}`};
}
function clamp(n:number,a:number,b:number){return Math.max(a,Math.min(n,b));}
// Measure glyphs before painting. Date/time is never ellipsized; shrink only as needed.
function line(g:CanvasRenderingContext2D,text:string,x:number,y:number,max:number,align:CanvasTextAlign='left',essential=false){
 const t=String(text||'').trim();if(!t||max<=0)return;
 g.textAlign=align;
 const width=g.measureText(t).width;
 if(essential&&width>max){g.fillText(t,x,y,max);return;}
 if(width<=max){g.fillText(t,x,y);return;}
 const chars=Array.from(t);let lo=0,hi=chars.length;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(g.measureText(chars.slice(0,mid).join('').trimEnd()+'…').width<=max)lo=mid;else hi=mid-1;}
 if(g.measureText('…').width<=max)g.fillText(chars.slice(0,lo).join('').trimEnd()+'…',x,y);
}
function colorBackground(g:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,opacity:number,r:number){
 if(opacity<=0)return;
 g.fillStyle=`rgba(9,19,36,${clamp(opacity,0,1)})`;
 g.beginPath();g.roundRect(x,y,w,h,Math.min(r,w/3,h/3));g.fill();
}
function locate(config:WatermarkConfig,W:number,H:number,w:number,h:number,pad:number){
 let x=pad,y=H-pad-h;
 switch(config.positionPreset){
  case 'top-left':y=pad;break;
  case 'top-right':x=W-pad-w;y=pad;break;
  case 'bottom-right':x=W-pad-w;break;
  case 'bottom-center':x=(W-w)/2;break;
  case 'custom':x=W*config.customPos.xPct/100-w/2;y=H*config.customPos.yPct/100-h/2;break;
 }
 return {x:clamp(x,pad,Math.max(pad,W-pad-w)),y:clamp(y,pad,Math.max(pad,H-pad-h))};
}
export type StampBounds={x:number;y:number;w:number;h:number};
function paintBody(g:CanvasRenderingContext2D,W:number,H:number,cfg:WatermarkConfig,template:WatermarkTemplate,codeOverride:string|undefined):StampBounds{
 const date=dateParts(cfg);
 // Relative sizing shared by raster sizes. Reserve height for the maximum rows.
 const short=Math.min(W,H);
 const fontSize=Math.max(1,Math.min(short*Math.max(10,Math.min(32,Number(cfg.fontSizePx)||13))/390,W*.075,H/12));
 const lineH=fontSize*1.52,p=fontSize*.72,outer=short*.025;
 const accent=cfg.accentColor||template.accentHex||'#E2B74B';
 const white=cfg.textColor||'#F8FAFC';
 const serial=cfg.showPhotoCode?(codeOverride||`${cfg.photoCodePrefix}-${String(cfg.photoCodeSeq).padStart(4,'0')}`):'';
 const loc=cfg.locationSource==='none'?'':cfg.locationText;
 const meta=[cfg.showCoordinates&&cfg.locationSource!=='none'?cfg.coordinates:'',cfg.inspectorName].filter(Boolean).join(' · ');
 const mode=template.surfaceMode;
 const family=watermarkFontFamily(cfg.fontKey);
 const title=cfg.customTitle||template.name;
 type Row={text:string;size:number;weight:number;color:string;essential?:boolean;right?:string;rightColor?:string;rightEssential?:boolean};
 let rows:Row[]=[],w=0;
 const make=(text:string,size:number,weight:number,color:string,essential=false):Row=>({text,size,weight,color,essential});
 const detail=(text:string,color='#E2E8F0')=>make(text,.85,400,color);
 if(mode==='strip-footer'){
   w=W;rows=[{...make(title,.95,700,white),right:date.full,rightColor:accent,rightEssential:true},detail(loc),detail(serial,'#CBD5E1')];
 }else if(mode==='led-digital'){
   w=Math.min(W-2*outer,Math.max(W*.39,fontSize*16));
   rows=[make(date.time,1.35,800,accent,true),make(date.date,.89,500,white,true),detail(serial,'#CBD5E1'),detail(loc)];
 }else if(mode==='minimal-text'){
   w=Math.min(W-2*outer,Math.max(W*.32,fontSize*23));
   rows=[make(date.full,1.06,700,accent,true),make(loc,.90,500,white),make(cfg.customNote,.82,400,white)];
 }else if(mode==='stripe-gold'){
   w=Math.min(W-2*outer,Math.max(W*.43,fontSize*24));
   rows=[{...make(template.name,.94,750,'#071121'),right:serial,rightColor:'#071121'},make(date.full,1,700,white,true),detail(loc),detail([cfg.customTitle,cfg.inspectorName].filter(Boolean).join(' · '),'#CBD5E1')];
 }else{
   w=Math.min(W-2*outer,Math.max(W*.41,fontSize*26));
   rows=[{...make(title,.93,700,accent),right:serial,rightColor:'#CBD5E1'},make(date.full,1.05,700,white,true),detail(loc),detail(meta,'#CBD5E1')];
 }
 rows=rows.filter(row=>row.text||row.right);
 const h=rows.length*lineH+2*p;
 const position=mode==='strip-footer'?{x:0,y:cfg.positionPreset==='custom'?clamp(H*cfg.customPos.yPct/100-h/2,0,H-h):H-h}:locate(cfg,W,H,w,h,outer);
 const {x,y}=position;
 const inset=mode==='strip-footer'?outer+p:p;
 g.save();g.textBaseline='middle';g.lineJoin='round';
 if(mode!=='minimal-text')colorBackground(g,x,y,w,h,cfg.bgOpacity,mode==='strip-footer'?0:fontSize*.55);
 if(mode==='stripe-gold'){
   g.shadowColor='transparent';g.fillStyle=accent;
   const r=Math.min(fontSize*.5,w/3,(lineH+p)/3);
   g.beginPath();g.roundRect(x,y,w,lineH+p,[r,r,0,0]);g.fill();
 }
 const usable=Math.max(0,w-2*inset);
 rows.forEach((row,i)=>{
   const cy=y+p+(i+.5)*lineH;
   g.shadowColor=mode==='stripe-gold'&&i===0?'transparent':'rgba(0,0,0,.65)';
   g.shadowBlur=fontSize*.09;
   g.font=`${row.weight} ${fontSize*row.size}px ${family}`;g.fillStyle=row.color;
   if(row.right){
     // Two disjoint measured columns, with a gap even at the smallest size.
     const gap=Math.min(usable*.08,fontSize*.8);
     const rightWidth=row.rightEssential?Math.min(usable*.68,Math.max(usable*.45,g.measureText(row.right).width)):Math.min(usable*.42,g.measureText(row.right).width);
     const leftWidth=Math.max(0,usable-gap-rightWidth);
     line(g,row.text,x+inset,cy,leftWidth,'left',row.essential);
     g.fillStyle=row.rightColor||row.color;
     line(g,row.right,x+w-inset,cy,rightWidth,'right',row.rightEssential);
   }else line(g,row.text,x+inset,cy,usable,'left',row.essential);
 });
 g.restore();
 return {x,y,w,h};
}
/** Independent/legacy templates need true encoded pixels, never a CSS-only stamp. */
export function drawIndependentStamp(
 g:CanvasRenderingContext2D,width:number,height:number,cfg:WatermarkConfig,
 orientation:OrientationDeg=0,code?:string,logo?:HTMLImageElement|ImageBitmap,
):StampBounds|undefined{
 if(width<=0||height<=0)return;
 const tpl=WATERMARK_TEMPLATES.find(t=>t.id===cfg.templateId);
 if(!tpl||!isIndependentStamp(cfg.templateId))throw Error(`Không tìm thấy bộ kết xuất cho mẫu dấu: ${cfg.templateId}`);
 g.save();
 let W=width,H=height;
 if(orientation===90||orientation===-90){
  W=height;H=width;
  g.translate(width/2,height/2);g.rotate(orientation*Math.PI/180);g.translate(-W/2,-H/2);
 }else if(orientation===180){g.translate(width,height);g.rotate(Math.PI);}
 const bounds=paintBody(g,W,H,cfg,tpl,code);
 drawWatermarkLogo(g,W,H,cfg,logo);
 g.restore();
 const {x,y,w,h}=bounds;
 if(orientation===90)return {x:width-y-h,y:x,w:h,h:w};
 if(orientation===-90)return {x:y,y:height-x-w,w:h,h:w};
 if(orientation===180)return {x:width-x-w,y:height-y-h,w,h};
 return bounds;
}
