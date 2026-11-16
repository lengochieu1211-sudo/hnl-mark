import React from 'react';
import { FileArchive, Share2 } from 'lucide-react';
import { MediaItem, WatermarkConfig } from '../../types/hnl';
import {PhotoPreview} from '../watermark/PhotoPreview';

interface ExportScreenProps {
  activeMedia: MediaItem;
  allMedia: MediaItem[];
  watermarkConfig: WatermarkConfig;
  onOpenActionSheet: (items: MediaItem[]) => void;
}

export const ExportScreen: React.FC<ExportScreenProps> = ({
  activeMedia,
  allMedia,
  watermarkConfig,
  onOpenActionSheet,
}) => {
  return (
    <div className="px-4 py-3 space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-[17px] font-semibold text-[#F8FAFC]">Xuất &amp; Bàn giao</h1>
        <p className="text-[12px] text-[#94A3B8]">
          Kiểm tra ảnh/video trước khi lưu vào máy, chia sẻ hoặc sao lưu dữ liệu dự án.
        </p>
      </div>

      {/* Preview Card */}
      <div className="rounded-2xl overflow-hidden bg-[#0D1626] border border-white/[0.09]">
        <div className="relative aspect-[4/3] max-h-[340px] w-full bg-black">
          {activeMedia.kind==='video'
            ? <video src={activeMedia.url} controls playsInline preload="metadata" className="w-full h-full object-contain" aria-label="Phát xem trước video" />
            : <PhotoPreview media={activeMedia} config={watermarkConfig}/>}
          {activeMedia.kind==='video'&&!activeMedia.isStamped&&<span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">Dấu sẽ được chèn khi xuất video</span>}
        </div>

        <div className="p-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08]">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#F8FAFC] truncate">{activeMedia.title}</div>
            <div className="text-xs text-[#94A3B8] font-mono-tabular mt-0.5">
              {activeMedia.photoCode} · {activeMedia.resolutionLabel} · {activeMedia.kind==='video'?'Video gốc được giữ lại':`JPEG ${watermarkConfig.jpegQuality}%`}
            </div>
          </div>
          <div className="text-xs text-[#94A3B8] font-mono-tabular">
            Tổng: {allMedia.length} tệp dự án
          </div>
        </div>
      </div>

      {/* Single Unified Save / Share Button */}
      <button
        type="button"
        onClick={() => onOpenActionSheet([activeMedia])}
        className="w-full min-h-[52px] rounded-2xl bg-[#E2B74B] hover:bg-[#ECC768] text-[#060B14] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#E2B74B]/15 active:scale-[0.99] transition"
      >
        <Share2 className="w-4 h-4" />
        <span>Lưu / Chia sẻ</span>
      </button>

      {/* Backup and data protection; internal icon QA is kept out of the application. */}
      <div className="rounded-2xl bg-[#0D1626] border border-white/[0.08] p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
          <FileArchive className="w-4 h-4 text-[#E2B74B]" />
          <span>Sao lưu & bảo vệ dữ liệu</span>
        </div>
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          Nhấn nút <strong className="text-[#F8FAFC]">Lưu / Chia sẻ</strong> ở trên rồi chọn{' '}
          <strong className="text-[#E2B74B]">Sao lưu dự án ZIP</strong> để giữ lại ảnh/video gốc và dữ liệu chỉnh sửa. Ảnh Timemark được đóng dấu trực tiếp trong giao diện AI Studio, luôn giữ lại ảnh gốc.
        </p>
      </div>
    </div>
  );
};
