/**
 * HNL Mark original Timemark layout port for AI Studio React.
 * Geometry and typography coefficients are taken from the original app.js
 * drawReferenceStamp, drawReferenceFooter and drawVerticalSerial.
 * The label "Verified" is display text only, not technical verification.
 * Never modifies source photo pixels unless explicitly exporting a copy.
 */
import type { OrientationDeg, WatermarkConfig, WatermarkFontKey } from '../types/hnl';
import {watermarkFontFamily} from './watermarkFonts';
import {drawWatermarkLogo,loadWatermarkLogo} from './watermarkLogo';
import {drawSimpleStamp,isSimpleStamp} from './simpleStampRenderer';

const clamp = (v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const pad = (n:number)=>String(n).padStart(2,'0');
const weekdays=['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
const font=(size:number,weight=400,key:WatermarkFontKey='be-vietnam')=>
 `${weight} ${Math.max(6,Math.round(size))}px ${watermarkFontFamily(key)}`;
/** Keep preview and new-file output on the same loaded font, including Vietnamese glyphs. */
export async function prepareTimemarkFont(key:WatermarkFontKey):Promise<void>{
 if(typeof document==='undefined'||!document.fonts)return;
 try{await Promise.all([document.fonts.load(font(14,400,key)),document.fonts.load(font(14,700,key))]);}catch{ /* Canvas will use the declared fallback. */ }
}
/** Stable per-file visual serial; this is a display code, not cryptographic authentication. */
export function createTimemarkCode():string{
 const values=new Uint32Array(2);
 if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(values);
 else{values[0]=Math.floor(Math.random()*0xFFFFFFFF);values[1]=Math.floor(Math.random()*0xFFFFFFFF);}
 return (Date.now().toString(36).toUpperCase()+Array.from(values,v=>v.toString(36).toUpperCase().padStart(7,'0')).join('')).slice(0,22);
}
function ellipsis(g:CanvasRenderingContext2D,s:string,max:number){
 let t=String(s||'').replace(/\s+/g,' ').trim();
 if(g.measureText(t).width<=max)return t;
 while(t.length&&g.measureText(t+'…').width>max)t=t.slice(0,-1);
 return t+'…';
}
function rect(g:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
 r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();
}
function shield(g:CanvasRenderingContext2D,size:number,color:string){
 g.save();g.scale(size/24,size/24);g.strokeStyle=color;g.lineWidth=1.9;g.lineJoin='round';g.lineCap='round';
 g.beginPath();g.moveTo(0,-10);g.lineTo(8,-7);g.lineTo(8,-.5);g.bezierCurveTo(8,4.5,4.8,8.4,0,10);g.bezierCurveTo(-4.8,8.4,-8,4.5,-8,-.5);g.lineTo(-8,-7);g.closePath();g.stroke();
 g.beginPath();g.moveTo(-3.1,0);g.lineTo(-.5,2.6);g.lineTo(4.2,-2.2);g.stroke();g.restore();
}
export function drawOriginalTimemark(
 g:CanvasRenderingContext2D, width:number,height:number, config:WatermarkConfig,
 orientation:OrientationDeg=0,codeOverride?:string,logo?:HTMLImageElement|ImageBitmap,
):void {
 if(width<=0||height<=0)return;
 g.save();
 let W=width,H=height;
 if(orientation===90||orientation===-90){
   W=height;H=width;
   g.translate(width/2,height/2);g.rotate(orientation*Math.PI/180);g.translate(-W/2,-H/2);
 }else if(orientation===180){
   g.translate(width,height);g.rotate(Math.PI);
 }
 const d=new Date(config.dateTimeIso);
 const date=Number.isFinite(d.getTime())?d:new Date();
 const time=`${pad(date.getHours())}:${pad(date.getMinutes())}`;
 const dateText=`${date.getDate()} Tháng ${date.getMonth()+1}, ${date.getFullYear()}`;
 const base=Math.max(8,Math.min(W,Math.min(W,H)*1.2)/1152*38*(config.fontSizePx/13));
 const fontTime=base*3.95, fDate=base*1.02,fWeek=base*.96,fAddress=base*1.01;
 const padx=Math.max(5,W*.030),pady=Math.max(5,H*.018);
 const firstH=Math.max(fontTime*1.13,Math.max(base*2.85,fDate*2.8));
 const address=config.locationText||'';
 const comments=[config.customTitle,config.customNote].filter(Boolean);
 const locH=address?Math.max(base*1.52,fAddress*1.45):0;
 const gap=address?base*.22:0;
 const blockH=firstH+gap+locH+comments.length*base*1.08;
 const x=clamp(.32*W-W*.295,padx,Math.max(padx,W-W*.83-padx));
 const y=clamp(.898*H-blockH*.5,pady,Math.max(pady,H-blockH-pady));
 const maxW=Math.max(10,Math.min(W*.78,W-x-padx));
 const white=config.textColor||'#ffffff',gold=config.accentColor||'#ffcf48';
 g.save();g.textAlign='left';g.textBaseline='alphabetic';g.lineJoin='round';
 if(config.bgOpacity>0&&config.bgOpacity>=.9){
   g.fillStyle=`rgba(4,10,17,${Math.min(.7,config.bgOpacity*.45)})`;
   rect(g,x-base*.28,y-base*.35,maxW+base*.5,blockH+base*.45,base*.22);g.fill();
 }
 g.shadowColor='rgba(0,0,0,.74)';g.shadowBlur=base*.19;g.shadowOffsetY=base*.095;
 g.font=font(fontTime,900,config.fontKey);
 const raw=g.measureText(time).width;
 const squeeze=Math.min(.66,Math.max(base,maxW*.40)/Math.max(raw,1));
 const painted=raw*squeeze;
 g.fillStyle=white;g.save();g.translate(x,y+firstH*.87);g.scale(squeeze,1);g.fillText(time,0,0);g.restore();
 const barX=x+painted+base*.86;
 g.save();g.shadowColor='transparent';g.shadowBlur=0;g.shadowOffsetY=0;g.fillStyle=gold;
 rect(g,barX,y+base*.20,Math.max(2,base*.105),firstH-base*.29,base*.04);g.fill();g.restore();
 const dateX=barX+base*.74,avail=Math.max(base,W-dateX-padx-W*.025);
 g.fillStyle=white;g.font=font(fDate,400,config.fontKey);g.fillText(ellipsis(g,dateText,avail),dateX,y+firstH*.47);
 g.font=font(fWeek,400,config.fontKey);g.fillText(ellipsis(g,weekdays[date.getDay()],avail),dateX,y+firstH*.90);
 let cursor=y+firstH;
 if(address){cursor+=gap+base*.30;g.font=font(fAddress,400,config.fontKey);g.fillText(ellipsis(g,address,Math.min(maxW,W*.73)),x,cursor+fAddress*1.03);cursor+=locH;}
 for(const note of comments){g.font=font(base*.79,400,config.fontKey);g.fillText(ellipsis(g,note,maxW),x,cursor+base*.77);cursor+=base*1.08;}
 g.restore();
 // Bottom right original Time / mark two-tone wordmark + caption.
 const margin=Math.max(7,W*.020),allowed=Math.min(W*.42,Math.max(base*9.2,W*.28));
 const brandFont=base*1.20,captionFont=base*.80,footerH=brandFont+captionFont*1.46;
 const cx=clamp(.875*W,margin+allowed/2,W-margin-allowed/2);
 // Both footer columns share the same bottom baseline in portrait and landscape.
 const baseline=clamp(y+firstH*.90,margin+footerH,H-margin);
 const fx=cx-allowed/2,fy=baseline-brandFont-captionFont*1.12,right=fx+allowed;
 g.save();g.textAlign='right';g.textBaseline='alphabetic';g.shadowColor='rgba(0,0,0,.76)';g.shadowBlur=base*.16;
 // Timemark never includes the HNL logo; independent templates remain unchanged.
 g.font=font(brandFont,700,config.fontKey);
 const markWidth=g.measureText('mark').width;
 g.fillStyle='#ffffff';g.fillText('mark',right,fy+brandFont*.96);
 g.fillStyle=gold;g.fillText('Time',right-markWidth,fy+brandFont*.96);
 g.fillStyle='rgba(255,255,255,.95)';g.font=font(captionFont,400,config.fontKey);
 g.fillText('100% Chân thực',right,fy+brandFont+captionFont*1.12);
 g.restore();
 // Original separate vertical code, in bounds even after 90°/180° rotation.
 if(config.showPhotoCode){
 const rawCode=codeOverride||`X${String(date.getTime().toString(36)).toUpperCase().padStart(10,'0')}${String(config.photoCodeSeq.toString(36)).toUpperCase().padStart(5,'0')}`;
 const cleanCode=rawCode.replace(/^HNL(?:[-_: ]+)/i,'');
 const label=`${cleanCode} Timemark Verified`;
 const f=base*.58;
 g.save();g.textBaseline='middle';g.textAlign='center';g.font=font(f,400,config.fontKey);
 const text=ellipsis(g,label,Math.max(10,H*.76)),len=g.measureText(text).width;
 const vx=clamp(.981*W,Math.max(7,f*.8),W-Math.max(7,f*.45));
 const vy=clamp(.43*H,Math.max(8,len*.5+f*1.5),Math.max(len*.5+f*1.5,H-len*.5-f*1.5));
 g.translate(vx,vy);g.rotate(-Math.PI/2);g.shadowColor='rgba(0,0,0,.84)';g.shadowBlur=f*.27;
 g.fillStyle='#ffffff';g.fillText(text,0,0);
 g.translate(-len*.5-f*.84,0);shield(g,f*.68,'#ffffff');g.restore();
 }
 drawWatermarkLogo(g,W,H,config,logo);
 g.restore();
}

/** Produce a stamped NEW copy. Input/source Blob is never modified. */
export function loadTimemarkLogo():Promise<HTMLImageElement|undefined>{
 return new Promise(resolve=>{
   if(typeof Image==='undefined'){resolve(undefined);return;}
   const logo=new Image();
   logo.onload=()=>resolve(logo);logo.onerror=()=>resolve(undefined);
   logo.src='./hnl-logo-192.png';
 });
}
export async function createTimemarkPhoto(source:Blob,config:WatermarkConfig,photoCode?:string,orientation:OrientationDeg=0):Promise<Blob>{
 const bitmap=await createImageBitmap(source);
 try{
   const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Không thể tạo ảnh dấu');
   await prepareTimemarkFont(config.fontKey);
   ctx.drawImage(bitmap,0,0);
   if(config.templateId!=='none'){
     const logo=await loadWatermarkLogo(config);
     if(isSimpleStamp(config.templateId))drawSimpleStamp(ctx,canvas.width,canvas.height,config,orientation,logo);
     else if(config.templateId==='timemark')drawOriginalTimemark(ctx,canvas.width,canvas.height,config,orientation,photoCode,logo);
     else throw Error('Mẫu dấu này chưa có bộ kết xuất pixel. Ảnh gốc vẫn được giữ riêng.');
   }
   return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Không kết xuất được JPEG')),'image/jpeg',clamp(config.jpegQuality/100,.5,1)));
 }finally{bitmap.close();}
}
