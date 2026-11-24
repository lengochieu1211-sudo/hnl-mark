import {mediaStampCode} from '../../services/timemarkSerial';
/**
 * Shared, non-destructive image preview.
 * Show the ORIGINAL immediately; expensive rendering is only necessary after
 * erase, crop, rotation or flip. CSS color adjustments are instantaneous.
 * A decoder/canvas error must never turn the gallery into an endless spinner.
 */
import React,{useEffect,useMemo,useRef,useState} from 'react';
import type {MediaItem,WatermarkConfig} from '../../types/hnl';
import {createEditorPreview,photoFilterCss,resolvePhotoEnhance,hasPhotoEnhance,photoEnhanceKey} from '../../services/smartErase';
import {mediaWatermarkConfig} from '../../services/watermarkLocation';
import {WatermarkOverlay} from './WatermarkOverlay';
import {editedRasterSize,type StampReferenceSize} from '../../services/stampPreviewGeometry';

type PreviewFrame={key:string;url:string;width:number;height:number;original:boolean};

export const PhotoPreview:React.FC<{
 media:MediaItem;config:WatermarkConfig;className?:string;showStamp?:boolean;compact?:boolean;
}>=({media,config,className='',showStamp=true,compact=false})=>{
 const stage=useRef<HTMLDivElement>(null);
 const [bounds,setBounds]=useState({width:0,height:0});
 const [photo,setPhoto]=useState<PreviewFrame|null>(null);
 const [pending,setPending]=useState(false);
 const [failure,setFailure]=useState('');
 const [retry,setRetry]=useState(0);
 const edits=media.edits;
 const structural=JSON.stringify([media.id,edits.smartErase||[],edits.cropRatio,edits.rotationDeg,edits.flipHorizontal,photoEnhanceKey(edits)]);
 const key=structural;
 const needsProcessing=!!((edits.smartErase||[]).length || (edits.cropRatio&&edits.cropRatio!=='free') ||
   ((edits.rotationDeg||0)%360) || edits.flipHorizontal || hasPhotoEnhance(edits));
 // Color sliders never trigger a canvas encode or object-URL replacement.
 const processingEdits=useMemo(()=>({...edits,brightness:100,contrast:100,saturation:100,photoFilter:'original',filterStrength:0,enhance:resolvePhotoEnhance(edits)}),[structural]);
 const [originalSize,setOriginalSize]=useState<StampReferenceSize|null>(null);
 useEffect(()=>{
  if(!needsProcessing||!media.rawBlob){setOriginalSize(null);return;}
  let alive=true;
  void createImageBitmap(media.rawBlob).then(bitmap=>{
   if(alive)setOriginalSize({width:bitmap.width,height:bitmap.height});
   bitmap.close();
  }).catch(()=>{if(alive)setOriginalSize(null);});
  return()=>{alive=false;};
 },[media.id,media.rawBlob,needsProcessing]);

 useEffect(()=>{
  const node=stage.current;if(!node)return;
  const resize=()=>{
   const width=node.clientWidth,height=node.clientHeight;
   setBounds(old=>old.width===width&&old.height===height?old:{width,height});
  };
  resize();
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
  observer?.observe(node);window.addEventListener('resize',resize);
  return()=>{observer?.disconnect();window.removeEventListener('resize',resize);};
 },[]);

 useEffect(()=>{
  let canceled=false,processedUrl='';
  // An owned URL is freed only after this preview stops using its original.
  const originalUrl=media.rawBlob?URL.createObjectURL(media.rawBlob):media.url;
  // A saved stamped JPEG without its original must NOT have a second stamp
  // painted over it. Other media (including bundled demo) is stampable.
  const original=!!media.rawBlob||(!media.stampedBlob&&!media.isStamped);
  setPhoto({key,url:originalUrl,width:0,height:0,original});
  setFailure('');
  setPending(needsProcessing);
  if(needsProcessing){
   const run=async()=>{
    try{
     if(!original)throw Error('Không tìm thấy ảnh gốc để áp dụng chỉnh sửa.');
     const source=media.rawBlob||await(await fetch(media.url)).blob();
     const output=await createEditorPreview(source,processingEdits,false,compact?480:1440);
     if(canceled)return;
     processedUrl=URL.createObjectURL(output);
     setPhoto({key,url:processedUrl,width:0,height:0,original:true});
     setPending(false);
    }catch(e){
     if(!canceled){
      console.warn('HNL Mark: lỗi dựng ảnh xem trước; giữ ảnh gốc:',e);
      setFailure('Không áp dụng được chỉnh sửa ảnh xem trước. Ảnh gốc vẫn còn.');
      setPending(false);
     }
    }
   };
   void run();
  }
  return()=>{
   canceled=true;
   if(media.rawBlob)URL.revokeObjectURL(originalUrl);
   if(processedUrl)URL.revokeObjectURL(processedUrl);
  };
 },[media.id,media.url,media.rawBlob,media.stampedBlob,media.isStamped,key,needsProcessing,processingEdits,compact,retry]);

 const matching=photo?.key===key;
 const ready=matching&&!!photo&&photo.width>0&&photo.height>0&&bounds.width>0&&bounds.height>0;
 const ratio=photo&&photo.height>0?photo.width/photo.height:1;
 const fittedW=ready?Math.min(bounds.width,bounds.height*ratio):0;
 const fittedH=ready?fittedW/ratio:0;
 const referenceSize=photo?(needsProcessing&&originalSize
  ?editedRasterSize(originalSize.width,originalSize.height,edits)
  :{width:photo.width,height:photo.height}):undefined;

 const effective=mediaWatermarkConfig({...config,...media.captureWatermark,...media.watermarkOverride},media);
 const url=matching&&photo?photo.url:media.url;
 const canOverlay=ready&&photo?.original&&showStamp&&effective.templateId!=='none';
 const handleLoaded=(event:React.SyntheticEvent<HTMLImageElement>)=>{
  const w=event.currentTarget.naturalWidth,h=event.currentTarget.naturalHeight;
  const loadedUrl=event.currentTarget.getAttribute('src');
  if(w>0&&h>0){
   setPhoto(old=>old&&old.key===key&&old.url===loadedUrl&&(old.width!==w||old.height!==h)
    ?{...old,width:w,height:h}:old);
  }
 };
 return <div ref={stage} data-hnl-shared-photo-preview="true" className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
   <div className="relative shrink-0 overflow-hidden" style={{width:ready?fittedW:'100%',height:ready?fittedH:'100%'}}>
    <img src={url} alt={media.title} draggable={false}
     onLoad={handleLoaded}
     onError={()=>setFailure('Không đọc được tệp ảnh. Vui lòng kiểm tra ảnh gốc trong thư viện.')}
     className="absolute inset-0 h-full w-full select-none"
     style={{objectFit:ready?'fill':'contain',filter:photoFilterCss(edits)}}/>
    {canOverlay&&<WatermarkOverlay config={effective} orientationDeg={media.orientationDeg||0} photoCode={mediaStampCode(effective.templateId,media)} referenceSize={referenceSize}/>}
   </div>
   {pending&&!compact&&<span className="absolute left-2 bottom-2 rounded bg-[#0B1424]/80 px-2 py-1 text-[10px] text-[#CBD5E1]" role="status">Đang áp dụng chỉnh sửa…</span>}
   {failure&&!compact&&<div role="alert" className="absolute left-2 right-2 bottom-2 flex items-center justify-between gap-2 rounded-lg bg-[#5B1D27]/95 px-2 py-1.5 text-[11px] text-white">
     <span>{failure}</span>
     <button type="button" className="shrink-0 rounded bg-white/15 px-2 py-1 font-semibold" onClick={e=>{e.stopPropagation();setRetry(n=>n+1);}}>Thử lại</button>
   </div>}
 </div>;
};
