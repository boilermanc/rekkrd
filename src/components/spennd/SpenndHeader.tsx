import React from 'react';
import { Link } from 'react-router-dom';

const SpenndHeader: React.FC = () => {
  return (
    <header className="bg-paper border-b border-paper-dark sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {/* Rekkrd logo */}
          <Link to="/" className="flex items-center">
            <span className="font-display text-2xl text-ink">Rekkrd</span>
          </Link>

          {/* Divider */}
          <div className="h-5 w-px bg-paper-dark" />

          {/* Spennd icon + wordmark */}
          <Link to="/spennd" className="flex items-center gap-2">
            <img src="/spennd-icon.svg" width={28} height={28} alt="Spennd" />
            <span className="font-display text-[18px] text-ink font-semibold">Spennd</span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Sellr link - hidden on mobile */}
          <Link
            to="/sellr"
            className="hidden sm:block font-mono text-[12px] text-ink hover:text-burnt-peach transition-colors"
          >
            Sellr
          </Link>

          {/* Sign Up button */}
          <Link
            to="/signup"
            className="bg-burnt-peach text-white rounded-full py-2 px-4 font-mono text-[12px] font-medium hover:opacity-90 transition-opacity"
          >
            Sign Up Free →
          </Link>
        </div>
      </div>
    </header>
  );
};

export default SpenndHeader;
