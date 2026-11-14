import React from 'react';

interface HnlLogoPlaceholderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'navy-gold' | 'transparent' | 'gold-solid';
  showPlaceholderNote?: boolean;
}

/**
 * Placeholder chính thức cho Logo HNL gốc.
 * Kỹ sư tích hợp thay thế component này bằng asset SVG/PNG HNL gốc từ nhánh dev.
 * Tuyệt đối không tự bịa biến thể logo thương mại chính thức.
 */
export const HnlLogoPlaceholder: React.FC<HnlLogoPlaceholderProps> = ({size='sm'}) => {
  const px=size==='xs'?24:size==='sm'?32:size==='md'?40:48;
  return <img src="./hnl-logo-192.png" alt="HNL" width={px} height={px}
    className="inline-block shrink-0 object-contain rounded-lg" loading="eager" />;
};

/**
 * Khung kiểm thử Android Adaptive Icon (vùng an toàn 66%, nền xanh navy đậm, không viền trắng/kem dày).
 */
export const AndroidAdaptiveIconPreview: React.FC = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-2">
      <div className="flex items-center gap-3 shrink-0">
        {/* Adaptive Icon Square Mask */}
        <div
          className="relative w-20 h-20 rounded-[22%] bg-[#091528] flex items-center justify-center overflow-hidden shadow-lg"
          aria-label="Xem trước Android Adaptive Icon dạng bo góc"
        >
          {/* 66% Safe Zone indicator */}
          <div className="w-[66%] h-[66%] rounded-full border border-dashed border-[#E2B74B]/35 flex flex-col items-center justify-center">
            <svg
              viewBox="0 0 40 34"
              className="w-8 h-7 text-[#E2B74B]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M14.5 4L12 7.5H7.5C5.29 7.5 3.5 9.29 3.5 11.5V27.5C3.5 29.71 5.29 31.5 7.5 31.5H32.5C34.71 31.5 36.5 29.71 36.5 27.5V11.5C36.5 9.29 34.71 7.5 32.5 7.5H28L25.5 4H14.5Z"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
              <circle cx="20" cy="19.5" r="5.5" stroke="currentColor" strokeWidth="2.2" />
              <text
                x="20"
                y="21.2"
                textAnchor="middle"
                fill="#F8FAFC"
                fontSize="5.2"
                fontWeight="700"
                fontFamily="sans-serif"
              >
                HNL
              </text>
            </svg>
          </div>
        </div>

        {/* Circular Launcher Mask */}
        <div
          className="relative w-20 h-20 rounded-full bg-[#091528] flex items-center justify-center overflow-hidden shadow-lg"
          aria-label="Xem trước Android Adaptive Icon dạng tròn"
        >
          <div className="w-[66%] h-[66%] rounded-full border border-dashed border-[#E2B74B]/35 flex flex-col items-center justify-center">
            <svg
              viewBox="0 0 40 34"
              className="w-8 h-7 text-[#E2B74B]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M14.5 4L12 7.5H7.5C5.29 7.5 3.5 9.29 3.5 11.5V27.5C3.5 29.71 5.29 31.5 7.5 31.5H32.5C34.71 31.5 36.5 29.71 36.5 27.5V11.5C36.5 9.29 34.71 7.5 32.5 7.5H28L25.5 4H14.5Z"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
              <circle cx="20" cy="19.5" r="5.5" stroke="currentColor" strokeWidth="2.2" />
              <text
                x="20"
                y="21.2"
                textAnchor="middle"
                fill="#F8FAFC"
                fontSize="5.2"
                fontWeight="700"
                fontFamily="sans-serif"
              >
                HNL
              </text>
            </svg>
          </div>
        </div>
      </div>

      <div className="text-xs text-[#94A3B8] leading-relaxed space-y-1">
        <p className="text-[#F8FAFC] font-medium">
          Chuẩn Android Adaptive Icon (108×108dp · Vùng an toàn 66%)
        </p>
        <p>
          Nền xanh navy đậm #091528 tràn viền, không viền trắng/kem dày, cụm camera nằm gọn trong vòng an toàn để không bị cắt trên launcher. Thay chữ HNL bằng vector logo gốc khi bàn giao.
        </p>
      </div>
    </div>
  );
};
