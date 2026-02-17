import React from 'react';

interface TrialBannerProps {
  daysLeft: number;
  onUpgrade: () => void;
  onDismiss: () => void;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ daysLeft, onUpgrade, onDismiss }) => {
  return (
    <div className="flex items-center justify-center gap-3 bg-th-accent/10 border-b border-th-accent/20 px-4 py-2 text-sm">
      <span className="text-th-text">
        <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> left in your Curator trial
      </span>
      <button
        onClick={onUpgrade}
        className="rounded-lg bg-th-accent px-3 py-1 text-xs font-semibold text-white transition-all hover:brightness-110"
      >
        Upgrade Now
      </button>
      <button
        onClick={onDismiss}
        className="ml-1 text-th-muted hover:text-th-text transition-colors"
        aria-label="Dismiss trial banner"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export default TrialBanner;
