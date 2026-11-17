import {idCardPrintLayout} from './scannerPrintLayout';
/** HNL Mark offline scanner: no network, no OCR, source blobs retained unmodified. */
import {scanOrientedSize,drawScannerOriented,adjustScanRgb,safeScanOps,safeScanColor,
 type ScanImageOp,type ScanColorAdjust} from './scannerEdits';
export type ScanPoint = {x:number;y:number};
export type ScanCorners = [ScanPoint,ScanPoint,ScanPoint,ScanPoint]; // TL, TR, BR, BL
export type ScanFilter = 'color'|'enhance'|'gray'|'bw'|'paper';
/** Local enhancement only. Cannot restore details absent from the camera original. */
export type ScanSharpness = 'off'|'auto'|'text';
export type ScanPaper = 'A4'|'A5'|'Letter'|'custom';
export type ScanDocumentType='auto'|'id-card'|'paper';
export type ScanWarpGrid={axis:'vertical'|'horizontal';points:ScanPoint[]};
export type ScanPage = {
  id:string; folderId:string; name:string; original:Blob; processed?:Blob;
  corners:ScanCorners; filter:ScanFilter; order:number; createdAt:number;
  transformOps?:ScanImageOp[]; colorAdjust?:ScanColorAdjust;
  detectionConfidence?:ScanDetection['confidence']; documentType?:ScanDocumentType;
  sharpness?:ScanSharpness; warpGrid?:ScanWarpGrid; splitParentId?:string; splitRegionCount?:number;
};
export type ScanFolder = {id:string;name:string;createdAt:number};
const DB='hnlmark-document-scanner-v1', VERSION=1;
// 1.5% inset on uncertain detections: never silently crop 6% from CCCD corners.
export const DEFAULT_CORNERS:ScanCorners=[{x:.015,y:.015},{x:.985,y:.015},{x:.985,y:.985},{x:.015,y:.985}];
export const newScanId=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
export function compactScanRegionName(name:string,index:number):string{
 const base=String(name||'Scan').replace(/(?:_vung_(?:them|\d+)|_V\d{2,})+$/gi,'').slice(0,42)||'Scan';
 return `${base}_V${String(index).padStart(2,'0')}`;
}
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 const req=indexedDB.open(DB,VERSION);
 req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('pages'))db.createObjectStore('pages',{keyPath:'id'});if(!db.objectStoreNames.contains('folders'))db.createObjectStore('folders',{keyPath:'id'});};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Không thể mở thư viện scan'));
});}
async function transact<T>(table:'pages'|'folders',mode:IDBTransactionMode,operate:(store:IDBObjectStore,done:(value:T)=>void)=>void):Promise<T>{
 const db=await database();return new Promise<T>((resolve,reject)=>{
  const tr=db.transaction(table,mode),store=tr.objectStore(table);let result:T;let completed=false;
  tr.oncomplete=()=>{db.close();if(completed)resolve(result);else reject(new Error('Giao dịch scan chưa hoàn tất'));};
  tr.onabort=()=>{db.close();reject(tr.error||new Error('Không thể lưu dữ liệu scan'));};
  tr.onerror=()=>{};
  try{operate(store,value=>{result=value;completed=true;});}catch(e){tr.abort();reject(e);}
 });
}
export const listScans=()=>transact<ScanPage[]>('pages','readonly',(s,done)=>{const r=s.getAll();r.onsuccess=()=>done(r.result||[]);});
export const listScanFolders=()=>transact<ScanFolder[]>('folders','readonly',(s,done)=>{const r=s.getAll();r.onsuccess=()=>done(r.result||[]);});
export const putScan=(p:ScanPage)=>transact<void>('pages','readwrite',(s,done)=>{s.put(p);done();});
export const removeScan=(id:string)=>transact<void>('pages','readwrite',(s,done)=>{s.delete(id);done();});
export const putScanFolder=(f:ScanFolder)=>transact<void>('folders','readwrite',(s,done)=>{s.put(f);done();});
export const removeScanFolder=(id:string)=>transact<void>('folders','readwrite',(s,done)=>{s.delete(id);done();});
/** Atomic reorder/move/delete-folder transaction, including both object stores.
 * A quota error never leaves half the pages moved to another folder. */
export async function updateScanBatch(pages:ScanPage[],removeFolderId?:string):Promise<void>{
 if(!pages.length&&!removeFolderId)return;
 const db=await database();
 return new Promise<void>((resolve,reject)=>{
  const tx=db.transaction(['pages','folders'],'readwrite');
  tx.oncomplete=()=>{db.close();resolve();};
  tx.onabort=()=>{db.close();reject(tx.error||new Error('Không thể cập nhật trọn bộ trang scan'))};
  tx.onerror=()=>{};
  try{
   const pageStore=tx.objectStore('pages');
   for(const page of pages)pageStore.put(page);
   if(removeFolderId)tx.objectStore('folders').delete(removeFolderId);
  }catch(error){try{tx.abort();}catch{/* completed */}reject(error);}
 });
}

/** Apply deferred automatic corners only if the source page has not been edited.
 * The transaction reads the latest stored row and never replaces processed
 * output, manual corner changes, or a deleted page with an old snapshot. */
export async function estimateScanCornersIfUnedited(id:string,expected:ScanCorners,next:ScanCorners,
 shouldApply:()=>boolean=()=>true):Promise<boolean>{
 if(!validCorners(next))return false;
 const db=await database();
 return new Promise<boolean>((resolve,reject)=>{
  const tx=db.transaction('pages','readwrite'),store=tx.objectStore('pages');let applied=false;
  tx.oncomplete=()=>{db.close();resolve(applied)};
  tx.onabort=()=>{db.close();reject(tx.error||new Error('Không lưu được bốn góc nhận diện'))};
  tx.onerror=()=>{};
  const req=store.get(id);
  req.onsuccess=()=>{
   const current=req.result as ScanPage|undefined;
   if(!shouldApply()||!current||current.processed||safeScanOps(current.transformOps).length||
     current.corners.some((p,i)=>Math.hypot(p.x-expected[i].x,p.y-expected[i].y)>1e-6))return;
   store.put({...current,corners:next,detectionConfidence:'estimated'});
   applied=true;
  };
 });
}

/** Restore every scanned page and folder in ONE IndexedDB transaction. If any
 * image fails to be stored (quota, ID collision, corruption), the transaction
 * rolls back completely and existing user scans remain untouched. */
/** Turn one saved camera frame into separate editable regions, atomically.
 * Every region still contains its original (not a destructively cropped JPEG).
 * A duplicate or stale request never overwrites previously edited pages.
 * IndexedDB may account for a cloned source blob in each child; cap at four. */
export async function splitStoredScanPage(id:string,expected:ScanCorners,regions:ScanCorners[],
 shouldApply:()=>boolean=()=>true):Promise<ScanPage[]>{
 if(regions.length<2||regions.length>4||regions.some(q=>!validCorners(q)))return [];
 const db=await database();return new Promise<ScanPage[]>((resolve,reject)=>{
  const tr=db.transaction('pages','readwrite'),store=tr.objectStore('pages');let created:ScanPage[]=[];
  tr.oncomplete=()=>{db.close();resolve(created)};
  tr.onabort=()=>{db.close();reject(tr.error||new Error('Không tách được trọn bộ vùng tài liệu'))};
  const req=store.get(id);
  req.onsuccess=()=>{
   const current=req.result as ScanPage|undefined;
   if(!shouldApply()||!current||current.processed||current.splitRegionCount||
    current.corners.some((c,i)=>Math.hypot(c.x-expected[i].x,c.y-expected[i].y)>1e-6))return;
   const first={...current,corners:regions[0],detectionConfidence:'estimated' as const,splitRegionCount:regions.length};
   store.put(first);
   created=[first];
   for(let n=1;n<regions.length;n++){
    const child:ScanPage={...current,id:newScanId(),name:compactScanRegionName(current.name,n+1),
     processed:undefined,corners:regions[n],detectionConfidence:'estimated',splitParentId:id,
     splitRegionCount:undefined,warpGrid:undefined,order:current.order+n*.001};
    store.add(child);created.push(child);
   }
  };
 });
}

