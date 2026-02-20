
import React, { useRef, useState, useCallback } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface GearUploadGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (images: { front: string; label?: string }) => void;
}

type UploadStep = 1 | 2 | 3;

/* ── Step indicator dots ───────────────────────────────────────── */
const StepDots: React.FC<{ current: UploadStep; frontUploaded: boolean; labelUploaded: boolean }> = ({
  current,
  frontUploaded,
  labelUploaded,
}) => (
  <div className="flex items-center gap-3" role="list" aria-label="Upload progress">
    {[1, 2, 3].map((step) => {
      const completed = (step === 1 && frontUploaded) || (step === 2 && labelUploaded) || false;
      const isCurrent = step === current;
      return (
        <div
          key={step}
          role="listitem"
          aria-label={`Step ${step}${isCurrent ? ', current' : ''}${completed ? ', completed' : ''}`}
          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
            completed
              ? 'bg-emerald-400'
              : isCurrent
              ? 'bg-[#dd6e42] scale-125'
              : 'border border-th-text3/40 bg-transparent'
          }`}
        >
          {completed && (
            <svg className="w-2.5 h-2.5 text-th-bg" viewBox="0 0 10 10" fill="currentColor">
              <path d="M8.5 3L4.2 7.3 1.5 4.6l.7-.7L4.2 5.9 7.8 2.3z" />
            </svg>
          )}
        </div>
      );
    })}
  </div>
);

/* ── Upload drop zone ──────────────────────────────────────────── */
const UploadZone: React.FC<{
  image: string | null;
  onFileSelect: (base64: string) => void;
  label: string;
  hint: string;
}> = ({ image, onFileSelect, label, hint }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      onFileSelect(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  if (image) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative w-full max-w-sm">
          <img
            src={image}
            alt={label}
            className="w-full rounded-2xl border-2 border-emerald-400 shadow-lg shadow-emerald-400/20"
          />
          <div className="absolute top-3 right-3 w-8 h-8 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`w-full max-w-sm aspect-[4/3] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 cursor-pointer ${
          isDragging
            ? 'border-[#dd6e42] bg-[#dd6e42]/10 scale-[1.02]'
            : 'border-th-surface/[0.20] hover:border-[#dd6e42]/50 hover:bg-th-surface/[0.04]'
        }`}
      >
        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
          isDragging ? 'bg-[#dd6e42]/20' : 'bg-th-surface/[0.06]'
        }`}>
          <svg className="w-8 h-8 text-[#dd6e42]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-th-text font-bold text-sm">{label}</p>
          <p className="text-th-text3/60 text-xs mt-1">{hint}</p>
        </div>
        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-[#dd6e42]/80">
          Tap to browse
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
};

const GearUploadGuide: React.FC<GearUploadGuideProps> = ({ isOpen, onClose, onComplete }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);

  const [step, setStep] = useState<UploadStep>(1);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [labelImage, setLabelImage] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isTransitioning, setIsTransitioning] = useState(false);

  /* ── Step transitions ──────────────────────────────────────── */
  const goToStep = useCallback((target: UploadStep, direction: 'left' | 'right' = 'left') => {
    setSlideDirection(direction);
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(target);
      setIsTransitioning(false);
    }, 300);
  }, []);

  /* ── Step 1: Upload front ────────────────────────────────────── */
  const handleFrontUploaded = useCallback((base64: string) => {
    setFrontImage(base64);
    setTimeout(() => goToStep(2), 800);
  }, [goToStep]);

  /* ── Step 2: Upload label ────────────────────────────────────── */
  const handleLabelUploaded = useCallback((base64: string) => {
    setLabelImage(base64);
    setTimeout(() => goToStep(3), 800);
  }, [goToStep]);

  const handleSkipLabel = useCallback(() => {
    setLabelImage(null);
    goToStep(3);
  }, [goToStep]);

  /* ── Step 3: Identify ──────────────────────────────────────── */
  const handleIdentify = useCallback(() => {
    if (!frontImage) return;
    onComplete({ front: frontImage, label: labelImage ?? undefined });
  }, [frontImage, labelImage, onComplete]);

  /* ── Re-upload actions ──────────────────────────────────────── */
  const handleRedoFront = useCallback(() => {
    setFrontImage(null);
    setLabelImage(null);
    goToStep(1, 'right');
  }, [goToStep]);

  const handleRedoLabel = useCallback(() => {
    setLabelImage(null);
    goToStep(2, 'right');
  }, [goToStep]);

  /* ── Reset on close ────────────────────────────────────────── */
  const handleClose = useCallback(() => {
    setStep(1);
    setFrontImage(null);
    setLabelImage(null);
    setIsTransitioning(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const slideClass = isTransitioning
    ? slideDirection === 'left'
      ? 'translate-x-[-100%] opacity-0'
      : 'translate-x-[100%] opacity-0'
    : 'translate-x-0 opacity-100';

  const stepAnnouncement =
    step === 1
      ? 'Step 1 of 3: Upload front panel photo'
      : step === 2
      ? 'Step 2 of 3: Upload back label photo (optional)'
      : 'Step 3 of 3: Review and identify';

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Upload gear photos"
      className="fixed inset-0 z-50 flex flex-col bg-th-bg outline-none"
    >
      {/* Live region for step announcements */}
      <div aria-live="polite" className="sr-only">
        {stepAnnouncement}
      </div>

      {/* Header: step dots + close */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <StepDots current={step} frontUploaded={!!frontImage} labelUploaded={!!labelImage} />
        <button
          onClick={handleClose}
          aria-label="Close upload guide"
          className="text-th-text2 hover:text-th-text transition-colors p-1"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content area with slide transition */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-out ${slideClass}`}>
        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 1: Upload Front Panel                            */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="flex-1 flex flex-col">
            <div className="px-4 pt-2 pb-3 text-center flex-shrink-0">
              <h2
                className="text-[1.1rem] text-[#f7f4ef] font-bold leading-snug"
                style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
              >
                Upload the Front
              </h2>
              <p className="text-th-text3/70 text-xs mt-1">
                A clear photo of the front panel with the brand name and controls
              </p>
            </div>

            <UploadZone
              image={frontImage}
              onFileSelect={handleFrontUploaded}
              label="Front Panel Photo"
              hint="JPG, PNG, or WebP"
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 2: Upload Back Label (optional)                  */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="flex-1 flex flex-col">
            <div className="px-4 pt-2 pb-3 text-center flex-shrink-0">
              <h2
                className="text-[1.1rem] text-[#f7f4ef] font-bold leading-snug"
                style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
              >
                Got a Label?
              </h2>
              <p className="text-th-text3/70 text-xs mt-1">
                Upload a photo of the back — model sticker, serial number, or specs label
              </p>
            </div>

            <UploadZone
              image={labelImage}
              onFileSelect={handleLabelUploaded}
              label="Back Label Photo"
              hint="Optional — helps with identification"
            />

            {!labelImage && (
              <div className="px-4 pb-6 flex justify-center flex-shrink-0">
                <button
                  onClick={handleSkipLabel}
                  className="border border-th-surface/[0.10] text-th-text font-bold py-2.5 px-6 rounded-xl hover:bg-th-surface/[0.08] transition-all uppercase tracking-[0.2em] text-[10px]"
                >
                  Skip — Front Shot is Enough
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 3: Review & Identify                             */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <h2
              className="text-[1.1rem] text-[#f7f4ef] font-bold leading-snug mb-6 text-center"
              style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              Ready to Identify
            </h2>

            {/* Photo cards */}
            <div className="w-full max-w-sm space-y-4 mb-8">
              {/* Front panel card */}
              <div className="glass-morphism rounded-xl border border-th-surface/[0.10] p-4 flex items-center gap-4">
                {frontImage && (
                  <img
                    src={frontImage}
                    alt="Front panel"
                    loading="lazy"
                    className="w-20 h-20 object-cover rounded-lg border border-th-surface/[0.10] flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-th-text text-sm font-medium">Front Panel</p>
                  <p className="text-emerald-400 text-xs mt-0.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Uploaded
                  </p>
                </div>
              </div>

              {/* Back label card */}
              <div className="glass-morphism rounded-xl border border-th-surface/[0.10] p-4 flex items-center gap-4">
                {labelImage ? (
                  <img
                    src={labelImage}
                    alt="Back label"
                    loading="lazy"
                    className="w-20 h-20 object-cover rounded-lg border border-th-surface/[0.10] flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg border border-th-surface/[0.10] flex-shrink-0 flex items-center justify-center bg-th-surface/[0.04]">
                    <svg className="w-8 h-8 text-th-text3/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-th-text text-sm font-medium">Back Label</p>
                  {labelImage ? (
                    <p className="text-emerald-400 text-xs mt-0.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Uploaded
                    </p>
                  ) : (
                    <p className="text-th-text3/50 text-xs mt-0.5">Skipped</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full max-w-sm space-y-3">
              <button
                onClick={handleIdentify}
                className="w-full bg-[#dd6e42] text-th-text font-bold py-3.5 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px]"
              >
                Identify My Gear
              </button>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleRedoFront}
                  className="text-th-text3/60 text-xs hover:text-th-text3 transition-colors underline underline-offset-2"
                >
                  Change Front
                </button>
                {labelImage && (
                  <button
                    onClick={handleRedoLabel}
                    className="text-th-text3/60 text-xs hover:text-th-text3 transition-colors underline underline-offset-2"
                  >
                    Change Label
                  </button>
                )}
              </div>
              <p className="text-th-text3/40 text-[10px] text-center mt-2">
                AI works best when the brand name and model number are clearly visible
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GearUploadGuide;
