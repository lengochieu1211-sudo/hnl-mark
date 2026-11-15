import React,{useEffect,useRef} from 'react';
import type {OrientationDeg,WatermarkConfig} from '../../types/hnl';
import {drawSimpleStamp} from '../../services/simpleStampRenderer';
import {prepareTimemarkFont} from '../../services/timemarkRenderer';
import {loadWatermarkLogo} from '../../services/watermarkLogo';
import {paintStampPreview,type StampReferenceSize} from '../../services/stampPreviewGeometry';
export const SimpleStampOverlay:React.FC<{config:WatermarkConfig;orientationDeg?:OrientationDeg;referenceSize?:StampReferenceSize}>=({config,orientationDeg=0,referenceSize})=>{
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current,parent=canvas?.parentElement;if(!canvas||!parent)return;
  let alive=true,logo:HTMLImageElement|undefined;
  const draw=()=>{
   if(!alive)return;paintStampPreview(canvas,parent,referenceSize,(ctx,w,h)=>
    drawSimpleStamp(ctx,w,h,config,orientationDeg,logo));
  };
  draw();void Promise.all([prepareTimemarkFont(config.fontKey),loadWatermarkLogo(config)]).then(([,img])=>{if(alive){logo=img;draw();}});
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(draw):null;ro?.observe(parent);
  return()=>{alive=false;ro?.disconnect()};
 },[config,orientationDeg,referenceSize?.width,referenceSize?.height]);
 return <canvas ref={ref} data-hnl-simple-stamp="true" className="absolute inset-0 z-10 w-full h-full pointer-events-none" aria-label="Dấu chỉ ngày giờ"/>;
};