/** Create one manual additional crop from a still-preserved source image. */
export async function addScanRegionManually(source:ScanPage,existingNames:string[]=[]):Promise<ScanPage>{
 const used=new Set([source.name,...existingNames]);let index=2;
 while(used.has(compactScanRegionName(source.name,index)))index++;
 const child:ScanPage={...source,id:newScanId(),name:compactScanRegionName(source.name,index),
  processed:undefined,corners:DEFAULT_CORNERS.map(p=>({...p})) as ScanCorners,
  detectionConfidence:'manual',splitParentId:source.splitParentId||source.id,
  splitRegionCount:undefined,warpGrid:undefined,order:source.order+.0005,createdAt:Date.now()};
 await transact<void>('pages','readwrite',(store,done)=>{store.add(child);done()});
 return child;
}

export async function restoreScanBatch(folders:ScanFolder[],pages:ScanPage[]):Promise<void>{
 const db=await database();
 return new Promise<void>((resolve,reject)=>{
  const tx=db.transaction(['folders','pages'],'readwrite');
  tx.oncomplete=()=>{db.close();resolve();};
  tx.onabort=()=>{db.close();reject(tx.error||new Error('Khôi phục scan thất bại; đã hoàn tác toàn bộ dữ liệu mới'));};
  tx.onerror=()=>{};
  try{
   const folderStore=tx.objectStore('folders'),pageStore=tx.objectStore('pages');
   // add, not put: never overwrite pre-existing items on a rare ID collision.
   for(const folder of folders)folderStore.add(folder);
   for(const page of pages)pageStore.add(page);
  }catch(error){try{tx.abort();}catch{/* transaction already finished */}}
 });
}


async function openBitmap(blob:Blob):Promise<ImageBitmap>{
 if(!blob.size)throw Error('Ảnh đầu vào trống');
 // createImageBitmap normalizes JPEG EXIF orientation before corner correction.
 return createImageBitmap(blob,{imageOrientation:'from-image'});
}
async function sourcePixels(blob:Blob,maxEdge:number,ops:ScanImageOp[]=[]):Promise<ImageData>{
 const bmp=await openBitmap(blob);try{
  const size=scanOrientedSize(bmp.width,bmp.height,ops);
  const scale=Math.min(1,maxEdge/Math.max(size.width,size.height));
  const w=Math.max(1,Math.round(size.width*scale)),h=Math.max(1,Math.round(size.height*scale));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Không thể xử lý ảnh trên thiết bị');
  drawScannerOriented(ctx,bmp,bmp.width,bmp.height,ops,scale);
  return ctx.getImageData(0,0,w,h);
 }finally{bmp.close();}
}
/** Preview is generated from the unmodified source; image operations do not
 * mutate the original or the stored corner markers. */
export async function scannerOrientedPreview(blob:Blob,ops:ScanImageOp[]):Promise<Blob>{
 if(!ops.length)return blob;
 const bmp=await openBitmap(blob);try{
  const dimensions=scanOrientedSize(bmp.width,bmp.height,ops);
  const scale=Math.min(1,1700/Math.max(dimensions.width,dimensions.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(dimensions.width*scale);canvas.height=Math.round(dimensions.height*scale);
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Không mở được ảnh chỉnh hướng');
  drawScannerOriented(ctx,bmp,bmp.width,bmp.height,ops,scale);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Không tạo được ảnh xem trước')),'image/jpeg',.91));
 }finally{bmp.close();}
}
export type ScanDetection={corners:ScanCorners;confidence:'estimated'|'manual'};
/** Robust on-device quadrilateral detector (no OpenCV/CDN dependency).
 * Inspired by contour + polygon approximation workflows common to offline scanners:
 * 1) robust border color model; 2) morphological closing; 3) connected components;
 * 4) convex hull / 4-vertex simplification; 5) geometry and edge validation.
 * Never silently crop when confidence is low: return a near-full-image manual frame.
 */
function defaultDetection():ScanDetection{
 return {corners:DEFAULT_CORNERS.map(p=>({...p})) as ScanCorners,confidence:'manual'};
}
type PixelPoint={x:number;y:number};
function convexHull(points:PixelPoint[]):PixelPoint[]{
 const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y);
 if(sorted.length<4)return sorted;
 const cross=(a:PixelPoint,b:PixelPoint,c:PixelPoint)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const lower:PixelPoint[]=[],upper:PixelPoint[]=[];
 for(const p of sorted){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);}
 for(let i=sorted.length-1;i>=0;i--){const p=sorted[i];while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);}
 lower.pop();upper.pop();return lower.concat(upper);
}
function hullToQuadrilateral(hull:PixelPoint[]):PixelPoint[]|null{
 if(hull.length<4)return null;
 const quad=[...hull];
 // Remove the smallest corner contribution until only four dominant vertices
 // remain. This avoids picking random text/shadow extrema as document corners.
 while(quad.length>4){
  let least=Infinity,remove=-1;
  for(let i=0;i<quad.length;i++){
   const p=quad[(i+quad.length-1)%quad.length],q=quad[i],r=quad[(i+1)%quad.length];
   const contribution=Math.abs((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x));
   if(contribution<least){least=contribution;remove=i;}
  }
  quad.splice(remove,1);
 }
 return quad;
}
function orderQuad(pts:PixelPoint[]):[PixelPoint,PixelPoint,PixelPoint,PixelPoint]|null{
 if(pts.length!==4)return null;
 const sum=(p:PixelPoint)=>p.x+p.y,diff=(p:PixelPoint)=>p.x-p.y;
 const tl=pts.reduce((a,b)=>sum(a)<sum(b)?a:b);
 const br=pts.reduce((a,b)=>sum(a)>sum(b)?a:b);
 const tr=pts.reduce((a,b)=>diff(a)>diff(b)?a:b);
 const bl=pts.reduce((a,b)=>diff(a)<diff(b)?a:b);
 if(new Set([tl,tr,br,bl]).size!==4)return null;
 return [tl,tr,br,bl];
}
function morphClose(src:Uint8Array,w:number,h:number):Uint8Array{
 const d=new Uint8Array(src.length),out=new Uint8Array(src.length);
 // 3×3 closing twice fills holes from text, signatures and thin shadow breaks.
 let mask=src;
 for(let pass=0;pass<2;pass++){
  d.fill(0);out.fill(0);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const k=y*w+x;
   if(mask[k]||mask[k-1]||mask[k+1]||mask[k-w]||mask[k+w]||mask[k-w-1]||mask[k-w+1]||mask[k+w-1]||mask[k+w+1])d[k]=1;
  }
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const k=y*w+x;
   if(d[k]&&d[k-1]&&d[k+1]&&d[k-w]&&d[k+w]&&d[k-w-1]&&d[k-w+1]&&d[k+w-1]&&d[k+w+1])out[k]=1;
  }
  mask=new Uint8Array(out);
 }
 return mask;
}
function quadPolygonArea(p:PixelPoint[]):number{
 let a=0;for(let i=0;i<4;i++)a+=p[i].x*p[(i+1)%4].y-p[(i+1)%4].x*p[i].y;
 return Math.abs(a)*.5;
}
function detectDocumentByColor(image:ImageData,kind:ScanDocumentType='auto'):ScanDetection{
 const {width:w,height:h,data}=image;
 if(w<70||h<70||data.length<w*h*4)return defaultDetection();
 const cornersRgb:number[][]=[];
 const radius=Math.max(3,Math.round(Math.min(w,h)*.035));
 for(const [cx,cy] of [[radius,radius],[w-radius-1,radius],[w-radius-1,h-radius-1],[radius,h-radius-1]]){
  const channel=[0,0,0];let count=0;
  for(let y=cy-radius;y<=cy+radius;y+=2)for(let x=cx-radius;x<=cx+radius;x+=2){
   if(x<0||x>=w||y<0||y>=h)continue;
   const k=(y*w+x)*4;for(let c=0;c<3;c++)channel[c]+=data[k+c];count++;
  }
  cornersRgb.push(channel.map(v=>v/Math.max(1,count)));
 }
 const distance=(a:number[],b:number[])=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2]);
 // Medoid: shadows in one image corner must not drag the background model.
 const model=cornersRgb.reduce((best,c)=>{
  const support=cornersRgb.reduce((n,other)=>n+(distance(c,other)<58?1:0),0);
  return support>best.support?{rgb:c,support}:best;
 },{rgb:cornersRgb[0],support:0});
 if(model.support<2)return defaultDetection();
 const near=cornersRgb.filter(c=>distance(c,model.rgb)<58);
 const bg=[0,1,2].map(c=>near.reduce((v,p)=>v+p[c],0)/near.length);
 // Border texture drives a noise-aware threshold; don't mistake patterned
 // desk/grain for the ID-card foreground.
 const borderDifferences:number[]=[];
 for(let i=0;i<64;i++){
  const u=Math.round(i*(w-1)/63),v=Math.round(i*(h-1)/63);
  for(const [x,y] of [[u,1],[u,h-2],[1,v],[w-2,v]]){
   const k=(y*w+x)*4;
   borderDifferences.push(distance([data[k],data[k+1],data[k+2]],bg));
  }
 }
 borderDifferences.sort((a,b)=>a-b);
 const noise=borderDifferences[Math.floor(borderDifferences.length*.66)];
 const threshold=Math.max(45,Math.min(115,noise*1.45+22));
 const mask=new Uint8Array(w*h);
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  const k=(y*w+x)*4;
  const dr=Math.abs(data[k]-bg[0]),dg=Math.abs(data[k+1]-bg[1]),db=Math.abs(data[k+2]-bg[2]);
  if(dr+dg+db>threshold)mask[y*w+x]=1;
 }
 const smooth=morphClose(mask,w,h);
 const visited=new Uint8Array(w*h),queue=new Int32Array(w*h);
 let best:ScanDetection|undefined,bestScore=-Infinity;
 for(let sy=3;sy<h-3;sy+=2)for(let sx=3;sx<w-3;sx+=2){
  const seed=sy*w+sx;if(!smooth[seed]||visited[seed])continue;
  let head=0,tail=1;queue[0]=seed;visited[seed]=1;
  let minX=w,maxX=0,minY=h,maxY=0,borderTouch=0;
  const boundary:PixelPoint[]=[];
  while(head<tail){
   const idx=queue[head++],x=idx%w,y=(idx/w)|0;
   minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);
   if(x<=3||x>=w-4||y<=3||y>=h-4)borderTouch++;
   let isBoundary=false;
   for(const n of [idx-1,idx+1,idx-w,idx+w]){
    if(n<0||n>=w*h||Math.abs((n%w)-x)>1){isBoundary=true;continue;}
    if(!smooth[n]){isBoundary=true;continue;}
    if(!visited[n]){visited[n]=1;queue[tail++]=n;}
   }
   if(isBoundary&&(head%2===0))boundary.push({x,y});
  }
  const componentArea=tail,coverage=componentArea/(w*h),bw=maxX-minX,bh=maxY-minY;
  if(coverage<.075||coverage>.88||bw<w*.24||bh<h*.2||minX<=4||minY<=4||maxX>=w-5||maxY>=h-5||borderTouch>componentArea*.018||boundary.length<12)continue;
  const fill=componentArea/Math.max(1,bw*bh);
  if(fill<.49)continue;
  const quad=hullToQuadrilateral(convexHull(boundary));
  const ordered=quad&&orderQuad(quad);
  if(!ordered)continue;
  const area=quadPolygonArea(ordered),ratio=area/Math.max(1,bw*bh);
  if(area<w*h*.07||ratio<.46)continue;
  const edgeLen=(a:PixelPoint,b:PixelPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
  const wd=(edgeLen(ordered[0],ordered[1])+edgeLen(ordered[3],ordered[2]))/2;
  const ht=(edgeLen(ordered[0],ordered[3])+edgeLen(ordered[1],ordered[2]))/2;
  if(wd/ht<.35||wd/ht>3.6)continue;
  // Leave a thin external rim so scanning never nicks a rounded CCCD corner.
  const center={x:ordered.reduce((n,p)=>n+p.x,0)/4,y:ordered.reduce((n,p)=>n+p.y,0)/4};
  const points=ordered.map(p=>({x:clamp((p.x+(p.x-center.x)*.013)/(w-1),0,1),
    y:clamp((p.y+(p.y-center.y)*.013)/(h-1),0,1)})) as ScanCorners;
  if(!validCorners(points))continue;
  const centrality=1-Math.hypot(center.x/w-.5,center.y/h-.5);
  const aspect=wd/ht;
  const expected=kind==='id-card'?1.585:kind==='paper'?Math.SQRT2:0;
  const aspectError=expected?Math.min(Math.abs(Math.log(aspect/expected)),Math.abs(Math.log(aspect*expected))):0;
  const aspectBonus=expected?.08*Math.exp(-2*aspectError):0;
  const score=coverage*.7+fill*.25+ratio*.25+centrality*.15+aspectBonus-borderTouch*.001;
  if(score>bestScore){best={corners:points,confidence:'estimated'};bestScore=score;}
 }
 return best??defaultDetection();
}

