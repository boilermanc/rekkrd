import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Bell, Headphones, TrendingUp } from 'lucide-react';

type ViewMode = 'public-landing' | 'landing' | 'grid' | 'list' | 'stakkd'
  | 'discogs' | 'wantlist' | 'value-dashboard' | 'profile' | 'price-alerts' | 'spins' | 'shelves' | 'bulk-import' | 'analytics';

interface MobileBottomNavProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onScanPress: () => void;
  onOpenStudio: () => void;
  onUploadPress: () => void;
  onToggleFilters: () => void;
  isFilterPanelOpen: boolean;
  activeFilterCount: number;
  wantlistCount: number;
  priceAlertCount: number;
  scansRemaining: number | null;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onScanPress,
  onOpenStudio,
  onUploadPress,
  onToggleFilters,
  isFilterPanelOpen,
  activeFilterCount,
  wantlistCount,
  priceAlertCount,
  scansRemaining,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const navigate = useNavigate();

  // Auto-close sheet on view change
  useEffect(() => {
    setIsMoreOpen(false);
  }, [currentView]);

  const isMoreActive = isMoreOpen || currentView === 'discogs' || currentView === 'wantlist' || currentView === 'price-alerts' || currentView === 'value-dashboard' || currentView === 'shelves' || currentView === 'bulk-import' || currentView === 'analytics';

  return (
    <>
      {/* Backdrop overlay */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsMoreOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* More slide-up sheet */}
      <div
        className={`fixed left-0 right-0 z-[45] md:hidden transition-all duration-300 ease-out ${
          isMoreOpen
            ? 'bottom-16 opacity-100'
            : '-bottom-full opacity-0 pointer-events-none'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-3 mb-2 bg-th-nav-bg/95 backdrop-blur-xl rounded-2xl border border-th-nav-text/[0.15] overflow-hidden shadow-2xl">
          {/* Spins */}
          <button
            onClick={() => { onNavigate('spins'); setIsMoreOpen(false); }}
            className={`flex items-center gap-4 w-full px-5 py-3.5 text-left active:bg-th-nav-text/[0.10] transition-colors ${
              currentView === 'spins' ? 'bg-th-nav-text/[0.08]' : ''
            }`}
          >
            <svg className="w-5 h-5 text-th-nav-text/80 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8.5a6 6 0 0 1 12 0c0 3-2 4.5-2 7a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-1" />
              <path d="M10.5 8.5a1.5 1.5 0 0 1 3 0c0 1.5-1.5 2-1.5 3.5" />
            </svg>
            <span className={`text-sm font-label tracking-wide ${currentView === 'spins' ? 'text-[#dd6e42]' : 'text-th-nav-text'}`}>Spins</span>
          </button>

          {/* Listening Room */}
          <button
            onClick={() => { navigate('/listening-room'); setIsMoreOpen(false); }}
            className="flex items-center gap-4 w-full px-5 py-3.5 text-left active:bg-th-nav-text/[0.10] transition-colors border-t border-th-nav-text/[0.08]"
          >
            <Headphones className="w-5 h-5 text-th-nav-text/80 flex-shrink-0" />
            <span className="text-sm font-label tracking-wide text-th-nav-text">Listening Room</span>
          </button>

          {/* Value Dashboard */}
          <button
            onClick={() => { onNavigate('value-dashboard'); setIsMoreOpen(false); }}
            className={`flex items-center gap-4 w-full px-5 py-3.5 text-left active:bg-th-nav-text/[0.10] transition-colors border-t border-th-nav-text/[0.08] ${
              currentView === 'value-dashboard' ? 'bg-th-nav-text/[0.08]' : ''
            }`}
          >
            <TrendingUp className="w-5 h-5 text-th-nav-text/80 flex-shrink-0" />
            <span className={`text-sm font-label tracking-wide ${currentView === 'value-dashboard' ? 'text-[#dd6e42]' : 'text-th-nav-text'}`}>Collection Value</span>
          </button>

          {/* Analytics */}
          <button
            onClick={() => { onNavigate('analytics'); setIsMoreOpen(false); }}
            className={`flex items-center gap-4 w-full px-5 py-3.5 text-left active:bg-th-nav-text/[0.10] transition-colors border-t border-th-nav-text/[0.08] ${
              currentView === 'analytics' ? 'bg-th-nav-text/[0.08]' : ''
            }`}
          >
            <BarChart3 className="w-5 h-5 text-th-nav-text/80 flex-shrink-0" />
            <span className={`text-sm font-label tracking-wide ${currentView === 'analytics' ? 'text-[#dd6e42]' : 'text-th-nav-text'}`}>Analytics</span>
          </button>

          {/* Browse Discogs */}
          <button
            onClick={() => { onNavigate('discogs'); setIsMoreOpen(false); }}
            className={`flex items-center gap-4 w-full px-5 py-3.5 text-left active:bg-th-nav-text/[0.10] transition-colors border-t border-th-nav-text/[0.08] ${
              currentView === 'discogs' ? 'bg-th-nav-text/[0.08]' : ''
            }`}
          >
            <svg className="w-5 h-5 text-th-nav-text/80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2a10 10 0 0 1 7.07 2.93" />
              <path d="M12 6a6 6 0 0 1 4.24 1.76" />
            </svg>
            <span className={`text-sm font-label tracking-wide ${currentView === 'discogs' ? 'text-[#dd6e42]' : 'text-th-nav-text'}`}>Browse Discogs</span>
          </button>

          {/* Wantlist */}
          <button
            onClick={() => { onNavigate('wantlist'); setIsMoreOpen(false); }}
            className={`flex items-center gap-4 w-full px-5 py-3.5 text-left active:bg-th-nav-text/[0.10] transition-colors border-t border-th-nav-text/[0.08] ${
              currentView === 'wantlist' ? 'bg-th-nav-text/[0.08]' : ''
            }`}
          >
            <svg className="w-5 h-5 text-th-nav-text/80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <path d="M12 11h4" />
              <path d="M12 16h4" />
              <path d="M8 11h.01" />
              <path d="M8 16h.01" />
            </svg>
            <span className={`text-sm font-label tracking-wide ${currentView === 'wantlist' ? 'text-[#dd6e42]' : 'text-th-nav-text'}`}>Wantlist</span>
            {wantlistCount > 0 && (
              <span className="ml-auto bg-[#dd6e42] text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {wantlistCount}
              </span>
            )}
          </button>

          {/* Price Alerts */}
          <button
            onClick={() => { onNavigate('price-alerts'); setIsMoreOpen(false); }}
            className={`flex items-center gap-4 w-full px-5 py-3.5 text-left active:bg-th-nav-text/[0.10] transition-colors border-t border-th-nav-text/[0.08] ${
              currentView === 'price-alerts' ? 'bg-th-nav-text/[0.08]' : ''
            }`}
          >
            <Bell className="w-5 h-5 text-th-nav-text/80 flex-shrink-0" />
            <span className={`text-sm font-label tracking-wide ${currentView === 'price-alerts' ? 'text-[#dd6e42]' : 'text-th-nav-text'}`}>Price Alerts</span>
            {priceAlertCount > 0 && (
              <span className="ml-auto bg-[#dd6e42] text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {priceAlertCount}
              </span>
            )}
          </button>

          {/* Shelves */}
          <button
            onClick={() => { onNavigate('shelves'); setIsMoreOpen(false); }}
            className={`flex items-center gap-4 w-full px-5 py-3.5 text-left active:bg-th-nav-text/[0.10] transition-colors border-t border-th-nav-text/[0.08] ${
              currentView === 'shelves' ? 'bg-th-nav-text/[0.08]' : ''
            }`}
          >
            <svg className="w-5 h-5 text-th-nav-text/80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            <span className={`text-sm font-label tracking-wide ${currentView === 'shelves' ? 'text-[#dd6e42]' : 'text-th-nav-text'}`}>Shelves</span>
          </button>

          {/* Import & Export */}
          <button
            onClick={() => { onNavigate('bulk-import'); setIsMoreOpen(false); }}
            className={`flex items-center gap-4 w-full px-5 py-3.5 text-left active:bg-th-nav-text/[0.10] transition-colors border-t border-th-nav-text/[0.08] ${
              currentView === 'bulk-import' ? 'bg-th-nav-text/[0.08]' : ''
            }`}
          >
            <svg className="w-5 h-5 text-th-nav-text/80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className={`text-sm font-label tracking-wide ${currentView === 'bulk-import' ? 'text-[#dd6e42]' : 'text-th-nav-text'}`}>Import & Export</span>
          </button>

          {/* Magic Mix Studio */}
          <button
            onClick={() => { onOpenStudio(); setIsMoreOpen(false); }}
            className="flex items-center gap-4 w-full px-5 py-3.5 text-left active:bg-th-nav-text/[0.10] transition-colors border-t border-th-nav-text/[0.08]"
          >
            <svg className="w-5 h-5 text-th-nav-text/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            <span className="text-sm font-label tracking-wide text-th-nav-text">Magic Mix Studio</span>
          </button>

          {/* Upload Cover */}
          <button
            onClick={() => { onUploadPress(); setIsMoreOpen(false); }}
            className="flex items-center gap-4 w-full px-5 py-3.5 text-left active:bg-th-nav-text/[0.10] transition-colors border-t border-th-nav-text/[0.08]"
          >
            <svg className="w-5 h-5 text-th-nav-text/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-sm font-label tracking-wide text-th-nav-text">Upload Cover</span>
          </button>

          {/* Filters — only on collection views */}
          {(currentView === 'grid' || currentView === 'list') && (
            <button
              onClick={() => { onToggleFilters(); setIsMoreOpen(false); }}
              className="flex items-center gap-4 w-full px-5 py-3.5 text-left active:bg-th-nav-text/[0.10] transition-colors border-t border-th-nav-text/[0.08]"
            >
              <svg className="w-5 h-5 text-th-nav-text/80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className={`text-sm font-label tracking-wide ${isFilterPanelOpen ? 'text-[#dd6e42]' : 'text-th-nav-text'}`}>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-auto bg-[#dd6e42] text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-th-nav-bg/95 backdrop-blur-md border-t border-th-nav-text/[0.12]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
          {/* Crate */}
          <button
            onClick={() => onNavigate('grid')}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
              (currentView === 'grid' || currentView === 'list') ? 'text-[#dd6e42]' : 'text-th-nav-text/70'
            }`}
            aria-label="Crate"
            aria-current={(currentView === 'grid' || currentView === 'list') ? 'page' : undefined}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-[9px] font-label tracking-widest uppercase">Crate</span>
          </button>

          {/* Stakkd */}
          <button
            onClick={() => onNavigate('stakkd')}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
              currentView === 'stakkd' ? 'text-[#dd6e42]' : 'text-th-nav-text/70'
            }`}
            aria-label="Stakkd"
            aria-current={currentView === 'stakkd' ? 'page' : undefined}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <circle cx="12" cy="14" r="4" />
              <circle cx="12" cy="6" r="2" />
            </svg>
            <span className="text-[9px] font-label tracking-widest uppercase">Stakkd</span>
          </button>

          {/* Scan (center, prominent) */}
          <button
            onClick={onScanPress}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative"
            aria-label="Scan cover"
          >
            <div className="w-12 h-12 -mt-4 rounded-full bg-gradient-to-r from-[#c45a30] to-[#4f6d7a] flex items-center justify-center shadow-lg border-2 border-th-nav-bg">
              <svg className="w-5 h-5 text-[#e8e2d6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-[9px] font-label tracking-widest uppercase text-th-nav-text/70">Scan</span>
            {scansRemaining !== null && (
              <span className="absolute top-0.5 left-1/2 translate-x-3 bg-[#dd6e42] text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {scansRemaining}
              </span>
            )}
          </button>

          {/* Spins */}
          <button
            onClick={() => onNavigate('spins')}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
              currentView === 'spins' ? 'text-[#dd6e42]' : 'text-th-nav-text/70'
            }`}
            aria-label="Spins"
            aria-current={currentView === 'spins' ? 'page' : undefined}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8.5a6 6 0 0 1 12 0c0 3-2 4.5-2 7a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-1" />
              <path d="M10.5 8.5a1.5 1.5 0 0 1 3 0c0 1.5-1.5 2-1.5 3.5" />
            </svg>
            <span className="text-[9px] font-label tracking-widest uppercase">Spins</span>
          </button>

          {/* More */}
          <button
            onClick={() => setIsMoreOpen(prev => !prev)}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
              isMoreActive ? 'text-[#dd6e42]' : 'text-th-nav-text/70'
            }`}
            aria-label="More options"
            aria-expanded={isMoreOpen}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
            <span className="text-[9px] font-label tracking-widest uppercase">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
