import React,{useEffect,useRef} from 'react';
import type {OrientationDeg,WatermarkConfig} from '../../types/hnl';
import {drawOriginalTimemark,prepareTimemarkFont} from '../../services/timemarkRenderer';
import {loadWatermarkLogo} from '../../services/watermarkLogo';

export const OriginalTimemarkOverlay:React.FC<{config:WatermarkConfig;orientationDeg?:OrientationDeg;photoCode?:string}>=({config,orientationDeg=0,photoCode})=>{
 const canvasRef=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=canvasRef.current,parent=canvas?.parentElement;
  if(!canvas||!parent)return;
  let active=true;
  let logo:HTMLImageElement|undefined;
  const render=()=>{
   const w=parent.clientWidth,h=parent.clientHeight;
   if(!w||!h)return;
   const dpr=Math.min(2,window.devicePixelRatio||1);
   canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
   const ctx=canvas.getContext('2d');if(!ctx)return;
   ctx.setTransform(dpr,0,0,dpr,0,0);
   drawOriginalTimemark(ctx,w,h,config,orientationDeg,photoCode,logo);
  };
  render();void Promise.all([prepareTimemarkFont(config.fontKey),loadWatermarkLogo(config)]).then(([,image])=>{if(!active)return;logo=image;render();});const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(render):null;
  ro?.observe(parent);return()=>{active=false;ro?.disconnect();};
 },[config,orientationDeg,photoCode]);
 return <canvas ref={canvasRef} data-hnl-original-timemark="true" aria-label="Mẫu dấu Timemark gốc" className="absolute inset-0 z-10 w-full h-full pointer-events-none"/>;
};
