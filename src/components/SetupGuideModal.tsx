
import React, { useRef, useCallback, useState } from 'react';
import { SetupGuide } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';
import SpinningRecord from './SpinningRecord';

interface SetupGuideModalProps {
  guide: SetupGuide | null;
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (name: string) => Promise<void>;
  onDownloadPdf?: () => Promise<void>;
}

const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ guide, loading, isOpen, onClose, onSave, onDownloadPdf }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);

  // Save UI state
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('My Setup Guide');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleSave = async () => {
    if (!onSave || !saveName.trim()) return;
    setSaving(true);
    setSaveError(false);
    try {
      await onSave(saveName.trim());
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowSaveInput(false);
      }, 2000);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!onDownloadPdf || downloading) return;
    setDownloading(true);
    try {
      await onDownloadPdf();
    } catch {
      // error handling is in the parent
    } finally {
      setDownloading(false);
    }
  };

  const handleCancelSave = () => {
    setShowSaveInput(false);
    setSaveError(false);
    setSaveName('My Setup Guide');
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Setup guide for your signal chain"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-th-bg/95 p-2 md:p-8 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="relative w-full max-w-2xl max-h-[98vh] md:max-h-[95vh] glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] flex flex-col animate-in zoom-in-95 duration-500">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-th-bg/50 text-th-text flex items-center justify-center hover:bg-th-text hover:text-th-bg transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="p-6 pb-0 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-label text-lg md:text-2xl font-bold tracking-tighter text-th-text">
                How to Connect
              </h2>
              <p className="text-th-text3 text-[10px] uppercase tracking-widest mt-1">
                Setup Guide
              </p>
            </div>
            {!loading && guide && !showSaveInput && !saveSuccess && (
              <div className="ml-auto mr-12 flex items-center gap-2">
                {onDownloadPdf && (
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="inline-flex items-center gap-1.5 bg-[#dd6e42] text-th-text font-bold py-1.5 px-3 rounded-lg hover:bg-[#c45e38] transition-all uppercase tracking-[0.15em] text-[9px] disabled:opacity-40"
                  >
                    {downloading ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    )}
                    PDF
                  </button>
                )}
                {onSave && (
                  <button
                    onClick={() => setShowSaveInput(true)}
                    className="inline-flex items-center gap-1.5 border border-th-surface/[0.15] text-th-text3 font-bold py-1.5 px-3 rounded-lg hover:border-th-surface/[0.3] hover:text-th-text2 transition-all uppercase tracking-[0.15em] text-[9px]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                    </svg>
                    Save
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Save input bar */}
        {showSaveInput && (
          <div className="mx-6 mt-4 flex items-center gap-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Guide name"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancelSave(); }}
              className="flex-1 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-3 py-2 text-sm text-th-text placeholder:text-th-text3/50 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50"
            />
            <button
              onClick={handleSave}
              disabled={saving || !saveName.trim()}
              className="inline-flex items-center gap-1.5 bg-[#dd6e42] text-th-text font-bold py-2 px-3 rounded-lg hover:bg-[#c45e38] transition-all uppercase tracking-[0.15em] text-[9px] disabled:opacity-40"
            >
              {saving ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : 'Save'}
            </button>
            <button
              onClick={handleCancelSave}
              className="text-th-text3 hover:text-th-text transition-colors text-[9px] uppercase tracking-widest font-bold py-2 px-2"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Save success indicator */}
        {saveSuccess && (
          <div className="mx-6 mt-4 flex items-center gap-2 text-green-400 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Guide saved
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <div className="mx-6 mt-2 text-red-400 text-xs">
            Failed to save
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

          {loading && (
            <div className="min-h-[40vh] flex flex-col items-center justify-center">
              <SpinningRecord size="w-20 h-20" />
              <p className="font-label text-[10px] tracking-widest mt-6 text-th-text3 uppercase">
                Analyzing your gear...
              </p>
            </div>
          )}

          {!loading && guide && (
            <>
              {/* Warnings */}
              {guide.warnings.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <h4 className="text-amber-400 text-[9px] font-label tracking-[0.3em] uppercase">Heads Up</h4>
                  </div>
                  <div className="space-y-2">
                    {guide.warnings.map((w, i) => (
                      <div key={i} className="glass-morphism rounded-xl border border-amber-400/15 p-3 text-sm text-th-text/80 leading-relaxed">
                        {w}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Signal Chain */}
              {guide.signal_chain.length > 0 && (
                <section>
                  <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-3">Signal Chain</h4>
                  <div className="space-y-0">
                    {guide.signal_chain.map((item, i) => (
                      <div key={i}>
                        <div className="glass-morphism rounded-xl border border-th-surface/[0.06] px-4 py-3 text-sm text-th-text font-medium flex items-center gap-3">
                          <span className="text-[#dd6e42] font-bold text-xs w-5 text-center flex-shrink-0">{i + 1}</span>
                          {item}
                        </div>
                        {i < guide.signal_chain.length - 1 && (
                          <div className="flex justify-center py-1">
                            <svg className="w-3 h-3 text-th-surface/[0.25]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Connections */}
              {guide.connections.length > 0 && (
                <section>
                  <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-3">Connections</h4>
                  <div className="space-y-3">
                    {guide.connections.map((conn, i) => (
                      <div key={i} className="glass-morphism rounded-xl border border-th-surface/[0.06] p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-th-text font-bold">{conn.from}</span>
                          <svg className="w-4 h-4 text-[#dd6e42] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                          <span className="text-th-text font-bold">{conn.to}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-block bg-[#dd6e42]/15 border border-[#dd6e42]/25 text-[#f0a882] text-[9px] font-label font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full">
                            {conn.cable_type}
                          </span>
                          <span className="text-th-text3/60 text-[10px] uppercase tracking-widest self-center">
                            {conn.connection_type}
                          </span>
                        </div>
                        {conn.notes && (
                          <p className="text-th-text/60 text-xs leading-relaxed mt-1">{conn.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Settings */}
              {guide.settings.length > 0 && (
                <section>
                  <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-3">Recommended Settings</h4>
                  <div className="glass-morphism rounded-xl border border-th-surface/[0.06] divide-y divide-th-surface/[0.06]">
                    {guide.settings.map((s, i) => (
                      <div key={i} className="p-4 space-y-1">
                        <div className="flex items-baseline justify-between gap-4">
                          <div>
                            <span className="text-th-text font-bold text-sm">{s.gear}</span>
                            <span className="text-th-text3/50 text-sm"> — {s.setting}</span>
                          </div>
                          <span className="text-[#f0a882] font-bold text-sm whitespace-nowrap">{s.recommended_value}</span>
                        </div>
                        <p className="text-th-text/50 text-xs leading-relaxed">{s.explanation}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Tips */}
              {guide.tips.length > 0 && (
                <section>
                  <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-3">Tips</h4>
                  <div className="space-y-2">
                    {guide.tips.map((tip, i) => (
                      <div key={i} className="flex gap-3 text-sm text-th-text/70 leading-relaxed">
                        <span className="text-[#dd6e42] font-bold flex-shrink-0 mt-0.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                          </svg>
                        </span>
                        {tip}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupGuideModal;
