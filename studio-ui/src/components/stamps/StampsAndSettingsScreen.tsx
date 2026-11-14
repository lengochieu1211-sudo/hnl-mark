import React, { useMemo, useState } from 'react';
import { Check, Sliders } from 'lucide-react';
import {
  AspectRatioMode,
  ImageEdits,
  MediaItem,
  WatermarkConfig,
  WatermarkFontKey,
  WatermarkPositionPreset,
} from '../../types/hnl';
import { WATERMARK_TEMPLATES } from '../../data/templates';
import { DEMO_IMAGES } from '../../data/mockMedia';
import { WatermarkOverlay } from '../watermark/WatermarkOverlay';
import { AccordionSection } from '../common/AccordionSection';
import { HnlLogoPlaceholder } from '../common/HnlBrandMark';
import { ImageEditorScreen } from '../editor/ImageEditorScreen';

interface StampsAndSettingsScreenProps {
  activeMedia: MediaItem;
  config: WatermarkConfig;
  initialSubTab?: 'templates' | 'customize' | 'editor';
  onChangeConfig: (patch: Partial<WatermarkConfig>) => void;
  onUpdateEdits: (mediaId: string, nextEdits: ImageEdits) => void;
}

const COLOR_SWATCHES = ['#E2B74B', '#F8FAFC', '#38BDF8', '#34D399', '#FB923C', '#0E2444'];

