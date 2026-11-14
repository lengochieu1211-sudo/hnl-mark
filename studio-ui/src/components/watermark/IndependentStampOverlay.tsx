import React,{useEffect,useRef} from 'react';
import type {OrientationDeg,WatermarkConfig} from '../../types/hnl';
import {drawIndependentStamp} from '../../services/independentStampRenderer';
import {prepareTimemarkFont} from '../../services/timemarkRenderer';
import {loadWatermarkLogo} from '../../services/watermarkLogo';

/** Canvas preview uses EXACTLY the renderer used in JPG & each video frame. */
export const IndependentStampOverlay:React.FC<{config:WatermarkConfig;orientationDeg?:OrientationDeg;photoCode?:string}>=({config,orientationDeg=0,photoCode})=>{
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current,parent=canvas?.parentElement;if(!canvas||!parent)return;
  let active=true,logo:HTMLImageElement|undefined;
  const paint=()=>{
    if(!active)return;
    const w=parent.clientWidth,h=parent.clientHeight;
    if(w<=0||h<=0)return;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    drawIndependentStamp(ctx,w,h,config,orientationDeg,photoCode,logo);
  };
  paint();
  void Promise.all([prepareTimemarkFont(config.fontKey),loadWatermarkLogo(config)]).then(([,img])=>{if(active){logo=img;paint();}});
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(paint):null;
  ro?.observe(parent);
  return()=>{active=false;ro?.disconnect();};
 },[config,orientationDeg,photoCode]);
 return <canvas ref={ref} data-hnl-independent-stamp="true" className="absolute inset-0 w-full h-full z-10 pointer-events-none" aria-label="Dấu HNL có thể kết xuất"/>;
};