/** An independent gradient/closed-outline pass for white-on-white pages,
 * patterned desks and CCCD with textured/uneven-colored card faces.
 * The old color-segmentation pass remains available as the primary candidate.
 * The perimeter must be supported by four long, strong image edges; isolated
 * text rectangles and shadows are rejected rather than silently clipped.
 * Implemented independently; no external model, OpenCV or remote CDN. */
function findEdgeQuadrilateral(image:ImageData,kind:ScanDocumentType):{corners:ScanCorners;support:number}|null{
 const {width:w,height:h,data}=image;
 if(w<70||h<70)return null;
 const size=w*h,gray=new Float32Array(size),smooth=new Float32Array(size),mag=new Float32Array(size);
 for(let i=0;i<size;i++){
  const j=i*4;gray[i]=.299*data[j]+.587*data[j+1]+.114*data[j+2];
 }
 // Separable 3x3 Gaussian blur without allocating a giant 12MP frame.
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const k=y*w+x;
  smooth[k]=(gray[k-w-1]+gray[k-w+1]+gray[k+w-1]+gray[k+w+1]
   +2*(gray[k-1]+gray[k+1]+gray[k-w]+gray[k+w])+4*gray[k])/16;
 }
 const hist=new Uint32Array(512);
 let n=0;
 for(let y=3;y<h-3;y++)for(let x=3;x<w-3;x++){
  const k=y*w+x;
  const gx=(smooth[k-w+1]+2*smooth[k+1]+smooth[k+w+1])-(smooth[k-w-1]+2*smooth[k-1]+smooth[k+w-1]);
  const gy=(smooth[k+w-1]+2*smooth[k+w]+smooth[k+w+1])-(smooth[k-w-1]+2*smooth[k-w]+smooth[k-w+1]);
  const v=Math.hypot(gx,gy);mag[k]=v;hist[Math.min(511,v|0)]++;n++;
 }
 let count=0,p80=0,p94=0;
 for(let i=0;i<hist.length;i++){
  count+=hist[i];if(!p80&&count>=n*.80)p80=i;
  if(!p94&&count>=n*.94){p94=i;break;}
 }
 // Low-contrast white paper still generates a 5-20 intensity gradient at its
 // boundary. Texture noise raises the threshold adaptively.
 const threshold=Math.max(7,Math.min(95,p80*1.48+3,p94*.92+4));
 const edges=new Uint8Array(size);
 for(let y=3;y<h-3;y++)for(let x=3;x<w-3;x++){
  const k=y*w+x;if(mag[k]>threshold)edges[k]=1;
 }
 // Join short gaps (soft paper boundaries/shadow occlusion) using dilated edge
 // strips. Dilation is limited to 2px; a missing entire edge stays uncertain.
 let closed=edges;
 for(let pass=0;pass<2;pass++){
  const next=new Uint8Array(size);
  for(let y=3;y<h-3;y++)for(let x=3;x<w-3;x++){
   const k=y*w+x;
   if(closed[k]||closed[k-1]||closed[k+1]||closed[k-w]||closed[k+w]||closed[k-w-1]||closed[k-w+1]||closed[k+w-1]||closed[k+w+1])next[k]=1;
  }
  closed=next;
 }
 // Flood-fill from outside the closed outlines, keeping enclosed objects.
 const external=new Uint8Array(size),queue=new Int32Array(size);let head=0,tail=0;
 const seed=(k:number)=>{if(!closed[k]&&!external[k]){external[k]=1;queue[tail++]=k;}};
 for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x);}
 for(let y=0;y<h;y++){seed(y*w);seed(y*w+w-1);}
 while(head<tail){const k=queue[head++],x=k%w;
  if(x>0)seed(k-1);if(x<w-1)seed(k+1);
  if(k>=w)seed(k-w);if(k<size-w)seed(k+w);
 }
 const filled=new Uint8Array(size);
 for(let i=0;i<size;i++)if(!external[i])filled[i]=1;
 const visited=new Uint8Array(size);let best:{corners:ScanCorners;support:number}|null=null;
 const pixels=new Int32Array(size);
 for(let sy=5;sy<h-5;sy+=2)for(let sx=5;sx<w-5;sx+=2){
  const start=sy*w+sx;if(!filled[start]||visited[start])continue;
  head=0;tail=1;pixels[0]=start;visited[start]=1;
  let minX=w,minY=h,maxX=0,maxY=0,touch=0;
  const boundary:PixelPoint[]=[];
  while(head<tail){const k=pixels[head++],x=k%w,y=(k/w)|0;
   if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
   if(x<5||y<5||x>w-6||y>h-6)touch++;
   let outline=false;
   const visit=(nk:number)=>{
    if(!filled[nk]){outline=true;return;}
    if(!visited[nk]){visited[nk]=1;pixels[tail++]=nk;}
   };
   if(x>0)visit(k-1);if(x<w-1)visit(k+1);if(y>0)visit(k-w);if(y<h-1)visit(k+w);
   if(outline&&(head%2===0))boundary.push({x,y});
  }
  const ratio=tail/size,bw=maxX-minX,bh=maxY-minY;
  if(ratio<.075||ratio>.83||touch||bw<w*.24||bh<h*.22||boundary.length<12)continue;
  const ordered=orderQuad(hullToQuadrilateral(convexHull(boundary))||[]);
  if(!ordered)continue;
  const area=quadPolygonArea(ordered),rectArea=bw*bh;
  if(area/size<.07||area/Math.max(1,rectArea)<.57)continue;
  const lens=ordered.map((v,i)=>Math.hypot(v.x-ordered[(i+1)%4].x,v.y-ordered[(i+1)%4].y));
  const long=(lens[0]+lens[2])/2,short=(lens[1]+lens[3])/2;
  if(long/short<.35||long/short>3.6)continue;
  // Evaluate actual edge evidence around each of 4 sides. Reject a contour
  // made by office clutter / shadows despite a quadrilateral-looking hull.
  let support=0,minSide=1;
  for(let i=0;i<4;i++){
   const a=ordered[i],b=ordered[(i+1)%4],N=48;
   const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
   let matching=0;
   for(let j=2;j<N-2;j++){
    const t=j/(N-1),xx=a.x+dx*t,yy=a.y+dy*t;
    let max=0;
    for(const offset of [-3,-1,0,1,3]){
     const px=Math.round(xx+offset*nx),py=Math.round(yy+offset*ny);
     if(px>2&&px<w-3&&py>2&&py<h-3)max=Math.max(max,mag[py*w+px]);
    }
    if(max>threshold*.85)matching++;
   }
   const match=matching/(N-4);support+=match/4;minSide=Math.min(minSide,match);
  }
  if(support<.64||minSide<.43)continue;
  const pts=ordered.map(p=>({x:clamp(p.x/(w-1),0,1),y:clamp(p.y/(h-1),0,1)})) as ScanCorners;
  if(!validCorners(pts))continue;
  const expected=kind==='id-card'?1.585:kind==='paper'?Math.SQRT2:0;
  const aspect=long/short;
  const deviation=expected?Math.min(Math.abs(Math.log(aspect/expected)),Math.abs(Math.log(aspect*expected))):0;
  if(expected&&deviation>.52)continue;
  const weighted=support+.08*ratio+.035*(area/rectArea)-(expected ? .06*deviation : 0);
  if(!best||weighted>best.support)best={corners:pts,support:weighted};
 }
 return best;
}
/** A fast, conservative blue-green ID-card pass for warm/textured desks.
 * Wood grain often defeats border-color segmentation and the card's photo can
 * break gradient outlines. Pixel colors on a cyan ID card remain distinct from
 * warm wood even when the middle of the card is white or heavily printed.
 * Reject boundary-touching, tiny and low-density objects; preserve a 3% rim
 * around the oriented rectangle so rounded physical corners are not cut. */
