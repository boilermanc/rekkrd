import React from 'react';
import { Link } from 'react-router-dom';

const SpenndHeader: React.FC = () => {
  return (
    <header className="bg-paper border-b border-paper-dark sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Rekkrd logo */}
          <Link to="/" className="flex items-center">
            <span className="font-display text-2xl text-ink">Rekkrd</span>
          </Link>

          {/* Divider — hidden on xs */}
          <div className="hidden sm:block h-5 w-px bg-paper-dark" />

          {/* Spennd icon + wordmark — hidden on xs */}
          <Link to="/spennd" className="hidden sm:flex items-center gap-2">
            <img src="/spennd-icon.svg" width={28} height={28} alt="Spennd" />
            <span className="font-display text-[18px] text-ink font-semibold">Spennd</span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Sellr link — hidden on xs */}
          <Link
            to="/sellr"
            className="hidden sm:flex flex-col items-start hover:opacity-80 transition-opacity"
          >
            <span className="font-mono text-[12px] font-medium text-[#4f6d7a]">Sellr</span>
            <span className="font-mono text-[9px] text-[#4f6d7a]/60">vinyl appraisals</span>
          </Link>

          {/* Sign Up button */}
          <Link
            to="/signup"
            className="bg-burnt-peach text-white rounded-full py-1.5 px-3 sm:py-2 sm:px-4 font-mono text-[12px] font-medium hover:opacity-90 transition-opacity"
          >
            Sign Up Free →
          </Link>
        </div>
      </div>
    </header>
  );
};

export default SpenndHeader;
