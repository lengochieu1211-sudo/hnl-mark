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
import { TEMPLATE_CATALOG_GROUPS, WATERMARK_TEMPLATES, type TemplateCatalogCategory } from '../../data/templates';
import { DEMO_IMAGES } from '../../data/mockMedia';
import { WatermarkOverlay } from '../watermark/WatermarkOverlay';
import { AccordionSection } from '../common/AccordionSection';
import { HnlLogoPlaceholder } from '../common/HnlBrandMark';
import {FONT_OPTIONS,watermarkFontFamily} from '../../services/watermarkFonts';
import {normalizeWatermarkLogo,logoSrc} from '../../services/watermarkLogo';
import { ImageEditorScreen } from '../editor/ImageEditorScreen';
import {mediaWatermarkConfig,readDeviceGps} from '../../services/watermarkLocation';
import {isAndroidApk,getSaveLocationLabel,chooseSaveLocation,clearSaveLocation} from '../../services/deviceBridge';

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
  const [templateFilter, setTemplateFilter] = useState<'all' | TemplateCatalogCategory>('all');
  const [openAccordion, setOpenAccordion] = useState<string>('datetime');
  const [logoBusy,setLogoBusy]=useState(false);
  const [logoError,setLogoError]=useState('');
  const [gpsError,setGpsError]=useState('');
  const [gpsBusy,setGpsBusy]=useState(false);
  const [saveLocation,setSaveLocation]=useState(()=>getSaveLocationLabel());
  const effectiveConfig=mediaWatermarkConfig(config,activeMedia);
  const fetchGps=async()=>{setGpsBusy(true);setGpsError('');try{
    const coordinates=await readDeviceGps();onChangeConfig({locationSource:'device',coordinates});
  }catch(e){setGpsError(e instanceof Error?e.message:String(e));}finally{setGpsBusy(false);}};
  const pickSaveFolder=()=>{chooseSaveLocation();setSaveLocation('Đang chọn thư mục trong Android…');};
  React.useEffect(()=>{const fn=()=>setSaveLocation(getSaveLocationLabel());
    window.addEventListener('hnl-studio:save-destination',fn);return()=>window.removeEventListener('hnl-studio:save-destination',fn);},[]);
  const changeLogoFile=async(file?:File)=>{
    if(!file)return;setLogoBusy(true);setLogoError('');
    try{const data=await normalizeWatermarkLogo(file);onChangeConfig({logoImageDataUrl:data,showLogo:true,timemarkLogoEnabled:true});}
    catch(e){setLogoError(e instanceof Error?e.message:String(e));}
    finally{setLogoBusy(false);}
  };

  const visibleCatalog = useMemo(() =>
    templateFilter === 'all'
      ? TEMPLATE_CATALOG_GROUPS
      : TEMPLATE_CATALOG_GROUPS.filter(group => group.category === templateFilter),
  [templateFilter]);

  const activeTemplate =
    WATERMARK_TEMPLATES.find((t) => t.id === config.templateId) ??
    WATERMARK_TEMPLATES.find((t) => t.id === 'timemark')!;
  const isLegacyTimemark = activeTemplate.group === 'timemark-legacy' &&
    activeTemplate.id !== 'timemark' && activeTemplate.id !== 'none';

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
              {TEMPLATE_CATALOG_GROUPS.length} Kiểu dấu
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
            {TEMPLATE_CATALOG_GROUPS.length} Kiểu dấu
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
        <WatermarkOverlay config={effectiveConfig} />
        {subTab==='customize'&&config.logoPosition==='custom'&&
          (config.templateId==='timemark'?config.timemarkLogoEnabled:config.showLogo)&&
          <div aria-label="Kéo để đổi vị trí logo" role="slider" aria-valuenow={config.logoCustomPos?.xPct??85}
            tabIndex={0} className="absolute inset-0 z-30 cursor-crosshair touch-none"
            onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);const b=e.currentTarget.getBoundingClientRect();
              onChangeConfig({logoCustomPos:{xPct:Math.min(100,Math.max(0,Math.round((e.clientX-b.left)/b.width*100))),yPct:Math.min(100,Math.max(0,Math.round((e.clientY-b.top)/b.height*100)))}});}}
            onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const b=e.currentTarget.getBoundingClientRect();
              onChangeConfig({logoCustomPos:{xPct:Math.min(100,Math.max(0,Math.round((e.clientX-b.left)/b.width*100))),yPct:Math.min(100,Math.max(0,Math.round((e.clientY-b.top)/b.height*100)))}});}}
            onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
            onKeyDown={e=>{const p=config.logoCustomPos||{xPct:85,yPct:15};if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
              e.preventDefault();onChangeConfig({logoCustomPos:{xPct:Math.max(0,Math.min(100,p.xPct+(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0))),yPct:Math.max(0,Math.min(100,p.yPct+(e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0)))}});}}>
            <span className="absolute left-2 top-2 rounded bg-[#081426]/75 px-2 py-1 text-[11px] text-[#E2B74B]">Kéo để đặt logo</span>
          </div>}
      </div>

      {/* Choose ONE original Timemark; group duplicate HNL layouts as variants. */}
      {subTab === 'templates' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hnl-scroll">
            {[
              { id: 'all', label: `Tất cả (${TEMPLATE_CATALOG_GROUPS.length})` },
              { id: 'timemark', label: 'Timemark gốc (1)' },
              { id: 'simple', label: 'Chỉ ngày / giờ (3)' },
              { id: 'independent', label: '6 Kiểu HNL' },
              { id: 'none', label: 'Không dấu' },
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
          {isLegacyTimemark && (
            <p role="status" className="rounded-xl bg-[#17253D] px-3 py-2 text-xs text-[#CBD5E1]">
              Ảnh cũ đang dùng “{activeTemplate.name}”. Dữ liệu mẫu cũ được giữ nguyên;
              các ảnh mới chỉ có một mẫu Timemark gốc để chọn.
            </p>
          )}
          <p className="text-[11px] text-[#94A3B8]">
            Chỉ giữ TM-01 Timemark Verified. Các mẫu HNL dùng chung bố cục được gom thành
            nhóm; chọn tên biến thể bên dưới nếu cần. Mã mẫu cũ vẫn đọc được khi khôi phục ZIP.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-start">
            {visibleCatalog.map((group, idx) => {
              const variants = group.templateIds.map(id =>
                WATERMARK_TEMPLATES.find(template => template.id === id)!);
              const selected = group.templateIds.includes(config.templateId);
              const preview = selected
                ? variants.find(template => template.id === config.templateId)!
                : variants[0];
              const thumbBg = [DEMO_IMAGES.rearConstruction, DEMO_IMAGES.surveyGreen,
                DEMO_IMAGES.nightInspection, DEMO_IMAGES.coastalTravel][idx % 4];
              const selectTemplate = (tpl: typeof preview) => onChangeConfig({
                templateId: tpl.id,
                accentColor: tpl.accentHex,
                ...(group.category === 'simple' ? {showLogo:false} : {}),
              });
              return (
                <div key={group.id} className={`rounded-2xl overflow-hidden bg-[#111C30] border ${
                  selected ? 'border-[#E2B74B] ring-1 ring-[#E2B74B]/60' : 'border-white/[0.08]'
                }`}>
                  <button type="button" onClick={() => selectTemplate(variants[0])}
                    aria-label={`Chọn kiểu ${group.title}`}
                    className="text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2B74B]">
                    <div className="relative aspect-[4/3] bg-[#060B14] overflow-hidden">
                      <img src={thumbBg} alt={group.title} referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" />
                      <WatermarkOverlay compact config={{...effectiveConfig,
                        templateId:preview.id, accentColor:preview.accentHex,
                        positionPreset:'bottom-left'}} />
                      {selected && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#E2B74B] text-[#060B14] flex items-center justify-center shadow">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>}
                    </div>
                    <div className="p-2.5 space-y-0.5">
                      <div className="text-[13px] font-semibold text-[#F8FAFC]">{group.title}</div>
                      <div className="text-[11px] text-[#94A3B8]">{group.description}</div>
                    </div>
                  </button>
                  {variants.length > 1 && (
                    <div className="flex flex-wrap gap-1 px-2.5 pb-2.5" aria-label={`Biến thể ${group.title}`}>
                      {variants.map(variant => (
                        <button key={variant.id} type="button" onClick={() => selectTemplate(variant)}
                          aria-pressed={config.templateId===variant.id}
                          className={`rounded-lg border px-2 py-1.5 text-[11px] min-h-8 ${
                            config.templateId === variant.id
                              ? 'border-[#E2B74B] text-[#E2B74B] bg-[#17253D]'
                              : 'border-white/10 text-[#CBD5E1] hover:border-white/30'
                          }`}>{variant.name}</button>
                      ))}
                    </div>
                  )}
                </div>
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
            subtitle={config.locationSource==='none'?'Không hiển thị':config.locationSource==='photo'?'GPS từ ảnh gốc':config.locationSource==='device'?'GPS điện thoại':config.locationText||'Nhập địa chỉ thủ công'}
            isOpen={openAccordion === 'location'}
            onToggle={() => toggleAcc('location')}
          >
            <div className="space-y-2">
              <select value={config.locationSource||'manual'}
                onChange={e=>onChangeConfig({locationSource:e.target.value as WatermarkConfig['locationSource']})}
                aria-label="Nguồn vị trí của ảnh"
                className="w-full h-9 px-2.5 rounded-lg bg-[#111C30] border border-white/[0.07] text-[13px] text-[#F8FAFC]">
                <option value="manual">Nhập vị trí thủ công</option>
                <option value="photo">GPS từ ảnh đã chọn (EXIF JPEG nếu có)</option>
                <option value="device">GPS hiện tại từ điện thoại (xin quyền)</option>
                <option value="none">Ẩn vị trí trên dấu</option>
              </select>
              {config.locationSource==='photo'&&<p className="text-[11px] text-[#CBD5E1]">
                {activeMedia?.coordinates?`GPS ảnh đang chọn: ${activeMedia.coordinates}`:'Ảnh này không có GPS EXIF đọc được; không tự gán vị trí khác.'}
              </p>}
              {config.locationSource==='device'&&<div className="space-y-1">
                <button type="button" disabled={gpsBusy} onClick={()=>void fetchGps()} className="min-h-10 w-full rounded-lg bg-[#17253D] border border-[#E2B74B]/40 text-[#E2B74B] text-xs">
                  {gpsBusy?'Đang lấy GPS…':'Lấy GPS từ điện thoại (cấp quyền khi được hỏi)'}</button>
                <p className="text-[11px] text-[#CBD5E1]">{config.coordinates||'Chưa có GPS; ứng dụng không tự điền tọa độ.'}</p>
                {gpsError&&<p role="alert" className="text-xs text-red-300">{gpsError}</p>}
              </div>}
              <input
                type="text"
                disabled={config.locationSource==='photo'||config.locationSource==='none'}
                value={config.locationText}
                onChange={(e) => onChangeConfig({ locationText: e.target.value })}
                placeholder="Nhập địa chỉ hiện trường..."
                className="w-full h-9 px-2.5 rounded-lg bg-[#111C30] border border-white/[0.07] text-[13px] text-[#F8FAFC]"
              />
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={effectiveConfig.coordinates}
                  disabled={config.locationSource==='photo'||config.locationSource==='none'}
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
              {FONT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <p className="mt-2 text-[12px] text-[#CBD5E1]" style={{fontFamily:watermarkFontFamily(config.fontKey)}}>
              12:30 · 14/11/2026 · Tiếng Việt có dấu · Timemark
            </p>
            <p className="mt-1 text-[11px] text-[#94A3B8]">Font HNL được đóng gói offline; các font hệ thống hiển thị theo thiết bị.</p>
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

          {/* Optional Timemark logo is OFF by default; other templates preserve original toggle. */}
          <AccordionSection
            title="7. Logo độc lập – 4 góc / tự kéo"
            subtitle={(config.templateId==='timemark' ? config.timemarkLogoEnabled : config.showLogo) ? 'Đang hiển thị · Có thể thay ảnh, đổi vị trí' : 'Đang ẩn'}
            isOpen={openAccordion === 'logo'}
            onToggle={() => toggleAcc('logo')}
          >
            <div className="space-y-3">
              <label className="flex items-center gap-3 rounded-lg px-3 py-2 bg-[#111C30] border border-white/[0.07]">
                <input type="checkbox"
                  checked={config.templateId==='timemark' ? !!config.timemarkLogoEnabled : config.showLogo}
                  onChange={e => onChangeConfig(config.templateId==='timemark' ? {timemarkLogoEnabled:e.target.checked} : {showLogo:e.target.checked})}
                  className="accent-[#E2B74B] w-4 h-4" />
                <span className="text-[13px]">Hiển thị logo trên ảnh / video</span>
              </label>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 bg-[#111C30] border border-white/[0.07]">
                {config.logoImageDataUrl
                  ? <img src={logoSrc(config)} alt="Logo tùy chỉnh" className="w-12 h-12 object-contain rounded-md" />
                  : <HnlLogoPlaceholder size="md" />}
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="block text-[12px] text-[#CBD5E1]">{config.logoImageDataUrl?'Logo ảnh đã chọn':'Logo HNL mặc định (tùy chọn)'}</span>
                  <label className="inline-flex min-h-9 px-3 items-center rounded-lg border border-[#E2B74B]/40 text-[#E2B74B] text-xs cursor-pointer">
                    {logoBusy?'Đang xử lý logo…':'Thay logo từ máy'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={logoBusy}
                      className="hidden" onChange={e=>{void changeLogoFile(e.target.files?.[0]);e.currentTarget.value='';}} />
                  </label>
                  {config.logoImageDataUrl&&<button type="button" onClick={()=>onChangeConfig({logoImageDataUrl:undefined})}
                    className="ml-2 text-xs text-[#94A3B8] underline">Dùng logo HNL</button>}
                </div>
              </div>
              {logoError&&<p role="alert" className="text-xs text-[#FDA4AF]">{logoError}</p>}
              <label className="block space-y-1">
                <span className="text-xs text-[#94A3B8]">Vị trí logo</span>
                <select value={config.logoPosition||'top-right'}
                  onChange={e=>onChangeConfig({logoPosition:e.target.value as WatermarkPositionPreset})}
                  className="w-full h-9 rounded-lg bg-[#111C30] text-[13px] border border-white/[0.07] px-2">
                  <option value="top-left">Trên trái</option>
                  <option value="top-right">Trên phải</option>
                  <option value="bottom-left">Dưới trái</option>
                  <option value="bottom-right">Dưới phải</option>
                  <option value="bottom-center">Dưới giữa</option>
                  <option value="custom">Tùy chỉnh tọa độ X/Y</option>
                </select>
              </label>
              {config.logoPosition==='custom'&&<div className="space-y-2">
                {(['xPct','yPct'] as const).map(axis=><label key={axis} className="flex items-center gap-2">
                  <span className="w-8 text-xs text-[#94A3B8]">{axis==='xPct'?'X':'Y'}</span>
                  <input type="range" min={0} max={100} step={1} className="flex-1 accent-[#E2B74B]"
                    value={config.logoCustomPos?.[axis]??(axis==='xPct'?85:15)}
                    onChange={e=>onChangeConfig({logoCustomPos:{xPct:config.logoCustomPos?.xPct??85,yPct:config.logoCustomPos?.yPct??15,[axis]:Number(e.target.value)}})} />
                  <span className="w-10 text-right text-xs text-[#E2B74B]">{config.logoCustomPos?.[axis]??(axis==='xPct'?85:15)}%</span>
                </label>)}
              </div>}
              <label className="flex items-center gap-2">
                <span className="text-xs text-[#94A3B8] whitespace-nowrap">Cỡ logo</span>
                <input type="range" min={4} max={30} step={1} className="flex-1 accent-[#E2B74B]"
                  value={config.logoSizePct??12} onChange={e=>onChangeConfig({logoSizePct:Number(e.target.value)})}/>
                <span className="w-10 text-right text-xs text-[#E2B74B]">{config.logoSizePct??12}%</span>
              </label>
              <p className="text-[11px] text-[#94A3B8]">Logo Timemark được ẩn mặc định. File gốc không bị sửa; logo được đóng vào bản ảnh/video xuất mới.</p>
            </div>
          </AccordionSection>

          {/* 8. Vị trí watermark */}
          <AccordionSection
            title="8. Vị trí chữ dấu thời gian"
            subtitle={`Đặt chữ tại: ${config.positionPreset}`}
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
              <div className="sm:col-span-2 space-y-2 pt-1 border-t border-white/10">
                <label className="block text-[12px] text-[#CBD5E1]">Định dạng video khi quay hoặc chèn dấu</label>
                <select value={config.videoFormat||'auto'} onChange={e=>onChangeConfig({videoFormat:e.target.value as WatermarkConfig['videoFormat']})}
                  aria-label="Định dạng xuất video" className="w-full h-9 rounded-lg px-2 bg-[#111C30] text-[#F8FAFC] border border-white/[0.07] text-[13px]">
                  <option value="auto">Tự động – MP4 nếu mã hóa được, nếu không WebM</option>
                  <option value="mp4">MP4 – bắt buộc hỗ trợ H.264/AAC</option>
                  <option value="webm">WebM – VP8/Opus</option>
                </select>
                <p className="text-[11px] text-[#94A3B8]">Thiết bị không hỗ trợ MP4 sẽ báo rõ lỗi, không đổi đuôi WebM thành MP4.</p>
                <label className="block text-[12px] text-[#CBD5E1]">Nơi lưu ảnh/video</label>
                <p className="text-[12px] text-[#E2B74B]">{saveLocation}</p>
                {isAndroidApk()?<div className="flex gap-2">
                  <button type="button" onClick={pickSaveFolder} className="min-h-10 px-3 rounded-lg border border-[#E2B74B]/40 bg-[#17253D] text-[#E2B74B] text-xs">Chọn thư mục / thẻ SD</button>
                  <button type="button" onClick={()=>{clearSaveLocation();setSaveLocation(getSaveLocationLabel());}} className="min-h-10 px-3 rounded-lg border border-white/10 text-white text-xs">Về bộ nhớ trong</button>
                </div>:<p className="text-[11px] text-[#94A3B8]">Trình duyệt Web sẽ dùng vị trí tải xuống do trình duyệt quản lý.</p>}
              </div>
            </div>
          </AccordionSection>
        </div>
      )}
    </div>
  );
};
