/**
 * Canonical non-destructive photo preview for every app screen.
 * Rebuilds the image from its untouched original + erase/crop/rotate/flip,
 * then shows color changes via CSS immediately and composites the watermark
 * on the EXACT visible image rectangle (not on the letterboxed viewport).
 * No stamped JPEG is ever used as the source of an editable preview.
 */
import React,{useEffect,useMemo,useRef,useState} from 'react';
import type {MediaItem,WatermarkConfig} from '../../types/hnl';
import {createEditorPreview} from '../../services/smartErase';
import {mediaWatermarkConfig} from '../../services/watermarkLocation';
import {WatermarkOverlay} from './WatermarkOverlay';

export const PhotoPreview:React.FC<{
 media:MediaItem;config:WatermarkConfig;className?:string;showStamp?:boolean;compact?:boolean;
}>=({media,config,className='',showStamp=true,compact=false})=>{
 const stage=useRef<HTMLDivElement>(null);
 const [bounds,setBounds]=useState({width:0,height:0});
 const [photo,setPhoto]=useState<{key:string,url:string,width:number,height:number}|null>(null);
 const edits=media.edits;
 const structural=JSON.stringify([media.id,edits.smartErase||[],edits.cropRatio,edits.rotationDeg,edits.flipHorizontal]);
 const key=structural;
 // Color sliders must not cause an expensive JPEG recode on every input event.
 const processingEdits=useMemo(()=>({...edits,brightness:100,contrast:100,saturation:100}),[structural]);
 useEffect(()=>{
  const node=stage.current;if(!node)return;
  const resize=()=>setBounds({width:node.clientWidth,height:node.clientHeight});resize();
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(node);
  window.addEventListener('resize',resize);
  return()=>{observer?.disconnect();window.removeEventListener('resize',resize);};
 },[]);
 useEffect(()=>{
  let canceled=false,activeUrl='';
  const run=async()=>{
   try{
    const source=media.rawBlob||await(await fetch(media.url)).blob();
    const output=await createEditorPreview(source,processingEdits,false,compact?480:1440);
    if(canceled)return;
    const bitmap=await createImageBitmap(output);
    const width=bitmap.width,height=bitmap.height;bitmap.close();
    if(canceled)return;
    activeUrl=URL.createObjectURL(output);
    setPhoto({key,url:activeUrl,width,height});
   }catch(e){if(!canceled){console.warn('Preview ảnh gốc đang được khôi phục:',e);setPhoto(null);}}
  };
  void run();return()=>{canceled=true;if(activeUrl)URL.revokeObjectURL(activeUrl);};
 },[media.id,media.rawBlob,structural,compact]);
 const isReady=photo?.key===key&&bounds.width>0&&bounds.height>0;
 const ratio=photo?photo.width/Math.max(1,photo.height):1;
 const fittedW=isReady?Math.min(bounds.width,bounds.height*ratio):0;
 const fittedH=isReady?fittedW/ratio:0;
 const effective=mediaWatermarkConfig(config,media);
 return <div ref={stage} data-hnl-shared-photo-preview="true" className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
   {isReady ? <div className="relative shrink-0 overflow-hidden" style={{width:fittedW,height:fittedH}}>
     <img src={photo!.url} alt={media.title} draggable={false} className="absolute inset-0 h-full w-full select-none" style={{filter:`brightness(${edits.brightness??100}%) contrast(${edits.contrast??100}%) saturate(${edits.saturation??100}%)`}} />
     {showStamp&&effective.templateId!=='none'&&<WatermarkOverlay config={effective} orientationDeg={media.orientationDeg||0} photoCode={media.photoCode}/>}
   </div> : <span className="text-[11px] text-[#94A3B8]" role="status">Đang cập nhật ảnh…</span>}
 </div>;
};
