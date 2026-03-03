import React, { useRef, useCallback } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Camera, Search } from 'lucide-react';

interface ScanFailedModalProps {
  onTryAgain: () => void;
  onSearchManually: () => void;
  onClose: () => void;
}

const ScanFailedModal: React.FC<ScanFailedModalProps> = ({ onTryAgain, onSearchManually, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Identification failed"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-th-bg/95 p-4 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="relative w-full max-w-md glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] animate-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-th-surface/[0.10]">
          <h2 className="font-label text-[#dd6e42] font-bold tracking-widest text-sm uppercase">
            Not Identified
          </h2>
          <button
            onClick={onClose}
            className="text-th-text2 hover:text-th-text transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-th-surface/[0.06] flex items-center justify-center">
            <Camera className="w-8 h-8 text-th-text3/40" />
          </div>
          <p className="text-th-text text-sm leading-relaxed">
            We couldn't identify this one. Try a clearer photo or use manual search.
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-th-surface/[0.10] flex gap-3">
          <button
            onClick={onTryAgain}
            className="flex-1 inline-flex items-center justify-center gap-2 border border-th-surface/[0.10] text-th-text font-bold py-3 rounded-xl hover:bg-th-surface/[0.08] transition-all uppercase tracking-[0.2em] text-[10px]"
          >
            <Camera className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={onSearchManually}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#dd6e42] text-th-text font-bold py-3 rounded-xl hover:bg-[#c45a30] transition-all uppercase tracking-[0.2em] text-[10px]"
          >
            <Search className="w-4 h-4" />
            Search Manually
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanFailedModal;
