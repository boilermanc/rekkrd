import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const SpenndHeader: React.FC = () => {
  const [sellrOpen, setSellrOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!sellrOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSellrOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [sellrOpen]);

  return (
    <header className="bg-paper border-b border-paper-dark sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left side — Spennd brand */}
        <Link to="/spennd" className="flex items-center gap-2">
          <img src="/spennd-icon.svg" width={32} height={32} alt="Spennd" />
          <span className="font-display text-[22px] text-ink font-semibold">Spennd</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Sellr dropdown — hidden on xs */}
          <div ref={dropdownRef} className="relative hidden sm:flex items-center">
            <button
              onClick={() => setSellrOpen(!sellrOpen)}
              className="font-mono text-[12px] text-[#4f6d7a] font-medium cursor-pointer hover:opacity-80 transition-opacity"
            >
              Sellr ↓
            </button>

            {/* Dropdown panel */}
            <div
              className={`absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-paper-dark p-5 z-50 transition-all duration-200 ${
                sellrOpen
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-1 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <img src="/spennd-icon.svg" width={20} height={20} alt="" />
                <span className="font-mono text-[14px] text-[#4f6d7a] font-semibold">Sellr</span>
              </div>

              <p className="font-serif text-[13px] text-ink/60 mb-4">
                The vinyl appraisal marketplace. List your records for appraisal, get real offers from collectors.
              </p>

              <Link to="/sellr" onClick={() => setSellrOpen(false)}>
                <button className="w-full bg-[#4f6d7a] text-white rounded-full py-2.5 px-4 font-mono text-[12px] font-medium hover:opacity-90 transition-opacity">
                  Explore Sellr →
                </button>
              </Link>

              <Link to="/signup" onClick={() => setSellrOpen(false)}>
                <button className="w-full mt-2 border border-[#5a8a6e] text-[#5a8a6e] rounded-full py-2.5 px-4 font-mono text-[12px] font-medium hover:bg-[#5a8a6e]/10 transition-colors">
                  Sign Up Free →
                </button>
              </Link>
            </div>
          </div>

          {/* Sign Up button */}
          <Link
            to="/signup"
            className="bg-[#5a8a6e] text-white rounded-full py-1.5 px-3 sm:py-2 sm:px-4 font-mono text-[12px] font-medium hover:bg-[#3d6b54] transition-colors"
          >
            Sign Up Free →
          </Link>
        </div>
      </div>
    </header>
  );
};

export default SpenndHeader;
