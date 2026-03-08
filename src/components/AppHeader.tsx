import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { ViewMode } from '../hooks/useAppNavigation';
import type { CollectionFilters } from '../hooks/useCollectionFilters';
import type { GatedFeature } from '../contexts/SubscriptionContext';
import PlanBadge from './PlanBadge';
import NavToolsDropdown from './NavToolsDropdown';
import { FilterPanel } from './FilterDropdown';
import { User } from 'lucide-react';

interface AppHeaderProps {
  resetView: () => void;
  currentView: ViewMode;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewMode>>;
  showStats: boolean;
  setShowStats: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  isFilterPanelOpen: boolean;
  setIsFilterPanelOpen: (open: boolean) => void;
  canUse: (feature: GatedFeature) => boolean;
  setUpgradeFeature: (feature: string | null) => void;
  navigate: (path: string) => void;
  wantlistCount: number;
  priceAlertCount: number;
  albumCount: number;
  activeFilterCount: number;
  theme: string;
  toggleTheme: () => void;
  signOut: () => void;
  filterDropdown?: React.ReactNode;
  filters?: CollectionFilters;
  setFilter?: <K extends keyof CollectionFilters>(key: K, value: CollectionFilters[K]) => void;
  clearAllFilters?: () => void;
  available?: {
    genres: string[];
    formats: string[];
    decades: string[];
    conditions: string[];
    labels: string[];
    tags: string[];
  };
}

