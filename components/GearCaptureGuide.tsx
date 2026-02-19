
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface GearCaptureGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (images: { front: string; label?: string }) => void;
}

type CaptureStep = 1 | 2 | 3;

/* ── SVG hint: front panel outline ─────────────────────────────── */
const FrontPanelHint: React.FC = () => (
  <svg
    width="220"
    height="80"
    viewBox="0 0 220 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="opacity-40"
    aria-hidden="true"
  >
    {/* Receiver body */}
    <rect x="4" y="8" width="212" height="64" rx="6" stroke="#c0d6df" strokeWidth="1.5" />
    {/* Front panel edge */}
    <line x1="4" y1="16" x2="216" y2="16" stroke="#c0d6df" strokeWidth="0.5" opacity="0.3" />
    {/* Brand area — dotted highlight */}
    <rect
      x="14" y="18" width="70" height="14" rx="3"
      stroke="#dd6e42" strokeWidth="1.2" strokeDasharray="4 2"
    />
    <line x1="20" y1="25" x2="75" y2="25" stroke="#c0d6df" strokeWidth="1" opacity="0.5" />
    {/* Model number area — dotted highlight */}
    <rect
      x="14" y="38" width="50" height="10" rx="2"
      stroke="#dd6e42" strokeWidth="1" strokeDasharray="3 2"
    />
    <line x1="20" y1="43" x2="55" y2="43" stroke="#c0d6df" strokeWidth="0.8" opacity="0.4" />
    {/* Knobs row */}
    <circle cx="120" cy="50" r="10" stroke="#c0d6df" strokeWidth="1.2" />
    <circle cx="120" cy="50" r="4" stroke="#c0d6df" strokeWidth="0.6" opacity="0.5" />
    <circle cx="120" cy="50" r="1.5" fill="#dd6e42" opacity="0.4" />
    <circle cx="150" cy="50" r="8" stroke="#c0d6df" strokeWidth="1.2" />
    <circle cx="150" cy="50" r="3" stroke="#c0d6df" strokeWidth="0.6" opacity="0.5" />
    <circle cx="175" cy="50" r="8" stroke="#c0d6df" strokeWidth="1.2" />
    <circle cx="175" cy="50" r="3" stroke="#c0d6df" strokeWidth="0.6" opacity="0.5" />
    {/* VU meter */}
    <rect x="100" y="18" width="40" height="16" rx="2" stroke="#c0d6df" strokeWidth="0.8" opacity="0.5" />
    <line x1="120" y1="30" x2="126" y2="20" stroke="#dd6e42" strokeWidth="0.8" opacity="0.6" />
    {/* Power indicator */}
    <circle cx="200" cy="50" r="3" fill="#dd6e42" opacity="0.3" />
    <circle cx="200" cy="50" r="5" stroke="#c0d6df" strokeWidth="0.6" opacity="0.4" />
  </svg>
);

