import {mediaStampCode} from '../../services/timemarkSerial';
import React,{useEffect,useRef,useState} from 'react';
import type {MediaItem,WatermarkConfig} from '../../types/hnl';
import {WatermarkOverlay} from './WatermarkOverlay';
import {mediaWatermarkConfig} from '../../services/watermarkLocation';

/** Live stamp preview for importable video. A camera video with burnt-in pixels
 * cannot be restamped until a separately recorded raw source exists.
 * Geometry matches the 1280px bounded imported-video encoder.
 */
export const VideoStampPreview:React.FC<{media:MediaItem;config:WatermarkConfig}>=({media,config})=>{
 const stage=useRef<HTMLDivElement>(null);
 const [bounds,setBounds]=useState({width:0,height:0});
 const [frame,setFrame]=useState({width:0,height:0});
 useEffect(()=>{
  const node=stage.current;if(!node)return;
  const resize=()=>setBounds({width:node.clientWidth,height:node.clientHeight});
  resize();const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
  ro?.observe(node);return()=>ro?.disconnect();
 },[]);
 const ratio=frame.width>0&&frame.height>0?frame.width/frame.height:16/9;
 const width=bounds.height>0?Math.min(bounds.width,bounds.height*ratio):bounds.width;
 const height=width/ratio;
 const scale=Math.min(1,1280/Math.max(1,frame.width,frame.height));
 const referenceSize={width:Math.max(2,Math.round(frame.width*scale/2)*2),
  height:Math.max(2,Math.round(frame.height*scale/2)*2)};
 const effective=mediaWatermarkConfig({...config,...media.captureWatermark,...media.watermarkOverride},media);
 const burnedCameraVideo=media.isStamped===true&&!media.stampedBlob&&!!media.captureWatermark;
 const canOverlay=frame.width>0&&!!media.rawBlob&&!media.stampedBlob&&!burnedCameraVideo&&effective.templateId!=='none';
 return <div ref={stage} className="relative w-full h-full flex items-center justify-center overflow-hidden" data-hnl-video-stamp-preview="true">
  <div className="relative shrink-0 overflow-hidden" style={{width:width||'100%',height:height||'100%'}}>
   <video key={media.id} src={media.url} controls playsInline preload="metadata"
    className="absolute inset-0 w-full h-full object-fill" onLoadedMetadata={event=>{
     const v=event.currentTarget;setFrame({width:v.videoWidth,height:v.videoHeight});
    }}/>
   {canOverlay&&<WatermarkOverlay config={effective} photoCode={mediaStampCode(effective.templateId,media)} referenceSize={referenceSize}/>}
  </div>
  {burnedCameraVideo&&<span className="absolute bottom-1 left-1 right-1 bg-[#06101E]/85 rounded px-2 py-1 text-[10px] text-[#E2B74B] pointer-events-none">
   Video quay cũ đã đốt dấu trực tiếp: chưa có bản gốc không dấu để thay mẫu
  </span>}
 </div>;
};
