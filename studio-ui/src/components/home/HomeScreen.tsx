import React, { useRef, useState } from 'react';
import {
  Camera,
  FolderOpen,
  ImagePlus,
  Minus,
  Plus,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { MediaItem, WatermarkConfig } from '../../types/hnl';
import { WATERMARK_TEMPLATES } from '../../data/templates';
import { WatermarkOverlay } from '../watermark/WatermarkOverlay';
import { AccordionSection } from '../common/AccordionSection';
import { AndroidAdaptiveIconPreview } from '../common/HnlBrandMark';

interface HomeScreenProps {
  activeMedia: MediaItem;
  watermarkConfig: WatermarkConfig;
  mediaCount: number;
  onOpenCamera: () => void;
  onOpenLibrary: () => void;
  onOpenEditor: () => void;
  onOpenStamps: () => void;
  onPickLocalMedia: (files: FileList | null) => void;
  onSelectTemplate: (templateId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  activeMedia,
  watermarkConfig,
  mediaCount,
  onOpenCamera,
  onOpenLibrary,
  onOpenEditor,
  onOpenStamps,
  onPickLocalMedia,
  onSelectTemplate,
}) => {
  const [previewHeightPx, setPreviewHeightPx] = useState<number>(280);
  const [openSecondary, setOpenSecondary] = useState<'none' | 'quick-stamps' | 'adaptive-icon'>('none');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeTemplate =
    WATERMARK_TEMPLATES.find((t) => t.id === watermarkConfig.templateId) ?? WATERMARK_TEMPLATES[10];

  // Drag handle to resize preview height smoothly
  const handleResizeDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startH = previewHeightPx;

    const onMove = (ev: PointerEvent) => {
      const next = Math.min(480, Math.max(180, Math.round(startH + (ev.clientY - startY))));
      setPreviewHeightPx(next);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className="px-4 py-3 space-y-4 max-w-5xl mx-auto">
      {/* Hidden local file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => {
          onPickLocalMedia(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* 1. Resizable Highlighted Preview Frame */}
      <section aria-label="Xem trước ảnh gắn dấu" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-[16px] font-semibold text-[#F8FAFC] truncate">
              Xem trước dấu thời gian
            </h1>
            <p className="text-[12px] text-[#94A3B8] truncate">
              {activeTemplate.name} · {activeMedia.resolutionLabel}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setPreviewHeightPx((h) => Math.max(180, h - 40))}
              className="min-w-[36px] min-h-[36px] rounded-lg bg-[#111C30] hover:bg-[#17253D] text-[#94A3B8] hover:text-white flex items-center justify-center border border-white/[0.08]"
              aria-label="Giảm chiều cao khung xem trước"
              title="Giảm chiều cao"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewHeightPx((h) => Math.min(480, h + 40))}
              className="min-w-[36px] min-h-[36px] rounded-lg bg-[#111C30] hover:bg-[#17253D] text-[#94A3B8] hover:text-white flex items-center justify-center border border-white/[0.08]"
              aria-label="Tăng chiều cao khung xem trước"
              title="Tăng chiều cao"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden bg-[#0B1424] border border-white/[0.09]">
          <div
            style={{ height: `${previewHeightPx}px` }}
            className="relative w-full overflow-hidden bg-[#040811] flex items-center justify-center"
          >
            <img
              src={activeMedia.url}
              alt={activeMedia.title}
              referrerPolicy="no-referrer"
              style={{
                filter: `brightness(${activeMedia.edits.brightness}%) contrast(${activeMedia.edits.contrast}%) saturate(${activeMedia.edits.saturation}%)`,
                transform: `rotate(${activeMedia.edits.rotationDeg}deg) scaleX(${
                  activeMedia.edits.flipHorizontal ? -1 : 1
                })`,
              }}
              className="w-full h-full object-cover transition-transform duration-200"
            />
            <WatermarkOverlay config={watermarkConfig} />
          </div>

          {/* Interactive drag bar to resize preview */}
          <div
            onPointerDown={handleResizeDragStart}
            role="slider"
            aria-label="Kéo để tăng giảm chiều cao khung xem trước"
            aria-valuemin={180}
            aria-valuemax={480}
            aria-valuenow={previewHeightPx}
            tabIndex={0}
            className="h-7 bg-[#0E182B] hover:bg-[#15233D] flex items-center justify-center cursor-ns-resize touch-none border-t border-white/[0.06]"
          >
            <span className="w-10 h-1 rounded-full bg-white/25" />
          </div>
        </div>
      </section>

      {/* 2. Core Action Grid — "Thư viện HNL Mark" aligned cleanly in same column as "Chọn ảnh / video" */}
      <section aria-label="Thao tác chính" className="grid grid-cols-2 gap-3">
        {/* Column 1: Chọn ảnh / video + Thư viện HNL Mark stacked in exact same column */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[52px] px-3.5 py-2.5 rounded-xl bg-[#111C30] hover:bg-[#17253D] border border-white/[0.09] text-left flex items-center gap-2.5 active:scale-[0.99] transition"
          >
            <span className="w-9 h-9 rounded-lg bg-[#E2B74B]/12 text-[#E2B74B] flex items-center justify-center shrink-0">
              <ImagePlus className="w-[18px] h-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-[#F8FAFC] truncate">
                Chọn ảnh / video
              </span>
              <span className="block text-[11px] text-[#94A3B8] truncate">
                Từ bộ nhớ thiết bị
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenLibrary}
            className="min-h-[52px] px-3.5 py-2.5 rounded-xl bg-[#111C30] hover:bg-[#17253D] border border-white/[0.09] text-left flex items-center gap-2.5 active:scale-[0.99] transition"
          >
            <span className="w-9 h-9 rounded-lg bg-white/[0.06] text-[#F8FAFC] flex items-center justify-center shrink-0">
              <FolderOpen className="w-[18px] h-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-[#F8FAFC] truncate">
                Thư viện HNL Mark
              </span>
              <span className="block text-[11px] text-[#94A3B8] font-mono-tabular truncate">
                {mediaCount} tệp dự án
              </span>
            </span>
          </button>
        </div>

        {/* Column 2: Mở camera (Primary Gold CTA) + Chỉnh sửa nhanh */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onOpenCamera}
            className="min-h-[52px] px-3.5 py-2.5 rounded-xl bg-[#E2B74B] hover:bg-[#ECC768] text-[#060B14] text-left flex items-center gap-2.5 shadow-lg shadow-[#E2B74B]/10 active:scale-[0.99] transition"
          >
            <span className="w-9 h-9 rounded-lg bg-[#060B14]/15 flex items-center justify-center shrink-0">
              <Camera className="w-[19px] h-[19px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-bold truncate">Mở camera</span>
              <span className="block text-[11px] text-[#060B14]/80 font-medium truncate">
                Chụp ảnh &amp; quay video
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenEditor}
            className="min-h-[52px] px-3.5 py-2.5 rounded-xl bg-[#111C30] hover:bg-[#17253D] border border-white/[0.09] text-left flex items-center gap-2.5 active:scale-[0.99] transition"
          >
            <span className="w-9 h-9 rounded-lg bg-white/[0.06] text-[#E2B74B] flex items-center justify-center shrink-0">
              <Sliders className="w-[18px] h-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-[#F8FAFC] truncate">
                Chỉnh sửa ảnh
              </span>
              <span className="block text-[11px] text-[#94A3B8] truncate">
                Cắt, xoay &amp; chỉnh màu
              </span>
            </span>
          </button>
        </div>
      </section>

      {/* 3. Collapsed Secondary Functions (Accordion) */}
      <section aria-label="Chức năng phụ thu gọn" className="pt-1">
        <AccordionSection
          title="Chọn nhanh mẫu dấu thời gian"
          subtitle={`Đang chọn: ${activeTemplate.name} · 22 mẫu sẵn sàng`}
          isOpen={openSecondary === 'quick-stamps'}
          onToggle={() =>
            setOpenSecondary((s) => (s === 'quick-stamps' ? 'none' : 'quick-stamps'))
          }
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-1 hnl-scroll">
            {WATERMARK_TEMPLATES.filter((t) => t.group === 'hnl-independent')
              .slice(0, 6)
              .map((tpl) => {
                const selected = tpl.id === watermarkConfig.templateId;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onSelectTemplate(tpl.id)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition border ${
                      selected
                        ? 'bg-[#E2B74B]/18 border-[#E2B74B] text-[#E2B74B]'
                        : 'bg-[#111C30] border-white/[0.08] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {tpl.name}
                  </button>
                );
              })}
            <button
              type="button"
              onClick={onOpenStamps}
              className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 bg-white/[0.06] text-[#F8FAFC] hover:bg-white/10 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E2B74B]" />
              Xem cả 22 mẫu
            </button>
          </div>
        </AccordionSection>

        <AccordionSection
          title="Nhận diện Logo & Android Adaptive Icon"
          subtitle="Placeholder logo HNL & khung kiểm thử vùng an toàn launcher"
          isOpen={openSecondary === 'adaptive-icon'}
          onToggle={() =>
            setOpenSecondary((s) => (s === 'adaptive-icon' ? 'none' : 'adaptive-icon'))
          }
        >
          <AndroidAdaptiveIconPreview />
        </AccordionSection>
      </section>
    </div>
  );
};
