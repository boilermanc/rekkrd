import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
            className="hidden sm:inline-flex items-center gap-1 text-xs text-sellr-charcoal/50 hover:text-sellr-blue transition-colors"
          >
            &larr; Rekkrd
          </a>
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-sm text-sellr-charcoal/40 min-h-[44px] flex items-center">...</span>
          ) : user ? (
            <>
              <span
                className="hidden sm:block text-sm text-sellr-charcoal/50 max-w-[160px] truncate"
                title={user.email ?? ''}
              >
                {user.email}
              </span>
              {!slotsLoading && (
                <div className="hidden sm:block">
                  <SlotCounter slotsUsed={slotsUsed} slotsPurchased={slotsPurchased} size="sm" />
                </div>
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

      {/* ── Page Content ────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        {children}
      </main>
    </div>
  );
};

export default SellrLayout;
