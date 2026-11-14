import React from 'react';
import { MapPin } from 'lucide-react';
import { OrientationDeg, WatermarkConfig } from '../../types/hnl';
import { WATERMARK_TEMPLATES } from '../../data/templates';
import { HnlLogoPlaceholder } from '../common/HnlBrandMark';
import { OriginalTimemarkOverlay } from './OriginalTimemarkOverlay';

interface WatermarkOverlayProps {
  config: WatermarkConfig;
  orientationDeg?: OrientationDeg;
  compact?: boolean;
  draggable?: boolean;
  onDragPositionChange?: (pos: { xPct: number; yPct: number }) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function formatWatermarkDate(iso: string, format: WatermarkConfig['dateFormat']): {
  dateStr: string;
  timeStr: string;
  fullStr: string;
} {
  const d = iso ? new Date(iso) : new Date();
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(safeDate.getDate());
  const month = pad(safeDate.getMonth() + 1);
  const year = safeDate.getFullYear();
  const hh = pad(safeDate.getHours());
  const mm = pad(safeDate.getMinutes());
  const ss = pad(safeDate.getSeconds());

  const dateStr = `${day}/${month}/${year}`;
  const timeStr = `${hh}:${mm}:${ss}`;

  if (format === 'YYYY-MM-DD HH:mm') {
    return { dateStr: `${year}-${month}-${day}`, timeStr: `${hh}:${mm}`, fullStr: `${year}-${month}-${day} ${hh}:${mm}` };
  }
  if (format === 'HH:mm · DD/MM/YYYY') {
    return { dateStr, timeStr: `${hh}:${mm}`, fullStr: `${hh}:${mm} · ${dateStr}` };
  }
  return { dateStr, timeStr, fullStr: `${dateStr} ${timeStr}` };
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  config,
  orientationDeg = 0,
  compact = false,
  draggable = false,
  onDragPositionChange,
  containerRef,
}) => {
  if(config.templateId === 'timemark') return <OriginalTimemarkOverlay config={config} orientationDeg={orientationDeg} />;
  if(config.templateId === 'none') return null;

  const template =
    WATERMARK_TEMPLATES.find((t) => t.id === config.templateId) ?? WATERMARK_TEMPLATES[10];

  const { dateStr, timeStr, fullStr } = formatWatermarkDate(config.dateTimeIso, config.dateFormat);
  const photoCode = `${config.photoCodePrefix}-${String(config.photoCodeSeq).padStart(4, '0')}`;

  const fontFamilyStyle =
    config.fontKey === 'jetbrains'
      ? 'var(--hnl-font-mono)'
      : config.fontKey === 'jakarta'
        ? 'var(--hnl-font-display)'
        : config.fontKey === 'serif'
          ? 'Georgia, "Times New Roman", serif'
          : 'var(--hnl-font-sans)';

  const scaleFactor = compact ? 0.62 : 1;
  const baseFontSize = Math.max(9, Math.round(config.fontSizePx * scaleFactor));
  const accent = config.accentColor || template.accentHex;

  // Handle pointer dragging inside editor canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || !onDragPositionChange || !containerRef?.current) return;
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const rect = containerRef.current.getBoundingClientRect();

    const updatePos = (clientX: number, clientY: number) => {
      const rawX = ((clientX - rect.left) / rect.width) * 100;
      const rawY = ((clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.min(82, Math.max(4, Math.round(rawX)));
      const clampedY = Math.min(88, Math.max(6, Math.round(rawY)));
      onDragPositionChange({ xPct: clampedX, yPct: clampedY });
    };

    const onMove = (ev: PointerEvent) => updatePos(ev.clientX, ev.clientY);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Determine placement styles
  const isStripFooter = template.surfaceMode === 'strip-footer' && config.positionPreset !== 'custom';

  const getPositionStyle = (): React.CSSProperties => {
    if (orientationDeg === 90 || orientationDeg === -90 || orientationDeg === 180) {
      // Rotate about the viewport center instead of a corner; prevents watermark clipping.
      return { left:'50%',top:'50%',maxWidth:orientationDeg===180?'74%':'65%',
        transform:`translate(-50%, -50%) rotate(${orientationDeg}deg)`,transformOrigin:'center center' };
    }
    // 90°, -90° and 180° already returned above; the strip here is 0°.
    if (isStripFooter) return { bottom: 0, left: 0, right: 0 };

    if (config.positionPreset === 'custom') {
      return {
        left: `${config.customPos.xPct}%`,
        top: `${config.customPos.yPct}%`,
        transform: `translate(-10%, -50%) rotate(${orientationDeg}deg)`,
        maxWidth: '88%',
      };
    }

    const inset = compact ? '6px' : '12px';
    const baseStyle: React.CSSProperties = {
      maxWidth: compact ? '90%' : '86%',
    };

    if (config.positionPreset === 'top-left') {
      return { ...baseStyle, top: inset, left: inset, transform: `rotate(${orientationDeg}deg)` };
    }
    if (config.positionPreset === 'top-right') {
      return { ...baseStyle, top: inset, right: inset, transform: `rotate(${orientationDeg}deg)` };
    }
    if (config.positionPreset === 'bottom-right') {
      return { ...baseStyle, bottom: inset, right: inset, transform: `rotate(${orientationDeg}deg)` };
    }
    if (config.positionPreset === 'bottom-center') {
      return {
        ...baseStyle,
        bottom: inset,
        left: '50%',
        transform: `translateX(-50%) rotate(${orientationDeg}deg)`,
      };
    }
    // default bottom-left
    return { ...baseStyle, bottom: inset, left: inset, transform: `rotate(${orientationDeg}deg)` };
  };

  // Visual variations across the 22 templates
  const renderCardContent = () => {
    const logoNode = config.showLogo ? (
      <HnlLogoPlaceholder size={compact ? 'xs' : 'sm'} variant="navy-gold" />
    ) : null;

    if (template.surfaceMode === 'led-digital') {
      return (
        <div
          className="rounded-lg px-2.5 py-1.5 backdrop-blur-sm border border-white/10"
          style={{
            backgroundColor: `rgba(6, 11, 20, ${Math.max(0.55, config.bgOpacity)})`,
            fontFamily: 'var(--hnl-font-mono)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            {config.logoSide === 'left' && logoNode}
            <span
              className="font-bold tracking-wider tabular-nums"
              style={{ color: accent, fontSize: `${baseFontSize + 3}px` }}
            >
              {timeStr}
            </span>
            {config.logoSide === 'right' && logoNode}
          </div>
          <div
            className="text-[11px] tabular-nums opacity-95 mt-0.5"
            style={{ color: config.textColor, fontSize: `${Math.max(9, baseFontSize - 2)}px` }}
          >
            {dateStr} {config.showPhotoCode ? `· ${photoCode}` : ''}
          </div>
          {!compact && (
            <div className="text-[11px] text-slate-200/90 truncate mt-0.5">
              {config.locationText}
            </div>
          )}
        </div>
      );
    }

    if (template.surfaceMode === 'strip-footer') {
      return (
        <div
          className="w-full px-3 py-2 flex flex-wrap items-center justify-between gap-2 backdrop-blur-sm border-t border-white/15"
          style={{
            backgroundColor: `rgba(8, 16, 30, ${Math.max(0.75, config.bgOpacity)})`,
            transform: orientationDeg === 180 ? 'rotate(180deg)' : undefined,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {config.logoSide === 'left' && logoNode}
            <div className="min-w-0">
              <div
                className="font-semibold truncate"
                style={{ color: config.textColor, fontSize: `${baseFontSize}px` }}
              >
                {config.customTitle || template.name}
              </div>
              <div
                className="text-[#CBD5E1] truncate"
                style={{ fontSize: `${Math.max(9, baseFontSize - 2)}px` }}
              >
                {config.locationText}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right font-mono-tabular">
              <div style={{ color: accent, fontSize: `${baseFontSize}px` }} className="font-semibold">
                {fullStr}
              </div>
              {config.showPhotoCode && (
                <div style={{ fontSize: `${Math.max(9, baseFontSize - 3)}px` }} className="text-slate-300">
                  {photoCode}
                </div>
              )}
            </div>
            {config.logoSide === 'right' && logoNode}
          </div>
        </div>
      );
    }

    if (template.surfaceMode === 'minimal-text') {
      return (
        <div
          className="px-1.5 py-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.92)]"
          style={{ color: config.textColor }}
        >
          <div className="flex items-center gap-1.5">
            {config.logoSide === 'left' && logoNode}
            <span
              className="font-semibold font-mono-tabular"
              style={{ color: accent, fontSize: `${baseFontSize + 1}px` }}
            >
              {fullStr}
            </span>
            {config.logoSide === 'right' && logoNode}
          </div>
          <div
            className="opacity-95 truncate mt-0.5"
            style={{ fontSize: `${Math.max(9, baseFontSize - 1)}px` }}
          >
            {config.locationText}
          </div>
          {!compact && config.customNote && (
            <div
              className="opacity-85 truncate"
              style={{ fontSize: `${Math.max(9, baseFontSize - 2)}px` }}
            >
              {config.customNote}
            </div>
          )}
        </div>
      );
    }

    if (template.surfaceMode === 'stripe-gold') {
      return (
        <div
          className="rounded-lg overflow-hidden backdrop-blur-sm border border-white/15"
          style={{
            backgroundColor: `rgba(9, 19, 36, ${config.bgOpacity})`,
          }}
        >
          <div
            className="px-2.5 py-1 flex items-center justify-between gap-2 text-[#060B14] font-semibold"
            style={{ backgroundColor: accent, fontSize: `${Math.max(9, baseFontSize - 2)}px` }}
          >
            <span className="truncate">
              {template.isPlaceholder ? `${template.code} · Slot mẫu cũ` : template.name}
            </span>
            {config.showPhotoCode && <span className="font-mono-tabular shrink-0">{photoCode}</span>}
          </div>
          <div className="px-2.5 py-1.5 space-y-0.5" style={{ color: config.textColor }}>
            <div className="flex items-center gap-1.5">
              {config.logoSide === 'left' && logoNode}
              <span className="font-mono-tabular font-semibold" style={{ fontSize: `${baseFontSize}px` }}>
                {fullStr}
              </span>
              {config.logoSide === 'right' && logoNode}
            </div>
            <div
              className="flex items-start gap-1 text-slate-200"
              style={{ fontSize: `${Math.max(9, baseFontSize - 2)}px` }}
            >
              <MapPin className="w-3 h-3 shrink-0 mt-0.5" style={{ color: accent }} />
              <span className="line-clamp-1">{config.locationText}</span>
            </div>
            {!compact && (
              <div
                className="text-slate-300 truncate"
                style={{ fontSize: `${Math.max(9, baseFontSize - 2)}px` }}
              >
                {config.customTitle} · {config.inspectorName}
              </div>
            )}
          </div>
        </div>
      );
    }

    // glass-dark & badge-card
    return (
      <div
        className="rounded-xl px-2.5 py-2 backdrop-blur-md border border-white/15 shadow-lg"
        style={{
          backgroundColor: `rgba(10, 20, 38, ${config.bgOpacity})`,
          color: config.textColor,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {config.logoSide === 'left' && logoNode}
            <span
              className="font-semibold truncate"
              style={{ color: accent, fontSize: `${Math.max(9, baseFontSize - 1)}px` }}
            >
              {template.isPlaceholder ? template.name : config.customTitle || template.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {config.showPhotoCode && (
              <span
                className="font-mono-tabular text-slate-300"
                style={{ fontSize: `${Math.max(9, baseFontSize - 3)}px` }}
              >
                {photoCode}
              </span>
            )}
            {config.logoSide === 'right' && logoNode}
          </div>
        </div>

        <div
          className="font-mono-tabular font-semibold mt-1"
          style={{ fontSize: `${baseFontSize + 1}px` }}
        >
          {fullStr}
        </div>

        <div
          className="text-slate-200/95 truncate mt-0.5"
          style={{ fontSize: `${Math.max(9, baseFontSize - 2)}px` }}
        >
          {config.locationText}
        </div>

        {!compact && config.showCoordinates && (
          <div
            className="font-mono-tabular text-slate-300/85 mt-0.5 flex items-center gap-2"
            style={{ fontSize: `${Math.max(8.5, baseFontSize - 3)}px` }}
          >
            <span>{config.coordinates}</span>
            <span>·</span>
            <span className="truncate">{config.inspectorName}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      style={{
        ...getPositionStyle(),
        fontFamily: fontFamilyStyle,
        touchAction: draggable ? 'none' : 'auto',
      }}
      className={`absolute z-10 select-none transition-transform duration-200 ${
        draggable
          ? 'cursor-grab active:cursor-grabbing ring-1 ring-dashed ring-[#E2B74B]/80 rounded-xl'
          : 'pointer-events-none'
      }`}
    >
      {renderCardContent()}
    </div>
  );
};
