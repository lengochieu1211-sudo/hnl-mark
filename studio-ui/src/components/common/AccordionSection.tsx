import React from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionSectionProps {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <div className="border-b border-white/[0.08]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full min-h-[48px] py-2.5 px-1 flex items-center justify-between gap-3 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2B74B]/70 rounded-lg"
      >
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium text-[#F8FAFC] truncate">{title}</div>
          {subtitle && (
            <div className="text-[12px] text-[#94A3B8] truncate mt-0.5">{subtitle}</div>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#94A3B8] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#E2B74B]' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="pb-3.5 pt-1 px-1 space-y-2.5">
          {children}
        </div>
      )}
    </div>
  );
};
