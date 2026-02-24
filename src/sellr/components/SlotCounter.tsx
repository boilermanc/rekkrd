import React from 'react';
import { Link } from 'react-router-dom';

interface SlotCounterProps {
  slotsUsed: number;
  slotsPurchased: number;
  size?: 'sm' | 'lg';
}

function getBarColor(percent: number): string {
  if (percent >= 90) return 'bg-red-400';
  if (percent >= 75) return 'bg-sellr-amber';
  return 'bg-sellr-sage';
}

const SlotCounter: React.FC<SlotCounterProps> = ({ slotsUsed, slotsPurchased, size = 'sm' }) => {
  const percent = slotsPurchased > 0 ? Math.min(100, (slotsUsed / slotsPurchased) * 100) : 0;
  const slotsRemaining = Math.max(0, slotsPurchased - slotsUsed);
  const barColor = getBarColor(percent);

  // ── Small (nav pill) ──────────────────────────────────────────────
  if (size === 'sm') {
    if (slotsPurchased === 0) {
      return (
        <Link
          to="/sellr/start"
          className="text-xs text-sellr-amber hover:text-sellr-amber-light transition-colors whitespace-nowrap"
        >
          No slots &mdash; Buy a plan
        </Link>
      );
    }

    return (
      <div className="flex flex-col items-center gap-0.5 min-w-[80px]">
        <span className="text-xs text-sellr-charcoal/60 whitespace-nowrap">
          {slotsUsed} / {slotsPurchased} slots
        </span>
        <div className="w-full h-1 bg-sellr-charcoal/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  // ── Large (dashboard/sidebar card) ────────────────────────────────
  return (
    <div className="bg-white rounded-lg border border-sellr-charcoal/10 p-5">
      <h3 className="text-sm font-medium text-sellr-charcoal/60 mb-3">Record Slots</h3>

      <div className="mb-1">
        <span className="font-display text-3xl text-sellr-charcoal">
          {slotsUsed}
        </span>
        <span className="font-display text-3xl text-sellr-charcoal/30 mx-1">/</span>
        <span className="font-display text-3xl text-sellr-charcoal/60">
          {slotsPurchased}
        </span>
      </div>
      <p className="text-xs text-sellr-charcoal/50 mb-4">slots used</p>

      <div className="w-full h-3 bg-sellr-charcoal/10 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {(slotsRemaining < 10 || slotsPurchased === 0) && (
        <Link
          to="/sellr/start"
          className="block w-full text-center py-2.5 bg-sellr-amber text-white text-sm font-medium rounded hover:bg-sellr-amber-light transition-colors"
        >
          Buy More Slots
        </Link>
      )}
    </div>
  );
};

export default SlotCounter;
