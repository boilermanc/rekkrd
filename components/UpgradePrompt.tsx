import React, { useRef, useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface UpgradePromptProps {
  feature: string;
  onClose: () => void;
  onUpgrade: () => void;
}

const FEATURE_INFO: Record<string, { title: string; description: string }> = {
  playlist: {
    title: 'AI Playlist Generation',
    description: 'Generate mood-based playlists from your vinyl collection with AI.',
  },
  lyrics: {
    title: 'Lyrics Lookup',
    description: 'View full lyrics for any track in your collection.',
  },
  covers: {
    title: 'Multi-Source Cover Art',
    description: 'Browse and pick cover art from iTunes and MusicBrainz.',
  },
  scan: {
    title: 'AI Camera Scans',
    description: "You've used all your free scans this month. Upgrade for unlimited AI identification.",
  },
  album_limit: {
    title: 'Album Limit Reached',
    description: "You've reached the 100-album limit on the free plan. Upgrade to add unlimited albums.",
  },
  gear_limit: {
    title: 'Gear Limit Reached',
    description: "You've reached the 3-gear limit on the free plan. Upgrade to add unlimited gear to your Stakkd.",
  },
  setup_guide: {
    title: 'Setup Guide',
    description: 'Get custom wiring and setup instructions for your exact gear combination. Available on Curator and above.',
  },
};

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ feature, onClose, onUpgrade }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, onClose);

  const info = FEATURE_INFO[feature] || {
    title: 'Premium Feature',
    description: 'This feature requires a Curator or Enthusiast plan.',
  };

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade required"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-th-bg/95 p-4 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="w-full max-w-md rounded-2xl bg-th-card border border-th-border p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-th-accent/10 text-3xl">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-th-accent">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-bold text-th-text">{info.title}</h2>
        <p className="mb-6 text-sm text-th-muted">{info.description}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onUpgrade}
            className="w-full rounded-xl bg-th-accent px-6 py-3 font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Upgrade to Curator
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-th-border px-6 py-3 font-medium text-th-muted transition-all hover:bg-th-border/30"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
