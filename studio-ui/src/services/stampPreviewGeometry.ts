import type {ImageEdits} from '../types/hnl';
/** Preview geometry is expressed in export pixels, not CSS pixels. */
export type StampReferenceSize={width:number;height:number};
export function editedRasterSize(width:number,height:number,edits?:ImageEdits):StampReferenceSize {
 let w=Math.max(1,Math.round(width)),h=Math.max(1,Math.round(height));
 const ratios:Record<string,number>={'1:1':1,'4:3':4/3,'3:4':3/4,'16:9':16/9,'9:16':9/16};
 const target=edits?.cropRatio?ratios[edits.cropRatio]:undefined;
 if(target){if(w/h>target)w=Math.round(h*target);else h=Math.round(w/target);}
 const turn=(((edits?.rotationDeg||0)%360)+360)%360;
 return turn===90||turn===270?{width:h,height:w}:{width:w,height:h};
}
export function paintStampPreview(canvas:HTMLCanvasElement,parent:HTMLElement,
 ref:StampReferenceSize|undefined,paint:(ctx:CanvasRenderingContext2D,w:number,h:number)=>void):void {
 const w=parent.clientWidth,h=parent.clientHeight;if(w<=0||h<=0)return;
 const dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const W=ref?.width&&ref.width>0?ref.width:w,H=ref?.height&&ref.height>0?ref.height:h;
 // Match <video object-cover> and camera center-crop: a single scale factor
 // prevents 90-degree/landscape transitions from stretching the date/time.
 // Independent X/Y scaling corrupted Timemark whenever the viewfinder and
 // native capture raster briefly disagreed (rotation lock / WebView resize).
 const scale=Math.max(canvas.width/W,canvas.height/H);
 const left=(canvas.width-W*scale)/2,top=(canvas.height-H*scale)/2;
 ctx.setTransform(scale,0,0,scale,left,top);
 paint(ctx,W,H);
}
