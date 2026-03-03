
import React, { useRef, useCallback } from 'react';
import { Album } from '../types';
import { proxyImageUrl } from '../services/imageProxy';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { CONDITION_GRADES } from '../../constants/conditionGrades';

interface DuplicateAlbumModalProps {
  existingAlbum: Album;
  onAddAnyway: () => void;
  onCancel: () => void;
}

const DuplicateAlbumModal: React.FC<DuplicateAlbumModalProps> = ({
  existingAlbum,
  onAddAnyway,
  onCancel,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnCancel = useCallback(onCancel, [onCancel]);
  useFocusTrap(modalRef, stableOnCancel);

  const conditionLabel = CONDITION_GRADES.find(
    g => g.value === existingAlbum.condition
  )?.label || existingAlbum.condition || 'Not Graded';

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Duplicate album detected"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-th-bg/95 p-4 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="w-full max-w-md glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] animate-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="p-6 pb-0 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#6a8c9a]/10">
            <svg className="w-6 h-6 text-[#6a8c9a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-th-text mb-1">Already in Your Crate</h2>
          <p className="text-sm text-th-text3">
            This album is already in your collection. Different pressing or edition?
          </p>
        </div>

        {/* Existing Album Preview */}
        <div className="p-6">
          <div className="flex gap-4 items-center p-4 rounded-2xl bg-th-surface/[0.04] border border-th-surface/[0.08]">
            <img
              src={proxyImageUrl(existingAlbum.cover_url)}
              alt={`Album cover for ${existingAlbum.title} by ${existingAlbum.artist}`}
              loading="lazy"
              className="w-20 h-20 rounded-lg object-cover shadow-lg flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/vinyl/400/400';
              }}
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-th-text truncate">{existingAlbum.title}</h3>
              <p className="text-[#dd6e42] text-sm font-medium truncate">{existingAlbum.artist}</p>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-th-text3 uppercase tracking-widest">
                {existingAlbum.year && <span>{existingAlbum.year}</span>}
                {existingAlbum.year && existingAlbum.condition && <span className="text-th-text3/50">·</span>}
                {existingAlbum.condition && <span>{conditionLabel}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-th-surface/[0.10] text-th-text font-bold py-3 rounded-xl hover:bg-th-surface/[0.08] transition-all uppercase tracking-[0.2em] text-[10px]"
          >
            Cancel
          </button>
          <button
            onClick={onAddAnyway}
            className="flex-1 bg-[#dd6e42] text-th-text font-bold py-3 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px]"
          >
            Add Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateAlbumModal;
