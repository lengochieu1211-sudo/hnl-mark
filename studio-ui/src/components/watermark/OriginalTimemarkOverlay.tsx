import React,{useEffect,useRef} from 'react';
import type {OrientationDeg,WatermarkConfig} from '../../types/hnl';
import {drawOriginalTimemark,prepareTimemarkFont} from '../../services/timemarkRenderer';
import {loadWatermarkLogo} from '../../services/watermarkLogo';
import {paintStampPreview,type StampReferenceSize} from '../../services/stampPreviewGeometry';

export const OriginalTimemarkOverlay:React.FC<{config:WatermarkConfig;orientationDeg?:OrientationDeg;photoCode?:string;referenceSize?:StampReferenceSize}>=({config,orientationDeg=0,photoCode,referenceSize})=>{
 const canvasRef=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=canvasRef.current,parent=canvas?.parentElement;
  if(!canvas||!parent)return;
  let active=true;
  let logo:HTMLImageElement|undefined;
  const render=()=>{
   paintStampPreview(canvas,parent,referenceSize,(ctx,w,h)=>
    drawOriginalTimemark(ctx,w,h,config,orientationDeg,photoCode,logo));
  };
  render();void Promise.all([prepareTimemarkFont(config.fontKey),loadWatermarkLogo(config)]).then(([,image])=>{if(!active)return;logo=image;render();});const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(render):null;
  ro?.observe(parent);return()=>{active=false;ro?.disconnect();};
 },[config,orientationDeg,photoCode,referenceSize?.width,referenceSize?.height]);
 return <canvas ref={canvasRef} data-hnl-original-timemark="true" aria-label="Mẫu dấu Timemark gốc" className="absolute inset-0 z-10 w-full h-full pointer-events-none"/>;
};
