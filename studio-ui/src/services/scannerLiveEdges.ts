/** Geometry for live four-edge overlay. All points use the camera raster after
 * any digital crop (the same crop used to save the shutter JPEG).
 * The overlay is drawn in the unscaled object-contain rectangle: with digital
 * zoom the preview is CSS-scaled, so the crop already accounts for that scale.
 */
export type LivePoint={x:number;y:number};
export type LiveQuad=[LivePoint,LivePoint,LivePoint,LivePoint];
export type LiveFrameRect={left:number;top:number;width:number;height:number};
const finitePositive=(value:number)=>Number.isFinite(value)&&value>0;

export function scannerLiveContainRect(
 viewportWidth:number,viewportHeight:number,rasterWidth:number,rasterHeight:number
):LiveFrameRect|null{
 if(![viewportWidth,viewportHeight,rasterWidth,rasterHeight].every(finitePositive))return null;
 const scale=Math.min(viewportWidth/rasterWidth,viewportHeight/rasterHeight);
 const width=rasterWidth*scale,height=rasterHeight*scale;
 return {left:(viewportWidth-width)/2,top:(viewportHeight-height)/2,width,height};
}

export function scannerLiveSourceCrop(rawWidth:number,rawHeight:number,softwareZoom:number):LiveFrameRect{
 if(![rawWidth,rawHeight,softwareZoom].every(finitePositive))throw Error('Camera chưa có kích thước hợp lệ');
 const zoom=Math.max(1,Math.min(8,softwareZoom));
 const width=rawWidth/zoom,height=rawHeight/zoom;
 return {left:(rawWidth-width)/2,top:(rawHeight-height)/2,width,height};
}

/** Mean normalized distance between two sets of corners. Treat a large sudden
 * jump as a new candidate, not as a confidently tracked document. */
export function scannerLiveQuadDelta(a:LiveQuad,b:LiveQuad):number{
 return a.reduce((sum,p,i)=>sum+Math.hypot(p.x-b[i].x,p.y-b[i].y),0)/4;
}

export function scannerLiveBlendQuad(previous:LiveQuad,next:LiveQuad,weight=.45):LiveQuad{
 const alpha=Math.max(0,Math.min(1,weight));
 return previous.map((p,i)=>({x:p.x+(next[i].x-p.x)*alpha,y:p.y+(next[i].y-p.y)*alpha})) as LiveQuad;
}
