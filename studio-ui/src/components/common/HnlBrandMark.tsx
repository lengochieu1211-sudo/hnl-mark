import React from 'react';
interface HnlLogoPlaceholderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'navy-gold' | 'transparent' | 'gold-solid';
  showPlaceholderNote?: boolean;
}
/** Preserve the original HNL brand artwork. */
export const HnlLogoPlaceholder: React.FC<HnlLogoPlaceholderProps> = ({size='sm'}) => {
  const px=size==='xs'?24:size==='sm'?32:size==='md'?40:48;
  return <img src="./hnl-logo-192.png" alt="HNL" width={px} height={px}
    className="inline-block shrink-0 object-contain rounded-lg" loading="eager" />;
};
/** Launcher masks visualized using real HNL assets, not a made-up icon. */
export const AndroidAdaptiveIconPreview: React.FC = () => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-2">
    <div className="flex items-center gap-3 shrink-0">
      <div className="w-20 h-20 rounded-[23%] overflow-hidden border border-white/10 bg-[#091528]"
        aria-label="Logo HNL trong khung bo góc">
        <img src="./hnl-logo-192.png" alt="Logo HNL gốc, khung bo góc" className="w-full h-full object-cover" />
      </div>
      <div className="w-20 h-20 rounded-full overflow-hidden border border-white/10 bg-[#091528]"
        aria-label="Logo HNL trong khung tròn">
        <img src="./hnl-logo-192.png" alt="Logo HNL gốc, khung tròn" className="w-full h-full object-cover" />
      </div>
    </div>
    <p className="text-xs text-[#94A3B8] leading-relaxed">
      Logo HNL gốc. Hiệu ứng bo góc và vùng cắt cần kiểm tra trên launcher Android/MIUI thực tế.
    </p>
  </div>
);
