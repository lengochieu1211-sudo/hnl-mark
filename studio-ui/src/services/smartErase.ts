/** Offline non-destructive smart clone/blur, adapted from HNL Mark main v2.0.4.
 * These edits are metadata applied to a NEW canvas before placing a stamp.
 * Original Blob is never mutated. This is not generative AI inpainting. */
import type {ImageEdits,SmartEraseOperation,SmartEraseDirection} from '../types/hnl';

const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
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
 const brightness=edits.brightness??100,contrast=edits.contrast??100,saturation=edits.saturation??100;
 if(brightness!==100||contrast!==100||saturation!==100){
  const next=blankCanvas(canvas.width,canvas.height);const g=next.getContext('2d');if(!g)throw Error('Không áp dụng được màu.');
  g.filter=`brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
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
