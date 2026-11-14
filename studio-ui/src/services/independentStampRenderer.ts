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
function line(g:CanvasRenderingContext2D,text:string,x:number,y:number,max:number,align:CanvasTextAlign='left'){
 let t=String(text||'').trim();if(!t)return;
 g.textAlign=align;
 if(g.measureText(t).width>max){
   while(t.length>1 && g.measureText(t+'…').width>max)t=t.slice(0,-1);
   t=t.trimEnd()+'…';
 }
 g.fillText(t,x,y);
}
function colorBackground(g:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,opacity:number,r:number){
 if(opacity<=0)return;
 g.fillStyle=`rgba(9,19,36,${clamp(opacity,.08,.93)})`;
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
function paintBody(g:CanvasRenderingContext2D,W:number,H:number,cfg:WatermarkConfig,template:WatermarkTemplate,codeOverride:string|undefined){
 const date=dateParts(cfg);
 const fontSize=clamp(Math.round(Math.min(W,H)/390*Math.max(10,cfg.fontSizePx)),10,Math.min(58,W*.083));
 const lineH=Math.round(fontSize*1.34);
 const p=Math.max(5,Math.round(fontSize*.6));
 const outer=Math.max(6,Math.round(Math.min(W,H)*.025));
 const accent=cfg.accentColor||template.accentHex||'#E2B74B';
 const white=cfg.textColor||'#F8FAFC';
 const code=cfg.showPhotoCode?`${cfg.photoCodePrefix}-${String(cfg.photoCodeSeq).padStart(4,'0')}`:'';
 const serial=cfg.showPhotoCode?(codeOverride||code):'';
 const loc=cfg.locationSource==='none'?'':cfg.locationText;
 const meta=[cfg.showCoordinates?cfg.coordinates:'',cfg.inspectorName].filter(Boolean).join(' · ');
 const mode=template.surfaceMode;
 const family=watermarkFontFamily(cfg.fontKey);
 g.save();g.textBaseline='middle';g.lineJoin='round';g.shadowColor='rgba(0,0,0,.7)';g.shadowBlur=Math.max(1,fontSize*.12);
 const set=(size:number,weight:number,color:string)=>{g.font=`${weight} ${Math.round(size)}px ${family}`;g.fillStyle=color;};
 if(mode==='strip-footer'){
   const lines=loc?3:2;
   const h=(lines+1)*lineH+p*2;
   // CSS preview uses full-width footer regardless of selected corner.
   const y=H-h;
   colorBackground(g,0,y,W,h,Math.max(.7,cfg.bgOpacity),0);
   set(fontSize*.95,700,white);line(g,cfg.customTitle||template.name,outer+p,y+p+lineH*.65,W*.45);
   set(fontSize*.93,700,accent);line(g,date.full,W-outer-p,y+p+lineH*.65,W*.49,'right');
   set(fontSize*.85,400,'#E2E8F0');line(g,loc,outer+p,y+p+lineH*1.75,W-2*(outer+p));
   if(serial){set(fontSize*.78,400,'#CBD5E1');line(g,serial,W-outer-p,H-p-lineH*.5,W*.55,'right');}
 } else if(mode==='led-digital'){
   const w=Math.min(W-outer*2,Math.max(W*.39,fontSize*16));
   const h=lineH*2.9+p*2;
   const {x,y}=locate(cfg,W,H,w,h,outer);
   colorBackground(g,x,y,w,h,Math.max(.55,cfg.bgOpacity),fontSize*.65);
   set(fontSize*1.35,800,accent);line(g,date.time,x+p,y+p+lineH*.70,w-2*p);
   set(fontSize*.89,500,white);line(g,date.date+(serial?' · '+serial:''),x+p,y+p+lineH*1.78,w-2*p);
   set(fontSize*.75,400,'#CBD5E1');line(g,loc,x+p,y+p+lineH*2.6,w-2*p);
 } else if(mode==='minimal-text'){
   const w=Math.min(W-outer*2,Math.max(W*.32,fontSize*23));
   const h=lineH*(cfg.customNote?3:2)+p*1.2;
   const {x,y}=locate(cfg,W,H,w,h,outer);
   set(fontSize*1.06,700,accent);line(g,date.full,x+p,y+lineH*.64,w-2*p);
   set(fontSize*.90,500,white);line(g,loc,x+p,y+lineH*1.68,w-2*p);
   if(cfg.customNote){set(fontSize*.82,400,white);line(g,cfg.customNote,x+p,y+lineH*2.63,w-2*p);}
 } else if(mode==='stripe-gold'){
   const w=Math.min(W-outer*2,Math.max(W*.43,fontSize*24));
   const h=lineH*3.8+p*2;
   const {x,y}=locate(cfg,W,H,w,h,outer);
   colorBackground(g,x,y,w,h,cfg.bgOpacity,fontSize*.55);
   g.shadowColor='transparent';g.fillStyle=accent;
   g.beginPath();g.roundRect(x,y,w,lineH*1.20+p,[fontSize*.5,fontSize*.5,0,0]);g.fill();
   set(fontSize*.94,750,'#071121');line(g,template.name,x+p,y+lineH*.8,w-(serial?Math.max(w*.34,p*3):p*2));
   if(serial){set(fontSize*.73,600,'#071121');line(g,serial,x+w-p,y+lineH*.8,w*.40,'right');}
   g.shadowColor='rgba(0,0,0,.7)';
   set(fontSize,700,white);line(g,date.full,x+p,y+lineH*1.94,w-2*p);
   set(fontSize*.85,400,'#E2E8F0');line(g,loc,x+p,y+lineH*2.85,w-2*p);
   set(fontSize*.80,400,'#CBD5E1');line(g,[cfg.customTitle,cfg.inspectorName].filter(Boolean).join(' · '),x+p,y+lineH*3.65,w-2*p);
 } else {
   // glass-dark and badge-card share the same layout as their CSS previews.
   const w=Math.min(W-outer*2,Math.max(W*.41,fontSize*26));
   const h=(meta?4.4:3.5)*lineH+p*2;
   const {x,y}=locate(cfg,W,H,w,h,outer);
   colorBackground(g,x,y,w,h,cfg.bgOpacity,fontSize*.7);
   set(fontSize*.93,700,accent);line(g,cfg.customTitle||template.name,x+p,y+p+lineH*.60,w-2*p-(serial?w*.25:0));
   if(serial){set(fontSize*.77,500,'#CBD5E1');line(g,serial,x+w-p,y+p+lineH*.60,w*.26,'right');}
   set(fontSize*1.05,700,white);line(g,date.full,x+p,y+p+lineH*1.75,w-2*p);
   set(fontSize*.85,400,'#E2E8F0');line(g,loc,x+p,y+p+lineH*2.78,w-2*p);
   if(meta){set(fontSize*.78,400,'#CBD5E1');line(g,meta,x+p,y+p+lineH*3.8,w-2*p);}
 }
 g.restore();
}
/** Independent/legacy templates need true encoded pixels, never a CSS-only stamp. */
export function drawIndependentStamp(
 g:CanvasRenderingContext2D,width:number,height:number,cfg:WatermarkConfig,
 orientation:OrientationDeg=0,code?:string,logo?:HTMLImageElement|ImageBitmap,
):void{
 if(width<=0||height<=0)return;
 const tpl=WATERMARK_TEMPLATES.find(t=>t.id===cfg.templateId);
 if(!tpl||!isIndependentStamp(cfg.templateId))throw Error(`Không tìm thấy bộ kết xuất cho mẫu dấu: ${cfg.templateId}`);
 g.save();
 let W=width,H=height;
 if(orientation===90||orientation===-90){
  W=height;H=width;
  g.translate(width/2,height/2);g.rotate(orientation*Math.PI/180);g.translate(-W/2,-H/2);
 }else if(orientation===180){g.translate(width,height);g.rotate(Math.PI);}
 paintBody(g,W,H,cfg,tpl,code);
 drawWatermarkLogo(g,W,H,cfg,logo);
 g.restore();
}
