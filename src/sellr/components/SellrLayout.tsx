import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import SellrLogo from './SellrLogo';
import SlotCounter from './SlotCounter';
import { useSellrAuth } from '../hooks/useSellrAuth';
import { useSellrAccount } from '../hooks/useSellrAccount';

interface SellrLayoutProps {
  children: React.ReactNode;
}

const SellrLayout: React.FC<SellrLayoutProps> = ({ children }) => {
  const { user, loading, signOut } = useSellrAuth();
  const { slotsUsed, slotsPurchased, loading: slotsLoading } = useSellrAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/sellr');
  };

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
      ?? document.createElement('link');
    const prevHref = link.href;
    link.rel = 'icon';
    link.href = '/sellr-favicon.svg';
    document.head.appendChild(link);

    return () => {
      link.href = prevHref || '/favicon.ico';
    };
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  return (
    <div className="min-h-screen bg-sellr-bg text-sellr-charcoal">
      {/* ── Top Nav ──────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <Link to="/sellr" className="flex items-center gap-2">
            <SellrLogo className="w-6 h-6" />
            <span className="font-display text-2xl tracking-tight text-sellr-blue">
              Sellr
            </span>
          </Link>
          <a
            href="https://rekkrd.com"
            className="hidden md:inline-flex items-center gap-1 text-xs text-sellr-charcoal/50 hover:text-sellr-blue transition-colors"
          >
            &larr; Rekkrd
          </a>
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-sm text-sellr-charcoal/40 min-h-[44px] flex items-center">...</span>
          ) : user ? (
            <>
              {/* Desktop: inline links */}
              <div className="hidden md:flex items-center gap-3">
                <span
                  className="text-sm text-sellr-charcoal/50 max-w-[160px] truncate"
                  title={user.email ?? ''}
                >
                  {user.email}
                </span>
                {!slotsLoading && (
                  <SlotCounter slotsUsed={slotsUsed} slotsPurchased={slotsPurchased} size="sm" />
                )}
                <Link
                  to="/sellr/dashboard"
                  className="flex items-center px-4 py-2.5 min-h-[44px] text-sm font-medium text-sellr-blue hover:text-sellr-blue-light transition-colors"
                  aria-label="Go to dashboard"
                >
                  Dashboard
                </Link>
                <Link
                  to="/sellr/account"
                  className="flex items-center px-4 py-2.5 min-h-[44px] text-sm text-sellr-charcoal/60 hover:text-sellr-charcoal transition-colors"
                  aria-label="Account settings"
                >
                  Account
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center px-4 py-2.5 min-h-[44px] text-sm text-sellr-charcoal/60 hover:text-sellr-charcoal transition-colors"
                  aria-label="Sign out of Sellr"
                >
                  Sign Out
                </button>
              </div>

              {/* Mobile: hamburger toggle */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(prev => !prev)}
                className="md:hidden flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] text-sellr-charcoal/70 hover:text-sellr-charcoal transition-colors"
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/sellr/login"
                className="flex items-center px-4 py-2.5 min-h-[44px] text-sm font-medium text-sellr-blue hover:text-sellr-blue-light transition-colors"
                aria-label="Sign in to Sellr"
              >
                Sign In
              </Link>
              <Link
                to="/sellr/start"
                className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 min-h-[44px] bg-sellr-amber text-white text-sm font-medium tracking-wide rounded hover:bg-sellr-amber-light transition-colors"
              >
                <SellrLogo className="w-4 h-4 sm:hidden" />
                <span className="hidden sm:inline">Start Appraisal</span>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Mobile Menu Backdrop ───────────────────────────── */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Menu Dropdown ───────────────────────────── */}
      {user && (
        <div className="relative z-50">
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
              isMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
            }`}
            role="menu"
            aria-label="Mobile navigation"
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4 pt-1 space-y-1">
              <div className="px-3 py-2 text-sm text-sellr-charcoal/50 truncate">
                {user.email}
              </div>
              {!slotsLoading && (
                <div className="px-3 py-2">
                  <SlotCounter slotsUsed={slotsUsed} slotsPurchased={slotsPurchased} size="sm" />
                </div>
              )}
              <div className="border-t border-sellr-charcoal/10 mx-3" />
              <Link
                to="/sellr/dashboard"
                className="flex items-center px-3 py-3 min-h-[44px] text-sm font-medium text-sellr-blue hover:bg-sellr-surface rounded transition-colors"
                role="menuitem"
              >
                Dashboard
              </Link>
              <Link
                to="/sellr/account"
                className="flex items-center px-3 py-3 min-h-[44px] text-sm text-sellr-charcoal/70 hover:bg-sellr-surface rounded transition-colors"
                role="menuitem"
              >
                Account
              </Link>
              <a
                href="https://rekkrd.com"
                className="flex items-center gap-1 px-3 py-3 min-h-[44px] text-sm text-sellr-charcoal/50 hover:bg-sellr-surface rounded transition-colors"
                role="menuitem"
              >
                &larr; Rekkrd
              </a>
              <div className="border-t border-sellr-charcoal/10 mx-3" />
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center w-full px-3 py-3 min-h-[44px] text-sm text-sellr-charcoal/60 hover:bg-sellr-surface rounded transition-colors text-left"
                role="menuitem"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Content ────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        {children}
      </main>
    </div>
  );
};

export default SellrLayout;
