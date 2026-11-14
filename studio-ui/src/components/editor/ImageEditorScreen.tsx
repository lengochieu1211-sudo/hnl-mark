import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  Crop,
  FlipHorizontal2,
  Move,
  RotateCcw,
  RotateCw,
  Undo2,
  Eraser,
  Check,
  X,
} from 'lucide-react';
import { CropRatio, ImageEdits, MediaItem, WatermarkConfig, SmartEraseDirection } from '../../types/hnl';
import {createEditorPreview,clampSmartRect} from '../../services/smartErase';
import { DEFAULT_IMAGE_EDITS } from '../../data/mockMedia';
import { WatermarkOverlay } from '../watermark/WatermarkOverlay';

interface ImageEditorScreenProps {
  media: MediaItem;
  watermarkConfig: WatermarkConfig;
  onUpdateEdits: (mediaId: string, nextEdits: ImageEdits) => void;
  onUpdateWatermarkPos: (pos: { xPct: number; yPct: number }) => void;
}

const CROP_OPTIONS: { id: CropRatio; label: string }[] = [
  { id: 'free', label: 'Tự do' },
  { id: '1:1', label: '1:1' },
  { id: '4:3', label: '4:3' },
  { id: '3:4', label: '3:4' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
];

export const ImageEditorScreen: React.FC<ImageEditorScreenProps> = ({
  media,
  watermarkConfig,
  onUpdateEdits,
  onUpdateWatermarkPos,
}) => {
  const [history, setHistory] = useState<ImageEdits[]>([]);
  const [previewHeightPx, setPreviewHeightPx] = useState<number>(300);
  const [zoom, setZoom] = useState<number>(1);
  const [showCropMenu, setShowCropMenu] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'crop' | 'color' | 'erase'>('crop');
  const [eraseDirection,setEraseDirection]=useState<SmartEraseDirection>('auto');
  const [eraseRect,setEraseRect]=useState<{x:number;y:number;w:number;h:number}|null>(null);
  const eraseStart=useRef<{x:number;y:number}|null>(null);
  const [previewUrl,setPreviewUrl]=useState<string>('');
  const [erasePreviewUrl,setErasePreviewUrl]=useState<string>('');
  const [imageSize,setImageSize]=useState<{w:number;h:number}>({w:4,h:3});
  const [eraseError,setEraseError]=useState('');
  const [previewBox,setPreviewBox]=useState({left:0,top:0,width:0,height:0});


  const canvasRef = useRef<HTMLDivElement | null>(null);
  const imageRectRef=useRef<HTMLDivElement|null>(null);
  const [stageSize,setStageSize]=useState({w:0,h:0});
  useEffect(()=>{
    const el=canvasRef.current;if(!el)return;
    const sync=()=>setStageSize({w:el.clientWidth,h:el.clientHeight});sync();
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(sync):null;
    observer?.observe(el);return()=>observer?.disconnect();
  },[]);
  const pinchStartRef = useRef<number | null>(null);
  const pinchZoomRef = useRef<number>(1);

  const edits = media.edits;
  // Recreate bitmap only when a geometric/erase operation changes, never on color slider ticks.
  const structureKey=JSON.stringify([media.id,edits.smartErase||[],edits.cropRatio,edits.rotationDeg,edits.flipHorizontal]);
  // Always work from the ORIGINAL Blob, not the already-stamped photo URL.
  // Release every preview object URL when edits change or the editor unmounts.
  useEffect(()=>{
    let disposed=false;let urls:string[]=[];
    const timer=window.setTimeout(async()=>{
      try{
        const source=media.rawBlob || await(await fetch(media.url)).blob();
        const structuralEdits={...edits,brightness:100,contrast:100,saturation:100};
        const normal=await createEditorPreview(source,structuralEdits,false);
        const erased=await createEditorPreview(source,structuralEdits,true);
        if(disposed)return;
        urls=[URL.createObjectURL(normal),URL.createObjectURL(erased)];
        setPreviewUrl(urls[0]);setErasePreviewUrl(urls[1]);setEraseError('');
      }catch(e){if(!disposed)setEraseError('Không tạo được preview chỉnh ảnh: '+String(e));}
    },40);
    return ()=>{disposed=true;window.clearTimeout(timer);urls.forEach(url=>URL.revokeObjectURL(url));};
  },[media.id,media.rawBlob,structureKey]);

  // Map touch/pen/mouse precisely to the visible object-contain image pixels.
  const pointAt=(event:React.PointerEvent<HTMLDivElement>)=>{
    const stage=event.currentTarget.getBoundingClientRect();
    const scale=Math.min(stage.width/imageSize.w,stage.height/imageSize.h);
    const w=imageSize.w*scale,h=imageSize.h*scale;
    const left=(stage.width-w)/2,top=(stage.height-h)/2;
    const x=Math.max(0,Math.min(1,(event.clientX-stage.left-left)/w));
    const y=Math.max(0,Math.min(1,(event.clientY-stage.top-top)/h));
    setPreviewBox({left,top,width:w,height:h});
    return {x,y};
  };
  const beginErase=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(activeTab!=='erase'||media.kind!=='photo')return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const pt=pointAt(event);eraseStart.current=pt;
    setEraseRect({x:pt.x,y:pt.y,w:0,h:0});
  };
  const moveErase=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(!eraseStart.current)return;
    const pt=pointAt(event),start=eraseStart.current;
    setEraseRect({x:Math.min(pt.x,start.x),y:Math.min(pt.y,start.y),w:Math.abs(pt.x-start.x),h:Math.abs(pt.y-start.y)});
  };
  const endErase=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(!eraseStart.current)return;
    moveErase(event);eraseStart.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const applyErase=()=>{
    if(!eraseRect||eraseRect.w<.004||eraseRect.h<.004)return;
    setEraseError('');
    const rect=clampSmartRect(eraseRect);
    commitEdits({smartErase:[...(edits.smartErase||[]),{rect,direction:eraseDirection}]});
    setEraseRect(null);
  };


  const commitEdits = (patch: Partial<ImageEdits>) => {
    setHistory((h) => [...h.slice(-15), edits]);
    onUpdateEdits(media.id, { ...edits, ...patch });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    onUpdateEdits(media.id, prev);
  };

  const handleResetOriginal = () => {
    setHistory((h) => [...h, edits]);
    setZoom(1);
    onUpdateEdits(media.id, { ...DEFAULT_IMAGE_EDITS });
  };

  const handleResizeDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startH = previewHeightPx;
    const onMove = (ev: PointerEvent) => {
      setPreviewHeightPx(Math.min(500, Math.max(200, Math.round(startH + (ev.clientY - startY)))));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      pinchStartRef.current = dist;
      pinchZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const next = Math.min(3.5, Math.max(1, pinchZoomRef.current * (dist / pinchStartRef.current)));
      setZoom(Number(next.toFixed(2)));
    }
  };

  const cropBoxAspect = () => {
    if (edits.cropRatio === '1:1') return 'aspect-square w-[68%] max-h-[84%]';
    if (edits.cropRatio === '4:3') return 'aspect-[4/3] w-[82%] max-h-[86%]';
    if (edits.cropRatio === '3:4') return 'aspect-[3/4] h-[84%] max-w-[78%]';
    if (edits.cropRatio === '16:9') return 'aspect-video w-[88%] max-h-[82%]';
    if (edits.cropRatio === '9:16') return 'aspect-[9/16] h-[86%] max-w-[65%]';
    return 'w-[90%] h-[86%]';
  };

  const scaleToFit=Math.min(stageSize.w/Math.max(1,imageSize.w),stageSize.h/Math.max(1,imageSize.h));
  const fittedW=Math.max(0,imageSize.w*scaleToFit),fittedH=Math.max(0,imageSize.h*scaleToFit);
  const imageRect={left:(stageSize.w-fittedW)/2,top:(stageSize.h-fittedH)/2,width:fittedW,height:fittedH};

  return (
    <div className="px-4 py-3 space-y-3.5 max-w-4xl mx-auto">
      {/* Top Toolbar: Title + Undo / Reset Original */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-[16px] font-semibold text-[#F8FAFC] truncate">Chỉnh sửa ảnh</h1>
          <p className="text-[11.5px] text-[#94A3B8] truncate">
            Giữ nguyên ảnh gốc · Kéo dấu trực tiếp hoặc chụm 2 ngón để zoom ({zoom.toFixed(1)}×)
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={history.length === 0}
            onClick={handleUndo}
            className="min-h-[40px] px-3 rounded-xl bg-[#111C30] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] disabled:opacity-40 flex items-center gap-1.5"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Hoàn tác</span>
          </button>
          <button
            type="button"
            onClick={handleResetOriginal}
            className="min-h-[40px] px-3 rounded-xl bg-[#111C30] border border-white/[0.08] text-xs font-medium text-[#E2B74B] flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục gốc</span>
          </button>
        </div>
      </div>

      {/* Large Resizable Preview Canvas */}
      <div className="rounded-2xl overflow-hidden bg-[#070E1A] border border-white/[0.09]">
        <div
          ref={canvasRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onPointerDown={beginErase}
          onPointerMove={moveErase}
          onPointerUp={endErase}
          onPointerCancel={e=>{endErase(e);eraseStart.current=null;}}
          onWheel={(e) => {
            const next = Math.min(3.5, Math.max(1, zoom + (e.deltaY < 0 ? 0.12 : -0.12)));
            setZoom(Number(next.toFixed(2)));
          }}
          style={{ height: `${previewHeightPx}px` }}
          className={`relative w-full overflow-hidden bg-[#04070E] flex items-center justify-center ${activeTab==='erase'?'touch-none':media.kind==='video'?'touch-auto':'touch-none'}`}
        >
          {media.kind==='video' ? <video src={media.url} controls playsInline preload="metadata" className="w-full h-full object-contain" /> :
            <div ref={imageRectRef} className="absolute overflow-hidden" style={{
              left:imageRect.left,top:imageRect.top,width:imageRect.width,height:imageRect.height,
              transform:`scale(${activeTab==='erase'?1:zoom})`,transition:'transform 140ms ease-out',transformOrigin:'center center'
            }}>
              <img src={(activeTab==='erase'?erasePreviewUrl:previewUrl)||media.url}
                alt={media.title}
                onLoad={e=>{const w=e.currentTarget.naturalWidth||4,h=e.currentTarget.naturalHeight||3;
                 setImageSize(old=>old.w===w&&old.h===h?old:{w,h});}}
                referrerPolicy="no-referrer"
                style={{filter:activeTab==='erase'?'none':`brightness(${edits.brightness??100}%) contrast(${edits.contrast??100}%) saturate(${edits.saturation??100}%)`}}
                className="w-full h-full pointer-events-none" draggable={false}/>
              {activeTab!=='erase'&&<WatermarkOverlay
                config={{ ...watermarkConfig, positionPreset: 'custom' }}
                draggable
                containerRef={imageRectRef}
                onDragPositionChange={onUpdateWatermarkPos}/>} 
            </div>}
          {activeTab==='erase'&&eraseRect&&(
            <div className="absolute pointer-events-none border-2 border-dashed border-[#FBD35B] bg-[#FBD35B]/15"
              style={{left:previewBox.left+eraseRect.x*previewBox.width,
                top:previewBox.top+eraseRect.y*previewBox.height,
                width:eraseRect.w*previewBox.width,height:eraseRect.h*previewBox.height}} />
          )}

          {/* Visual Crop Ratio Guide Overlay */}
          {activeTab!=='erase' && (edits.cropRatio !== 'free' || showCropMenu) && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`${cropBoxAspect()} border border-[#E2B74B]/90 shadow-[0_0_0_9999px_rgba(4,7,14,0.45)] transition-all duration-150`}
              />
            </div>
          )}

          {/* Subtle drag hint */}
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/60 text-[11px] text-[#E2B74B] flex items-center gap-1 pointer-events-none">
            {activeTab==='erase'?<Eraser className="w-3 h-3"/>:<Move className="w-3 h-3"/>}
            <span>{activeTab==='erase'?'Kéo khoanh vùng trên ảnh gốc':'Kéo dấu để đổi vị trí'}</span>
          </div>
        </div>

        {/* Drag handle to resize viewport height */}
        <div
          onPointerDown={handleResizeDrag}
          className="h-7 bg-[#0E182B] hover:bg-[#15233D] flex items-center justify-center cursor-ns-resize touch-none border-t border-white/[0.06]"
          title="Kéo để thay đổi kích thước khung xem"
        >
          <span className="w-10 h-1 rounded-full bg-white/25" />
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('crop')}
          className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold transition ${
            activeTab === 'crop'
              ? 'bg-[#E2B74B] text-[#060B14]'
              : 'bg-[#111C30] text-[#94A3B8] hover:text-white'
          }`}
        >
          Cắt &amp; Xoay khung
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('color')}
          className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold transition ${
            activeTab === 'color'
              ? 'bg-[#E2B74B] text-[#060B14]'
              : 'bg-[#111C30] text-[#94A3B8] hover:text-white'
          }`}
        >
          Ánh sáng &amp; Màu sắc
        </button>
        <button type="button" onClick={()=>{setActiveTab('erase');setEraseRect(null);}}
          disabled={media.kind!=='photo'} className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 ${
            activeTab==='erase'?'bg-[#E2B74B] text-[#060B14]':'bg-[#111C30] text-[#94A3B8] hover:text-white'}`}>
          <Eraser className="w-4 h-4"/> Xóa thông minh
        </button>
      </div>

      {activeTab === 'erase' ? (
        <section className="rounded-2xl border border-white/10 bg-[#101A2B] p-3 space-y-3" aria-label="Xóa thông minh bằng vá nền offline">
          <p className="text-[12px] text-[#CBD5E1]">Khoanh vùng ngày giờ hoặc vật thể cần xóa trên ảnh gốc, chọn hướng lấy mẫu nền rồi nhấn <strong>Xử lý vùng</strong>. Phù hợp vùng nhỏ, nền ít chi tiết; không phải AI tạo ảnh.</p>
          <label className="flex items-center gap-2 text-[12px]">Vá từ vùng
            <select aria-label="Phương pháp xóa thông minh" value={eraseDirection}
              onChange={e=>setEraseDirection(e.target.value as SmartEraseDirection)}
              className="min-h-10 flex-1 min-w-0 px-3 rounded-xl bg-[#0B1424] border border-white/15">
              <option value="auto">Lân cận (tự chọn hướng)</option>
              <option value="up">Phía trên</option><option value="down">Phía dưới</option>
              <option value="left">Bên trái</option><option value="right">Bên phải</option>
              <option value="blur">Làm mờ vùng chọn</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={!eraseRect||eraseRect.w<.004||eraseRect.h<.004}
              onClick={applyErase} className="flex-1 min-h-11 rounded-xl bg-[#E2B74B] text-[#061121] font-bold text-sm disabled:opacity-40 flex justify-center items-center gap-2"><Check size={17}/> Xử lý vùng</button>
            <button type="button" onClick={()=>setEraseRect(null)}
              className="min-h-11 px-3 rounded-xl bg-[#17253D] text-white text-xs flex items-center gap-1"><X size={15}/> Hủy vùng</button>
          </div>
          {eraseError&&<p className="text-xs text-red-300" role="alert">{eraseError}</p>}
          <p className="text-[11px] text-[#94A3B8]">Đã xử lý {edits.smartErase?.length||0} vùng. Dùng Hoàn tác hoặc Khôi phục gốc ở phía trên. Ảnh gốc vẫn giữ riêng trong thư viện và bản ZIP.</p>
        </section>
      ) : activeTab === 'crop' ? (
        <div className="space-y-3">
          {/* Aligned "Tỷ lệ khung cắt" and "Tạo khung giữa" buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => setShowCropMenu((s) => !s)}
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                showCropMenu || edits.cropRatio !== 'free'
                  ? 'bg-[#E2B74B]/18 border-[#E2B74B] text-[#E2B74B]'
                  : 'bg-[#111C30] border-white/[0.08] text-[#F8FAFC]'
              }`}
            >
              <Crop className="w-4 h-4 shrink-0" />
              <span className="truncate">Tỷ lệ khung cắt</span>
            </button>

            <button
              type="button"
              onClick={() => commitEdits({ centeredFrame: !edits.centeredFrame })}
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                edits.centeredFrame
                  ? 'bg-[#E2B74B]/18 border-[#E2B74B] text-[#E2B74B]'
                  : 'bg-[#111C30] border-white/[0.08] text-[#F8FAFC]'
              }`}
            >
              <AlignCenter className="w-4 h-4 shrink-0" />
              <span className="truncate">Tạo khung giữa</span>
            </button>

            <button
              type="button"
              onClick={() => commitEdits({ rotationDeg: (edits.rotationDeg + 90) % 360 })}
              className="min-h-[44px] px-3 rounded-xl bg-[#111C30] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] flex items-center justify-center gap-2 hover:bg-[#17253D]"
            >
              <RotateCw className="w-4 h-4 shrink-0" />
              <span className="truncate">Xoay 90°</span>
            </button>

            <button
              type="button"
              onClick={() => commitEdits({ flipHorizontal: !edits.flipHorizontal })}
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 ${
                edits.flipHorizontal
                  ? 'bg-[#E2B74B]/18 border-[#E2B74B] text-[#E2B74B]'
                  : 'bg-[#111C30] border-white/[0.08] text-[#F8FAFC]'
              }`}
            >
              <FlipHorizontal2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Lật ngang</span>
            </button>
          </div>

          {/* Crop ratio chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hnl-scroll">
            {CROP_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => commitEdits({ cropRatio: opt.id })}
                className={`min-h-[38px] px-3.5 rounded-lg text-xs font-mono-tabular font-medium whitespace-nowrap shrink-0 border transition ${
                  edits.cropRatio === opt.id
                    ? 'bg-[#E2B74B] text-[#060B14] border-[#E2B74B] font-semibold'
                    : 'bg-[#111C30] text-[#94A3B8] border-white/[0.08] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl bg-[#111C30] border border-white/[0.08] p-3.5">
          {[
            { key: 'brightness' as const, label: 'Độ sáng', min: 50, max: 150, val: edits.brightness },
            { key: 'contrast' as const, label: 'Tương phản', min: 50, max: 150, val: edits.contrast },
            { key: 'saturation' as const, label: 'Màu sắc (Bão hòa)', min: 0, max: 180, val: edits.saturation },
          ].map((ctrl) => (
            <div key={ctrl.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#F8FAFC] font-medium">{ctrl.label}</span>
                <span className="font-mono-tabular text-[#E2B74B]">{ctrl.val}%</span>
              </div>
              <input
                type="range"
                min={ctrl.min}
                max={ctrl.max}
                value={ctrl.val}
                onChange={(e) => commitEdits({ [ctrl.key]: Number(e.target.value) })}
                className="w-full accent-[#E2B74B] h-1.5 cursor-pointer"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
