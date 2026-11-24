import React,{useEffect,useRef,useState} from 'react';
import type {OrientationDeg,WatermarkConfig} from '../../types/hnl';
import {drawIndependentStamp} from '../../services/independentStampRenderer';
import {prepareTimemarkFont} from '../../services/timemarkRenderer';
import {loadWatermarkLogo} from '../../services/watermarkLogo';
import {paintStampPreview,type StampReferenceSize} from '../../services/stampPreviewGeometry';

/** Canvas preview uses EXACTLY the renderer used in JPG & each video frame. */
export const IndependentStampOverlay:React.FC<{config:WatermarkConfig;orientationDeg?:OrientationDeg;photoCode?:string;referenceSize?:StampReferenceSize;onDragPositionChange?:(p:{xPct:number;yPct:number})=>void}>=({config,orientationDeg=0,photoCode,referenceSize,onDragPositionChange})=>{
 const ref=useRef<HTMLCanvasElement>(null);
 const [hit,setHit]=useState<{left:number;top:number;width:number;height:number}|null>(null);
 const drag=useRef(false);
 useEffect(()=>{
  const canvas=ref.current,parent=canvas?.parentElement;if(!canvas||!parent)return;
  let active=true,logo:HTMLImageElement|undefined;
  const paint=()=>{
    if(!active)return;
    paintStampPreview(canvas,parent,referenceSize,(ctx,w,h)=>{
      const b=drawIndependentStamp(ctx,w,h,config,orientationDeg,photoCode,logo);
      if(!onDragPositionChange||!b)return;
      const scale=Math.max(parent.clientWidth/w,parent.clientHeight/h),left=(parent.clientWidth-w*scale)/2,top=(parent.clientHeight-h*scale)/2;
      setHit({left:left+b.x*scale,top:top+b.y*scale,width:b.w*scale,height:b.h*scale});
    });
  };
  paint();
  void Promise.all([prepareTimemarkFont(config.fontKey),loadWatermarkLogo(config)]).then(([,img])=>{if(active){logo=img;paint();}});
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(paint):null;
  ro?.observe(parent);
  return()=>{active=false;ro?.disconnect();};
 },[config,orientationDeg,photoCode,referenceSize?.width,referenceSize?.height,onDragPositionChange]);
 const move=(e:React.PointerEvent<HTMLDivElement>)=>{
  if(!drag.current||!onDragPositionChange||!ref.current)return;
  const r=ref.current.getBoundingClientRect();if(!r.width||!r.height)return;
  const u=(e.clientX-r.left)/r.width,v=(e.clientY-r.top)/r.height;
  const x=orientationDeg===90?v:orientationDeg===-90?1-v:orientationDeg===180?1-u:u;
  const y=orientationDeg===90?1-u:orientationDeg===-90?u:orientationDeg===180?1-v:v;
  const pct=(n:number)=>Math.round(Math.max(0,Math.min(1,n))*100);
  onDragPositionChange({xPct:pct(x),yPct:pct(y)});
 };
 return <><canvas ref={ref} data-hnl-independent-stamp="true" className="absolute inset-0 w-full h-full z-10 pointer-events-none" aria-label="Dấu HNL có thể kết xuất"/>
 {onDragPositionChange&&hit&&<div aria-label="Kéo vị trí dấu" className="absolute z-20 cursor-grab touch-none rounded-md ring-1 ring-dashed ring-[#E2B74B]/70"
  style={hit} onPointerDown={e=>{e.stopPropagation();drag.current=true;e.currentTarget.setPointerCapture(e.pointerId);}}
  onPointerMove={e=>{e.stopPropagation();move(e);}} onPointerUp={e=>{e.stopPropagation();drag.current=false;}}
  onPointerCancel={()=>{drag.current=false;}} onLostPointerCapture={()=>{drag.current=false;}}/>}</>;
};
