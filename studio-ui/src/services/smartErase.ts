/** Offline non-destructive smart clone/blur, adapted from HNL Mark main v2.0.4.
 * These edits are metadata applied to a NEW canvas before placing a stamp.
 * Original Blob is never mutated. This is not generative AI inpainting. */
import type {ImageEdits,SmartEraseOperation,SmartEraseDirection} from '../types/hnl';

const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
// Original HNL presets; no third-party LUTs or network dependencies.
// Identical CSS filter string for editor, gallery preview and export canvas.
export const PHOTO_FILTERS=[
 {id:'original',label:'Gốc',b:100,c:100,s:100,sepia:0,hue:0,gray:0},
 // HNL original approximation of a vivid/high-contrast style; not the B612 LUT.
 {id:'hnl-vd3',label:'HNL VD3',b:104,c:123,s:125,sepia:0,hue:0,gray:0},
 {id:'site',label:'Công trình',b:105,c:118,s:102,sepia:0,hue:0,gray:0},
 {id:'natural',label:'Tự nhiên',b:103,c:104,s:104,sepia:0,hue:0,gray:0},
 {id:'clear',label:'Trong trẻo',b:112,c:104,s:92,sepia:0,hue:0,gray:0},
 {id:'vivid',label:'Rực rỡ',b:104,c:110,s:145,sepia:0,hue:0,gray:0},
 {id:'warm',label:'Ấm áp',b:104,c:105,s:112,sepia:24,hue:-8,gray:0},
 {id:'cool',label:'Mát lạnh',b:104,c:107,s:104,sepia:12,hue:32,gray:0},
 {id:'portrait',label:'Chân dung',b:108,c:92,s:92,sepia:8,hue:0,gray:0},
 {id:'vintage',label:'Vintage',b:101,c:90,s:75,sepia:40,hue:-8,gray:0},
 {id:'cinema',label:'Điện ảnh',b:93,c:122,s:78,sepia:12,hue:18,gray:0},
 {id:'mono',label:'Đen trắng',b:102,c:116,s:100,sepia:0,hue:0,gray:100},
 {id:'sepia',label:'Sepia',b:104,c:104,s:100,sepia:100,hue:0,gray:0},
 {id:'skin-natural',label:'Da tự nhiên',b:104,c:98,s:101,sepia:0,hue:0,gray:0},
 {id:'skin-bright',label:'Da sáng',b:108,c:96,s:98,sepia:0,hue:0,gray:0},
 {id:'skin-soft',label:'Da mịn',b:105,c:97,s:98,sepia:0,hue:0,gray:0},
 {id:'skin-clear',label:'Da trong',b:108,c:100,s:96,sepia:0,hue:-3,gray:0},
 {id:'skin-peach',label:'Hồng đào',b:105,c:97,s:108,sepia:4,hue:-8,gray:0},
 {id:'portrait-hd',label:'Chân dung HD',b:105,c:104,s:104,sepia:0,hue:0,gray:0},
 {id:'outdoor-fresh',label:'Ngoài trời tươi',b:106,c:105,s:122,sepia:0,hue:0,gray:0},
 {id:'nature-hd',label:'Thiên nhiên HD',b:105,c:108,s:116,sepia:0,hue:0,gray:0},
 {id:'site-hd',label:'Công trình HD',b:105,c:109,s:103,sepia:0,hue:0,gray:0},
 {id:'bright-detail',label:'Sáng rõ',b:107,c:98,s:105,sepia:0,hue:0,gray:0},
 {id:'night-hd',label:'Đêm rõ nét',b:103,c:103,s:99,sepia:0,hue:0,gray:0},
 {id:'video-natural',label:'Video tự nhiên',b:103,c:102,s:103,sepia:0,hue:0,gray:0},
] as const;
export function photoFilterCss(edits:Pick<ImageEdits,'brightness'|'contrast'|'saturation'|'photoFilter'|'filterStrength'>):string{
 const p=PHOTO_FILTERS.find(x=>x.id===edits.photoFilter)||PHOTO_FILTERS[0];
 const n=(v:number|undefined,d:number,lo:number,hi:number)=>Number.isFinite(v)?clamp(v as number,lo,hi):d;
 const k=n(edits.filterStrength,100,0,100)/100;
 const b=n(edits.brightness,100,50,150),c=n(edits.contrast,100,50,150),sat=n(edits.saturation,100,0,180);
 if(k===0||p.id==='original')return `brightness(${b}%) contrast(${c}%) saturate(${sat}%)`;
 return `brightness(${b*(1+(p.b-100)*k/100)}%) contrast(${c*(1+(p.c-100)*k/100)}%) saturate(${sat*(1+(p.s-100)*k/100)}%) sepia(${p.sepia*k}%) hue-rotate(${p.hue*k}deg) grayscale(${p.gray*k}%)`;
}
export type PhotoEnhance={skinBright?:number;skinSmooth?:number;sharpness?:number;denoise?:number;clarity?:number;shadows?:number};
export const HD_CONTROLS=[['skinBright','Sáng da'],['skinSmooth','Mịn da'],['sharpness','Độ nét'],['denoise','Giảm hạt'],['clarity','Độ trong'],['shadows','Sáng vùng tối']] as const;
type HDKey=typeof HD_CONTROLS[number][0];
const HD_PRESETS:Record<string,PhotoEnhance>={
 'skin-natural':{skinBright:18,skinSmooth:16,denoise:12},'skin-bright':{skinBright:38,skinSmooth:20,shadows:12},
 'skin-soft':{skinBright:12,skinSmooth:45,denoise:18},'skin-clear':{skinBright:25,skinSmooth:20,clarity:8},
 'skin-peach':{skinBright:18,skinSmooth:15},'portrait-hd':{skinSmooth:15,sharpness:25,denoise:14},
 'outdoor-fresh':{clarity:15,shadows:12},'nature-hd':{sharpness:25,clarity:18,denoise:10},
 'site-hd':{sharpness:28,clarity:20,denoise:12},'bright-detail':{shadows:40,denoise:18,sharpness:10},
 'night-hd':{shadows:25,denoise:55,sharpness:8}
};
export function resolvePhotoEnhance(edits:Pick<ImageEdits,'photoFilter'|'filterStrength'|'enhance'>):Required<PhotoEnhance>{
 const p=HD_PRESETS[edits.photoFilter||'']||{},k=clamp(Number.isFinite(edits.filterStrength)?edits.filterStrength!:100,0,100)/100;
 const val=(key:HDKey)=>clamp(Number.isFinite(edits.enhance?.[key])?edits.enhance![key]!:(p[key]||0)*k,0,100);
 return {skinBright:val('skinBright'),skinSmooth:val('skinSmooth'),sharpness:val('sharpness'),denoise:val('denoise'),clarity:val('clarity'),shadows:val('shadows')};
}
export function hasPhotoEnhance(e:Pick<ImageEdits,'photoFilter'|'filterStrength'|'enhance'>){return Object.values(resolvePhotoEnhance(e)).some(v=>v>0);}
export function photoEnhanceKey(e:Pick<ImageEdits,'photoFilter'|'filterStrength'|'enhance'>){return JSON.stringify(resolvePhotoEnhance(e));}
/** Local edge-aware detail processing. No inferred/fabricated detail.
 * Skin selection is an approximate chroma mask, not face recognition.
 * Row chunks bound temporary allocation; the input pixel buffer is read-only. */
