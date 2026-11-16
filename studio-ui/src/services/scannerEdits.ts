/** Scanner-only, non-destructive orientation and color transformations.
 * Editing operates on a derived view. ScanPage.original is never replaced.
 * Order is significant: ops are applied sequentially to the displayed image.
 */
export type ScanImageOp='cw'|'ccw'|'flip-h'|'flip-v';
export type ScanPoint={x:number;y:number};
export type ScanQuad=[ScanPoint,ScanPoint,ScanPoint,ScanPoint];
export type ScanColorAdjust={brightness:number;contrast:number;saturation:number};
export const DEFAULT_SCAN_COLOR:ScanColorAdjust={brightness:100,contrast:100,saturation:100};
export const isScanImageOp=(value:unknown):value is ScanImageOp=>
 value==='cw'||value==='ccw'||value==='flip-h'||value==='flip-v';
/** Reduce all rotate/flip histories to one of the eight square symmetries.
 * This prevents unbounded metadata growth and keeps restored previews stable. */
export function normalizeScanOps(raw:ScanImageOp[]):ScanImageOp[]{
 const allowed=raw.filter(isScanImageOp);
 const signatures=[{x:0,y:0},{x:1,y:0},{x:0,y:1}].map(p=>scanPointAfterOps(p,allowed));
 const choices:ScanImageOp[][]=[[],['cw'],['cw','cw'],['ccw'],['flip-h'],['flip-v'],['cw','flip-h'],['cw','flip-v']];
 const match=choices.find(candidate=>signatures.every((p,i)=>{
  const q=scanPointAfterOps([{x:0,y:0},{x:1,y:0},{x:0,y:1}][i],candidate);
  return Math.abs(p.x-q.x)<1e-10&&Math.abs(p.y-q.y)<1e-10;
 }));
 return match||[];
}
export const safeScanOps=(ops:unknown):ScanImageOp[]=>Array.isArray(ops)?normalizeScanOps(ops.filter(isScanImageOp)):[];
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
export function safeScanColor(input?:Partial<ScanColorAdjust>|null):ScanColorAdjust{
 const check=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?clamp(n,0,200):100;
 return {brightness:check(input?.brightness),contrast:check(input?.contrast),saturation:check(input?.saturation)};
}
export function scanPointAfterOp(p:ScanPoint,op:ScanImageOp):ScanPoint{
 if(op==='cw')return{x:1-p.y,y:p.x};
 if(op==='ccw')return{x:p.y,y:1-p.x};
 if(op==='flip-h')return{x:1-p.x,y:p.y};
 return{x:p.x,y:1-p.y};
}
export function scanPointAfterOps(p:ScanPoint,ops:ScanImageOp[]):ScanPoint{
 return ops.reduce((q,op)=>scanPointAfterOp(q,op),p);
}
/** TL,TR,BR,BL must remain in that order after an image transform. */
export function scanQuadAfterOp(corners:ScanQuad,op:ScanImageOp):ScanQuad{
 const permutation:Record<ScanImageOp,number[]>={
  cw:[3,0,1,2],ccw:[1,2,3,0],'flip-h':[1,0,3,2],'flip-v':[3,2,1,0]
 };
 return permutation[op].map(i=>scanPointAfterOp(corners[i],op)) as ScanQuad;
}
export function scanOrientedSize(width:number,height:number,ops:ScanImageOp[]):{width:number;height:number}{
 const odd=ops.reduce((n,op)=>n+Number(op==='cw'||op==='ccw'),0)%2;
 return odd?{width:height,height:width}:{width,height};
}
/** Affine source-pixel -> oriented output-pixel matrix for drawImage(). */
export function scanAffine(width:number,height:number,ops:ScanImageOp[]):[number,number,number,number,number,number]{
 if(width<=0||height<=0)throw Error('Ảnh quét không có kích thước hợp lệ');
 const size=scanOrientedSize(width,height,ops);
 const p=scanPointAfterOps({x:0,y:0},ops);
 const ex=scanPointAfterOps({x:1,y:0},ops);
 const ey=scanPointAfterOps({x:0,y:1},ops);
 return [(ex.x-p.x)*size.width/width,(ex.y-p.y)*size.height/width,
         (ey.x-p.x)*size.width/height,(ey.y-p.y)*size.height/height,
          p.x*size.width,p.y*size.height];
}
/** After orientation, all image geometry and corners share one coordinate space. */
export function drawScannerOriented(ctx:CanvasRenderingContext2D,image:CanvasImageSource,sourceW:number,sourceH:number,ops:ScanImageOp[],scale=1){
 const matrix=scanAffine(sourceW,sourceH,ops);
 ctx.setTransform(matrix[0]*scale,matrix[1]*scale,matrix[2]*scale,matrix[3]*scale,matrix[4]*scale,matrix[5]*scale);
 ctx.drawImage(image,0,0,sourceW,sourceH);
 ctx.setTransform(1,0,0,1,0,0);
}
/** Filter pixels after perspective and preset scan filtering. */
export function adjustScanRgb(r:number,g:number,b:number,input?:Partial<ScanColorAdjust>):[number,number,number]{
 const a=safeScanColor(input),sat=a.saturation/100,contrast=a.contrast/100,bright=a.brightness/100;
 const mid=.2126*r+.7152*g+.0722*b;
 const pixel=(v:number)=>clamp((mid+(v-mid)*sat-127.5)*contrast+127.5,0,255)*bright;
 return [clamp(pixel(r),0,255),clamp(pixel(g),0,255),clamp(pixel(b),0,255)];
}
