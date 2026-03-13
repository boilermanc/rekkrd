import React, { useState, useRef, useEffect, useCallback } from 'react';

interface StakkdOnboardingProps {
  onComplete: () => void;
  onGoHome?: () => void;
}

const TOTAL_STEPS = 4;

const StakkdOnboarding: React.FC<StakkdOnboardingProps> = ({ onComplete, onGoHome }) => {
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
    <div className="fixed inset-0 top-[60px] z-[35] bg-th-bg/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">

      {/* Home button */}
      {onGoHome && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <button
            onClick={onGoHome}
            aria-label="Rekkrd home"
            title="Back to home"
            className="w-10 h-10 bg-gradient-to-tr from-sk-accent to-sk-deep rounded-lg flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition-transform flex-shrink-0 border-none p-0"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" fill="#B85A78"/>
              <circle cx="12" cy="12" r="9.5" fill="none" stroke="#D4899A" strokeWidth="0.4" opacity="0.5"/>
              <circle cx="12" cy="12" r="8" fill="none" stroke="#D4899A" strokeWidth="0.3" opacity="0.4"/>
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="#D4899A" strokeWidth="0.3" opacity="0.3"/>
              <circle cx="12" cy="12" r="5.2" fill="#6A2540"/>
              <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#B85A78">R</text>
            </svg>
          </button>
          <span className="font-label text-lg font-bold tracking-tighter text-th-text">
            REKK<span className="text-sk-accent-hover">R</span>D
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-th-text3/70 text-xs font-label tracking-widest uppercase">
            Step {step + 1} of {TOTAL_STEPS}
          </span>
          <button
            onClick={onComplete}
            className="text-th-text3/60 text-xs font-label tracking-widest uppercase hover:text-th-text3 transition-colors"
          >
            Skip
          </button>
        </div>
        <div className="h-1 bg-th-surface/[0.08] rounded-full overflow-hidden">
          <div
            className="h-full bg-sk-accent rounded-full transition-all duration-500"
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
              <div className="w-20 h-20 rounded-2xl bg-sk-accent/10 border border-sk-accent/20 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-sk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="12" cy="12" r="1" />
                  <line x1="12" y1="8" x2="16" y2="5" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-th-text mb-3">
                Welcome to <span className="text-sk-accent">Stakkd</span>
              </h2>
              <p className="text-th-text3/70 text-sm leading-relaxed max-w-sm">
                Your complete audio gear catalog. Document your equipment, visualize your signal chain, and get AI-powered setup guides — all in one place.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <div className="flex items-center gap-2 text-xs text-th-text3/70">
                  <svg className="w-4 h-4 text-sk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  AI identification
                </div>
                <div className="flex items-center gap-2 text-xs text-th-text3/70">
                  <svg className="w-4 h-4 text-sk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Signal chain
                </div>
                <div className="flex items-center gap-2 text-xs text-th-text3/70">
                  <svg className="w-4 h-4 text-sk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Setup guides
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Adding Your Gear ── */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-sk-accent/10 border border-sk-accent/20 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-sk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-th-text mb-3">
                Add Your <span className="text-sk-accent">Gear</span>
              </h2>
              <p className="text-th-text3/70 text-sm leading-relaxed max-w-sm mb-6">
                Three ways to catalog your equipment. Pick whatever works best for each piece.
              </p>

              {/* Method cards */}
              <div className="w-full max-w-xs space-y-3">
                <div className="flex items-center gap-3 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-sk-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-th-text text-xs font-bold">Scan</p>
                    <p className="text-th-text3/70 text-[10px]">Snap a photo, AI identifies your gear</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-sk-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <div className="text-left">
                    <p className="text-th-text text-xs font-bold">Upload</p>
                    <p className="text-th-text3/70 text-[10px]">Pick a photo from your library</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-th-text text-xs font-bold">Manual Entry <span className="text-amber-400 text-[9px] ml-1">Recommended</span></p>
                    <p className="text-th-text3/70 text-[10px]">Type in brand, model &amp; specs by hand</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Signal Chain ── */}
          {step === 2 && (
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-sk-accent/10 border border-sk-accent/20 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-sk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.82" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-th-text mb-3">
                Signal <span className="text-sk-accent">Chain</span>
              </h2>
              <p className="text-th-text3/70 text-sm leading-relaxed max-w-sm mb-6">
                Your gear is organized in signal flow order — from source to speakers. Drag and drop to customize your chain.
              </p>

              {/* Mini signal chain flow */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {[
                  { label: 'Turntable', icon: <><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="12" r="0.5" /></> },
                  { label: 'Preamp', icon: <><rect x="4" y="7" width="16" height="10" rx="2" /><path d="M8 12h1M11 12h1M14 12h1" /></> },
                  { label: 'Amp', icon: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="8" cy="12" r="2.5" /><circle cx="16" cy="12" r="2.5" /></> },
                  { label: 'Speakers', icon: <><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="11" r="4" /><circle cx="12" cy="11" r="1.5" /></> },
                ].map((item, i) => (
                  <React.Fragment key={item.label}>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-lg bg-th-surface/[0.06] border border-th-surface/[0.10] flex items-center justify-center">
                        <svg className="w-5 h-5 text-sk-accent/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
                          {item.icon}
                        </svg>
                      </div>
                      <span className="text-[9px] text-th-text3/40 font-label">{item.label}</span>
                    </div>
                    {i < 3 && (
                      <svg className="w-4 h-4 text-th-text3/20 flex-shrink-0 -mt-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Powerful Features ── */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-sk-accent/10 border border-sk-accent/20 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-sk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-th-text mb-3">
                Powerful <span className="text-sk-accent">Features</span>
              </h2>
              <p className="text-th-text3/70 text-sm leading-relaxed max-w-sm mb-6">
                Unlock insights, guides, and more for your gear.
              </p>

              {/* Feature highlights */}
              <div className="w-full max-w-xs space-y-3">
                <div className="flex items-center gap-3 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-sk-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.82" />
                  </svg>
                  <div className="text-left">
                    <p className="text-th-text text-xs font-bold">Setup Guide</p>
                    <p className="text-th-text3/70 text-[10px]">AI wiring instructions for your gear combo</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-sk-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-th-text text-xs font-bold">Chain Insights</p>
                    <p className="text-th-text3/70 text-[10px]">Quality analysis &amp; compatibility warnings</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-sk-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-th-text text-xs font-bold">Manual Finder</p>
                    <p className="text-th-text3/70 text-[10px]">AI tracks down equipment manuals &amp; PDFs</p>
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
          className="px-6 py-2.5 rounded-xl bg-sk-accent text-white text-sm font-label tracking-wide font-bold hover:bg-sk-accent-hover transition-all"
        >
          {step === TOTAL_STEPS - 1 ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default StakkdOnboarding;
