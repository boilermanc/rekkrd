import React, { useState, useRef, useEffect, useCallback } from 'react';
import { updateProfile } from '../services/profileService';
import { useAuthContext } from '../contexts/AuthContext';
import { Headphones, Music, Disc3, Tv, Sparkles, Heart, Trophy, TrendingUp, Mail, Archive, Crown, Gem, Camera, Compass } from 'lucide-react';


const TOTAL_STEPS = 4;

interface OnboardingWizardProps {
  onComplete: (startAction?: 'scan' | 'explore', selectedTier?: 'collector' | 'curator' | 'enthusiast', priceId?: string) => void;
  previewMode?: boolean;
}

interface ProfileData {
  displayName: string;
  favoriteGenres: string[];
  listeningSetup: string;
  collectingGoal: string;
  emailDigestOptin: boolean;
  selectedTier: 'collector' | 'curator' | 'enthusiast';
  billingInterval: 'monthly' | 'annual';
  startAction: 'scan' | 'explore';
}

/* ─── Step 1: Welcome ─── */
interface StepWelcomeProps {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
}

const StepWelcome: React.FC<StepWelcomeProps> = ({ displayName, onDisplayNameChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Small delay so the fade-in transition doesn't fight with focus
    const timer = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(timer);
  }, []);

  const initials = displayName.trim()
    ? displayName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('')
    : '?';

  return (
    <div className="w-full flex flex-col items-center text-center">
      <h2 className="font-display text-4xl md:text-5xl font-bold text-[#dd6e42] mb-3">
        Welcome to Rekkrd
      </h2>
      <p className="text-th-text3 text-lg mb-10">
        Let's set up your collector profile. It only takes a minute.
      </p>

      {/* Avatar preview */}
      <div className="w-20 h-20 rounded-full glass-morphism flex items-center justify-center mb-8">
        <span className="text-[#dd6e42] font-bold text-2xl select-none">
          {initials}
        </span>
      </div>

      {/* Display name input */}
      <div className="w-full max-w-sm">
        <label
          htmlFor="onboarding-display-name"
          className="block font-label text-[10px] tracking-widest text-th-text3 uppercase mb-2"
        >
          What should we call you?
        </label>
        <input
          ref={inputRef}
          id="onboarding-display-name"
          type="text"
          value={displayName}
          onChange={e => onDisplayNameChange(e.target.value)}
          maxLength={50}
          placeholder="Your name or collector handle"
          className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-4 py-3 text-sm text-th-text placeholder:text-th-text3/50 focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50 transition-all"
        />
      </div>

      <p className="text-th-text3 text-sm italic mt-8">
        You're joining a community of serious collectors.
      </p>
    </div>
  );
};

/* ─── Step 2: Your Habits ─── */

const GENRE_OPTIONS = [
  'Rock', 'Jazz', 'Blues', 'Soul', 'Funk', 'Hip-Hop', 'Electronic', 'Classical',
  'Country', 'Pop', 'R&B', 'Reggae', 'Metal', 'Folk', 'Latin', 'Punk', 'Indie',
  'Soundtrack', 'World', 'Gospel',
] as const;

const SETUP_OPTIONS = [
  { id: 'audiophile', label: 'Audiophile', Icon: Headphones },
  { id: 'casual', label: 'Casual', Icon: Music },
  { id: 'dj', label: 'DJ / Mixer', Icon: Disc3 },
  { id: 'home-theater', label: 'Home Theater', Icon: Tv },
  { id: 'all', label: 'All of the above', Icon: Sparkles },
] as const;

const GOAL_OPTIONS = [
  { id: 'enjoyment', label: 'Pure Enjoyment', Icon: Heart },
  { id: 'completionist', label: 'Completionist', Icon: Trophy },
  { id: 'investment', label: 'Investment', Icon: TrendingUp },
] as const;

interface StepHabitsProps {
  favoriteGenres: string[];
  listeningSetup: string;
  collectingGoal: string;
  onToggleGenre: (genre: string) => void;
  onSetListeningSetup: (id: string) => void;
  onSetCollectingGoal: (id: string) => void;
}