function findCoolCardQuadrilateral(image:ImageData,kind:ScanDocumentType):ScanDetection|null{
 if(kind==='paper')return null;
 const {width:w,height:h,data}=image;
 if(w<90||h<90)return null;
 const sampled:PixelPoint[]=[];
 const cols=Math.ceil((w-4)/2),rows=Math.ceil((h-4)/2);
 const coolMask=new Uint8Array(cols*rows);
 let cool=0,border=0,minX=w,minY=h,maxX=0,maxY=0;
 const inset=Math.max(4,Math.round(Math.min(w,h)*.025));
 for(let y=2;y<h-2;y+=2)for(let x=2;x<w-2;x+=2){
  const k=(y*w+x)*4,r=data[k],g=data[k+1],b=data[k+2];
  // Test cool chroma, not luminance. White glare and text may be holes.
  if(!((g-r>14&&b-r>0)||(g-r>27&&b-r>-10)))continue;
  cool++;coolMask[((y-2)/2)*cols+(x-2)/2]=1;
  if(x<=inset||x>=w-1-inset||y<=inset||y>=h-1-inset)border++;
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);
  minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  sampled.push({x,y});
 }
 const total=Math.ceil((w-4)/2)*Math.ceil((h-4)/2),share=cool/Math.max(1,total);
 if(cool<130||share<.025||share>.34||border>cool*.014||
  minX<=inset||minY<=inset||maxX>=w-1-inset||maxY>=h-1-inset||
  maxX-minX<w*.18||maxY-minY<h*.18)return null;
 // Teal specks in shiny wood/glare can pull an all-pixel hull far away
 // from the card. Prefer the dominant CLOSED cyan component, while retaining
 // the original sample geometry for accurate, uncropped rounded corners.
 const closed=morphClose(coolMask,cols,rows);
 const visited=new Uint8Array(closed.length),queue=new Int32Array(closed.length);
 let primary:PixelPoint[]=[];
 for(let k=0;k<closed.length;k++){
  if(!closed[k]||visited[k])continue;
  let head=0,tail=0;queue[tail++]=k;visited[k]=1;
  const component:PixelPoint[]=[];
  while(head<tail){
   const curr=queue[head++],xx=curr%cols,yy=Math.floor(curr/cols);
   if(coolMask[curr])component.push({x:2+xx*2,y:2+yy*2});
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;
    const nx=xx+dx,ny=yy+dy;
    if(nx<0||nx>=cols||ny<0||ny>=rows)continue;
    const nk=ny*cols+nx;
    if(closed[nk]&&!visited[nk]){visited[nk]=1;queue[tail++]=nk;}
   }
  }
  if(component.length>primary.length)primary=component;
 }
 // Retain the previous candidate on fragmented/two-tone cards rather than
 // risk selecting just one half (portrait and QR zones often split the mask).
 const hull=convexHull(primary.length>=cool*.70?primary:sampled);
 if(hull.length<4)return null;
 // A minimum-area rotated rectangle spans separated teal sections of an ID
 // (the portrait, QR code and glare need not form a closed contour).
 let best:{area:number;ux:number;uy:number;loU:number;hiU:number;loV:number;hiV:number}|null=null;
 for(let i=0;i<hull.length;i++){
  const a=hull[i],b=hull[(i+1)%hull.length];
  const len=Math.hypot(b.x-a.x,b.y-a.y);if(len<1)return null;
  const ux=(b.x-a.x)/len,uy=(b.y-a.y)/len;
  let loU=Infinity,hiU=-Infinity,loV=Infinity,hiV=-Infinity;
  for(const p of hull){const u=p.x*ux+p.y*uy,v=-p.x*uy+p.y*ux;
   loU=Math.min(loU,u);hiU=Math.max(hiU,u);
   loV=Math.min(loV,v);hiV=Math.max(hiV,v);
  }
  const area=(hiU-loU)*(hiV-loV);
  if(!best||area<best.area)best={area,ux,uy,loU,hiU,loV,hiV};
 }
 if(!best)return null;
 const size=best.area/(w*h),fill=cool*4/Math.max(1,best.area);
 const dimU=best.hiU-best.loU,dimV=best.hiV-best.loV;
 const ratio=Math.max(dimU,dimV)/Math.max(1,Math.min(dimU,dimV));
 if(size<.09||size>.74||fill<.19||ratio<1.24||ratio>2.35)return null;
 // 3% extends the inferred color boundary to the true rounded outer edge.
 const padU=Math.max(2,dimU*.03),padV=Math.max(2,dimV*.03);
 const {ux,uy}=best;
 const coords:[[number,number],[number,number],[number,number],[number,number]]=[
  [best.loU-padU,best.loV-padV],[best.hiU+padU,best.loV-padV],
  [best.hiU+padU,best.hiV+padV],[best.loU-padU,best.hiV+padV],
 ];
 const points=coords.map(([u,v])=>({x:(ux*u-uy*v)/(w-1),y:(uy*u+ux*v)/(h-1)}));
 const ordered=orderQuad(points);
 if(!ordered)return null;
 const normalized=ordered.map(p=>({x:p.x,y:p.y})) as ScanCorners;
 // Never clamp vertices outside the photo: that would distort perspective.
 if(!validCorners(normalized))return null;
 return {corners:normalized,confidence:'estimated'};
}

