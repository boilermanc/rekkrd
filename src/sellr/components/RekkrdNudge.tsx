import React, { useState, useEffect } from 'react';
import SellrLogo from './SellrLogo';

interface RekkrdNudgeProps {
  sessionId: string;
  recordCount: number;
  reportToken: string;
}

const RekkrdNudge: React.FC<RekkrdNudgeProps> = ({ sessionId, recordCount, reportToken }) => {
  const storageKey = `sellr_nudge_dismissed_${sessionId}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already dismissed — bail out
    if (localStorage.getItem(storageKey)) return;

    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [storageKey]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(storageKey, '1');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-sellr-blue text-white shadow-lg pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left — message */}
        <div className="flex items-center gap-2 min-w-0">
          <SellrLogo className="w-5 h-5 flex-shrink-0 opacity-80" color="white" />
          <span className="text-sm font-medium truncate">
            Save {recordCount > 0 ? `these ${recordCount} records` : 'this collection'} to Rekkrd — track value over time.
          </span>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <a
            href={`/signup?import=${sessionId}&token=${reportToken}`}
            className="flex-1 sm:flex-none text-center px-4 py-2 min-h-[44px] flex items-center justify-center bg-white text-sellr-blue text-sm font-medium rounded hover:bg-white/90 transition-colors"
          >
            Import Free
          </a>
          <button
            onClick={dismiss}
            className="flex-1 sm:flex-none text-center px-4 py-2 min-h-[44px] flex items-center justify-center border border-white/60 text-white text-sm font-medium rounded hover:bg-white/10 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default RekkrdNudge;
