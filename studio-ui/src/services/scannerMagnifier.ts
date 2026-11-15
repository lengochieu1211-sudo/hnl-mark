/** Pixel-accurate scanner corner loupe. Coordinates match the *displayed* source <img>,
 * not the document photo file's unrotated JPEG raster or a CSS background percentage.
 */
export type ScannerNormalizedPoint={x:number;y:number};
export type ScannerViewportPoint={clientX:number;clientY:number};
export type ScannerRect={left:number;top:number;width:number;height:number};

const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
export const SCANNER_LOUPE_ZOOM=4.5;
export const SCANNER_LOUPE_IMAGE_SIZE=120;
// Includes 3px colored border on both sides.
export const SCANNER_LOUPE_OUTER_SIZE=126;

/** Pointer coords are viewport-relative. getBoundingClientRect() includes scroll and CSS scales. */
export function scannerPointAtPointer(pointer:ScannerViewportPoint,rect:ScannerRect):ScannerNormalizedPoint{
 if(!(rect.width>0&&rect.height>0))throw Error('Ảnh scan chưa có kích thước hiển thị');
 return {x:clamp((pointer.clientX-rect.left)/rect.width,.001,.999),
         y:clamp((pointer.clientY-rect.top)/rect.height,.001,.999)};
}

/** Preserve the contact-to-handle offset: grabbing the edge of a large touch handle
 * must not cause the selected scan corner to jump under the fingertip. */
export function scannerCornerWithOffset(
 pointer:ScannerViewportPoint,rect:ScannerRect,offset:ScannerNormalizedPoint
):ScannerNormalizedPoint{
 const raw=scannerPointAtPointer(pointer,rect);
 return {x:clamp(raw.x+offset.x,.001,.999),y:clamp(raw.y+offset.y,.001,.999)};
}

/** Exact canvas draw placement: the sampled image point must land at the crosshair
 * (middle of the loupe), including near its edges. Keep source aspect ratio unchanged. */
export function scannerLoupeImageRect(
 corner:ScannerNormalizedPoint,previewWidth:number,previewHeight:number,
 size=SCANNER_LOUPE_IMAGE_SIZE,zoom=SCANNER_LOUPE_ZOOM
){
 if(!(previewWidth>0&&previewHeight>0&&size>0&&zoom>0))throw Error('Kích thước kính phóng đại không hợp lệ');
 const width=previewWidth*zoom,height=previewHeight*zoom;
 return {left:size/2-corner.x*width,top:size/2-corner.y*height,width,height};
}

/** Place loupe on the free side of the touching finger, independent of the image
 * clip/scroll/portrait/landscape. Fixed positioning uses viewport coordinates. */
export function scannerLoupeViewportPosition(
 pointer:ScannerViewportPoint,viewportWidth:number,viewportHeight:number,
 size=SCANNER_LOUPE_OUTER_SIZE
){
 const margin=8,gap=34;
 const maxLeft=Math.max(margin,viewportWidth-size-margin);
 const maxTop=Math.max(margin,viewportHeight-size-margin);
 const idealX=pointer.clientX+gap+size+margin<=viewportWidth
  ?pointer.clientX+gap:pointer.clientX-size-gap;
 const idealY=pointer.clientY-size-gap>=margin
  ?pointer.clientY-size-gap:pointer.clientY+gap;
 return {left:clamp(idealX,margin,maxLeft),top:clamp(idealY,margin,maxTop)};
}