/** Higher-confidence 4-edge result replaces uncertain color-only segmentation.
 * Never force detection when edges do not close: manual frame retains source. */
export function detectDocumentEdges(image:ImageData,kind:ScanDocumentType='auto'):ScanDetection{
 // Strong cyan-ID candidate: avoids both expensive contour passes on busy wood.
 const coolCard=findCoolCardQuadrilateral(image,kind);
 if(coolCard)return coolCard;
 const color=detectDocumentByColor(image,kind);
 const edge=findEdgeQuadrilateral(image,kind);
 if(!edge)return color;
 if(color.confidence==='manual')return {corners:edge.corners,confidence:'estimated'};
 // When two independent methods agree, color pass already has generous outer rim.
 const difference=color.corners.reduce((d,p,i)=>d+Math.hypot(p.x-edge.corners[i].x,p.y-edge.corners[i].y),0)/4;
 if(difference<.042)return color;
 // Significant disagreement: use the edge model only with near-continuous
 // support, otherwise preserve the previous conservative color candidate.
 if(edge.support>.93)return {corners:edge.corners,confidence:'estimated'};
 return color;
}

/** Find distinct, spatially separate documents from one photo.
 * This is intentionally conservative: only isolated well-shaped cyan IDs or
 * bright neutral paper regions are proposed. Users can add missing regions
 * by hand; weak guesses must never silently crop or discard the source. */
export function detectMultipleDocumentEdges(image:ImageData,kind:ScanDocumentType='auto',limit=4):ScanDetection[]{
 const {width:w,height:h,data}=image;
 if(w<100||h<100||data.length<w*h*4)return [];
 const stride=2,cols=Math.floor((w-4)/stride)+1,rows=Math.floor((h-4)/stride)+1;
 const borderSamples:number[]=[];
 for(let j=0;j<24;j++){
  const x=Math.round(j*(w-1)/23),y=Math.round(j*(h-1)/23);
  for(const [xx,yy] of [[x,2],[x,h-3],[2,y],[w-3,y]]){
   const k=(yy*w+xx)*4;
   borderSamples.push(.2126*data[k]+.7152*data[k+1]+.0722*data[k+2]);
  }
 }
 borderSamples.sort((a,b)=>a-b);
 const borderLum=borderSamples[Math.floor(borderSamples.length*.50)];
 const masks:{mask:Uint8Array;type:'cool'|'paper'}[]=[];
 for(const type of (kind==='id-card'?['cool']:kind==='paper'?['paper']:['cool','paper']) as ('cool'|'paper')[]){
  const mask=new Uint8Array(cols*rows);
  let count=0;
  for(let y=2,yy=0;yy<rows;yy++,y+=stride)for(let x=2,xx=0;xx<cols;xx++,x+=stride){
   const k=(y*w+x)*4,r=data[k],g=data[k+1],b=data[k+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);
   const cool=(g-r>14&&b-r>0)||(g-r>27&&b-r>-10);
   const white=(.2126*r+.7152*g+.0722*b>Math.max(168,borderLum+27))&&hi-lo<44;
   if(type==='cool'?cool:white){mask[yy*cols+xx]=1;count++;}
  }
  if(count>75&&count<mask.length*.78)masks.push({mask,type});
 }
 const candidates:{quad:ScanCorners;area:number;centroid:ScanPoint;type:string}[]=[];
 for(const {mask,type} of masks){
  const close=morphClose(mask,cols,rows),seen=new Uint8Array(close.length);
  const queue=new Int32Array(close.length);
  for(let seed=0;seed<close.length;seed++){
   if(!close[seed]||seen[seed])continue;
   let front=0,back=0;
   queue[back++]=seed;seen[seed]=1;
   const points:PixelPoint[]=[];
   let left=w,top=h,right=0,bottom=0;
   while(front<back){
    const k=queue[front++],cx=k%cols,cy=Math.floor(k/cols);
    if(mask[k]){const x=2+cx*stride,y=2+cy*stride;
     points.push({x,y});left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     if(!dx&&!dy)continue;
     const nx=cx+dx,ny=cy+dy;if(nx<0||nx>=cols||ny<0||ny>=rows)continue;
     const nk=ny*cols+nx;if(close[nk]&&!seen[nk]){seen[nk]=1;queue[back++]=nk;}
    }
   }
   if(points.length<Math.max(45,w*h*.0017)||left<4||top<4||right>w-5||bottom>h-5)continue;
   const hull=convexHull(points);if(hull.length<4)continue;
   let best:{area:number;ux:number;uy:number;loU:number;hiU:number;loV:number;hiV:number}|null=null;
   for(let i=0;i<hull.length;i++){
    const a=hull[i],b=hull[(i+1)%hull.length],len=Math.hypot(b.x-a.x,b.y-a.y);
    if(len<.1)continue;
    const ux=(b.x-a.x)/len,uy=(b.y-a.y)/len;
    let loU=Infinity,hiU=-Infinity,loV=Infinity,hiV=-Infinity;
    for(const pt of hull){const u=pt.x*ux+pt.y*uy,v=-pt.x*uy+pt.y*ux;
     loU=Math.min(loU,u);hiU=Math.max(hiU,u);loV=Math.min(loV,v);hiV=Math.max(hiV,v);}
    const area=(hiU-loU)*(hiV-loV);
    if(!best||area<best.area)best={area,ux,uy,loU,hiU,loV,hiV};
   }
   if(!best)continue;
   const frac=best.area/(w*h),fill=points.length*stride*stride/Math.max(1,best.area);
   const sideA=best.hiU-best.loU,sideB=best.hiV-best.loV;
   const ratio=Math.max(sideA,sideB)/Math.max(1,Math.min(sideA,sideB));
   if(frac<.023||frac>.58||ratio<1.17||ratio>2.37||fill<(type==='cool'?.14:.43))continue;
   const pu=Math.max(2,sideA*(type==='cool'?.035:.012));
   const pv=Math.max(2,sideB*(type==='cool'?.035:.012));
   const coords:[[number,number],[number,number],[number,number],[number,number]]=[
    [best.loU-pu,best.loV-pv],[best.hiU+pu,best.loV-pv],
    [best.hiU+pu,best.hiV+pv],[best.loU-pu,best.hiV+pv]
   ];
   const {ux,uy}=best;
   const normalized=orderQuad(coords.map(([u,v])=>({x:(ux*u-uy*v)/(w-1),y:(uy*u+ux*v)/(h-1)})));
   if(!normalized||!validCorners(normalized))continue;
   const q=normalized as ScanCorners;
   const center={x:q.reduce((sum,p)=>sum+p.x,0)/4,y:q.reduce((sum,p)=>sum+p.y,0)/4};
   const area=frac;
   if(candidates.some(c=>Math.hypot(c.centroid.x-center.x,c.centroid.y-center.y)<.13))continue;
   candidates.push({quad:q,area,centroid:center,type});
  }
 }
 // Require two clearly separated regions before automatically splitting.
 // Suppress a nested bright portrait or glare patch mistaken for another
 // document. A second region must be spatially separate, not inside the first.
 const bounds=(c:typeof candidates[number])=>{
  const xs=c.quad.map(p=>p.x),ys=c.quad.map(p=>p.y);
  return {left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
 };
 const result:typeof candidates=[];
 for(const c of candidates.sort((a,b)=>b.area-a.area)){
  const a=bounds(c);
  const overlaps=result.some(other=>{
   const b=bounds(other);
   const iw=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
   const ih=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
   const smaller=Math.min((a.right-a.left)*(a.bottom-a.top),(b.right-b.left)*(b.bottom-b.top));
   return iw*ih/Math.max(1e-6,smaller)>.25;
  });
  if(!overlaps)result.push(c);
  if(result.length>=Math.min(4,limit))break;
 }
 if(result.length<2)return [];
 result.sort((a,b)=>a.centroid.y-b.centroid.y||a.centroid.x-b.centroid.x);
 return result.map(r=>({corners:r.quad,confidence:'estimated'}));
}
export async function suggestMultipleDocumentEdges(blob:Blob,kind:ScanDocumentType='auto'):
 Promise<ScanDetection[]>{
 return detectMultipleDocumentEdges(await sourcePixels(blob,520),kind);
}

/** A stored JPEG is the only authoritative raster for its persisted corners.
 * Cyan card evidence is needed before replacing a live camera quadrilateral:
 * when the shutter frame differs from the last video-analysis frame, an old
 * green overlay may otherwise leave the four saved points on bare wood.
 * No screenshot or document content leaves the device. */
function scanCoolEvidence(image:ImageData,quad:ScanCorners):{covered:number;density:number;total:number}{
 if(!validCorners(quad))return {covered:0,density:0,total:0};
 const {width:w,height:h,data}=image;
 let coolTotal=0,coolInside=0,insideCount=0;
 const inQuad=(x:number,y:number)=>{
  let sign=0;
  for(let i=0;i<4;i++){
   const a=quad[i],b=quad[(i+1)%4];
   const cross=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);
   if(Math.abs(cross)<1e-7)continue;
   if(sign&&cross*sign<0)return false;
   sign=Math.sign(cross);
  }
  return true;
 };
 for(let y=2;y<h-2;y+=3)for(let x=2;x<w-2;x+=3){
  const k=(y*w+x)*4,r=data[k],g=data[k+1],b=data[k+2];
  const cool=(g-r>14&&b-r>0)||(g-r>27&&b-r>-10);
  const inside=inQuad(x/(w-1),y/(h-1));
  if(inside)insideCount++;
  if(cool){coolTotal++;if(inside)coolInside++;}
 }
 return {covered:coolInside/Math.max(1,coolTotal),density:coolInside/Math.max(1,insideCount),total:coolTotal};
}