const AppHeader: React.FC<AppHeaderProps> = ({
  resetView, currentView, setCurrentView,
  showStats, setShowStats,
  searchQuery, setSearchQuery, searchInputRef,
  isFilterPanelOpen, setIsFilterPanelOpen,
  canUse, setUpgradeFeature,
  navigate, wantlistCount, priceAlertCount, albumCount, activeFilterCount,
  theme, toggleTheme, signOut, filterDropdown,
  filters, setFilter, clearAllFilters, available,
}) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const showSearchBar = currentView !== 'landing' && currentView !== 'stakkd' && currentView !== 'profile' && currentView !== 'price-alerts';

  const closeMobileSearch = useCallback(() => {
    setOverlayVisible(false);
    setTimeout(() => setMobileSearchOpen(false), 200);
  }, []);

  // Entrance animation
  useEffect(() => {
    if (!mobileSearchOpen) {
      setOverlayVisible(false);
      return;
    }
    const raf = requestAnimationFrame(() => setOverlayVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [mobileSearchOpen]);

  // Auto-focus mobile search input
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchInputRef.current) {
      const timer = setTimeout(() => mobileSearchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [mobileSearchOpen]);

  // Escape key to close
  useEffect(() => {
    if (!mobileSearchOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMobileSearch();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileSearchOpen, closeMobileSearch]);

  // Lock body scroll
  useEffect(() => {
    if (mobileSearchOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [mobileSearchOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 glass-morphism border-b border-th-surface/[0.10] px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between md:justify-start gap-3">
            <button
              onClick={resetView}
              aria-label="Rekkrd home"
              title="Home / Reset Filters"
              className="w-10 h-10 bg-gradient-to-tr from-[#dd6e42] to-[#4f6d7a] rounded-lg flex items-center justify-center shadow-lg neon-border cursor-pointer active:scale-90 transition-transform flex-shrink-0 border-none p-0"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                {/* Vinyl disc */}
                <circle cx="12" cy="12" r="11" fill="#f0a882"/>
                {/* Grooves */}
                <circle cx="12" cy="12" r="9.5" fill="none" stroke="#d48a6a" strokeWidth="0.4" opacity="0.5"/>
                <circle cx="12" cy="12" r="8" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.4"/>
                <circle cx="12" cy="12" r="6.5" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.3"/>
                {/* Center label */}
                <circle cx="12" cy="12" r="5.2" fill="#c45a30"/>
                {/* R letter */}
                <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#f0a882">R</text>
              </svg>
            </button>
            {currentView !== 'landing' && (
              <h1 className="font-label text-lg md:text-2xl font-bold tracking-tighter text-th-text truncate">
                REKK<span className="text-[#c45a30]">R</span>D
              </h1>
            )}

            {/* Mobile search icon — only on collection views */}
            {showSearchBar && (
              <button
                onClick={() => setMobileSearchOpen(true)}
                className={`md:hidden p-2.5 rounded-full border transition-all flex-shrink-0 ${
                  searchQuery
                    ? 'bg-[#dd6e42] border-[#dd6e42] text-th-text shadow-lg'
                    : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text2 hover:text-th-text'
                }`}
                aria-label={searchQuery ? `Search active: ${searchQuery}` : 'Search collection'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
          </div>

          {showSearchBar && <div className="flex-1 max-w-xl flex items-center gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className={`hidden md:flex p-3 rounded-full border transition-all flex-shrink-0 ${showStats ? 'bg-[#dd6e42] border-[#dd6e42] text-th-text shadow-lg' : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text2 hover:text-th-text'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
            {/* Desktop inline search — hidden on mobile */}
            <div className="hidden md:block flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Search your collection"
                placeholder="Search titles, artists, genres…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-full pl-10 ${searchQuery ? 'pr-9' : 'pr-4'} py-2.5 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50 transition-all placeholder:text-th-text3/60`}
              />
              <svg className="absolute left-3.5 top-3 w-4 h-4 text-th-text3/70 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-th-text3/50 hover:text-th-text2 active:text-th-text transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {filterDropdown}
            <button
              onClick={() => setCurrentView(currentView === 'list' ? 'grid' : 'list')}
              className={`p-3 rounded-full border transition-all flex-shrink-0 ${currentView === 'list' ? 'bg-[#dd6e42] border-[#dd6e42] text-th-text shadow-lg' : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text2 hover:text-th-text'}`}
              title={currentView === 'list' ? 'Switch to grid view' : 'Switch to list view'}
            >
              {currentView === 'list' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )}
            </button>
            <NavToolsDropdown
              currentView={currentView}
              setCurrentView={setCurrentView}
              canUse={canUse}
              setUpgradeFeature={setUpgradeFeature}
              navigate={navigate}
              wantlistCount={wantlistCount}
              priceAlertCount={priceAlertCount}
            />
            {(currentView === 'grid' || currentView === 'list') && (
              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                aria-label={`Filter and sort collection${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
                className={`relative hidden md:flex p-3 rounded-full border transition-all flex-shrink-0 ${isFilterPanelOpen ? 'bg-[#dd6e42] border-[#dd6e42] text-th-text shadow-lg' : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text2 hover:text-th-text'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {activeFilterCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#dd6e42] text-white text-[9px] font-bold flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>}

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Plan Badge */}
            <div className="relative">
              <PlanBadge albumCount={albumCount} onUpgrade={() => setUpgradeFeature('plan_upgrade')} />
            </div>

            {/* Blog */}
            <Link
              to="/blog"
              className="p-2 rounded-full text-th-text3/70 hover:text-th-text2 hover:bg-th-surface/[0.04] transition-all"
              title="Blog"
              aria-label="Blog"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-th-text3/70 hover:text-th-text2 hover:bg-th-surface/[0.04] transition-all"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setCurrentView('profile')}
              className={`p-2 rounded-full transition-all ${currentView === 'profile' ? 'bg-[#dd6e42] text-white' : 'text-th-text3/70 hover:text-th-text2 hover:bg-th-surface/[0.04]'}`}
              title="Profile"
              aria-label="Profile"
            >
              <User className="w-5 h-5" />
            </button>

            <button
              onClick={signOut}
              className="p-2 rounded-full text-th-text3/70 hover:text-th-text2 hover:bg-th-surface/[0.04] transition-all"
              title="Sign out"
              aria-label="Sign out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-th-bg/95 backdrop-blur-sm transition-opacity duration-200 ${overlayVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeMobileSearch}
            aria-hidden="true"
          />

          {/* Search panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search collection"
            tabIndex={-1}
            className={`relative z-10 flex flex-col transition-transform duration-200 ease-out ${overlayVisible ? 'translate-y-0' : '-translate-y-full'}`}
          >
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-4 bg-th-bg border-b border-th-surface/[0.10]">
              <button
                onClick={closeMobileSearch}
                className="p-2 rounded-full text-th-text2 hover:text-th-text active:bg-th-surface/[0.06] transition-colors flex-shrink-0"
                aria-label="Close search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Large search input */}
              <div className="flex-1 relative">
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  aria-label="Search your collection"
                  placeholder="Search titles, artists, genres…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-th-surface/[0.06] border border-th-surface/[0.15] rounded-2xl pl-11 ${searchQuery ? 'pr-10' : 'pr-4'} py-3.5 min-h-[52px] text-base text-th-text focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50 transition-all placeholder:text-th-text3/60`}
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-th-text3/70 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); mobileSearchInputRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-th-text3/50 hover:text-th-text2 active:text-th-text transition-colors"
                    aria-label="Clear search"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Filter options */}
            {filters && setFilter && clearAllFilters && available && (
              <div className="bg-th-bg overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(100vh - 100px)' }}>
                <FilterPanel
                  filters={filters}
                  setFilter={setFilter}
                  clearAll={clearAllFilters}
                  activeFilterCount={activeFilterCount}
                  available={available}
                  onClose={closeMobileSearch}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AppHeader;
