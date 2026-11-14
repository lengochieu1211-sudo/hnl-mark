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
