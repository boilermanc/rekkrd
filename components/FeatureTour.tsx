import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Disc3, Layers, Trash2, X } from 'lucide-react';
import AlbumCard from './AlbumCard';
import type { Album } from '../types';

const TOTAL_STEPS = 5;

interface FeatureTourProps {
  onComplete: () => void;
  onClose: () => void;
}

/* ─── Tour Step Layout ─── */

interface TourStepLayoutProps {
  heading: string;
  description: string;
  bullets: string[];
  children: React.ReactNode;
}

const TourStepLayout: React.FC<TourStepLayoutProps> = ({ heading, description, bullets, children }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
    {/* Left: copy */}
    <div className="flex flex-col min-w-0 pt-4">
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

/* ─── AI Scanning Tour ─── */

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

/* ─── Collection Tour — Dummy Data ─── */

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
    format: 'Vinyl',
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
    format: 'Cassette',
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
    format: 'Vinyl',
  },
];

/* ─── Wantlist Tour — Compact Preview ─── */

interface WantlistPreviewItem {
  title: string;
  artist: string;
  year: string;
  genre: string;
  priceLow: number | null;
  priceMedian: number;
  priceHigh: number | null;
  updated: boolean;
}

const WANTLIST_ITEMS: WantlistPreviewItem[] = [
  { title: 'Ziggy Stardust', artist: 'David Bowie', year: '1972', genre: 'Rock', priceLow: 18, priceMedian: 34, priceHigh: 67, updated: true },
  { title: 'I Never Loved a Man', artist: 'Aretha Franklin', year: '1967', genre: 'Soul', priceLow: null, priceMedian: 28, priceHigh: null, updated: false },
];

