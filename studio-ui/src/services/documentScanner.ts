/** HNL Mark offline scanner: no network, no OCR, source blobs retained unmodified. */
export type ScanPoint = {x:number;y:number};
export type ScanCorners = [ScanPoint,ScanPoint,ScanPoint,ScanPoint]; // TL, TR, BR, BL
export type ScanFilter = 'color'|'enhance'|'gray'|'bw'|'paper';
export type ScanPaper = 'A4'|'A5'|'Letter'|'custom';
export type ScanDocumentType='auto'|'id-card'|'paper';
export type ScanPage = {
  id:string; folderId:string; name:string; original:Blob; processed?:Blob;
  corners:ScanCorners; filter:ScanFilter; order:number; createdAt:number;
  detectionConfidence?:ScanDetection['confidence']; documentType?:ScanDocumentType;
};
export type ScanFolder = {id:string;name:string;createdAt:number};
const DB='hnlmark-document-scanner-v1', VERSION=1;
// 1.5% inset on uncertain detections: never silently crop 6% from CCCD corners.
export const DEFAULT_CORNERS:ScanCorners=[{x:.015,y:.015},{x:.985,y:.015},{x:.985,y:.985},{x:.015,y:.985}];
export const newScanId=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
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

async function openBitmap(blob:Blob):Promise<ImageBitmap>{
 if(!blob.size)throw Error('Ảnh đầu vào trống');
 // createImageBitmap normalizes JPEG EXIF orientation before corner correction.
 return createImageBitmap(blob,{imageOrientation:'from-image'});
}
async function sourcePixels(blob:Blob,maxEdge:number):Promise<ImageData>{
 const bmp=await openBitmap(blob);try{
  const scale=Math.min(1,maxEdge/Math.max(bmp.width,bmp.height));
  const w=Math.max(1,Math.round(bmp.width*scale)),h=Math.max(1,Math.round(bmp.height*scale));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Không thể xử lý ảnh trên thiết bị');
  ctx.drawImage(bmp,0,0,w,h);return ctx.getImageData(0,0,w,h);
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
/** Higher-confidence 4-edge result replaces uncertain color-only segmentation.
 * Never force detection when edges do not close: manual frame retains source. */
export function detectDocumentEdges(image:ImageData,kind:ScanDocumentType='auto'):ScanDetection{
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
/** Solve inverse homography: output unit square -> quadrilateral in input image. */
export function squareToQuadrilateral(points:ScanCorners):number[]{
 if(!validCorners(points))throw Error('Bốn góc tạo thành vùng không hợp lệ. Hãy kéo lại các góc.');
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
export async function flattenDocument(blob:Blob,corners:ScanCorners,filter:ScanFilter,signal?:AbortSignal):Promise<Blob>{
 if(!validCorners(corners))throw Error('Vùng quét không hợp lệ. Hãy chỉnh lại 4 góc.');
 const input=await sourcePixels(blob,2400);const {width:iw,height:ih,data}=input;
 const pix=(a:ScanPoint,b:ScanPoint)=>Math.hypot((a.x-b.x)*iw,(a.y-b.y)*ih);
 const rawW=Math.max(pix(corners[0],corners[1]),pix(corners[3],corners[2]));
 const rawH=Math.max(pix(corners[0],corners[3]),pix(corners[1],corners[2]));
 const factor=Math.min(1,2200/Math.max(rawW,rawH));
 const w=clamp(Math.round(rawW*factor),80,2200),h=clamp(Math.round(rawH*factor),80,2200);
 if(w*h>5_000_000)throw Error('Ảnh quá lớn; hãy giảm độ phân giải trước khi quét');
 const coeff=squareToQuadrilateral(corners),out=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++){
  if(signal?.aborted)throw Error('Đã hủy xử lý ảnh');
  const v=(y+.5)/h;
  for(let x=0;x<w;x++){
   const u=(x+.5)/w,den=coeff[6]*u+coeff[7]*v+1;
   const xx=clamp(((coeff[0]*u+coeff[1]*v+coeff[2])/den)*(iw-1),0,iw-1);
   const yy=clamp(((coeff[3]*u+coeff[4]*v+coeff[5])/den)*(ih-1),0,ih-1);
   const sx=Math.floor(xx),sy=Math.floor(yy),rx=Math.min(iw-1,sx+1),ry=Math.min(ih-1,sy+1),fx=xx-sx,fy=yy-sy;
   const k00=(sy*iw+sx)*4,k10=(sy*iw+rx)*4,k01=(ry*iw+sx)*4,k11=(ry*iw+rx)*4;
   const rgb=[0,1,2].map(c=>(1-fy)*((1-fx)*data[k00+c]+fx*data[k10+c])+fy*((1-fx)*data[k01+c]+fx*data[k11+c]));
   const p=modifyFilter(rgb[0],rgb[1],rgb[2],filter),i=(y*w+x)*4;
   out[i]=p[0];out[i+1]=p[1];out[i+2]=p[2];out[i+3]=255;
  }
  if(y%24===0)await new Promise<void>(resolve=>setTimeout(resolve,0)); // keep Android UI responsive
 }
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Không tạo được ảnh tài liệu');
 ctx.putImageData(new ImageData(out,w,h),0,0);
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Không thể xuất ảnh quét')),'image/jpeg',.91));
}

export interface PdfExportOptions {paper:ScanPaper;landscape:boolean;marginMm:number;customWidthMm:number;customHeightMm:number;twoPerPage:boolean;}
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
  const canvas=document.createElement('canvas');canvas.width=bmp.width;canvas.height=bmp.height;
  const g=canvas.getContext('2d');if(!g)throw Error('Không thể mở ảnh');g.drawImage(bmp,0,0);
  const jpeg=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Lỗi nén PDF')),'image/jpeg',.89));
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
   const scale=Math.min(cellW/img.w,cellH/img.h),w=img.w*scale,h=img.h*scale;
   const x=margin+i*(cellW+gap)+(cellW-w)/2,y=margin+(cellH-h)/2;
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
