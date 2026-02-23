import React from 'react';
import { Link } from 'react-router-dom';
import { Disc3 } from 'lucide-react';

interface SellrLayoutProps {
  children: React.ReactNode;
}

const SellrLayout: React.FC<SellrLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-sellr-bg text-sellr-charcoal">
      {/* ── Top Nav ──────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <Link to="/sellr" className="flex items-center gap-2">
          <Disc3 className="w-6 h-6 text-sellr-blue" strokeWidth={1.5} />
          <span className="font-display text-2xl tracking-tight text-sellr-blue">
            Sellr
          </span>
        </Link>

        <Link
          to="/sellr/scan"
          className="px-5 py-2.5 bg-sellr-amber text-white text-sm font-medium tracking-wide rounded hover:bg-sellr-amber-light transition-colors"
        >
          Start Appraisal
        </Link>
      </nav>

      {/* ── Page Content ────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 pb-16">
        {children}
      </main>
    </div>
  );
};

export default SellrLayout;