export const StampsAndSettingsScreen: React.FC<StampsAndSettingsScreenProps> = ({
  activeMedia,
  config,
  initialSubTab = 'templates',
  onChangeConfig,
  onUpdateEdits,
}) => {
  const [subTab, setSubTab] = useState<'templates' | 'customize' | 'editor'>(initialSubTab);
  const [templateFilter, setTemplateFilter] = useState<'all' | 'timemark-legacy' | 'hnl-independent'>('all');
  const [openAccordion, setOpenAccordion] = useState<string>('datetime');

  const filteredTemplates = useMemo(() => {
    if (templateFilter === 'all') return WATERMARK_TEMPLATES;
    return WATERMARK_TEMPLATES.filter((t) => t.group === templateFilter);
  }, [templateFilter]);

  const activeTemplate =
    WATERMARK_TEMPLATES.find((t) => t.id === config.templateId) ?? WATERMARK_TEMPLATES[10];

  const toggleAcc = (id: string) => {
    setOpenAccordion((cur) => (cur === id ? '' : id));
  };

  if (subTab === 'editor') {
    return (
      <div>
        <div className="px-4 pt-3 flex items-center justify-between gap-2 max-w-4xl mx-auto">
          <div className="flex items-center gap-1 bg-[#0B1424] p-1 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setSubTab('templates')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-white"
            >
              22 Mẫu dấu
            </button>
            <button
              type="button"
              onClick={() => setSubTab('customize')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-white"
            >
              Tùy chỉnh dấu
            </button>
            <button
              type="button"
              onClick={() => setSubTab('editor')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E2B74B] text-[#060B14]"
            >
              Chỉnh sửa ảnh
            </button>
          </div>
        </div>
        <ImageEditorScreen
          media={activeMedia}
          watermarkConfig={config}
          onUpdateEdits={onUpdateEdits}
          onUpdateWatermarkPos={(pos) =>
            onChangeConfig({ positionPreset: 'custom', customPos: pos })
          }
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3.5 max-w-5xl mx-auto">
      {/* Sub-navigation tabs inside Cài dấu */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-[#0B1424] p-1 rounded-xl border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setSubTab('templates')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition ${
              subTab === 'templates'
                ? 'bg-[#E2B74B] text-[#060B14]'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            22 Mẫu dấu
          </button>
          <button
            type="button"
            onClick={() => setSubTab('customize')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition ${
              subTab === 'customize'
                ? 'bg-[#E2B74B] text-[#060B14]'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Tùy chỉnh chi tiết
          </button>
          <button
            type="button"
            onClick={() => setSubTab('editor')}
            className="min-h-[36px] px-3 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-white flex items-center gap-1"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Chỉnh ảnh</span>
          </button>
        </div>

        <span className="text-[12px] text-[#94A3B8] truncate">
          Đang chọn: <strong className="text-[#E2B74B] font-medium">{activeTemplate.name}</strong>
        </span>
      </div>

      {/* Live Preview Banner (Updates immediately on template/setting changes) */}
      <div className="relative h-44 sm:h-52 w-full rounded-2xl overflow-hidden bg-[#04070E] border border-white/[0.09]">
        <img
          src={activeMedia.url}
          alt={activeMedia.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        <WatermarkOverlay config={config} />
      </div>

      {/* TAB 1: 22 WATERMARK TEMPLATES */}
      {subTab === 'templates' && (
        <div className="space-y-3">
          {/* Group Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hnl-scroll">
            {[
              { id: 'all', label: 'Tất cả (22)' },
              { id: 'hnl-independent', label: '12 Mẫu độc lập' },
              { id: 'timemark-legacy', label: '10 Mẫu Timemark (Placeholder)' },
            ].map((grp) => (
              <button
                key={grp.id}
                type="button"
                onClick={() => setTemplateFilter(grp.id as typeof templateFilter)}
                className={`min-h-[38px] px-3 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border transition ${
                  templateFilter === grp.id
                    ? 'bg-[#17253D] border-[#E2B74B] text-[#E2B74B]'
                    : 'bg-[#111C30] border-white/[0.08] text-[#94A3B8] hover:text-white'
                }`}
              >
                {grp.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredTemplates.map((tpl, idx) => {
              const isSelected = tpl.id === config.templateId;
              const thumbBg =
                idx % 4 === 0
                  ? DEMO_IMAGES.rearConstruction
                  : idx % 4 === 1
                    ? DEMO_IMAGES.surveyGreen
                    : idx % 4 === 2
                      ? DEMO_IMAGES.nightInspection
                      : DEMO_IMAGES.coastalTravel;

              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() =>
                    onChangeConfig({
                      templateId: tpl.id,
                      accentColor: tpl.accentHex,
                    })
                  }
                  className={`text-left rounded-2xl overflow-hidden bg-[#111C30] border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2B74B] ${
                    isSelected
                      ? 'border-[#E2B74B] ring-1 ring-[#E2B74B]/60'
                      : 'border-white/[0.08] hover:border-white/25'
                  }`}
                >
                  {/* Simulated photo thumbnail with actual template preview */}
                  <div className="relative aspect-[4/3] bg-[#060B14] overflow-hidden">
                    <img
                      src={thumbBg}
                      alt={tpl.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <WatermarkOverlay
                      compact
                      config={{
                        ...config,
                        templateId: tpl.id,
                        accentColor: tpl.accentHex,
                        positionPreset: 'bottom-left',
                      }}
                    />
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#E2B74B] text-[#060B14] flex items-center justify-center shadow">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 space-y-0.5">
                    <div className="text-[13px] font-semibold text-[#F8FAFC] truncate">
                      {tpl.name}
                    </div>
                    <div className="text-[11px] text-[#94A3B8] truncate">
                      {tpl.isPlaceholder
                        ? `Mã ${tpl.code} · Bảo toàn slot cũ`
                        : tpl.summary}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: 11 ACCORDION SETTINGS GROUPS (Compact 13-14px inputs) */}
      {subTab === 'customize' && (
        <div className="rounded-2xl bg-[#0D1626] border border-white/[0.08] px-3.5 py-1">
          {/* 1. Ngày giờ */}
          <AccordionSection
            title="1. Ngày giờ"
            subtitle={config.autoTime ? 'Tự động theo hệ thống' : 'Tùy chỉnh thủ công'}
            isOpen={openAccordion === 'datetime'}
            onToggle={() => toggleAcc('datetime')}
          >
            <div className="grid sm:grid-cols-2 gap-2.5">
              <label className="flex items-center justify-between gap-2 px-3 h-9 rounded-lg bg-[#111C30] border border-white/[0.07]">
                <span className="text-[13px] text-[#F8FAFC]">Lấy giờ tự động</span>
                <input
                  type="checkbox"
                  checked={config.autoTime}
                  onChange={(e) => onChangeConfig({ autoTime: e.target.checked })}
                  className="accent-[#E2B74B] w-4 h-4"
                />
              </label>

              <select
                value={config.dateFormat}
                onChange={(e) =>
                  onChangeConfig({ dateFormat: e.target.value as WatermarkConfig['dateFormat'] })
                }
                aria-label="Định dạng ngày giờ"
                className="h-9 px-2.5 rounded-lg bg-[#111C30] border border-white/[0.07] text-[13px] text-[#F8FAFC] font-mono-tabular"
              >
                <option value="DD/MM/YYYY HH:mm:ss">DD/MM/YYYY HH:mm:ss</option>
                <option value="YYYY-MM-DD HH:mm">YYYY-MM-DD HH:mm</option>
                <option value="HH:mm · DD/MM/YYYY">HH:mm · DD/MM/YYYY</option>
              </select>

              <input
                type="datetime-local"
                value={config.dateTimeIso.slice(0, 16)}
                disabled={config.autoTime}
                onChange={(e) => onChangeConfig({ dateTimeIso: `${e.target.value}:00` })}
                className="sm:col-span-2 h-9 px-2.5 rounded-lg bg-[#111C30] border border-white/[0.07] text-[13px] text-[#F8FAFC] disabled:opacity-45 font-mono-tabular"
              />
            </div>
          </AccordionSection>

          {/* 2. Vị trí / địa chỉ */}
          <AccordionSection
            title="2. Vị trí / Địa chỉ"
            subtitle={config.locationText}
            isOpen={openAccordion === 'location'}
            onToggle={() => toggleAcc('location')}
          >
            <div className="space-y-2">
              <input
                type="text"
                value={config.locationText}
                onChange={(e) => onChangeConfig({ locationText: e.target.value })}
                placeholder="Nhập địa chỉ hiện trường..."
                className="w-full h-9 px-2.5 rounded-lg bg-[#111C30] border border-white/[0.07] text-[13px] text-[#F8FAFC]"
              />
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={config.coordinates}
                  onChange={(e) => onChangeConfig({ coordinates: e.target.value })}
                  placeholder="Tọa độ GPS..."
                  className="h-9 px-2.5 rounded-lg bg-[#111C30] border border-white/[0.07] text-[13px] text-[#F8FAFC] font-mono-tabular"
                />
                <label className="flex items-center justify-between gap-2 px-3 h-9 rounded-lg bg-[#111C30] border border-white/[0.07]">
                  <span className="text-[13px] text-[#F8FAFC]">Hiện tọa độ GPS</span>
                  <input
                    type="checkbox"
                    checked={config.showCoordinates}
                    onChange={(e) => onChangeConfig({ showCoordinates: e.target.checked })}
                    className="accent-[#E2B74B] w-4 h-4"
                  />
                </label>
              </div>
            </div>
          </AccordionSection>

          {/* 3. Nội dung tùy chỉnh */}
          <AccordionSection
            title="3. Nội dung tùy chỉnh"
            subtitle={config.customTitle || 'Tiêu đề công việc & ghi chú'}
            isOpen={openAccordion === 'custom-text'}
            onToggle={() => toggleAcc('custom-text')}
          >
            <div className="space-y-2">
              <input
                type="text"
                value={config.customTitle}
                onChange={(e) => onChangeConfig({ customTitle: e.target.value })}
                placeholder="Tiêu đề / Hạng mục"
                className="w-full h-9 px-2.5 rounded-lg bg-[#111C30] border border-white/[0.07] text-[13px] text-[#F8FAFC]"
              />
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={config.inspectorName}
                  onChange={(e) => onChangeConfig({ inspectorName: e.target.value })}
                  placeholder="Người thực hiện"
                  className="h-9 px-2.5 rounded-lg bg-[#111C30] border border-white/[0.07] text-[13px] text-[#F8FAFC]"
                />
                <input
                  type="text"
                  value={config.customNote}
                  onChange={(e) => onChangeConfig({ customNote: e.target.value })}
                  placeholder="Ghi chú ngắn"
                  className="h-9 px-2.5 rounded-lg bg-[#111C30] border border-white/[0.07] text-[13px] text-[#F8FAFC]"
                />
              </div>
            </div>
          </AccordionSection>

          {/* 4. Font chữ */}
          <AccordionSection
            title="4. Font chữ"
            subtitle={`Đang dùng: ${config.fontKey}`}
            isOpen={openAccordion === 'font'}
            onToggle={() => toggleAcc('font')}
          >
            <select
              value={config.fontKey}
              onChange={(e) => onChangeConfig({ fontKey: e.target.value as WatermarkFontKey })}
              aria-label="Chọn font chữ dấu thời gian"
              className="w-full h-9 px-2.5 rounded-lg bg-[#111C30] border border-white/[0.07] text-[13.5px] text-[#F8FAFC]"
            >
              <option value="be-vietnam">Be Vietnam Pro (Chuẩn tiếng Việt)</option>
              <option value="jakarta">Plus Jakarta Sans (Kỹ thuật hiện đại)</option>
              <option value="jetbrains">JetBrains Mono (Số đơn cách)</option>
              <option value="serif">Serif cổ điển (Biên bản / Kỷ niệm)</option>
            </select>
          </AccordionSection>

          {/* 5. Kích thước chữ */}
          <AccordionSection
            title="5. Kích thước chữ"
            subtitle={`${config.fontSizePx}px`}
            isOpen={openAccordion === 'font-size'}
            onToggle={() => toggleAcc('font-size')}
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={10}
                max={20}
                value={config.fontSizePx}
                onChange={(e) => onChangeConfig({ fontSizePx: Number(e.target.value) })}
                className="flex-1 accent-[#E2B74B] h-1.5"
              />
              <span className="text-[13px] font-mono-tabular text-[#E2B74B] w-11 text-right">
                {config.fontSizePx}px
              </span>
            </div>
          </AccordionSection>

          {/* 6. Màu sắc */}
          <AccordionSection
            title="6. Màu sắc & Độ mờ nền"
            subtitle={`Nhấn ${config.accentColor} · Nền ${Math.round(config.bgOpacity * 100)}%`}
            isOpen={openAccordion === 'colors'}
            onToggle={() => toggleAcc('colors')}
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12.5px] text-[#94A3B8] mr-1">Màu nhấn:</span>
                {COLOR_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onChangeConfig({ accentColor: hex })}
                    style={{ backgroundColor: hex }}
                    aria-label={`Chọn màu ${hex}`}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      config.accentColor === hex ? 'border-white scale-110' : 'border-white/20'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12.5px] text-[#94A3B8] shrink-0">Độ đậm nền dấu</span>
                <input
                  type="range"
                  min={0.2}
                  max={0.95}
                  step={0.05}
                  value={config.bgOpacity}
                  onChange={(e) => onChangeConfig({ bgOpacity: Number(e.target.value) })}
                  className="flex-1 accent-[#E2B74B] h-1.5"
                />
                <span className="text-xs font-mono-tabular text-[#E2B74B] w-10 text-right">
                  {Math.round(config.bgOpacity * 100)}%
                </span>
              </div>
            </div>
          </AccordionSection>

          {/* 7. Logo HNL */}
          <AccordionSection
            title="7. Logo HNL"
            subtitle={config.showLogo ? 'Đang bật (Placeholder logo gốc)' : 'Đang ẩn'}
            isOpen={openAccordion === 'logo'}
            onToggle={() => toggleAcc('logo')}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#111C30] border border-white/[0.07]">
                <HnlLogoPlaceholder size="sm" showPlaceholderNote />
                <input
                  type="checkbox"
                  checked={config.showLogo}
                  onChange={(e) => onChangeConfig({ showLogo: e.target.checked })}
                  className="accent-[#E2B74B] w-4 h-4"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['left', 'right'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => onChangeConfig({ logoSide: side })}
                    className={`h-9 rounded-lg text-xs font-medium border ${
                      config.logoSide === side
                        ? 'bg-[#E2B74B]/18 border-[#E2B74B] text-[#E2B74B]'
                        : 'bg-[#111C30] border-white/[0.07] text-[#94A3B8]'
                    }`}
                  >
                    {side === 'left' ? 'Logo bên trái' : 'Logo bên phải'}
                  </button>
                ))}
              </div>
            </div>
          </AccordionSection>

          {/* 8. Vị trí watermark */}
          <AccordionSection
            title="8. Vị trí Watermark"
            subtitle={`Neo tại: ${config.positionPreset}`}
            isOpen={openAccordion === 'position'}
            onToggle={() => toggleAcc('position')}
          >
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'top-left', label: 'Trên trái' },
                { id: 'top-right', label: 'Trên phải' },
                { id: 'bottom-left', label: 'Dưới trái' },
                { id: 'bottom-right', label: 'Dưới phải' },
                { id: 'bottom-center', label: 'Dưới giữa' },
                { id: 'custom', label: 'Tự kéo vị trí' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    onChangeConfig({ positionPreset: p.id as WatermarkPositionPreset })
                  }
                  className={`h-9 px-2 rounded-lg text-xs font-medium border ${
                    config.positionPreset === p.id
                      ? 'bg-[#E2B74B] text-[#060B14] border-[#E2B74B] font-semibold'
                      : 'bg-[#111C30] border-white/[0.07] text-[#94A3B8]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </AccordionSection>

          {/* 9. Mã ảnh */}
          <AccordionSection
            title="9. Mã ảnh"
            subtitle={`${config.photoCodePrefix}-${String(config.photoCodeSeq).padStart(4, '0')}`}
            isOpen={openAccordion === 'code'}
            onToggle={() => toggleAcc('code')}
          >
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={config.photoCodePrefix}
                onChange={(e) => onChangeConfig({ photoCodePrefix: e.target.value.toUpperCase() })}
                placeholder="Tiền tố"
                className="h-9 px-2.5 rounded-lg bg-[#111C30] border border-white/[0.07] text-[13px] text-[#F8FAFC] font-mono-tabular"
              />
              <input
                type="number"
                value={config.photoCodeSeq}
                onChange={(e) => onChangeConfig({ photoCodeSeq: Number(e.target.value) || 1 })}
                className="h-9 px-2.5 rounded-lg bg-[#111C30] border border-white/[0.07] text-[13px] text-[#F8FAFC] font-mono-tabular"
              />
              <label className="flex items-center justify-between px-2.5 h-9 rounded-lg bg-[#111C30] border border-white/[0.07]">
                <span className="text-xs text-[#F8FAFC]">Hiện</span>
                <input
                  type="checkbox"
                  checked={config.showPhotoCode}
                  onChange={(e) => onChangeConfig({ showPhotoCode: e.target.checked })}
                  className="accent-[#E2B74B] w-4 h-4"
                />
              </label>
            </div>
          </AccordionSection>

          {/* 10. Cấu hình riêng từng ảnh */}
          <AccordionSection
            title="10. Cấu hình riêng từng ảnh"
            subtitle={config.perPhotoOverrideEnabled ? 'Đang bật cấu hình độc lập' : 'Dùng chung toàn dự án'}
            isOpen={openAccordion === 'per-photo'}
            onToggle={() => toggleAcc('per-photo')}
          >
            <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#111C30] border border-white/[0.07]">
              <span className="text-[13px] text-[#F8FAFC]">
                Lưu riêng mẫu dấu cho từng ảnh đã chọn
              </span>
              <input
                type="checkbox"
                checked={config.perPhotoOverrideEnabled}
                onChange={(e) => onChangeConfig({ perPhotoOverrideEnabled: e.target.checked })}
                className="accent-[#E2B74B] w-4 h-4"
              />
            </label>
          </AccordionSection>

          {/* 11. Thiết lập ảnh / video */}
          <AccordionSection
            title="11. Thiết lập ảnh / video"
            subtitle={`Tỷ lệ ${config.defaultAspectRatio} · Chất lượng JPEG ${config.jpegQuality}%`}
            isOpen={openAccordion === 'media-settings'}
            onToggle={() => toggleAcc('media-settings')}
          >
            <div className="grid sm:grid-cols-2 gap-2.5">
              <select
                value={config.defaultAspectRatio}
                onChange={(e) =>
                  onChangeConfig({ defaultAspectRatio: e.target.value as AspectRatioMode })
                }
                aria-label="Tỷ lệ khung mặc định"
                className="h-9 px-2.5 rounded-lg bg-[#111C30] border border-white/[0.07] text-[13px] text-[#F8FAFC]"
              >
                <option value="4:3">Khung mặc định 4:3</option>
                <option value="16:9">Khung mặc định 16:9</option>
                <option value="1:1">Khung mặc định 1:1</option>
                <option value="full">Toàn màn hình (Full)</option>
              </select>

              <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-[#111C30] border border-white/[0.07]">
                <span className="text-xs text-[#94A3B8] shrink-0">JPEG</span>
                <input
                  type="range"
                  min={70}
                  max={100}
                  value={config.jpegQuality}
                  onChange={(e) => onChangeConfig({ jpegQuality: Number(e.target.value) })}
                  className="flex-1 accent-[#E2B74B] h-1.5"
                />
                <span className="text-xs font-mono-tabular text-[#E2B74B] w-9 text-right">
                  {config.jpegQuality}%
                </span>
              </div>
            </div>
          </AccordionSection>
        </div>
      )}
    </div>
  );
};
