import React from 'react';

interface HnlLogoPlaceholderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'navy-gold' | 'transparent' | 'gold-solid';
  showPlaceholderNote?: boolean;
}

/**
 * Display the same original artwork and visible crop as the Android launcher:
 * trim 19px from each side of the 512px original, use 98% of the canvas,
 * then apply a 14.5% rounded-corner mask. No logo color or artwork edits.
 */
export const HnlLogoPlaceholder: React.FC<HnlLogoPlaceholderProps> = ({size='sm'}) => {
  const px=size==='xs'?24:size==='sm'?32:size==='md'?40:48;
  return (
    <span role="img" aria-label="HNL"
      className="inline-flex shrink-0 items-center justify-center"
      style={{width:px,height:px}}>
      <span className="relative block overflow-hidden"
        style={{width:'98%',height:'98%',borderRadius:'14.5%'}}>
        <img src="./hnl-logo-512.png" alt="" loading="eager"
          className="absolute block max-w-none"
          style={{width:'108.0169%',height:'108.0169%',left:'-4.00845%',top:'-4.00845%'}} />
      </span>
    </span>
  );
};