const WantlistPreview: React.FC = () => (
  <div className="flex flex-col gap-3">
    {WANTLIST_ITEMS.map(item => (
      <div key={item.title} className="glass-morphism rounded-xl border border-white/10 overflow-hidden">
        {/* Compact cover placeholder */}
        <div className="h-28 bg-th-bg/40 relative flex items-center justify-center">
          <Disc3 className="w-12 h-12 text-th-text3/30" />
          <div className="absolute bottom-2 left-2 bg-[#dd6e42]/90 backdrop-blur-sm text-th-text px-2 py-0.5 rounded text-[10px] font-bold shadow-lg border border-[#f0a882]/50">
            ${item.priceMedian}
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-bold text-th-text text-sm truncate">{item.title}</h3>
          <p className="text-[#dd6e42] text-xs font-medium truncate">{item.artist}</p>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-th-text3 uppercase tracking-widest">
            <span>{item.year}</span>
            <span>{item.genre}</span>
          </div>
          {/* Price row */}
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
            {item.priceLow !== null && (
              <div className="text-center">
                <span className="block text-th-text3 uppercase tracking-wider">Low</span>
                <span className="block text-[#dd6e42] font-bold">${item.priceLow}</span>
              </div>
            )}
            <div className="text-center">
              <span className="block text-th-text3 uppercase tracking-wider">Med</span>
              <span className="block text-[#dd6e42] font-bold">${item.priceMedian}</span>
            </div>
            {item.priceHigh !== null && (
              <div className="text-center">
                <span className="block text-th-text3 uppercase tracking-wider">High</span>
                <span className="block text-[#dd6e42] font-bold">${item.priceHigh}</span>
              </div>
            )}
          </div>
          {item.updated && (
            <p className="text-[9px] text-th-text3/60 mt-1 text-center">Updated today</p>
          )}
          {/* Action buttons */}
          <div className="mt-2 flex gap-2">
            <div className="flex-1 flex items-center justify-center gap-1.5 bg-[#dd6e42] text-white text-xs font-medium py-2 px-3 rounded-lg">
              <Disc3 className="w-3.5 h-3.5" />
              Mark as Owned
            </div>
            <div className="flex items-center justify-center text-th-text3 p-2 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

/* ─── Discogs Integration ─── */

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

/* ─── Stakkd Gear Catalog ─── */

const StakkdGearPreview: React.FC = () => (
  <div className="glass-morphism rounded-xl border border-white/10 p-4 flex flex-col gap-3">
    <span className="text-[#dd6e42] text-xs font-label uppercase tracking-widest">
      Turntable
    </span>
    <div>
      <p className="text-th-text3 text-xs">Technics</p>
      <p className="text-th-text font-bold text-lg font-display">SL-1200MK2</p>
    </div>
    <p className="text-th-text3 text-xs">1978 &ndash; 2010</p>
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
    <div className="border-t border-white/10 mt-4 pt-4 flex items-center justify-between">
      <span className="text-th-text3 text-xs">Powered by</span>
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1.5">
          <Layers size={16} className="text-[#dd6e42]" />
          <span className="text-[#dd6e42] font-bold text-lg font-mono">Stakkd</span>
        </div>
        <span className="text-th-text3 text-xs italic">Your complete audio gear catalog</span>
      </div>
    </div>
  </div>
);

/* ─── Main Feature Tour ─── */

const FeatureTour: React.FC<FeatureTourProps> = ({ onComplete, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const pendingStepRef = useRef<number | null>(null);

  const isFirst = currentStep === 0;
  const isLast = currentStep === TOTAL_STEPS - 1;
  const progress = (currentStep + 1) / TOTAL_STEPS;

  const transitionToStep = useCallback((nextStep: number) => {
    setFadeState('out');
    pendingStepRef.current = nextStep;
  }, []);

  const handleTransitionEnd = useCallback(() => {
    if (fadeState === 'out' && pendingStepRef.current !== null) {
      setCurrentStep(pendingStepRef.current);
      pendingStepRef.current = null;
      setFadeState('in');
    }
  }, [fadeState]);

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      transitionToStep(currentStep + 1);
    }
  }, [isLast, currentStep, onComplete, transitionToStep]);

  const handleBack = useCallback(() => {
    if (!isFirst) {
      transitionToStep(currentStep - 1);
    }
  }, [isFirst, currentStep, transitionToStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, onClose]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <TourStepLayout
            heading="Scan Any Album Instantly"
            description="Point your camera at any vinyl, cassette, or 8-track. Our AI identifies it in seconds, detects the format, and fills in artist, title, tracklist, and pricing automatically."
            bullets={[
              'Works with vinyl, cassette & 8-track formats',
              'Cross-references Discogs for pressing details',
              'Barcode scanning for instant matches',
            ]}
          >
            <ScanDemoPreview />
          </TourStepLayout>
        );
      case 1:
        return (
          <TourStepLayout
            heading="Your Collection, Beautifully Organized"
            description="Every album cataloged with cover art, tracklist, condition grading, and market value. Search, filter, and sort your entire library instantly."
            bullets={[
              'Grid and list views',
              'Filter by genre, decade, condition, and format',
              'Color-coded format badges at a glance',
            ]}
          >
            <div className="grid grid-cols-3 gap-2">
              {DUMMY_ALBUMS.map(album => (
                <AlbumCard key={album.id} album={album} onDelete={noop} onSelect={noop} />
              ))}
            </div>
          </TourStepLayout>
        );
      case 2:
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
            <WantlistPreview />
          </TourStepLayout>
        );
      case 3:
        return (
          <TourStepLayout
            heading="Connect Your Discogs Account"
            description="Already have your collection cataloged on Discogs? Import it in one click. Connect your account to sync your collection, wantlist, and get real-time marketplace pricing."
            bullets={[
              'Import thousands of records instantly',
              'Wantlist sync with live pricing',
              'Two-way collection sync',
              'Powered by the world\'s largest music database',
            ]}
          >
            <DiscogsPreview />
          </TourStepLayout>
        );
      case 4:
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
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-th-bg flex flex-col">
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

        {/* Right: Close */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-th-text3 hover:text-th-text2 transition-colors bg-transparent border-none cursor-pointer"
          aria-label="Close tour"
        >
          <X size={20} />
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
            className="font-label text-xs tracking-wider text-th-text3 uppercase hover:text-th-text2 transition-colors bg-transparent border-none cursor-pointer px-4 py-2"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {/* Right: Next / Create Account */}
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2.5 rounded-lg bg-[#dd6e42] hover:bg-[#c45a30] text-white font-label text-xs tracking-wider uppercase transition-colors cursor-pointer border-none"
        >
          {isLast ? 'Create Your Free Account' : 'Next'}
        </button>
      </footer>
    </div>
  );
};

export default FeatureTour;
