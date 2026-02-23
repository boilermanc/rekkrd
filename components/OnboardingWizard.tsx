import React, { useState, useRef, useEffect, useCallback } from 'react';
import { updateProfile } from '../services/profileService';
import { useAuthContext } from '../contexts/AuthContext';
import { Headphones, Music, Disc3, Tv, Sparkles, Heart, Trophy, TrendingUp, Mail, Archive, Crown, Gem, Camera, Compass } from 'lucide-react';
import AlbumCard from './AlbumCard';
import WantlistCard from './WantlistCard';
import { useCheckout } from '../hooks/useCheckout';
import type { Album, WantlistItem } from '../types';

const TOTAL_STEPS = 9;

interface OnboardingWizardProps {
  onComplete: (startAction?: 'scan' | 'explore') => void;
  previewMode?: boolean;
}

interface ProfileData {
  displayName: string;
  favoriteGenres: string[];
  listeningSetup: string;
  collectingGoal: string;
  emailDigestOptin: boolean;
  selectedTier: 'collector' | 'curator' | 'enthusiast';
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
  price: string;
  Icon: typeof Archive;
  badge?: string;
  features: string[];
}[] = [
  {
    id: 'collector',
    name: 'Collector',
    price: 'Free',
    Icon: Archive,
    features: ['Up to 50 albums', 'AI identification', 'Basic collection stats'],
  },
  {
    id: 'curator',
    name: 'Curator',
    price: '$4.99/mo',
    Icon: Crown,
    badge: 'Most Popular',
    features: ['Up to 500 albums', 'Playlist Studio', 'Advanced analytics', 'Priority AI'],
  },
  {
    id: 'enthusiast',
    name: 'Enthusiast',
    price: '$9.99/mo',
    Icon: Gem,
    features: ['Unlimited albums', 'Everything in Curator', 'Discogs sync', 'Early access features'],
  },
];

interface StepPlanSelectionProps {
  emailDigestOptin: boolean;
  selectedTier: ProfileData['selectedTier'];
  onToggleEmailDigest: () => void;
  onSelectTier: (tier: ProfileData['selectedTier']) => void;
}

