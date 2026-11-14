import React, {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ChevronLeft, ChevronRight, Images, Pencil, Share2} from 'lucide-react';
import type {MediaItem} from '../../types/hnl';

type Props={
  items:MediaItem[];
  initialId:string;
  onBackToCamera:()=>void;
  onOpenFullLibrary:()=>void;
  onEditMedia:(item:MediaItem)=>void;
  onShareMedia:(item:MediaItem)=>void;
};

/** Camera-roll review: the bottom-left thumbnail must never open the OS file picker. */
export const CameraRollScreen:React.FC<Props>=({items,initialId,onBackToCamera,onOpenFullLibrary,onEditMedia,onShareMedia})=>{
  const ordered=[...items].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const [currentId,setCurrentId]=useState(initialId);
  const [zoom,setZoom]=useState(1);
  const touchStartX=useRef<number|null>(null);
  const pinchDist=useRef<number|null>(null);
  const pinchZoom=useRef(1);
  const [viewerTools,setViewerTools]=useState(true);
  const activeIndex=Math.max(0,ordered.findIndex(item=>item.id===currentId));
  const active=ordered[activeIndex];
  useEffect(()=>{setCurrentId(initialId);setZoom(1);},[initialId]);
  const select=(index:number)=>{const next=ordered[index];if(next){setCurrentId(next.id);setZoom(1);}};
  const step=(delta:number)=>select(Math.max(0,Math.min(ordered.length-1,activeIndex+delta)));
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}
      if(event.key==='ArrowRight'){event.preventDefault();step(1);}
      if(event.key==='Escape'){event.preventDefault();onBackToCamera();}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  });
  const distance=(a:React.Touch,b:React.Touch)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  const handleStart=(e:React.TouchEvent)=>{
    if(e.touches.length===2){pinchDist.current=distance(e.touches[0],e.touches[1]);pinchZoom.current=zoom;touchStartX.current=null;}
    else if(e.touches.length===1){touchStartX.current=e.touches[0].clientX;pinchDist.current=null;}
  };
  const handleMove=(e:React.TouchEvent)=>{
    if(e.touches.length===2&&pinchDist.current&&active?.kind==='photo'){
      const ratio=distance(e.touches[0],e.touches[1])/pinchDist.current;
      setZoom(Math.max(1,Math.min(5,pinchZoom.current*ratio)));
    }
  };
  const handleEnd=(e:React.TouchEvent)=>{
    if(pinchDist.current){if(e.touches.length===0)pinchDist.current=null;return;}
    if(e.changedTouches.length===1&&touchStartX.current!==null&&zoom<=1.01){
      const diff=e.changedTouches[0].clientX-touchStartX.current;
      if(Math.abs(diff)>55)step(diff<0?1:-1);
    }
    touchStartX.current=null;
  };
  return <section className="relative flex flex-1 min-h-0 flex-col w-full h-full bg-[#02050A] text-white overflow-hidden" data-hnl-camera-roll="true">
    <header className="relative z-10 shrink-0 flex items-center justify-between gap-3 px-3 py-2 bg-[#07101D]/90 border-b border-white/10"
      style={{paddingTop:'max(8px,var(--hnl-safe-top))'}}>
      <button type="button" onClick={onBackToCamera} aria-label="Quay lại camera" className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10"><ArrowLeft className="w-6 h-6"/></button>
      <div className="flex-1 min-w-0 text-center">
        <p className="text-sm font-semibold truncate">{active?.title||'Ảnh đã chụp'}</p>
        <p className="text-[11px] text-[#AEBBD0] tabular-nums">{ordered.length?`${activeIndex+1} / ${ordered.length}`:'Thư viện trống'}</p>
      </div>
      <button type="button" onClick={onOpenFullLibrary} aria-label="Mở thư viện đầy đủ" title="Xem tất cả ảnh và video"
        className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10"><Images className="w-5 h-5"/></button>
    </header>
    <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-black touch-pan-y"
      onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
      onClick={()=>setViewerTools(old=>!old)}>
      {active?.kind==='video'? <video key={active.id} src={active.url} playsInline controls preload="metadata" className="max-w-full max-h-full w-auto h-auto object-contain" />
      : active ? <img key={active.id} src={active.url} alt={active.title} draggable={false}
          className="w-full h-full object-contain select-none" style={{transform:`scale(${zoom})`,transition:pinchDist.current?'none':'transform 120ms ease'}} />
      : <div className="flex flex-col items-center gap-3 p-5 text-center text-[#94A3B8]"><Images className="w-11 h-11"/><p>Chưa có ảnh hoặc video đã chụp.</p><button type="button" onClick={onBackToCamera} className="px-4 py-2 rounded-xl bg-[#E2B74B] text-[#071121] font-semibold">Chụp ảnh</button></div>}
      {active&&viewerTools&&ordered.length>1&&<>
        <button type="button" onClick={e=>{e.stopPropagation();step(-1);}} disabled={activeIndex===0} aria-label="Ảnh trước" className="absolute left-1 top-1/2 -translate-y-1/2 p-2 bg-black/35 rounded-full disabled:opacity-20"><ChevronLeft className="w-6 h-6"/></button>
        <button type="button" onClick={e=>{e.stopPropagation();step(1);}} disabled={activeIndex===ordered.length-1} aria-label="Ảnh tiếp theo" className="absolute right-1 top-1/2 -translate-y-1/2 p-2 bg-black/35 rounded-full disabled:opacity-20"><ChevronRight className="w-6 h-6"/></button>
      </>}
    </div>
    <div className="shrink-0 border-t border-white/10 bg-[#09111E]" style={{paddingBottom:'max(8px,var(--hnl-safe-bottom))'}}>
      {ordered.length>1&&<div className="flex items-center gap-2 overflow-x-auto px-3 pt-3 pb-2" aria-label="Danh sách ảnh đã chụp">
        {ordered.map((item,index)=><button key={item.id} type="button" onClick={()=>select(index)} aria-label={`Xem ảnh ${index+1}`}
          className={`relative w-14 h-14 shrink-0 overflow-hidden rounded-lg border-2 ${index===activeIndex?'border-[#E2B74B]':'border-white/10'}`}>
          {item.kind==='video'? <div className="w-full h-full bg-[#1C2A40] flex items-center justify-center text-[10px]">VIDEO</div>:
            <img src={item.url} alt="" className="w-full h-full object-cover"/>}
        </button>)}
      </div>}
      {active&&<div className="flex items-center justify-between gap-3 px-4 py-2">
        <span className="text-xs text-[#94A3B8] tabular-nums truncate">{new Date(active.createdAt).toLocaleString('vi-VN')}</span>
        <div className="flex gap-2">
          <button type="button" onClick={()=>onEditMedia(active)} className="flex gap-1.5 items-center px-3 py-2 rounded-xl bg-[#15233B] text-xs"><Pencil className="w-4 h-4"/>Sửa dấu</button>
          <button type="button" onClick={()=>onShareMedia(active)} className="flex gap-1.5 items-center px-3 py-2 rounded-xl bg-[#E2B74B] text-[#06101E] text-xs font-semibold"><Share2 className="w-4 h-4"/>Lưu / Chia sẻ</button>
        </div>
      </div>}
    </div>
  </section>;
};
