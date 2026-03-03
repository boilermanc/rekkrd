import React from 'react';

interface DiscogsAttributionProps {
  size: 'compact' | 'full';
}

const DiscogsAttribution: React.FC<DiscogsAttributionProps> = ({ size }) => {
  if (size === 'compact') {
    return (
      <span className="text-[10px] text-th-text3/40" aria-label="Data provided by Discogs">
        via{' '}
        <a
          href="https://www.discogs.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-th-text3/60 transition-colors"
        >
          Discogs
        </a>
      </span>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 pt-2" aria-label="Data provided by Discogs">
      {/* Vinyl disc icon */}
      <svg className="w-4 h-4 text-th-text3/40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
        <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
      <p className="text-[10px] text-th-text3/40">
        Powered by{' '}
        <a
          href="https://www.discogs.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-th-text3/60 transition-colors"
        >
          Discogs
        </a>
      </p>
    </div>
  );
};

export default DiscogsAttribution;
