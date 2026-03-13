import React, { useRef, useCallback } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Disc3 } from 'lucide-react';

interface SideBPromptModalProps {
  isOpen: boolean;
  onScanA: () => void;
  onSkip: () => void;
}

const SideBPromptModal: React.FC<SideBPromptModalProps> = ({ isOpen, onScanA, onSkip }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnSkip = useCallback(onSkip, [onSkip]);
  useFocusTrap(modalRef, stableOnSkip);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="side-b-prompt-heading"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-th-bg/95 p-4 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="relative w-full max-w-md glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] animate-in zoom-in-95 duration-500">
        {/* Body */}
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#dd6e42]/10 flex items-center justify-center">
            <Disc3 className="w-8 h-8 text-[#dd6e42]" />
          </div>
          <h2
            id="side-b-prompt-heading"
            className="font-label text-[#dd6e42] font-bold tracking-widest text-sm uppercase"
          >
            Got Side B!
          </h2>
          <p className="text-th-text3 text-sm leading-relaxed">
            We captured Side B. Scan Side A to complete the picture, or skip to save with what we have.
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-th-surface/[0.10] flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 border border-th-surface/[0.10] text-th-text font-bold py-3 rounded-xl hover:bg-th-surface/[0.08] transition-all uppercase tracking-[0.2em] text-[10px]"
          >
            Skip, save anyway
          </button>
          <button
            onClick={onScanA}
            className="flex-1 bg-[#dd6e42] text-th-text font-bold py-3 rounded-xl hover:bg-[#c45a30] transition-all uppercase tracking-[0.2em] text-[10px]"
          >
            Scan Side A
          </button>
        </div>
      </div>
    </div>
  );
};

export default SideBPromptModal;
