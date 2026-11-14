import React from 'react';
import { Keyboard, MonitorSmartphone, X } from 'lucide-react';
import { ViewportPreset } from '../../types/hnl';
import { VIEWPORT_PRESETS } from '../../data/templates';

interface ViewportTesterModalProps {
  isOpen: boolean;
  activePreset: ViewportPreset;
  simulateKeyboard: boolean;
  onSelectPreset: (preset: ViewportPreset) => void;
  onToggleKeyboard: () => void;
  onClose: () => void;
}

export const ViewportTesterModal: React.FC<ViewportTesterModalProps> = ({
  isOpen,
  activePreset,
  simulateKeyboard,
  onSelectPreset,
  onToggleKeyboard,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#0D1729] border border-white/15 shadow-2xl overflow-hidden"
      >
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4 text-[#E2B74B]" />
            <h2 className="text-[15px] font-semibold text-[#F8FAFC]">
              Kiểm thử Responsive &amp; Bàn phím Android
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 text-[#94A3B8]"
            aria-label="Đóng kiểm thử viewport"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto hnl-scroll">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {VIEWPORT_PRESETS.map((preset) => {
              const selected = preset.id === activePreset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onSelectPreset(preset);
                    onClose();
                  }}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-left transition ${
                    selected
                      ? 'bg-[#E2B74B]/18 border-[#E2B74B] text-[#E2B74B]'
                      : 'bg-[#111C30] border-white/[0.08] text-[#F8FAFC] hover:bg-[#17253D]'
                  }`}
                >
                  <div className="text-xs font-semibold font-mono-tabular">{preset.label}</div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onToggleKeyboard}
              className={`w-full min-h-[46px] px-3.5 rounded-xl border flex items-center justify-between text-xs font-medium transition ${
                simulateKeyboard
                  ? 'bg-[#E2B74B]/18 border-[#E2B74B] text-[#E2B74B]'
                  : 'bg-[#111C30] border-white/[0.08] text-[#F8FAFC]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                <span>Mô phỏng Bàn phím Android đang mở (240px)</span>
              </span>
              <span className="font-mono-tabular font-bold">
                {simulateKeyboard ? 'ĐANG BẬT' : 'TẮT'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
