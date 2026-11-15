import React,{useEffect,useRef} from 'react';
import type {OrientationDeg,WatermarkConfig} from '../../types/hnl';
import {drawIndependentStamp} from '../../services/independentStampRenderer';
import {prepareTimemarkFont} from '../../services/timemarkRenderer';
import {loadWatermarkLogo} from '../../services/watermarkLogo';
import {paintStampPreview,type StampReferenceSize} from '../../services/stampPreviewGeometry';

/** Canvas preview uses EXACTLY the renderer used in JPG & each video frame. */
export const IndependentStampOverlay:React.FC<{config:WatermarkConfig;orientationDeg?:OrientationDeg;photoCode?:string;referenceSize?:StampReferenceSize}>=({config,orientationDeg=0,photoCode,referenceSize})=>{
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current,parent=canvas?.parentElement;if(!canvas||!parent)return;
  let active=true,logo:HTMLImageElement|undefined;
  const paint=()=>{
    if(!active)return;
    paintStampPreview(canvas,parent,referenceSize,(ctx,w,h)=>
    drawIndependentStamp(ctx,w,h,config,orientationDeg,photoCode,logo));
  };
  paint();
  void Promise.all([prepareTimemarkFont(config.fontKey),loadWatermarkLogo(config)]).then(([,img])=>{if(active){logo=img;paint();}});
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(paint):null;
  ro?.observe(parent);
  return()=>{active=false;ro?.disconnect();};
 },[config,orientationDeg,photoCode,referenceSize?.width,referenceSize?.height]);
 return <canvas ref={ref} data-hnl-independent-stamp="true" className="absolute inset-0 w-full h-full z-10 pointer-events-none" aria-label="Dấu HNL có thể kết xuất"/>;
};
