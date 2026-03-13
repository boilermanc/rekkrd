import React, { useState, useRef, useEffect, useCallback } from 'react';

interface RoomOnboardingProps {
  onComplete: () => void;
  onGoHome?: () => void;
}

const TOTAL_STEPS = 4;

const RoomOnboarding: React.FC<RoomOnboardingProps> = ({ onComplete, onGoHome }) => {
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
              <circle cx="12" cy="12" r="11" className="fill-sk-blush"/>
              <circle cx="12" cy="12" r="9.5" fill="none" stroke="#d48a6a" strokeWidth="0.4" opacity="0.5"/>
              <circle cx="12" cy="12" r="8" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.4"/>
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.3"/>
              <circle cx="12" cy="12" r="5.2" className="fill-sk-accent-hover"/>
              <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" className="fill-sk-blush">R</text>
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
                  <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
                  <path d="M3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" />
                  <path d="M13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
                  <path d="M13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-th-text mb-3">
                Welcome to <span className="text-sk-accent">Room Planner</span>
              </h2>
              <p className="text-th-text3/70 text-sm leading-relaxed max-w-sm">
                Map your listening spaces and get AI-powered gear placement recommendations. The Room Planner helps you optimize your audio setup for the best possible sound.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <div className="flex items-center gap-2 text-xs text-th-text3/70">
                  <svg className="w-4 h-4 text-sk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Room mapping
                </div>
                <div className="flex items-center gap-2 text-xs text-th-text3/70">
                  <svg className="w-4 h-4 text-sk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  AI placement
                </div>
                <div className="flex items-center gap-2 text-xs text-th-text3/70">
                  <svg className="w-4 h-4 text-sk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Stereo triangle
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Define Your Room ── */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-sk-accent/10 border border-sk-accent/20 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-sk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="M3 3h18" />
                  <path d="M7 3v2M11 3v2M15 3v2M19 3v2" />
                  <path d="M3 7h2M3 11h2M3 15h2M3 19h2" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-th-text mb-3">
                Define Your <span className="text-sk-accent">Room</span>
              </h2>
              <p className="text-th-text3/70 text-sm leading-relaxed max-w-sm mb-6">
                Enter your room&rsquo;s dimensions, shape, floor type, and listening position. This information helps the AI understand your space and make better recommendations.
              </p>

              {/* Mini room card preview */}
              <div className="w-full max-w-xs bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-sk-accent" />
                  <span className="text-th-text text-xs font-label tracking-wide">Living Room</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sk-accent/10 text-sk-accent text-[10px] font-bold tracking-wide">
                    14 &times; 12 ft
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-full border border-th-surface/[0.15] text-th-text3 text-[9px] font-medium uppercase tracking-widest">Rectangular</span>
                  <span className="px-2 py-0.5 rounded-full border border-th-surface/[0.15] text-th-text3 text-[9px] font-medium uppercase tracking-widest">Hardwood</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Add Wall Features ── */}
          {step === 2 && (
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-sk-accent/10 border border-sk-accent/20 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-sk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-th-text mb-3">
                Add Wall <span className="text-sk-accent">Features</span>
              </h2>
              <p className="text-th-text3/70 text-sm leading-relaxed max-w-sm mb-6">
                Mark doors, windows, closets, and other features on each wall. The AI uses these to avoid placing gear in front of doorways or blocking windows.
              </p>

              {/* Feature type chips */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { label: 'Door', color: '#8B3252' },
                  { label: 'Window', color: '#5b9bd5' },
                  { label: 'Closet', color: '#8b6f47' },
                  { label: 'Fireplace', color: '#e05252' },
                  { label: 'Stairs', color: '#9b72cf' },
                  { label: 'Opening', color: '#5bb572' },
                ].map((feat) => (
                  <div
                    key={feat.label}
                    className="px-3 py-2 rounded-lg bg-th-surface/[0.04] border border-th-surface/[0.10] text-th-text2 text-xs font-label tracking-wide flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: feat.color }} />
                    {feat.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Generate AI Layout ── */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-sk-accent/10 border border-sk-accent/20 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-sk-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-th-text mb-3">
                Generate AI <span className="text-sk-accent">Layout</span>
              </h2>
              <p className="text-th-text3/70 text-sm leading-relaxed max-w-sm mb-6">
                Once your room is set up, AI analyzes your dimensions, features, and gear catalog to recommend optimal placement for every piece of equipment.
              </p>

              {/* Feature highlights */}
              <div className="w-full max-w-xs space-y-3">
                <div className="flex items-center gap-3 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-sk-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-th-text text-xs font-bold">Gear Placement</p>
                    <p className="text-th-text3/70 text-[10px]">AI recommends position and facing for each piece</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-sk-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <div className="text-left">
                    <p className="text-th-text text-xs font-bold">Listening Position</p>
                    <p className="text-th-text3/70 text-[10px]">Optimal sweet spot marked on the diagram</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-sk-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 20L12 4l8 16H4z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-th-text text-xs font-bold">Stereo Triangle</p>
                    <p className="text-th-text3/70 text-[10px]">Speaker-to-listener angle visualization</p>
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

export default RoomOnboarding;
