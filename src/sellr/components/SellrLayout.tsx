import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Disc3 } from 'lucide-react';

interface SellrLayoutProps {
  children: React.ReactNode;
}

const SellrLayout: React.FC<SellrLayoutProps> = ({ children }) => {
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
        <Link to="/sellr" className="flex items-center gap-2">
          <Disc3 className="w-6 h-6 text-sellr-blue" strokeWidth={1.5} />
          <span className="font-display text-2xl tracking-tight text-sellr-blue">
            Sellr
          </span>
        </Link>

        <Link
          to="/sellr/scan"
          className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 min-h-[44px] bg-sellr-amber text-white text-sm font-medium tracking-wide rounded hover:bg-sellr-amber-light transition-colors"
        >
          <Disc3 className="w-4 h-4 sm:hidden" />
          <span className="hidden sm:inline">Start Appraisal</span>
        </Link>
      </nav>

      {/* ── Page Content ────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        {children}
      </main>
    </div>
  );
};

export default SellrLayout;
