import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ShelfOnboardingProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

const ShelfOnboarding: React.FC<ShelfOnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const pendingStepRef = useRef<number | null>(null);

  // Escape key dismisses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onComplete();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onComplete]);

  const goToStep = useCallback((nextStep: number) => {
    pendingStepRef.current = nextStep;
    setFadeState('out');
  }, []);

  const handleTransitionEnd = useCallback(() => {
    if (fadeState === 'out' && pendingStepRef.current !== null) {
      setStep(pendingStepRef.current);
      pendingStepRef.current = null;
      setFadeState('in');
    }
  }, [fadeState]);

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      goToStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) goToStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-th-bg/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-th-text3/50 text-xs font-label tracking-widest uppercase">
            Step {step + 1} of {TOTAL_STEPS}
          </span>
          <button
            onClick={onComplete}
            className="text-th-text3/40 text-xs font-label tracking-widest uppercase hover:text-th-text3 transition-colors"
          >
            Skip
          </button>
        </div>
        <div className="h-1 bg-th-surface/[0.08] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#dd6e42] rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div
        className="w-full max-w-lg"
        style={{ opacity: fadeState === 'in' ? 1 : 0, transition: 'opacity 150ms ease-in-out' }}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="glass-morphism rounded-3xl border border-th-surface/[0.10] p-8 md:p-10">

          {/* ── Step 0: Welcome ── */}
          {step === 0 && (
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#dd6e42]/10 border border-[#dd6e42]/20 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-[#dd6e42]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-th-text mb-3">
                Welcome to <span className="text-[#dd6e42]">Shelf Organizer</span>
              </h2>
              <p className="text-th-text3/70 text-sm leading-relaxed max-w-sm">
                Map your digital vinyl collection to your physical shelves. The Shelf Organizer helps you know exactly where every record belongs — so your real shelves match your digital catalog.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <div className="flex items-center gap-2 text-xs text-th-text3/50">
                  <svg className="w-4 h-4 text-[#dd6e42]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Smart sorting
                </div>
                <div className="flex items-center gap-2 text-xs text-th-text3/50">
                  <svg className="w-4 h-4 text-[#dd6e42]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Drag &amp; drop
                </div>
                <div className="flex items-center gap-2 text-xs text-th-text3/50">
                  <svg className="w-4 h-4 text-[#dd6e42]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Auto rebalance
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Define Your Shelves ── */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#dd6e42]/10 border border-[#dd6e42]/20 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-[#dd6e42]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10H3M21 6H3M21 14H3M21 18H3" />
                  <rect x="1" y="3" width="22" height="18" rx="2" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-th-text mb-3">
                Define Your <span className="text-[#dd6e42]">Shelves</span>
              </h2>
              <p className="text-th-text3/70 text-sm leading-relaxed max-w-sm mb-6">
                Tell us about your physical storage. Each shelf has a name, a number of sections (cubes or compartments), and a capacity per section.
              </p>

              {/* Mini shelf preview */}
              <div className="w-full max-w-xs bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#dd6e42]" />
                  <span className="text-th-text text-xs font-label tracking-wide">Kallax 4x4</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded bg-th-surface/[0.08] border border-th-surface/[0.06] flex items-center justify-center">
                      <span className="text-[9px] text-th-text3/30 font-label">{i + 1}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-th-text3/40 text-center">8 sections &middot; 50 per section &middot; 400 total</p>
              </div>
            </div>
          )}

          {/* ── Step 2: Sort Scheme ── */}
          {step === 2 && (
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#dd6e42]/10 border border-[#dd6e42]/20 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-[#dd6e42]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M3 12h12M3 18h6" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-th-text mb-3">
                Choose Your <span className="text-[#dd6e42]">Sort Scheme</span>
              </h2>
              <p className="text-th-text3/70 text-sm leading-relaxed max-w-sm mb-6">
                How should your records be arranged on the shelf? Pick a sort order and your collection will be distributed accordingly.
              </p>

              {/* Sort options display */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { label: 'A→Z by Artist', desc: 'Alphabetical by artist name' },
                  { label: 'Genre, then Artist', desc: 'Grouped by genre first' },
                  { label: 'Oldest First', desc: 'By release year ascending' },
                  { label: 'Newest First', desc: 'By release year descending' },
                  { label: 'Date Added', desc: 'Most recently added first' },
                  { label: 'Custom', desc: 'Your own manual order' },
                ].map((opt) => (
                  <div
                    key={opt.label}
                    className="px-3 py-2 rounded-lg bg-th-surface/[0.04] border border-th-surface/[0.10] text-th-text2 text-xs font-label tracking-wide"
                    title={opt.desc}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Drag, Drop & Rebalance ── */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#dd6e42]/10 border border-[#dd6e42]/20 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-[#dd6e42]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                  <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-th-text mb-3">
                Drag, Drop &amp; <span className="text-[#dd6e42]">Rebalance</span>
              </h2>
              <p className="text-th-text3/70 text-sm leading-relaxed max-w-sm mb-6">
                In Shelf View, you can fine-tune your organization with drag-and-drop. Moved albums get pinned in place. When things get unbalanced, hit Rebalance to even things out — pinned albums stay put.
              </p>

              {/* Feature highlights */}
              <div className="w-full max-w-xs space-y-3">
                <div className="flex items-center gap-3 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-[#dd6e42] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="5" r="1" /><circle cx="9" cy="9" r="1" /><circle cx="9" cy="13" r="1" />
                    <circle cx="15" cy="5" r="1" /><circle cx="15" cy="9" r="1" /><circle cx="15" cy="13" r="1" />
                  </svg>
                  <div className="text-left">
                    <p className="text-th-text text-xs font-bold">Drag Handle</p>
                    <p className="text-th-text3/50 text-[10px]">Grab the 6-dot icon to move albums</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-[#dd6e42] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l0 10" />
                    <path d="M18.364 18.364A9 9 0 005.636 5.636" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  <div className="text-left">
                    <p className="text-th-text text-xs font-bold">Pin in Place</p>
                    <p className="text-th-text3/50 text-[10px]">Moved albums lock during rebalance</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-[#dd6e42] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 14h6m0 0l-3-3m3 3l-3 3" />
                    <path d="M20 10h-6m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <div className="text-left">
                    <p className="text-th-text text-xs font-bold">Smart Rebalance</p>
                    <p className="text-th-text3/50 text-[10px]">Even out sections with one click</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="w-full max-w-lg flex items-center justify-between mt-8">
        <div>
          {step > 0 && (
            <button
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl border border-th-surface/[0.10] text-th-text2 text-sm font-label tracking-wide hover:text-th-text hover:border-th-surface/[0.20] transition-all"
            >
              Back
            </button>
          )}
        </div>
        <button
          onClick={handleNext}
          className="px-6 py-2.5 rounded-xl bg-[#dd6e42] text-white text-sm font-label tracking-wide font-bold hover:bg-[#c45a30] transition-all"
        >
          {step === TOTAL_STEPS - 1 ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default ShelfOnboarding;
