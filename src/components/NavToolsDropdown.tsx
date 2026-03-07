import React, { useState, useRef, useEffect } from 'react';
import { BarChart3, Bell, Headphones, TrendingUp } from 'lucide-react';
import type { ViewMode } from '../hooks/useAppNavigation';
import type { GatedFeature } from '../contexts/SubscriptionContext';

interface NavToolsDropdownProps {
  currentView: ViewMode;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewMode>>;
  canUse: (feature: GatedFeature) => boolean;
  setUpgradeFeature: (feature: string | null) => void;
  navigate: (path: string) => void;
  wantlistCount: number;
  priceAlertCount: number;
}

const NavToolsDropdown: React.FC<NavToolsDropdownProps> = ({
  currentView, setCurrentView,
  canUse, setUpgradeFeature,
  navigate, wantlistCount, priceAlertCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isOpen]);

  const toolViews: ViewMode[] = [
    'stakkd', 'discogs', 'wantlist', 'value-dashboard',
    'analytics', 'price-alerts', 'spins', 'shelves', 'bulk-import',
  ];
  const isToolActive = toolViews.includes(currentView);
  const totalBadge = wantlistCount + priceAlertCount;

  const handleViewNav = (view: ViewMode, gatedFeature?: GatedFeature) => {
    if (gatedFeature && !canUse(gatedFeature)) {
      setUpgradeFeature(gatedFeature);
      setIsOpen(false);
      return;
    }
    setCurrentView(view);
    setIsOpen(false);
  };

  const menuItem = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    options?: { active?: boolean; locked?: boolean; badge?: number },
  ) => {
    const { active = false, locked = false, badge } = options || {};
    return (
      <button
        key={label}
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
          active
            ? 'bg-[#dd6e42]/20 text-[#f0a882] font-semibold'
            : 'text-th-text2 hover:bg-th-surface/[0.08] hover:text-th-text'
        }`}
      >
        <span className="w-5 h-5 flex-shrink-0 relative">
          {icon}
          {locked && (
            <span className="absolute -top-1 -right-1.5 w-3 h-3 rounded-full bg-th-accent/80 flex items-center justify-center">
              <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
          )}
        </span>
        <span className="flex-1 text-left">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="bg-[#dd6e42] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`hidden md:flex p-3 rounded-full border transition-all flex-shrink-0 relative ${
          isToolActive || isOpen
            ? 'bg-[#dd6e42] border-[#dd6e42] text-th-text shadow-lg'
            : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text2 hover:text-th-text'
        }`}
        title="Tools"
        aria-label="Tools menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        {totalBadge > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#dd6e42] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {totalBadge}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 glass-morphism rounded-2xl border border-th-surface/[0.10] p-2 z-50 animate-in fade-in slide-in-from-top duration-200 shadow-2xl">
          {menuItem('Listening Room', <Headphones className="w-5 h-5" />, () => { navigate('/listening-room'); setIsOpen(false); })}
          {menuItem('Stakkd', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><circle cx="12" cy="14" r="4" /><circle cx="12" cy="6" r="2" /></svg>, () => handleViewNav('stakkd'), { active: currentView === 'stakkd' })}
          {menuItem('Browse Discogs', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /><path d="M12 2a10 10 0 0 1 7.07 2.93" /><path d="M12 6a6 6 0 0 1 4.24 1.76" /></svg>, () => handleViewNav('discogs'), { active: currentView === 'discogs' })}
          {menuItem('Wantlist', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>, () => handleViewNav('wantlist'), { active: currentView === 'wantlist', badge: wantlistCount })}
          {menuItem('Collection Value', <TrendingUp className="w-5 h-5" />, () => handleViewNav('value-dashboard'), { active: currentView === 'value-dashboard' })}
          {menuItem('Analytics', <BarChart3 className="w-5 h-5" />, () => handleViewNav('analytics', 'analytics'), { active: currentView === 'analytics', locked: !canUse('analytics') })}
          {menuItem('Price Alerts', <Bell className="w-5 h-5" />, () => handleViewNav('price-alerts'), { active: currentView === 'price-alerts', badge: priceAlertCount })}
          {menuItem('Spins', <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6 8.5a6 6 0 0 1 12 0c0 3-2 4.5-2 7a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-1" /><path d="M10.5 8.5a1.5 1.5 0 0 1 3 0c0 1.5-1.5 2-1.5 3.5" /></svg>, () => handleViewNav('spins'), { active: currentView === 'spins' })}
          {menuItem('Shelves', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>, () => handleViewNav('shelves', 'shelf_organizer'), { active: currentView === 'shelves', locked: !canUse('shelf_organizer') })}
          {menuItem('Import / Export', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>, () => handleViewNav('bulk-import', 'bulk_import'), { active: currentView === 'bulk-import', locked: !canUse('bulk_import') })}
        </div>
      )}
    </div>
  );
};

export default NavToolsDropdown;