/** Return a correction only with evidence in the exact saved image; return null
 * if the preview is already aligned or evidence is too weak to cut safely. */
export function selectSavedScanCorners(image:ImageData,live:ScanCorners|null,found:ScanDetection,
 kind:ScanDocumentType='auto'):ScanDetection|null{
 if(found.confidence!=='estimated'||!validCorners(found.corners))return null;
 const current=live&&validCorners(live)?live:null;
 const difference=current?current.reduce((sum,p,i)=>sum+Math.hypot(p.x-found.corners[i].x,p.y-found.corners[i].y),0)/4:Infinity;
 if(difference<.075)return null; // Hold already-correct live corners.
 if(kind==='paper')return current?null:found; // Neutral paper has no cyan proof.
 const proposed=scanCoolEvidence(image,found.corners);
 const prior=current?scanCoolEvidence(image,current):null;
 // If a cyan card is visible, never promote a false positive on wood.
 if(proposed.total>90){
  if(proposed.covered<.72||proposed.density<.085)return null;
  if(prior&&(proposed.covered-prior.covered<.28||proposed.density<prior.density*1.25))return null;
 }
 // On paper without a cool card, don't replace an existing stable live quad.
 else if(current)return null;
 return found;
}

/** Execute only after the original JPEG is committed. This decoder reads the
 * captured image, not any moving camera video frame or DOM preview overlay. */
export async function reconcileSavedScanCorners(blob:Blob,live:ScanCorners|null,
 kind:ScanDocumentType='auto'):Promise<ScanDetection|null>{
 const pixels=await sourcePixels(blob,360);
 return selectSavedScanCorners(pixels,live,detectDocumentEdges(pixels,kind),kind);
}

export async function suggestDocumentEdges(blob:Blob,kind:ScanDocumentType='auto'):Promise<ScanDetection>{return detectDocumentEdges(await sourcePixels(blob,360),kind);}
export function validCorners(points:ScanCorners):boolean{
 if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))return false;
 let sign=0,area=0;
 for(let i=0;i<4;i++){const a=points[i],b=points[(i+1)%4],c=points[(i+2)%4];
  const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
  if(Math.abs(cross)<.001||sign&&Math.sign(cross)!==sign)return false;
  sign=Math.sign(cross);area+=a.x*b.y-b.x*a.y;
 }
 return Math.abs(area)>.025;
}

/** Vertically or horizontally segmented paper flattening. Two opposing edge
 * polylines, each with 3-6 nodes, form 2-5 planar strips at fold creases. */
