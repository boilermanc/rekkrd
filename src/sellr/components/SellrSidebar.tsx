import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import SellrLogo from './SellrLogo';
import { useSellrAccount } from '../hooks/useSellrAccount';
import type { SellrSession, SellrRecord } from '../types';

interface SellrSidebarProps {
  session: SellrSession | null;
  records: SellrRecord[];
  onRecordDeleted: () => void;
}

// ── Delete confirmation row ──────────────────────────────────────────

const DeleteConfirm: React.FC<{
  recordId: string;
  sessionId: string;
  onDeleted: () => void;
  onCancel: () => void;
}> = ({ recordId, sessionId, onDeleted, onCancel }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-cancel after 2 seconds
  useEffect(() => {
    timerRef.current = setTimeout(onCancel, 2000);
    return () => clearTimeout(timerRef.current);
  }, [onCancel]);

  const handleConfirm = async () => {
    clearTimeout(timerRef.current);
    try {
      const res = await fetch(
        `/api/sellr/records/${recordId}?session_id=${sessionId}`,
        { method: 'DELETE' },
      );
      if (res.ok) onDeleted();
    } catch {
      // Silent — user can retry
    }
  };

  return (
    <span className="flex items-center gap-1 text-xs text-red-500">
      Sure?
      <button
        onClick={handleConfirm}
        className="font-medium underline hover:text-red-700"
      >
        Yes
      </button>
    </span>
  );
};

// ── Progress bar color ───────────────────────────────────────────────

function progressColor(pct: number): string {
  if (pct > 80) return 'bg-red-400';
  if (pct > 50) return 'bg-sellr-amber';
  return 'bg-sellr-sage';
}

// ── Format currency ──────────────────────────────────────────────────

function fmtUsd(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtPrice(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── SellrSidebar ─────────────────────────────────────────────────────

const SellrSidebar: React.FC<SellrSidebarProps> = ({ session, records, onRecordDeleted }) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { slotsUsed, slotsPurchased, loading: slotsLoading } = useSellrAccount();

  const count = session?.record_count ?? 0;
  const pct = slotsPurchased > 0 ? Math.min(100, Math.round((slotsUsed / slotsPurchased) * 100)) : 0;

  // Value calculations
  const pricedRecords = records.filter(r => r.price_median != null);
  const totalMedian = pricedRecords.reduce((sum, r) => sum + (r.price_median ?? 0), 0);
  const totalLow = pricedRecords.reduce((sum, r) => sum + (r.price_low ?? 0), 0);
  const totalHigh = pricedRecords.reduce((sum, r) => sum + (r.price_high ?? 0), 0);
  const showValue = pricedRecords.length > 0;

  const handleDeleteConfirmed = () => {
    setConfirmingId(null);
    onRecordDeleted();
  };

  return (
    <aside className="lg:w-[40%] w-full flex flex-col max-lg:max-h-[400px] max-lg:overflow-y-auto" aria-label="Your records">
      <div className="bg-sellr-surface rounded-lg p-6 flex flex-col flex-1">

        {/* ── 1. Progress Header ─────────────────────────────────── */}
        <div className="mb-6">
          <h2 className="font-display text-lg text-sellr-charcoal/80 mb-1">Your Collection</h2>
          <p className="text-2xl font-display text-sellr-blue">
            {count} record{count !== 1 ? 's' : ''}
          </p>

          {!slotsLoading && slotsPurchased > 0 ? (
            <>
              <div className="mt-3 h-2 rounded-full bg-sellr-charcoal/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressColor(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-sellr-charcoal/40">
                {slotsUsed} of {slotsPurchased} slots used
              </p>
            </>
          ) : !slotsLoading ? (
            <p className="mt-2 text-xs text-sellr-charcoal/40">
              No plan selected.{' '}
              <Link to="/sellr/start" className="text-sellr-blue hover:text-sellr-blue-light underline">
                Choose a plan
              </Link>
            </p>
          ) : null}
        </div>

        {/* ── 2. Value Summary ───────────────────────────────────── */}
        {showValue && (
          <div className="bg-white/60 rounded-lg p-4 mb-6">
            <p className="text-xs text-sellr-charcoal/50 uppercase tracking-wide mb-1">
              Est. Collection Value
            </p>
            <p className="text-2xl font-display text-sellr-charcoal">
              {fmtUsd(totalMedian)}
            </p>
            {totalLow > 0 && totalHigh > 0 && (
              <p className="text-xs text-sellr-charcoal/50 mt-0.5">
                Range: {fmtUsd(totalLow)} — {fmtUsd(totalHigh)}
              </p>
            )}
            {pricedRecords.length < 3 && (
              <p className="text-xs text-sellr-charcoal/40 mt-2">
                Add more records to see full value estimate.
              </p>
            )}
          </div>
        )}

        {/* ── 3. Record List ─────────────────────────────────────── */}
        <div className="flex-1 min-h-0">
          {records.length > 0 ? (
            <ul className="max-h-96 overflow-y-auto space-y-1.5 pr-1" role="list">
              {records.map(record => (
                <li
                  key={record.id}
                  className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-white/40 transition-colors"
                >
                  {/* Cover thumbnail */}
                  {record.cover_image ? (
                    <img
                      src={record.cover_image}
                      alt={`Cover for ${record.title} by ${record.artist}`}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-sellr-charcoal/5 flex items-center justify-center flex-shrink-0">
                      <SellrLogo className="w-5 h-5" color="#1a1a1a" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">{record.artist}</p>
                    <p className="text-xs text-sellr-charcoal/60 truncate leading-tight">{record.title}</p>
                  </div>

                  {/* Price */}
                  {record.price_median != null && (
                    <span className="text-xs font-medium text-sellr-amber flex-shrink-0">
                      ~{fmtPrice(record.price_median)}
                    </span>
                  )}

                  {/* Delete */}
                  <div className="flex-shrink-0 w-14 flex justify-end">
                    {confirmingId === record.id && session ? (
                      <DeleteConfirm
                        recordId={record.id}
                        sessionId={session.id}
                        onDeleted={handleDeleteConfirmed}
                        onCancel={() => setConfirmingId(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setConfirmingId(record.id)}
                        className="p-2.5 -m-1.5 text-sellr-charcoal/25 hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label={`Delete ${record.title} by ${record.artist}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-sellr-charcoal/40 py-4">
              Records you scan or search will appear here.
            </p>
          )}
        </div>

        {/* ── 4. Done CTA ────────────────────────────────────────── */}
        <div className="mt-6 pt-4 border-t border-sellr-charcoal/10">
          <Link
            to={session ? `/sellr/review?session=${session.id}` : '#'}
            className={`block text-center w-full px-5 py-3 min-h-[44px] rounded font-medium transition-colors ${
              count > 0
                ? 'bg-sellr-amber text-white hover:bg-sellr-amber-light'
                : 'bg-sellr-charcoal/10 text-sellr-charcoal/30 pointer-events-none'
            }`}
            aria-disabled={count === 0}
          >
            Review &amp; Get Report
          </Link>
          <p className="text-xs text-sellr-charcoal/40 text-center mt-2">
            You can still add records after reviewing.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default SellrSidebar;