/* ── SVG hint: back panel label ────────────────────────────────── */
const BackLabelHint: React.FC = () => (
  <svg
    width="220"
    height="80"
    viewBox="0 0 220 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="opacity-40"
    aria-hidden="true"
  >
    {/* Receiver back panel */}
    <rect x="4" y="8" width="212" height="64" rx="6" stroke="#c0d6df" strokeWidth="1.5" />
    {/* Ventilation slots */}
    {[20, 28, 36].map((y) => (
      <line key={y} x1="12" y1={y} x2="60" y2={y} stroke="#c0d6df" strokeWidth="0.5" opacity="0.25" />
    ))}
    {/* RCA jacks */}
    <circle cx="160" cy="24" r="4" stroke="#c0d6df" strokeWidth="0.8" opacity="0.5" />
    <circle cx="175" cy="24" r="4" stroke="#c0d6df" strokeWidth="0.8" opacity="0.5" />
    <circle cx="190" cy="24" r="4" stroke="#c0d6df" strokeWidth="0.8" opacity="0.5" />
    <circle cx="205" cy="24" r="4" stroke="#c0d6df" strokeWidth="0.8" opacity="0.5" />
    {/* Speaker terminals */}
    <rect x="150" y="38" width="60" height="14" rx="2" stroke="#c0d6df" strokeWidth="0.6" opacity="0.4" />
    {/* Label/sticker area — dotted highlight */}
    <rect
      x="30" y="40" width="90" height="26" rx="3"
      stroke="#dd6e42" strokeWidth="1.5" strokeDasharray="5 3"
    />
    {/* Label text lines */}
    <line x1="38" y1="48" x2="110" y2="48" stroke="#c0d6df" strokeWidth="1" opacity="0.5" />
    <line x1="38" y1="53" x2="95" y2="53" stroke="#c0d6df" strokeWidth="0.8" opacity="0.4" />
    <line x1="38" y1="58" x2="80" y2="58" stroke="#c0d6df" strokeWidth="0.6" opacity="0.3" />
    {/* Power cord */}
    <rect x="8" y="56" width="16" height="10" rx="2" stroke="#c0d6df" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

/* ── Step indicator dots ───────────────────────────────────────── */
const StepDots: React.FC<{ current: CaptureStep; frontCaptured: boolean; labelCaptured: boolean }> = ({
  current,
  frontCaptured,
  labelCaptured,
}) => (
  <div className="flex items-center gap-3" role="list" aria-label="Capture progress">
    {[1, 2, 3].map((step) => {
      const completed = (step === 1 && frontCaptured) || (step === 2 && labelCaptured) || false;
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

const GearCaptureGuide: React.FC<GearCaptureGuideProps> = ({ isOpen, onClose, onComplete }) => {
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<CaptureStep>(1);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [facingMode] = useState<'user' | 'environment'>('environment');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [labelImage, setLabelImage] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isTransitioning, setIsTransitioning] = useState(false);

  /* ── Camera lifecycle ──────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setCameraError(true);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setIsStreaming(false);
    };
  }, [isOpen]);

  /* ── Capture from canvas ───────────────────────────────────── */
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  /* ── Step transitions ──────────────────────────────────────── */
  const goToStep = useCallback((target: CaptureStep, direction: 'left' | 'right' = 'left') => {
    setSlideDirection(direction);
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(target);
      setIsTransitioning(false);
    }, 300);
  }, []);

  /* ── Step 1: Capture front ─────────────────────────────────── */
  const handleCaptureFront = useCallback(() => {
    const img = captureFrame();
    if (!img) {
      showToast('Capture failed — try again.', 'error');
      return;
    }
    setFrontImage(img);
    setTimeout(() => goToStep(2), 1000);
  }, [captureFrame, goToStep, showToast]);

  /* ── Step 2: Capture label ─────────────────────────────────── */
  const handleCaptureLabel = useCallback(() => {
    const img = captureFrame();
    if (!img) {
      showToast('Capture failed — try again.', 'error');
      return;
    }
    setLabelImage(img);
    setTimeout(() => goToStep(3), 1000);
  }, [captureFrame, goToStep, showToast]);

  const handleSkipLabel = useCallback(() => {
    setLabelImage(null);
    goToStep(3);
  }, [goToStep]);

  /* ── File upload fallback ──────────────────────────────────── */
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (step === 1) {
          setFrontImage(base64);
          setTimeout(() => goToStep(2), 1000);
        } else if (step === 2) {
          setLabelImage(base64);
          setTimeout(() => goToStep(3), 1000);
        }
      };
      reader.readAsDataURL(file);
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [step, goToStep],
  );

  /* ── Step 3: Identify ──────────────────────────────────────── */
  const handleIdentify = useCallback(() => {
    if (!frontImage) return;
    onComplete({ front: frontImage, label: labelImage ?? undefined });
  }, [frontImage, labelImage, onComplete]);

  /* ── Retake actions ────────────────────────────────────────── */
  const handleRetakeFront = useCallback(() => {
    setFrontImage(null);
    setLabelImage(null);
    goToStep(1, 'right');
  }, [goToStep]);

  const handleRetakeLabel = useCallback(() => {
    setLabelImage(null);
    goToStep(2, 'right');
  }, [goToStep]);

  /* ── Reset on close ────────────────────────────────────────── */
  const handleClose = useCallback(() => {
    setStep(1);
    setFrontImage(null);
    setLabelImage(null);
    setCameraError(false);
    setIsTransitioning(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const slideClass = isTransitioning
    ? slideDirection === 'left'
      ? 'translate-x-[-100%] opacity-0'
      : 'translate-x-[100%] opacity-0'
    : 'translate-x-0 opacity-100';

  /* ── Step announcement text ────────────────────────────────── */
  const stepAnnouncement =
    step === 1
      ? 'Step 1 of 3: Capture front panel'
      : step === 2
      ? 'Step 2 of 3: Capture back label (optional)'
      : 'Step 3 of 3: Review and identify';

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Guided gear photo capture"
      className="fixed inset-0 z-50 flex flex-col bg-th-bg outline-none"
    >
      {/* Live region for step announcements */}
      <div aria-live="polite" className="sr-only">
        {stepAnnouncement}
      </div>

      {/* Header: step dots + close */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <StepDots current={step} frontCaptured={!!frontImage} labelCaptured={!!labelImage} />
        <button
          onClick={handleClose}
          aria-label="Close capture guide"
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
        {/* STEP 1: Front Panel Capture                           */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="flex-1 flex flex-col">
            {/* Instruction + hint */}
            <div className="px-4 pt-2 pb-3 text-center flex-shrink-0">
              <h2
                className="text-[1.1rem] text-[#f7f4ef] font-bold leading-snug"
                style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
              >
                Show Us the Front
              </h2>
              <p className="text-th-text3/70 text-xs mt-1">
                Point at the front panel — capture the brand name and controls
              </p>
              <div className="mt-2 flex justify-center">
                <FrontPanelHint />
              </div>
            </div>

            {/* Camera feed */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="text-center px-6">
                  <p className="text-th-text3 text-sm mb-4">
                    Camera access denied. You can upload a photo instead.
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#dd6e42] text-th-text font-bold py-3 px-6 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px]"
                  >
                    Upload Photo
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover${facingMode === 'user' ? ' scale-x-[-1]' : ''}`}
                  />
                  {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-pulse text-th-text3">Initializing Lens...</div>
                    </div>
                  )}
                </>
              )}

              {/* Capture preview thumbnail */}
              {frontImage && (
                <div className="absolute bottom-3 left-3 w-16 h-16 rounded-lg overflow-hidden border-2 border-emerald-400 shadow-lg">
                  <img src={frontImage} alt="Front panel captured" loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-emerald-400/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom actions */}
            {!cameraError && (
              <div className="px-4 py-6 flex flex-col items-center gap-3 flex-shrink-0">
                <button
                  onClick={handleCaptureFront}
                  disabled={!isStreaming || !!frontImage}
                  aria-label="Capture front panel photo"
                  className="w-20 h-20 rounded-full border-4 border-th-text flex items-center justify-center active:scale-95 transition-transform hover:border-[#dd6e42] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="w-16 h-16 rounded-full bg-th-text hover:bg-[#dd6e42] transition-colors" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-th-text3/60 text-xs hover:text-th-text3 transition-colors underline underline-offset-2"
                >
                  Upload Photo
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 2: Back Label Capture (optional)                 */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="flex-1 flex flex-col">
            {/* Instruction + hint */}
            <div className="px-4 pt-2 pb-3 text-center flex-shrink-0">
              <h2
                className="text-[1.1rem] text-[#f7f4ef] font-bold leading-snug"
                style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
              >
                Got a Label?
              </h2>
              <p className="text-th-text3/70 text-xs mt-1">
                Flip it around — look for a model sticker, serial number, or specs label on the back
              </p>
              <div className="mt-2 flex justify-center">
                <BackLabelHint />
              </div>
            </div>

            {/* Camera feed (reuses same stream) */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="text-center px-6">
                  <p className="text-th-text3 text-sm mb-4">
                    Camera access denied. You can upload a photo instead.
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#dd6e42] text-th-text font-bold py-3 px-6 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px]"
                  >
                    Upload Photo
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover${facingMode === 'user' ? ' scale-x-[-1]' : ''}`}
                  />
                  {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-pulse text-th-text3">Initializing Lens...</div>
                    </div>
                  )}
                </>
              )}

              {/* Capture preview thumbnail */}
              {labelImage && (
                <div className="absolute bottom-3 left-3 w-16 h-16 rounded-lg overflow-hidden border-2 border-emerald-400 shadow-lg">
                  <img src={labelImage} alt="Back label captured" loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-emerald-400/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom actions */}
            <div className="px-4 py-5 flex flex-col items-center gap-3 flex-shrink-0">
              {!cameraError && (
                <button
                  onClick={handleCaptureLabel}
                  disabled={!isStreaming || !!labelImage}
                  aria-label="Capture back label photo"
                  className="w-20 h-20 rounded-full border-4 border-th-text flex items-center justify-center active:scale-95 transition-transform hover:border-[#dd6e42] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="w-16 h-16 rounded-full bg-th-text hover:bg-[#dd6e42] transition-colors" />
                </button>
              )}
              <button
                onClick={handleSkipLabel}
                disabled={!!labelImage}
                className="border border-th-surface/[0.10] text-th-text font-bold py-2.5 px-6 rounded-xl hover:bg-th-surface/[0.08] transition-all uppercase tracking-[0.2em] text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Skip — Front Shot is Enough
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-th-text3/60 text-xs hover:text-th-text3 transition-colors underline underline-offset-2"
              >
                Upload Photo
              </button>
            </div>
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
                    Captured
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
                      Captured
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
                  onClick={handleRetakeFront}
                  className="text-th-text3/60 text-xs hover:text-th-text3 transition-colors underline underline-offset-2"
                >
                  Retake Front
                </button>
                {labelImage && (
                  <button
                    onClick={handleRetakeLabel}
                    className="text-th-text3/60 text-xs hover:text-th-text3 transition-colors underline underline-offset-2"
                  >
                    Retake Label
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

      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
};

export default GearCaptureGuide;