export function initScanWarpGrid(c:ScanCorners,count:6|8|10|12,axis:'vertical'|'horizontal'='vertical'):ScanWarpGrid{
 if(!validCorners(c))throw Error('Hãy chỉnh 4 góc hợp lệ trước khi thêm điểm nếp gấp');
 const lerp=(a:ScanPoint,b:ScanPoint,t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 const a:ScanPoint[]=[],b:ScanPoint[]=[];
 for(let i=0;i<count/2;i++){const t=i/(count/2-1);
  a.push(axis==='vertical'?lerp(c[0],c[1],t):lerp(c[0],c[3],t));
  b.push(axis==='vertical'?lerp(c[3],c[2],t):lerp(c[1],c[2],t));
 }
 return {axis,points:[...a,...b]};
}
export function scanWarpOuterCorners(g:ScanWarpGrid):ScanCorners{
 const n=g.points.length/2,p=g.points;
 return g.axis==='vertical'?[p[0],p[n-1],p[2*n-1],p[n]]:[p[0],p[n],p[2*n-1],p[n-1]];
}
export function scanWarpQuads(g:ScanWarpGrid):ScanCorners[]{
 const n=g.points.length/2,p=g.points;const out:ScanCorners[]=[];
 for(let i=0;i<n-1;i++)out.push(g.axis==='vertical'?[p[i],p[i+1],p[n+i+1],p[n+i]]:[p[i],p[n+i],p[n+i+1],p[i+1]]);
 return out;
}
function validStrip(q:ScanCorners):boolean{
 if(q.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))return false;
 let sign=0,area=0;
 for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4],c=q[(i+2)%4];
  const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
  if(Math.abs(cross)<.00002||sign&&Math.sign(cross)!==sign)return false;
  sign=Math.sign(cross);area+=a.x*b.y-b.x*a.y;
 }return Math.abs(area)>.0005;
}
export function validScanWarp(c:ScanCorners,g:ScanWarpGrid|null|undefined):boolean{
 if(!g||!['vertical','horizontal'].includes(g.axis)||!Array.isArray(g.points)||
  ![6,8,10,12].includes(g.points.length)||!validCorners(c))return false;
 if(scanWarpOuterCorners(g).some((p,i)=>!p||Math.hypot(p.x-c[i].x,p.y-c[i].y)>.00001))return false;
 return scanWarpQuads(g).every(validStrip);
}
export function transformScanWarpGrid(g:ScanWarpGrid,op:ScanImageOp):ScanWarpGrid{
 const n=g.points.length/2;
 const axis=op==='cw'||op==='ccw'?(g.axis==='vertical'?'horizontal':'vertical'):g.axis;
 const tr=(p:ScanPoint):ScanPoint=>op==='cw'?{x:1-p.y,y:p.x}:op==='ccw'?{x:p.y,y:1-p.x}:
  op==='flip-h'?{x:1-p.x,y:p.y}:{x:p.x,y:1-p.y};
 const groups=[g.points.slice(0,n).map(tr),g.points.slice(n).map(tr)];
 const secondary=(p:ScanPoint)=>axis==='vertical'?p.y:p.x;
 const primary=(p:ScanPoint)=>axis==='vertical'?p.x:p.y;
 groups.sort((a,b)=>a.reduce((sum,p)=>sum+secondary(p),0)-b.reduce((sum,p)=>sum+secondary(p),0));
 groups.forEach(a=>a.sort((p,q)=>primary(p)-primary(q)));
 return {axis,points:groups.flat()};
}
export type ScanWarpBand={start:number;end:number;coeff:number[]};
export function scanWarpBands(c:ScanCorners,g?:ScanWarpGrid|null):ScanWarpBand[]{
 if(!g)return [{start:0,end:1,coeff:squareToQuadrilateral(c)}];
 if(!validScanWarp(c,g))throw Error('Các điểm nếp gấp giao nhau hoặc quá sát nhau');
 const quads=scanWarpQuads(g),dist=(a:ScanPoint,b:ScanPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
 const widths=quads.map(q=>g.axis==='vertical'?(dist(q[0],q[1])+dist(q[3],q[2]))/2:
  (dist(q[0],q[3])+dist(q[1],q[2]))/2);
 const total=widths.reduce((s,v)=>s+v,0);let start=0;
 return quads.map((q,i)=>{const end=i===quads.length-1?1:start+widths[i]/total;
  const out={start,end,coeff:squareToQuadrilateral(q,true)};start=end;return out;});
}
export function mapScanWarpOutput(u:number,v:number,bands:ScanWarpBand[],axis:'vertical'|'horizontal'='vertical'):ScanPoint{
 const t=axis==='vertical'?u:v,b=bands.find(b=>t<=b.end)||bands[bands.length-1];
 const fraction=clamp((t-b.start)/(b.end-b.start),0,1);
 const x=axis==='vertical'?fraction:u,y=axis==='vertical'?v:fraction,c=b.coeff,den=c[6]*x+c[7]*y+1;
 return {x:(c[0]*x+c[1]*y+c[2])/den,y:(c[3]*x+c[4]*y+c[5])/den};
}

/** Solve inverse homography: output unit square -> quadrilateral in input image. */
export function squareToQuadrilateral(points:ScanCorners,allowNarrowStrip=false):number[]{
 if(!(allowNarrowStrip?validStrip(points):validCorners(points)))throw Error('Bốn góc tạo thành vùng không hợp lệ. Hãy kéo lại các góc.');
 const pairs:[number,number,ScanPoint][]=[[0,0,points[0]],[1,0,points[1]],[1,1,points[2]],[0,1,points[3]]];
 const m:number[][]=[];
 for(const [u,v,p] of pairs){m.push([u,v,1,0,0,0,-u*p.x,-v*p.x,p.x]);m.push([0,0,0,u,v,1,-u*p.y,-v*p.y,p.y]);}
 for(let col=0;col<8;col++){
  let pivot=col;for(let i=col+1;i<8;i++)if(Math.abs(m[i][col])>Math.abs(m[pivot][col]))pivot=i;
  if(Math.abs(m[pivot][col])<1e-9)throw Error('Không thể xử lý 4 góc ảnh');
  [m[col],m[pivot]]=[m[pivot],m[col]];
  const k=m[col][col];for(let j=col;j<=8;j++)m[col][j]/=k;
  for(let row=0;row<8;row++)if(row!==col){const fac=m[row][col];for(let j=col;j<=8;j++)m[row][j]-=fac*m[col][j];}
 }
 return m.map(row=>row[8]);
}
function luminance(r:number,g:number,b:number){return .2126*r+.7152*g+.0722*b;}
function modifyFilter(r:number,g:number,b:number,filter:ScanFilter):[number,number,number]{
 if(filter==='color')return [r,g,b];
 const lum=luminance(r,g,b);
 if(filter==='gray')return [lum,lum,lum];
 if(filter==='bw'){const v=lum>142?255:0;return [v,v,v];}
 if(filter==='paper'){const v=clamp((lum-105)*2.1+180,0,255);return [v,v,v];}
 return [clamp((r-110)*1.18+132,0,255),clamp((g-110)*1.18+132,0,255),clamp((b-110)*1.18+132,0,255)];
}
/** Bounded edge-aware unsharp mask. Uses actual sampled pixels only; it does
 * not invent missing text. A local luminance difference avoids color halos,
 * smooth photographic regions are left alone, and output stays within 8-bit.
 * Processing is chunked so mobile WebView controls remain responsive. */
export async function sharpenScanPixels(pixels:Uint8ClampedArray,w:number,h:number,
 mode:ScanSharpness,signal?:AbortSignal):Promise<Uint8ClampedArray>{
 if(mode==='off'||w<3||h<3)return pixels;
 if(pixels.length!==w*h*4)throw Error('Sai kích thước dữ liệu ảnh cần làm nét');
 const luminances=new Uint8Array(w*h);
 for(let k=0;k<w*h;k++){
  const i=k*4;luminances[k]=Math.round(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2]);
 }
 const gain=mode==='text'?1.05:.67,threshold=mode==='text'?3:5;
 for(let y=1;y<h-1;y++){
  if(signal?.aborted)throw Error('Đã hủy xử lý ảnh');
  const row=y*w;
  for(let x=1;x<w-1;x++){
   const k=row+x,i=k*4;
   const smooth=(luminances[k-w-1]+2*luminances[k-w]+luminances[k-w+1]+
       2*luminances[k-1]+4*luminances[k]+2*luminances[k+1]+
       luminances[k+w-1]+2*luminances[k+w]+luminances[k+w+1])/16;
   const detail=luminances[k]-smooth;
   if(Math.abs(detail)<threshold)continue; // Ignore paper grain and JPEG noise.
   // Prevent prominent halos on faces, highlights and black QR finder blocks.
   const strength=mode==='auto'?Math.min(1,Math.abs(detail)/17):1;
   const delta=clamp(detail*gain*strength,-19,19);
   for(let c=0;c<3;c++)pixels[i+c]=clamp(pixels[i+c]+delta,0,255);
  }
  if(y%40===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 return pixels;
}

export async function flattenDocument(blob:Blob,corners:ScanCorners,filter:ScanFilter,signal?:AbortSignal,
 options?:{operations?:ScanImageOp[];adjustments?:ScanColorAdjust;sharpness?:ScanSharpness;warpGrid?:ScanWarpGrid|null}):Promise<Blob>{
 if(!validCorners(corners))throw Error('Vùng quét không hợp lệ. Hãy chỉnh lại 4 góc.');
 const input=await sourcePixels(blob,2400,safeScanOps(options?.operations));const {width:iw,height:ih,data}=input;
 const pix=(a:ScanPoint,b:ScanPoint)=>Math.hypot((a.x-b.x)*iw,(a.y-b.y)*ih);
 const rawW=Math.max(pix(corners[0],corners[1]),pix(corners[3],corners[2]));
 const rawH=Math.max(pix(corners[0],corners[3]),pix(corners[1],corners[2]));
 const factor=Math.min(1,2200/Math.max(rawW,rawH));
 const w=clamp(Math.round(rawW*factor),80,2200),h=clamp(Math.round(rawH*factor),80,2200);
 if(w*h>5_000_000)throw Error('Ảnh quá lớn; hãy giảm độ phân giải trước khi quét');
 const bands=scanWarpBands(corners,options?.warpGrid),axis=options?.warpGrid?.axis||'vertical';
 const out=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++){
  if(signal?.aborted)throw Error('Đã hủy xử lý ảnh');
  const v=(y+.5)/h;
  for(let x=0;x<w;x++){
   const u=(x+.5)/w,source=mapScanWarpOutput(u,v,bands,axis);
   const xx=clamp(source.x*(iw-1),0,iw-1);
   const yy=clamp(source.y*(ih-1),0,ih-1);
   const sx=Math.floor(xx),sy=Math.floor(yy),rx=Math.min(iw-1,sx+1),ry=Math.min(ih-1,sy+1),fx=xx-sx,fy=yy-sy;
   const k00=(sy*iw+sx)*4,k10=(sy*iw+rx)*4,k01=(ry*iw+sx)*4,k11=(ry*iw+rx)*4;
   const rgb=[0,1,2].map(c=>(1-fy)*((1-fx)*data[k00+c]+fx*data[k10+c])+fy*((1-fx)*data[k01+c]+fx*data[k11+c]));
   const p=modifyFilter(rgb[0],rgb[1],rgb[2],filter),i=(y*w+x)*4;
   const adjusted=adjustScanRgb(p[0],p[1],p[2],safeScanColor(options?.adjustments));
   out[i]=adjusted[0];out[i+1]=adjusted[1];out[i+2]=adjusted[2];out[i+3]=255;
  }
  if(y%24===0)await new Promise<void>(resolve=>setTimeout(resolve,0)); // keep Android UI responsive
 }
 await sharpenScanPixels(out,w,h,options?.sharpness||'off',signal);
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Không tạo được ảnh tài liệu');
 ctx.putImageData(new ImageData(out,w,h),0,0);
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Không thể xuất ảnh quét')),'image/jpeg',.94));
}

export interface PdfExportOptions {paper:ScanPaper;landscape:boolean;marginMm:number;customWidthMm:number;customHeightMm:number;twoPerPage:boolean;idCardPrintSize?:boolean;}
const pt=(mm:number)=>mm*72/25.4;
const paperSize=(opts:PdfExportOptions):[number,number]=>{
 const sizes:Record<ScanPaper,[number,number]>={A4:[210,297],A5:[148,210],Letter:[215.9,279.4],custom:[clamp(opts.customWidthMm,60,420),clamp(opts.customHeightMm,60,594)]};
 const [a,b]=sizes[opts.paper];return [pt(opts.landscape?b:a),pt(opts.landscape?a:b)];
};
const ascii=(s:string)=>new TextEncoder().encode(s);
const concat=(parts:Uint8Array[]):Uint8Array=>{const n=parts.reduce((s,p)=>s+p.length,0),o=new Uint8Array(n);let i=0;for(const p of parts){o.set(p,i);i+=p.length;}return o;};
/** Small self-contained PDF 1.4 writer embedding already-scanned JPEGs; no network/CDN. */
export async function createScannerPdf(images:Blob[],opts:PdfExportOptions):Promise<Blob>{
 if(!images.length)throw Error('Chưa chọn ảnh để xuất PDF');
 if(images.length>80)throw Error('Giới hạn 80 ảnh mỗi lần xuất PDF để tránh hết bộ nhớ');
 const imgs:{data:Uint8Array;w:number;h:number}[]=[];
 for(const image of images){const bmp=await openBitmap(image);try{
  // Processed scans are JPEG already: preserve these bytes in the PDF.
  // A second lossy JPEG encode erases fine print and QR edges.
  let jpeg=image;
  if(image.type!=='image/jpeg'){
   const canvas=document.createElement('canvas');canvas.width=bmp.width;canvas.height=bmp.height;
   const g=canvas.getContext('2d');if(!g)throw Error('Không thể mở ảnh');g.drawImage(bmp,0,0);
   jpeg=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Lỗi nén PDF')),'image/jpeg',.94));
  }
  imgs.push({data:new Uint8Array(await jpeg.arrayBuffer()),w:bmp.width,h:bmp.height});
 }finally{bmp.close();}}
 const [pw,ph]=paperSize(opts),margin=pt(clamp(opts.marginMm,0,30));
 const countPerPage=opts.twoPerPage?2:1,groups:typeof imgs[]=[];
 for(let i=0;i<imgs.length;i+=countPerPage)groups.push(imgs.slice(i,i+countPerPage));
 const objects=new Map<number,Uint8Array>();let id=3;
 const pageIds:number[]=[];
 for(const group of groups){const pageId=id++,contentId=id++,imagesIds=group.map(()=>id++);pageIds.push(pageId);
  const gap=opts.twoPerPage?pt(6):0,innerW=pw-2*margin-gap;
  const cellW=innerW/group.length,cellH=ph-2*margin;
  if(cellW<10||cellH<10)throw Error('Lề trang quá lớn');
  const draws:string[]=[];
  group.forEach((img,i)=>{
   let w:number,h:number,x:number,y:number;
   if(opts.twoPerPage&&opts.idCardPrintSize){
    // ISO/IEC 7810 ID-1 credit-card footprint (Vietnamese CCCD):
    // print at 100% scale, not the previous fit-to-page enlargement.
    ({w,h,x,y}=idCardPrintLayout(pw,ph,margin,group.length,gap)[i]);
    // Never silently stretch a poor crop into an official-sized card.
    if(Math.abs(Math.log((img.w/img.h)/(w/h)))>.12)
     throw Error('Ảnh CCCD chưa đúng tỷ lệ 85,60 × 53,98 mm. Hãy chỉnh lại bốn góc trước khi xuất.');
   }else{
    const scale=Math.min(cellW/img.w,cellH/img.h);
    w=img.w*scale;h=img.h*scale;
    x=margin+i*(cellW+gap)+(cellW-w)/2;y=margin+(cellH-h)/2;
   }
   draws.push(`q ${w.toFixed(3)} 0 0 ${h.toFixed(3)} ${x.toFixed(3)} ${y.toFixed(3)} cm /Im${i} Do Q\n`);
  });
  const stream=ascii(draws.join(''));
  objects.set(contentId,concat([ascii(`<< /Length ${stream.length} >>\nstream\n`),stream,ascii('endstream')]));
  group.forEach((img,i)=>objects.set(imagesIds[i],concat([
    ascii(`<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.data.length} >>\nstream\n`),img.data,ascii('\nendstream')
  ])));
  const xobjs=imagesIds.map((obj,i)=>`/Im${i} ${obj} 0 R`).join(' ');
  objects.set(pageId,ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw.toFixed(3)} ${ph.toFixed(3)}] /Resources << /XObject << ${xobjs} >> >> /Contents ${contentId} 0 R >>`));
 }
 objects.set(1,ascii('<< /Type /Catalog /Pages 2 0 R >>'));
 objects.set(2,ascii(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(i=>`${i} 0 R`).join(' ')}] >>`));
 const parts:Uint8Array[]=[ascii('%PDF-1.4\n%HNL Mark Document Scanner\n')];let offset=parts[0].length;
 const offsets=[0];
 for(let n=1;n<id;n++){
  const body=objects.get(n);if(!body)throw Error('Tệp PDF không đầy đủ');
  offsets[n]=offset;const obj=concat([ascii(`${n} 0 obj\n`),body,ascii('\nendobj\n')]);parts.push(obj);offset+=obj.length;
 }
 const start=offset;
 const xref=`xref\n0 ${id}\n0000000000 65535 f \n${offsets.slice(1).map(o=>`${String(o).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${id} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
 parts.push(ascii(xref));return new Blob(parts as BlobPart[],{type:'application/pdf'});
}