export function enhanceRows(src:Uint8ClampedArray,w:number,h:number,y0:number,count:number,out:Uint8ClampedArray,e:Required<PhotoEnhance>){
 const sb=e.skinBright/100,sm=e.skinSmooth/100,sh=e.sharpness/100,dn=e.denoise/100,cl=e.clarity/100,ss=e.shadows/100;
 for(let y=y0;y<y0+count;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,o=((y-y0)*w+x)*4,r=src[i],g=src[i+1],b=src[i+2],lum=.299*r+.587*g+.114*b;
  const cb=128-.168736*r-.331264*g+.5*b,cr=128+.5*r-.418688*g-.081312*b;
  const skin=clamp(Math.min((cb-75)/12,(137-cb)/12,(cr-130)/12,(183-cr)/12,(lum-25)/25,(245-lum)/20),0,1);
  const left=x>0?i-4:i,right=x+1<w?i+4:i,up=y>0?i-w*4:i,down=y+1<h?i+w*4:i;
  const weight=(j:number)=>{const diff=Math.max(Math.abs(src[j]-r),Math.abs(src[j+1]-g),Math.abs(src[j+2]-b));return Math.max(0,1-diff/36);};
  const wl=weight(left),wr=weight(right),wu=weight(up),wd=weight(down),sum=2+wl+wr+wu+wd;
  const smooth=Math.min(.78,.65*dn+.68*sm*skin);
  const light=ss*35*Math.pow(1-lum/255,2)+sb*skin*22*Math.sin(Math.PI*lum/255);
  for(let c=0;c<3;c++){
    const v=src[i+c],avg=(2*v+wl*src[left+c]+wr*src[right+c]+wu*src[up+c]+wd*src[down+c])/sum;
    const detail=v-avg;
    // Do not amplify isolated low-amplitude noise after denoise.
    const boost=Math.abs(detail)>3?clamp(detail,-18,18)*sh*.65*(1-dn*.65)*(1-sm*skin*.7):0;
    const contrast=cl*8*((lum-128)/128)*Math.sin(Math.PI*lum/255);
    out[o+c]=clamp(v+(avg-v)*smooth+boost+light+contrast,0,255);
  }
  out[o+3]=src[i+3];
 }
}
function applyPhotoEnhance(canvas:HTMLCanvasElement,e:Required<PhotoEnhance>){
 if(!Object.values(e).some(v=>v>0))return;
 const g=canvas.getContext('2d',{willReadFrequently:true});if(!g)throw Error('Không tạo được bộ xử lý HD.');
 const w=canvas.width,h=canvas.height,src=g.getImageData(0,0,w,h);
 for(let y=0;y<h;y+=64){const rows=Math.min(64,h-y),out=g.createImageData(w,rows);enhanceRows(src.data,w,h,y,rows,out.data,e);g.putImageData(out,0,y);}
}
export function clampSmartRect(r:SmartEraseOperation['rect']){
 const x=clamp(Number(r.x)||0,0,.999),y=clamp(Number(r.y)||0,0,.999);
 return {x,y,w:clamp(Number(r.w)||0,0,1-x),h:clamp(Number(r.h)||0,0,1-y)};
}
function pixelRect(op:SmartEraseOperation,W:number,H:number){
 const r=clampSmartRect(op.rect),x=clamp(Math.floor(r.x*W),0,W-1),y=clamp(Math.floor(r.y*H),0,H-1);
 return {x,y,w:clamp(Math.ceil(r.w*W),1,W-x),h:clamp(Math.ceil(r.h*H),1,H-y)};
}
export function applySmartErase(canvas:HTMLCanvasElement,operations:SmartEraseOperation[]=[]){
 const W=canvas.width,H=canvas.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Không có Canvas để vá ảnh.');
 for(const op of operations){
  if(!op||!op.rect)continue;
  const {x,y,w,h}=pixelRect(op,W,H);
  if(w<2||h<2)continue;
  if(w>W*.72||h>H*.72||w*h>2_000_000)throw Error('Vùng xóa quá lớn. Hãy khoanh nhiều vùng nhỏ để tránh thiếu bộ nhớ.');
  if(op.direction==='blur'){
   const sample=document.createElement('canvas');sample.width=Math.max(1,Math.floor(w/24));sample.height=Math.max(1,Math.floor(h/24));
   sample.getContext('2d')?.drawImage(canvas,x,y,w,h,0,0,sample.width,sample.height);
   ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(sample,0,0,sample.width,sample.height,x,y,w,h);ctx.restore();continue;
  }
  const gap=Math.max(4,Math.round(Math.min(w,h)*.15));
  const dirs:Record<Exclude<SmartEraseDirection,'auto'|'blur'>,[number,number]>={
   up:[0,-h-gap],down:[0,h+gap],left:[-w-gap,0],right:[w+gap,0]
  };
  const sources=Object.entries(dirs).filter(([,d])=>{
   const sx=x+d[0],sy=y+d[1];return sx>=0&&sy>=0&&sx+w<=W&&sy+h<=H;
  });
  if(!sources.length)throw Error('Vùng khoanh sát viền ảnh; hãy chọn một vùng nhỏ hơn hoặc Làm mờ.');
  const target=ctx.getImageData(x,y,w,h),targetPixels=target.data;
  const edgeScore=(pixels:Uint8ClampedArray)=>{
   let score=0,count=0;const step=Math.max(1,Math.floor(Math.min(w,h)/20));
   const sample=(xx:number,yy:number)=>{const i=(yy*w+xx)*4;for(let k=0;k<3;k++)score+=Math.abs(targetPixels[i+k]-pixels[i+k]);count++};
   for(let xx=0;xx<w;xx+=step){sample(xx,0);sample(xx,h-1)}
   for(let yy=0;yy<h;yy+=step){sample(0,yy);sample(w-1,yy)}
   return score/Math.max(1,count);
  };
  const direction=op.direction;
  const chosen=direction!=='auto'?sources.find(([name])=>name===direction):undefined;
  if(direction!=='auto'&&!chosen)throw Error('Hướng lấy mẫu nằm ngoài ảnh; hãy chọn Tự động.');
  let best=chosen,lowest=Infinity;
  if(!best){for(const entry of sources){const [dx,dy]=entry[1];const sample=ctx.getImageData(x+dx,y+dy,w,h);const score=edgeScore(sample.data);
   if(score<lowest){best=entry;lowest=score;}
  }}
  if(!best)throw Error('Không tìm được vùng nền để vá.');
  const [dx,dy]=best[1],src=ctx.getImageData(x+dx,y+dy,w,h).data;
  const feather=Math.max(2,Math.min(28,Math.floor(Math.min(w,h)*.14)));
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
   const edge=Math.min(xx,yy,w-1-xx,h-1-yy);
   const alpha=.65+.35*clamp((edge+1)/feather,0,1);const i=(yy*w+xx)*4;
   for(let channel=0;channel<3;channel++)targetPixels[i+channel]=Math.round(targetPixels[i+channel]*(1-alpha)+src[i+channel]*alpha);
  }
  ctx.putImageData(target,x,y);
 }
}
function blankCanvas(w:number,h:number){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;}
function sourceBitmap(bitmap:ImageBitmap,edits:ImageEdits,maxEdge:number,onlyErase:boolean){
 const scale=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height));
 let canvas=blankCanvas(bitmap.width*scale,bitmap.height*scale),ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Không tạo được bộ xử lý ảnh.');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
 applySmartErase(canvas,edits.smartErase||[]);
 if(onlyErase)return canvas;
 // Crop before rotation; always crop a NEW canvas without changing the source.
 const ratio=edits.cropRatio;
 const ratios:Record<string,number>={'1:1':1,'4:3':4/3,'3:4':3/4,'16:9':16/9,'9:16':9/16};
 const wanted=ratios[ratio];
 if(wanted){let w=canvas.width,h=canvas.height;
  if(w/h>wanted)w=Math.round(h*wanted);else h=Math.round(w/wanted);
  const cropped=blankCanvas(w,h);cropped.getContext('2d')?.drawImage(canvas,(canvas.width-w)/2,(canvas.height-h)/2,w,h,0,0,w,h);canvas=cropped;
 }
 const deg=(((edits.rotationDeg||0)%360)+360)%360;
 if(deg||edits.flipHorizontal){
  const swap=deg===90||deg===270;const next=blankCanvas(swap?canvas.height:canvas.width,swap?canvas.width:canvas.height);
  const g=next.getContext('2d');if(!g)throw Error('Không xoay được ảnh.');
  g.translate(next.width/2,next.height/2);g.rotate(deg*Math.PI/180);
  if(edits.flipHorizontal)g.scale(-1,1);
  g.drawImage(canvas,-canvas.width/2,-canvas.height/2);
  canvas=next;
 }
 applyPhotoEnhance(canvas,resolvePhotoEnhance(edits));
 const filter=photoFilterCss(edits);
 if(filter!=='brightness(100%) contrast(100%) saturate(100%)'){
  const next=blankCanvas(canvas.width,canvas.height);const g=next.getContext('2d');if(!g)throw Error('Không áp dụng được màu.');
  g.filter=filter;
  g.drawImage(canvas,0,0);canvas=next;
 }
 return canvas;
}
export function createEditedCanvas(bitmap:ImageBitmap,edits:ImageEdits,maxEdge=Infinity,onlyErase=false){
 return sourceBitmap(bitmap,edits,maxEdge,onlyErase);
}
export async function createEditorPreview(blob:Blob,edits:ImageEdits,onlyErase=false,maxEdge=1440):Promise<Blob>{
 const bitmap=await createImageBitmap(blob);
 try{const canvas=createEditedCanvas(bitmap,edits,maxEdge,onlyErase);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Không tạo được ảnh xem trước')),'image/jpeg',.88));
 }finally{bitmap.close();}
}
