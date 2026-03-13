
import React, { useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface AddGearMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectUpload: () => void;
  onSelectManual: () => void;
}

const AddGearMethodModal: React.FC<AddGearMethodModalProps> = ({
  isOpen,
  onClose,
  onSelectCamera,
  onSelectUpload,
  onSelectManual,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, onClose);

  if (!isOpen) return null;

  const handleSelect = (handler: () => void) => {
    onClose();
    handler();
  };

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Add gear to Stakkd"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-th-bg/95 p-4 md:p-8 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] animate-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-th-surface/[0.10]">
          <h2 className="font-label text-sk-accent font-bold tracking-widest text-sm uppercase">
            Add Gear
          </h2>
          <button
            onClick={onClose}
            className="text-th-text2 hover:text-th-text transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Method cards */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Scan with Camera */}
          <button
            onClick={() => handleSelect(onSelectCamera)}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-th-surface/[0.10] bg-th-surface/[0.03] hover:bg-th-surface/[0.08] hover:border-th-surface/[0.25] transition-all text-center group"
          >
            <svg className="w-8 h-8 text-sk-accent/70 group-hover:text-sk-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <span className="text-th-text text-xs font-bold uppercase tracking-widest">Scan</span>
            <span className="text-th-text3 text-[10px] leading-relaxed">Point your camera at any gear</span>
          </button>

          {/* Upload a Photo */}
          <button
            onClick={() => handleSelect(onSelectUpload)}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-th-surface/[0.10] bg-th-surface/[0.03] hover:bg-th-surface/[0.08] hover:border-th-surface/[0.25] transition-all text-center group"
          >
            <svg className="w-8 h-8 text-sk-accent/70 group-hover:text-sk-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-th-text text-xs font-bold uppercase tracking-widest">Upload</span>
            <span className="text-th-text3 text-[10px] leading-relaxed">Use a photo from your library</span>
          </button>

          {/* Add Manually */}
          <button
            onClick={() => handleSelect(onSelectManual)}
            className="relative flex flex-col items-center gap-2 p-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] hover:bg-amber-500/[0.12] hover:border-amber-500/40 transition-all text-center group"
          >
            <span className="absolute -top-2 right-2 bg-emerald-500 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">Recommended</span>
            <svg className="w-8 h-8 text-amber-400/70 group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            <span className="text-amber-300 text-xs font-bold uppercase tracking-widest">Manual</span>
            <span className="text-th-text3 text-[10px] leading-relaxed">Enter brand, model, and details</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddGearMethodModal;