const StepPlanSelection: React.FC<StepPlanSelectionProps> = ({
  emailDigestOptin, selectedTier, onToggleEmailDigest, onSelectTier,
}) => (
  <div className="w-full flex flex-col items-center">
    <h2 className="font-display text-4xl md:text-5xl font-bold text-[#dd6e42] mb-3 text-center">
      Choose your plan
    </h2>
    <p className="text-th-text3 text-lg mb-10 text-center">
      Start free, upgrade anytime. All paid plans include a 14-day free trial.
    </p>

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

    {/* Divider */}
    <div className="w-full flex items-center gap-3 mb-8">
      <div className="flex-1 h-px bg-th-surface/10" />
      <span className="font-label text-[10px] tracking-widest text-th-text3 uppercase">
        Select a plan
      </span>
      <div className="flex-1 h-px bg-th-surface/10" />
    </div>

    {/* Plan cards */}
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
      {PLAN_OPTIONS.map(({ id, name, price, Icon, badge, features }) => {
        const selected = selectedTier === id;
        const isCurator = id === 'curator';
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectTier(id)}
            className={`relative glass-morphism rounded-xl p-5 flex flex-col items-center text-center transition-all cursor-pointer border ${
              selected
                ? 'border-[#dd6e42] bg-[#dd6e42]/10'
                : 'border-white/10'
            } ${isCurator && selected ? 'shadow-[0_0_20px_rgba(221,110,66,0.15)]' : ''}`}
          >
            {badge && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#dd6e42] text-white text-[10px] font-label tracking-wider uppercase px-3 py-0.5 rounded-full">
                {badge}
              </span>
            )}
            <Icon size={28} className={selected ? 'text-[#dd6e42]' : 'text-th-text3'} />
            <h3 className={`font-display text-lg font-bold mt-3 mb-1 ${selected ? 'text-th-text' : 'text-th-text2'}`}>
              {name}
            </h3>
            <p className={`text-sm font-label mb-4 ${selected ? 'text-[#dd6e42]' : 'text-th-text3'}`}>
              {price}
            </p>
            <ul className="text-xs text-th-text3 space-y-1.5 text-left w-full">
              {features.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 ${selected ? 'text-[#dd6e42]' : 'text-th-text3'}`}>&bull;</span>
                  {f}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>

    <p className="text-th-text3 text-xs text-center mt-6 max-w-md">
      Paid plans start with a 14-day free trial. Cancel anytime. You won't be charged during onboarding.
    </p>
  </div>
);

/* ─── Tour Step Layout ─── */

interface TourStepLayoutProps {
  heading: string;
  description: string;
  bullets: string[];
  children: React.ReactNode;
}

const TourStepLayout: React.FC<TourStepLayoutProps> = ({ heading, description, bullets, children }) => (
  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
    {/* Left: copy */}
    <div className="flex flex-col">
      <span className="font-label text-[10px] tracking-widest text-[#dd6e42] uppercase mb-3">
        Feature Tour
      </span>
      <h2 className="font-display text-3xl md:text-4xl font-bold text-th-text mb-3">
        {heading}
      </h2>
      <p className="text-th-text3 text-sm leading-relaxed mb-6">
        {description}
      </p>
      <ul className="space-y-2.5">
        {bullets.map(b => (
          <li key={b} className="flex items-start gap-2.5 text-sm text-th-text2">
            <span className="text-[#dd6e42] mt-0.5 shrink-0">&bull;</span>
            {b}
          </li>
        ))}
      </ul>
    </div>
    {/* Right: live preview */}
    <div className="pointer-events-none select-none scale-90 origin-top transform">
      {children}
    </div>
  </div>
);

/* ─── Step 4: AI Scanning Tour ─── */

const ScanDemoPreview: React.FC = () => (
  <div className="flex flex-col gap-3">
    {/* Fake camera viewport */}
    <div className="relative aspect-video rounded-xl glass-morphism border border-white/10 flex items-center justify-center overflow-hidden">
      {/* Static vinyl disc SVG */}
      <svg className="w-28 h-28 opacity-60" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="58" stroke="#dd6e42" strokeWidth="1" opacity="0.3" />
        <circle cx="60" cy="60" r="50" fill="#1a1a1a" />
        <circle cx="60" cy="60" r="48" fill="none" stroke="#333" strokeWidth="0.5" />
        <circle cx="60" cy="60" r="40" fill="none" stroke="#333" strokeWidth="0.3" />
        <circle cx="60" cy="60" r="32" fill="none" stroke="#333" strokeWidth="0.3" />
        <circle cx="60" cy="60" r="20" fill="#c45a30" />
        <circle cx="60" cy="60" r="4" fill="#1a1a1a" />
      </svg>
      {/* Pulsing overlay text */}
      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[#dd6e42] font-label text-xs tracking-widest uppercase animate-pulse">
        Identifying...
      </span>
    </div>
    {/* Fake result card */}
    <div className="glass-morphism rounded-xl border border-white/10 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-th-text font-display font-bold text-sm">Rumours</p>
          <p className="text-th-text3 text-xs">Fleetwood Mac</p>
        </div>
        <span className="text-th-text3 text-xs font-label">1977</span>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <span className="text-[#dd6e42] font-label text-sm">$23 estimated value</span>
        <span className="text-green-400 text-[10px] font-label tracking-wide">&#10003; Match found via Discogs</span>
      </div>
    </div>
  </div>
);

/* ─── Step 5: Collection Tour — Dummy Data ─── */

const noop = () => {};

const DUMMY_ALBUMS: Album[] = [
  {
    id: 'demo-1',
    created_at: '2024-01-01T00:00:00Z',
    artist: 'Fleetwood Mac',
    title: 'Rumours',
    year: '1977',
    genre: 'Rock',
    cover_url: '',
    price_median: 23,
    isFavorite: true,
  },
  {
    id: 'demo-2',
    created_at: '2024-01-02T00:00:00Z',
    artist: 'Miles Davis',
    title: 'Kind of Blue',
    year: '1959',
    genre: 'Jazz',
    cover_url: '',
    price_median: 45,
  },
  {
    id: 'demo-3',
    created_at: '2024-01-03T00:00:00Z',
    artist: 'Prince',
    title: 'Purple Rain',
    year: '1984',
    genre: 'Pop',
    cover_url: '',
    price_median: 18,
  },
];

/* ─── Step 6: Wantlist Tour — Dummy Data ─── */

const DUMMY_WANTLIST: WantlistItem[] = [
  {
    id: 'wl-demo-1',
    user_id: 'demo',
    artist: 'David Bowie',
    title: 'Ziggy Stardust',
    year: '1972',
    genre: 'Rock',
    cover_url: null,
    discogs_release_id: null,
    discogs_url: null,
    price_low: 18,
    price_median: 34,
    price_high: 67,
    prices_updated_at: new Date().toISOString(),
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'wl-demo-2',
    user_id: 'demo',
    artist: 'Aretha Franklin',
    title: 'I Never Loved a Man',
    year: '1967',
    genre: 'Soul',
    cover_url: null,
    discogs_release_id: null,
    discogs_url: null,
    price_low: null,
    price_median: 28,
    price_high: null,
    prices_updated_at: null,
    created_at: '2024-01-02T00:00:00Z',
  },
];

/* ─── Step 7: Discogs Integration ─── */

const DiscogsPreview: React.FC = () => (
  <div className="glass-morphism rounded-xl border border-white/10 p-6 flex flex-col items-center text-center">
    <span className="text-white font-bold text-2xl tracking-tight mb-1">discogs</span>
    <p className="text-th-text3 text-xs mb-5">16 million+ releases. 60 million+ listings.</p>
    <div className="w-full px-4 py-2.5 rounded-lg bg-[#dd6e42] text-white font-label text-xs tracking-wider uppercase text-center mb-5">
      Connect Discogs
    </div>
    <div className="flex flex-wrap gap-2 justify-center">
      {['Collection Import', 'Wantlist Sync', 'Price Data'].map(label => (
        <span
          key={label}
          className="glass-morphism rounded-full text-xs text-th-text3 px-3 py-1 border border-white/10"
        >
          {label}
        </span>
      ))}
    </div>
  </div>
);

/* ─── Step 8: Stakkd Gear Catalog ─── */

const StakkdGearPreview: React.FC = () => (
  <div className="glass-morphism rounded-xl border border-white/10 p-4 flex flex-col gap-3">
    <span className="text-[#dd6e42] text-xs font-label uppercase tracking-widest">
      Turntable
    </span>
    <div>
      <p className="text-th-text3 text-xs">Technics</p>
      <p className="text-th-text font-bold text-lg font-display">SL-1200MK2</p>
    </div>
    <p className="text-th-text3 text-xs">1978 – 2010</p>
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-2 border-t border-white/5">
      <span className="text-th-text3">Drive Type</span>
      <span className="text-th-text2">Direct Drive</span>
      <span className="text-th-text3">Speed</span>
      <span className="text-th-text2">33&#8531; / 45 RPM</span>
      <span className="text-th-text3">Wow &amp; Flutter</span>
      <span className="text-th-text2">0.025%</span>
      <span className="text-th-text3">Signal-to-Noise</span>
      <span className="text-th-text2">78 dB</span>
    </div>
    <div className="flex items-center justify-between pt-2 border-t border-white/5">
      <span className="text-th-text3 text-[10px] font-label tracking-wider uppercase">Collector</span>
      <span className="text-[#dd6e42] text-xs font-label tracking-wider">Stakkd</span>
    </div>
  </div>
);

/* ─── Step 9: Get Started ─── */

interface StepGetStartedProps {
  displayName: string;
  startAction: ProfileData['startAction'];
  selectedTier: ProfileData['selectedTier'];
  onSelectStartAction: (action: ProfileData['startAction']) => void;
}

const StepGetStarted: React.FC<StepGetStartedProps> = ({
  displayName, startAction, selectedTier, onSelectStartAction,
}) => {
  const tierLabel = selectedTier === 'curator' ? 'Curator' : selectedTier === 'enthusiast' ? 'Enthusiast' : '';

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
            Scan Your First Record
          </span>
          <span className="text-th-text3 text-xs">Point your camera at any album cover</span>
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
    startAction: 'explore',
  });
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const [saving, setSaving] = useState(false);
  const pendingStepRef = useRef<number | null>(null);
  const [pricing, setPricing] = useState<Record<string, { monthly?: { priceId: string } }> | null>(null);
  const { checkout } = useCheckout();

  // Fetch Stripe prices on mount (for paid tier checkout on final step)
  useEffect(() => {
    if (previewMode) return;
    fetch('/api/prices')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.tiers) setPricing(data.tiers); })
      .catch(() => {});
  }, [previewMode]);

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

  const saveAndComplete = useCallback(async (fullSave: boolean) => {
    if (previewMode) {
      onComplete(profileData.startAction);
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        ...(fullSave ? {
          display_name: profileData.displayName,
          favorite_genres: profileData.favoriteGenres,
          listening_setup: profileData.listeningSetup || null,
          collecting_goal: profileData.collectingGoal || null,
          onboarding_selected_tier: profileData.selectedTier,
        } : {}),
        onboarding_completed: true,
      } as Parameters<typeof updateProfile>[1]);

      // Fire-and-forget: welcome email on onboarding completion
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      fetch('/api/onboarding/complete', { method: 'POST', headers }).catch(() => {});

      // Paid tier → Stripe checkout redirect (page will navigate away)
      const tier = profileData.selectedTier;
      if (fullSave && tier !== 'collector') {
        const priceId = pricing?.[tier]?.monthly?.priceId;
        if (priceId) {
          checkout(priceId);
          return; // Stripe redirects the page; don't call onComplete
        }
      }

      onComplete(profileData.startAction);
    } catch (err) {
      console.error('Failed to save onboarding profile:', err);
      // Still proceed — profile can be updated later
      onComplete(profileData.startAction);
    } finally {
      setSaving(false);
    }
  }, [previewMode, user, session, profileData, onComplete, checkout, pricing]);

  const handleSkipAll = useCallback(() => {
    saveAndComplete(false);
  }, [saveAndComplete]);

  const handleNext = useCallback(() => {
    if (!canAdvance) return;
    prepareStepData();
    if (isLast) {
      saveAndComplete(true);
    } else {
      transitionToStep(currentStep + 1);
    }
  }, [canAdvance, prepareStepData, isLast, currentStep, saveAndComplete, transitionToStep]);

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
            onToggleEmailDigest={() =>
              setProfileData(prev => ({ ...prev, emailDigestOptin: !prev.emailDigestOptin }))
            }
            onSelectTier={tier => setProfileData(prev => ({ ...prev, selectedTier: tier }))}
          />
        );
      case 3:
        return (
          <TourStepLayout
            heading="Scan Any Record Instantly"
            description="Point your camera at any album cover. Our AI identifies it in seconds and fills in artist, title, tracklist, and pricing automatically."
            bullets={[
              'Works with any commercially released record',
              'Cross-references Discogs for pressing details',
              'Barcode scanning for instant matches',
            ]}
          >
            <ScanDemoPreview />
          </TourStepLayout>
        );
      case 4:
        return (
          <TourStepLayout
            heading="Your Collection, Beautifully Organized"
            description="Every record cataloged with cover art, tracklist, condition grading, and market value. Search, filter, and sort your entire library instantly."
            bullets={[
              'Grid and list views',
              'Filter by genre, decade, condition',
              'Mark favorites, track play counts',
            ]}
          >
            <div className="grid grid-cols-3 gap-2">
              {DUMMY_ALBUMS.map(album => (
                <AlbumCard key={album.id} album={album} onDelete={noop} onSelect={noop} />
              ))}
            </div>
          </TourStepLayout>
        );
      case 5:
        return (
          <TourStepLayout
            heading="Track Records You're Hunting For"
            description="Add records to your wantlist and watch their market prices. When you find one, mark it as owned and it moves straight into your collection."
            bullets={[
              'Import your Discogs wantlist in one click',
              'Real-time Discogs marketplace pricing',
              'Two-step confirm before marking as owned',
            ]}
          >
            <div className="flex flex-col gap-3">
              {DUMMY_WANTLIST.map(item => (
                <WantlistCard key={item.id} item={item} onRemove={noop} onMarkAsOwned={noop} isInCollection={false} />
              ))}
            </div>
          </TourStepLayout>
        );
      case 6:
        return (
          <TourStepLayout
            heading="Connect Your Discogs Account"
            description="Already have your collection cataloged on Discogs? Import it in one click. Connect your account to sync your collection, wantlist, and get real-time marketplace pricing."
            bullets={[
              'Import thousands of records instantly',
              'Wantlist sync with live pricing',
              'Two-way collection sync',
              'Powered by the world\'s largest vinyl database',
            ]}
          >
            <DiscogsPreview />
          </TourStepLayout>
        );
      case 7:
        return (
          <TourStepLayout
            heading="Catalog Your Entire Setup"
            description="Stakkd is your audio gear catalog. Photograph your turntable, amplifier, or speakers and our AI identifies it, pulls specs, and helps you document your complete signal chain."
            bullets={[
              'AI-powered gear identification',
              'Full specs database (turntables, amps, cartridges, speakers)',
              'Document your signal chain',
              'Track purchase prices and gear value',
            ]}
          >
            <StakkdGearPreview />
          </TourStepLayout>
        );
      case 8:
        return (
          <StepGetStarted
            displayName={profileData.displayName}
            startAction={profileData.startAction}
            selectedTier={profileData.selectedTier}
            onSelectStartAction={action => setProfileData(prev => ({ ...prev, startAction: action }))}
          />
        );
      default:
        return (
          <div className="glass-morphism rounded-xl p-8 md:p-12 w-full text-center">
            <span className="font-label text-[10px] tracking-widest text-[#dd6e42] uppercase block mb-4">
              // Step {currentStep + 1}
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-th-text mb-2">
              Step {currentStep + 1}
            </h2>
            <p className="text-th-text3 text-sm">
              Content for this step will be added in a future task.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-th-bg flex flex-col">
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

        {/* Right: Skip */}
        <button
          type="button"
          onClick={handleSkipAll}
          disabled={saving}
          className="font-label text-[10px] tracking-widest text-th-text3 uppercase hover:text-th-text2 transition-colors bg-transparent border-none cursor-pointer px-2 py-1 disabled:opacity-50"
        >
          Skip Setup
        </button>
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