const StepHabits: React.FC<StepHabitsProps> = ({
  favoriteGenres, listeningSetup, collectingGoal,
  onToggleGenre, onSetListeningSetup, onSetCollectingGoal,
}) => (
  <div className="w-full flex flex-col items-center">
    <h2 className="font-display text-4xl md:text-5xl font-bold text-[#dd6e42] mb-3 text-center">
      Tell us about your taste
    </h2>
    <p className="text-th-text3 text-lg mb-10 text-center">
      We'll use this to personalize your experience.
    </p>

    {/* Favorite Genres */}
    <div className="w-full mb-8">
      <label className="block font-label text-[10px] tracking-widest text-th-text3 uppercase mb-3">
        What genres do you collect?
      </label>
      <div className="flex flex-wrap gap-2">
        {GENRE_OPTIONS.map(genre => {
          const selected = favoriteGenres.includes(genre);
          return (
            <button
              key={genre}
              type="button"
              onClick={() => onToggleGenre(genre)}
              className={`rounded-full px-4 py-2 text-sm transition-all cursor-pointer border ${
                selected
                  ? 'bg-[#dd6e42]/20 border-[#dd6e42] text-[#dd6e42]'
                  : 'glass-morphism text-th-text3 border-white/10'
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>
    </div>

    {/* Listening Setup */}
    <div className="w-full mb-8">
      <label className="block font-label text-[10px] tracking-widest text-th-text3 uppercase mb-3">
        How do you listen?
      </label>
      <div className="grid grid-cols-2 gap-3">
        {SETUP_OPTIONS.map(({ id, label, Icon }) => {
          const selected = listeningSetup === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSetListeningSetup(id)}
              className={`glass-morphism rounded-xl p-4 flex flex-col items-center gap-2 transition-all cursor-pointer border ${
                selected
                  ? 'border-[#dd6e42] bg-[#dd6e42]/10'
                  : 'border-white/10'
              }`}
            >
              <Icon size={28} className={selected ? 'text-[#dd6e42]' : 'text-th-text3'} />
              <span className={`text-sm ${selected ? 'text-th-text' : 'text-th-text3'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>

    {/* Collecting Goal */}
    <div className="w-full">
      <label className="block font-label text-[10px] tracking-widest text-th-text3 uppercase mb-3">
        What drives your collecting?
      </label>
      <div className="grid grid-cols-3 gap-3">
        {GOAL_OPTIONS.map(({ id, label, Icon }) => {
          const selected = collectingGoal === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSetCollectingGoal(id)}
              className={`glass-morphism rounded-xl p-4 flex flex-col items-center gap-2 transition-all cursor-pointer border ${
                selected
                  ? 'border-[#dd6e42] bg-[#dd6e42]/10'
                  : 'border-white/10'
              }`}
            >
              <Icon size={28} className={selected ? 'text-[#dd6e42]' : 'text-th-text3'} />
              <span className={`text-sm ${selected ? 'text-th-text' : 'text-th-text3'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

/* ─── Step 3: Plan Selection ─── */

const PLAN_OPTIONS: {
  id: ProfileData['selectedTier'];
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  Icon: typeof Archive;
  badge?: string;
  features: string[];
  selectedBg: string;
  selectedBorder: string;
  selectedRing: string;
  selectedAccent: string;
}[] = [
  {
    id: 'collector',
    name: 'Collector',
    monthlyPrice: 'Free',
    annualPrice: 'Free',
    Icon: Archive,
    features: ['Up to 100 albums', 'AI identification', 'Wantlist & Discogs pricing', 'Spins & play history', 'Listening Room', 'Basic collection stats'],
    selectedBg: 'bg-slate-500/15',
    selectedBorder: 'border-slate-400',
    selectedRing: 'ring-slate-400/50',
    selectedAccent: 'text-slate-300',
  },
  {
    id: 'curator',
    name: 'Curator',
    monthlyPrice: '$4.99/mo',
    annualPrice: '$49.99/yr',
    Icon: Crown,
    badge: 'Most Popular',
    features: [
      'Unlimited albums',
      'Unlimited AI scans',
      'AI playlist generation',
      'Lyrics for all tracks',
      'Multi-source cover art',
      'Wantlist & price alerts',
      'Stakkd \u2014 unlimited gear',
      'AI gear identification',
      'Manual finder & setup guides',
      'Listening Room',
      'Collection Export \u2014 CSV & PDF',
    ],
    selectedBg: 'bg-emerald-500/15',
    selectedBorder: 'border-emerald-400',
    selectedRing: 'ring-emerald-400/50',
    selectedAccent: 'text-emerald-400',
  },
  {
    id: 'enthusiast',
    name: 'Archivist',
    monthlyPrice: '$9.99/mo',
    annualPrice: '$99.99/yr',
    Icon: Gem,
    features: [
      'Everything in Curator',
      'Room Planner \u2014 rooms, layout & gear placement',
      'Shelf Organizer',
      'Collection Analytics \u2014 charts & insights',
      'Bulk import & export',
      'PDF collection catalogs',
      'Early beta access',
      'Priority support',
    ],
    selectedBg: 'bg-violet-500/15',
    selectedBorder: 'border-violet-400',
    selectedRing: 'ring-violet-400/50',
    selectedAccent: 'text-violet-400',
  },
];

interface StepPlanSelectionProps {
  emailDigestOptin: boolean;
  selectedTier: ProfileData['selectedTier'];
  isAnnual: boolean;
  onToggleEmailDigest: () => void;
  onSelectTier: (tier: ProfileData['selectedTier']) => void;
  onToggleAnnual: () => void;
}

const StepPlanSelection: React.FC<StepPlanSelectionProps> = ({
  emailDigestOptin, selectedTier, isAnnual, onToggleEmailDigest, onSelectTier, onToggleAnnual,
}) => {

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="font-display text-4xl md:text-5xl font-bold text-[#dd6e42] mb-3 text-center">
        Choose your plan
      </h2>
      <p className="text-th-text3 text-lg mb-6 text-center">
        Start free, upgrade anytime. All paid plans include a 7-day free trial.
      </p>

      {/* Monthly / Annual toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${!isAnnual ? 'text-th-text' : 'text-th-text3'}`}>
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isAnnual}
          onClick={onToggleAnnual}
          className={`relative w-12 h-6 rounded-full border-2 transition-all cursor-pointer ${
            isAnnual
              ? 'bg-[#dd6e42] border-[#dd6e42]'
              : 'bg-th-surface/[0.15] border-th-surface/[0.25]'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
              isAnnual ? 'translate-x-6' : ''
            }`}
          />
        </button>
        <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${isAnnual ? 'text-th-text' : 'text-th-text3'}`}>
          Annual
        </span>
        {isAnnual && (
          <span className="text-[10px] font-bold uppercase tracking-widest bg-[#dd6e42]/10 text-[#dd6e42] px-2 py-0.5 rounded-full">
            Save 18%
          </span>
        )}
      </div>

      {/* Email digest toggle */}
      <div className="w-full max-w-md flex items-center justify-between glass-morphism rounded-xl px-5 py-4 mb-8 border border-white/10">
        <div className="flex items-center gap-3">
          <Mail size={20} className="text-[#dd6e42]" />
          <div>
            <p className="text-sm text-th-text">Monthly collection digest</p>
            <p className="text-xs text-th-text3">Stats, new features &amp; collecting tips</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={emailDigestOptin}
          onClick={onToggleEmailDigest}
          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-none shrink-0 ${
            emailDigestOptin ? 'bg-[#dd6e42]' : 'bg-th-surface/20'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
              emailDigestOptin ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Plan cards */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLAN_OPTIONS.map(({ id, name, monthlyPrice, annualPrice, Icon, badge, features, selectedBg, selectedBorder, selectedRing, selectedAccent }) => {
          const selected = selectedTier === id;
          const price = isAnnual ? annualPrice : monthlyPrice;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelectTier(id)}
              className={`relative rounded-xl p-5 flex flex-col items-center text-center transition-all duration-200 cursor-pointer border ${
                selected
                  ? `${selectedBorder} ${selectedBg} ring-1 ${selectedRing}`
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              {badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#dd6e42] text-white text-[10px] font-label tracking-wider uppercase px-3 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
              <Icon size={28} className={selected ? selectedAccent : 'text-th-text3'} />
              <h3 className={`font-display text-lg font-bold mt-3 mb-1 ${selected ? 'text-th-text' : 'text-th-text2'}`}>
                {name}
              </h3>
              {price === 'Free' ? (
                <p className={`text-2xl font-bold mb-4 ${selected ? selectedAccent : 'text-th-text2'}`}>Free</p>
              ) : (
                <div className="flex items-baseline gap-0.5 mb-4">
                  <span className={`text-sm font-semibold ${selected ? selectedAccent : 'text-th-text3'}`}>$</span>
                  <span className={`text-2xl font-bold ${selected ? 'text-th-text' : 'text-th-text2'}`}>
                    {price.slice(1, price.indexOf('/'))}
                  </span>
                  <span className={`text-sm ${selected ? selectedAccent : 'text-th-text3'}`}>
                    {price.slice(price.indexOf('/'))}
                  </span>
                </div>
              )}
              <ul className="text-xs text-th-text3 space-y-1.5 text-left w-full">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <span className={`mt-0.5 shrink-0 ${selected ? selectedAccent : 'text-th-text3'}`}>&bull;</span>
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <p className="text-th-text3 text-xs text-center mt-6 max-w-md">
        All paid plans start with a 7-day free trial. Cancel anytime.
      </p>
    </div>
  );
};

/* ─── Step 4: Get Started ─── */

interface StepGetStartedProps {
  displayName: string;
  startAction: ProfileData['startAction'];
  selectedTier: ProfileData['selectedTier'];
  onSelectStartAction: (action: ProfileData['startAction']) => void;
}

const StepGetStarted: React.FC<StepGetStartedProps> = ({
  displayName, startAction, selectedTier, onSelectStartAction,
}) => {
  const tierLabel = selectedTier === 'curator' ? 'Curator' : selectedTier === 'enthusiast' ? 'Archivist' : '';

  return (
    <div className="w-full flex flex-col items-center text-center">
      {/* Vinyl SVG */}
      <svg className="w-24 h-24 mb-8" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="58" stroke="#dd6e42" strokeWidth="1" opacity="0.3" />
        <circle cx="60" cy="60" r="50" fill="#1a1a1a" />
        <circle cx="60" cy="60" r="48" fill="none" stroke="#333" strokeWidth="0.5" />
        <circle cx="60" cy="60" r="40" fill="none" stroke="#333" strokeWidth="0.3" />
        <circle cx="60" cy="60" r="32" fill="none" stroke="#333" strokeWidth="0.3" />
        <circle cx="60" cy="60" r="20" fill="#c45a30" />
        <circle cx="60" cy="60" r="4" fill="#1a1a1a" />
      </svg>

      <h2 className="font-display text-4xl md:text-5xl font-bold text-[#dd6e42] mb-3">
        You're all set{displayName ? `, ${displayName}` : ''}!
      </h2>
      <p className="text-th-text3 text-lg mb-10">
        Your collection is waiting. Let's go.
      </p>

      {/* CTA cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
        <button
          type="button"
          onClick={() => onSelectStartAction('scan')}
          className={`glass-morphism rounded-xl p-5 flex flex-col items-center gap-3 transition-all cursor-pointer border ${
            startAction === 'scan'
              ? 'border-[#dd6e42] bg-[#dd6e42]/10'
              : 'border-white/10'
          }`}
        >
          <Camera size={28} className={startAction === 'scan' ? 'text-[#dd6e42]' : 'text-th-text3'} />
          <span className={`font-display font-bold text-sm ${startAction === 'scan' ? 'text-th-text' : 'text-th-text2'}`}>
            Scan Your First Album
          </span>
          <span className="text-th-text3 text-xs">Point your camera at any vinyl, cassette, 8-track, or barcode</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectStartAction('explore')}
          className={`glass-morphism rounded-xl p-5 flex flex-col items-center gap-3 transition-all cursor-pointer border ${
            startAction === 'explore'
              ? 'border-[#dd6e42] bg-[#dd6e42]/10'
              : 'border-white/10'
          }`}
        >
          <Compass size={28} className={startAction === 'explore' ? 'text-[#dd6e42]' : 'text-th-text3'} />
          <span className={`font-display font-bold text-sm ${startAction === 'explore' ? 'text-th-text' : 'text-th-text2'}`}>
            Explore the App
          </span>
          <span className="text-th-text3 text-xs">Browse your collection and features</span>
        </button>
      </div>

      {tierLabel && (
        <p className="text-th-text3 text-sm mt-6">
          We'll set up your {tierLabel} plan after you explore the app.
        </p>
      )}
    </div>
  );
};

/* ─── Main Wizard ─── */

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, previewMode }) => {
  const { user, session } = useAuthContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState<ProfileData>({
    displayName: '',
    favoriteGenres: [],
    listeningSetup: '',
    collectingGoal: '',
    emailDigestOptin: true,
    selectedTier: 'collector',
    billingInterval: 'monthly',
    startAction: 'explore',
  });
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const [saving, setSaving] = useState(false);
  const pendingStepRef = useRef<number | null>(null);
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOTAL_STEPS - 1;
  const progress = (currentStep + 1) / TOTAL_STEPS;

  // Per-step validation
  const canAdvance = (() => {
    switch (currentStep) {
      case 0: return profileData.displayName.trim().length > 0;
      default: return true;
    }
  })();

  // Per-step pre-advance cleanup (trim, normalize, etc.)
  const prepareStepData = useCallback(() => {
    switch (currentStep) {
      case 0:
        setProfileData(prev => ({ ...prev, displayName: prev.displayName.trim() }));
        break;
    }
  }, [currentStep]);

  const transitionToStep = useCallback((nextStep: number) => {
    setFadeState('out');
    pendingStepRef.current = nextStep;
  }, []);

  // After fade-out completes, switch step and fade back in
  const handleTransitionEnd = useCallback(() => {
    if (fadeState === 'out' && pendingStepRef.current !== null) {
      setCurrentStep(pendingStepRef.current);
      pendingStepRef.current = null;
      setFadeState('in');
    }
  }, [fadeState]);

  const saveAndComplete = useCallback(async (fullSave: boolean, overrides?: { selectedTier?: ProfileData['selectedTier'] }) => {
    const tier = overrides?.selectedTier ?? profileData.selectedTier;
    const action = profileData.startAction;
    const interval = profileData.billingInterval;
    const selectedPriceId = (tier === 'curator' || tier === 'enthusiast') ? `${tier}:${interval}` : undefined;
    if (previewMode) {
      onComplete(action, tier, selectedPriceId);
      return;
    }
    if (!user) {
      console.error('[onboarding] saveAndComplete: no user — cannot save');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(user.id, {
        ...(fullSave ? {
          display_name: profileData.displayName,
          favorite_genres: profileData.favoriteGenres,
          listening_setup: profileData.listeningSetup || null,
          collecting_goal: profileData.collectingGoal || null,
          email_digest_optin: profileData.emailDigestOptin,
          onboarding_selected_tier: tier,
        } : {}),
        onboarding_completed: true,
      } as Parameters<typeof updateProfile>[1]);
      // Fire-and-forget: welcome email on onboarding completion
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      fetch('/api/onboarding/complete', { method: 'POST', headers }).catch(() => {});

      onComplete(action, tier, selectedPriceId);
    } catch (err) {
      console.error('[onboarding] Failed to save profile:', err);
      // Still proceed — profile can be updated later
      onComplete(action, tier, selectedPriceId);
    } finally {
      setSaving(false);
    }
  }, [previewMode, user, session, profileData, onComplete]);

  const handleNext = useCallback(() => {
    if (!canAdvance) return;
    prepareStepData();
    if (isLast) {
      saveAndComplete(true);
    } else if (currentStep === 2 && (profileData.selectedTier === 'curator' || profileData.selectedTier === 'enthusiast')) {
      // Paid plan selected — skip step 4 and complete immediately
      saveAndComplete(true);
    } else {
      transitionToStep(currentStep + 1);
    }
  }, [canAdvance, prepareStepData, isLast, currentStep, profileData.selectedTier, saveAndComplete, transitionToStep]);

  const handleBack = useCallback(() => {
    if (!isFirst) {
      transitionToStep(currentStep - 1);
    }
  }, [isFirst, currentStep, transitionToStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !saving && canAdvance) {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, saving, canAdvance]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepWelcome
            displayName={profileData.displayName}
            onDisplayNameChange={value => setProfileData(prev => ({ ...prev, displayName: value }))}
          />
        );
      case 1:
        return (
          <StepHabits
            favoriteGenres={profileData.favoriteGenres}
            listeningSetup={profileData.listeningSetup}
            collectingGoal={profileData.collectingGoal}
            onToggleGenre={genre =>
              setProfileData(prev => ({
                ...prev,
                favoriteGenres: prev.favoriteGenres.includes(genre)
                  ? prev.favoriteGenres.filter(g => g !== genre)
                  : [...prev.favoriteGenres, genre],
              }))
            }
            onSetListeningSetup={id => setProfileData(prev => ({ ...prev, listeningSetup: id }))}
            onSetCollectingGoal={id => setProfileData(prev => ({ ...prev, collectingGoal: id }))}
          />
        );
      case 2:
        return (
          <StepPlanSelection
            emailDigestOptin={profileData.emailDigestOptin}
            selectedTier={profileData.selectedTier}
            isAnnual={profileData.billingInterval === 'annual'}
            onToggleEmailDigest={() =>
              setProfileData(prev => ({ ...prev, emailDigestOptin: !prev.emailDigestOptin }))
            }
            onSelectTier={tier => setProfileData(prev => ({ ...prev, selectedTier: tier }))}
            onToggleAnnual={() =>
              setProfileData(prev => ({ ...prev, billingInterval: prev.billingInterval === 'monthly' ? 'annual' : 'monthly' }))
            }
          />
        );
      case 3:
        return (
          <StepGetStarted
            displayName={profileData.displayName}
            startAction={profileData.startAction}
            selectedTier={profileData.selectedTier}
            onSelectStartAction={action => setProfileData(prev => ({ ...prev, startAction: action }))}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={previewMode ? "h-full min-h-screen bg-th-bg flex flex-col" : "fixed inset-0 z-50 bg-th-bg flex flex-col"}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 shrink-0">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-[#dd6e42] to-[#4f6d7a] rounded-lg flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" fill="#f0a882" />
              <circle cx="12" cy="12" r="9.5" fill="none" stroke="#d48a6a" strokeWidth="0.4" opacity="0.5" />
              <circle cx="12" cy="12" r="8" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.4" />
              <circle cx="12" cy="12" r="5.2" fill="#c45a30" />
              <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#f0a882">R</text>
            </svg>
          </div>
          <span className="font-display text-lg font-bold text-th-text tracking-tight">
            Rekk<span className="text-[#dd6e42]">r</span>d
          </span>
          {previewMode && (
            <span className="ml-2 bg-[#dd6e42] text-white text-[10px] font-label tracking-wider uppercase px-2 py-0.5 rounded">
              Preview
            </span>
          )}
        </div>

        {/* Center: Progress */}
        <div className="flex flex-col items-center gap-1.5 flex-1 mx-4">
          <span className="font-label text-[10px] tracking-widest text-th-text3 uppercase">
            Step {currentStep + 1} of {TOTAL_STEPS}
          </span>
          <div className="w-full max-w-xs h-1 rounded-full bg-th-bg3/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#dd6e42] transition-all duration-500 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

      </header>

      {/* Main content area */}
      <main className="flex-1 flex items-center justify-center px-4 md:px-8 overflow-y-auto">
        <div
          className="w-full max-w-5xl flex flex-col items-center justify-center py-12"
          style={{
            opacity: fadeState === 'in' ? 1 : 0,
            transition: 'opacity 150ms ease-in-out',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {renderStep()}
        </div>
      </main>

      {/* Bottom nav bar */}
      <footer className="flex items-center justify-between px-4 md:px-8 py-4 shrink-0 border-t border-th-surface/[0.06]">
        {/* Left: Back */}
        {!isFirst ? (
          <button
            type="button"
            onClick={handleBack}
            disabled={saving}
            className="font-label text-xs tracking-wider text-th-text3 uppercase hover:text-th-text2 transition-colors bg-transparent border-none cursor-pointer px-4 py-2 disabled:opacity-50"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {/* Right: Next / Get Started */}
        <button
          type="button"
          onClick={handleNext}
          disabled={saving || !canAdvance}
          className="px-6 py-2.5 rounded-lg bg-[#dd6e42] hover:bg-[#c45a30] text-white font-label text-xs tracking-wider uppercase transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isLast ? (
            'Get Started'
          ) : (
            'Next'
          )}
        </button>
      </footer>
    </div>
  );
};

export default OnboardingWizard;
