import React, { useRef, useState } from 'react';
import {
  AlignCenter,
  Crop,
  FlipHorizontal2,
  Move,
  RotateCcw,
  RotateCw,
  Undo2,
} from 'lucide-react';
import { CropRatio, ImageEdits, MediaItem, WatermarkConfig } from '../../types/hnl';
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
  const [activeTab, setActiveTab] = useState<'crop' | 'color'>('crop');

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pinchStartRef = useRef<number | null>(null);
  const pinchZoomRef = useRef<number>(1);

  const edits = media.edits;

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
          onWheel={(e) => {
            const next = Math.min(3.5, Math.max(1, zoom + (e.deltaY < 0 ? 0.12 : -0.12)));
            setZoom(Number(next.toFixed(2)));
          }}
          style={{ height: `${previewHeightPx}px` }}
          className={`relative w-full overflow-hidden bg-[#04070E] flex items-center justify-center ${media.kind==='video'?'touch-auto':'touch-none'}`}
        >
          {media.kind==='video' ? <video src={media.url} controls playsInline preload="metadata" className="w-full h-full object-contain" /> : <img
            src={media.url}
            alt={media.title}
            referrerPolicy="no-referrer"
            style={{
              filter: `brightness(${edits.brightness}%) contrast(${edits.contrast}%) saturate(${edits.saturation}%)`,
              transform: `scale(${zoom}) rotate(${edits.rotationDeg}deg) scaleX(${
                edits.flipHorizontal ? -1 : 1
              })`,
              transition: 'transform 140ms ease-out',
            }}
            className={`w-full h-full object-cover pointer-events-none ${
              edits.centeredFrame ? 'p-4 bg-[#0B1424] object-contain' : ''
            }`}
          />}

          {/* Visual Crop Ratio Guide Overlay */}
          {(edits.cropRatio !== 'free' || showCropMenu) && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`${cropBoxAspect()} border border-[#E2B74B]/90 shadow-[0_0_0_9999px_rgba(4,7,14,0.45)] transition-all duration-150`}
              />
            </div>
          )}

          {/* Draggable Watermark */}
          <WatermarkOverlay
            config={{ ...watermarkConfig, positionPreset: 'custom' }}
            draggable
            containerRef={canvasRef}
            onDragPositionChange={onUpdateWatermarkPos}
          />

          {/* Subtle drag hint */}
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/60 text-[11px] text-[#E2B74B] flex items-center gap-1 pointer-events-none">
            <Move className="w-3 h-3" />
            <span>Kéo dấu để đổi vị trí</span>
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
      </div>

      {activeTab === 'crop' ? (
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
