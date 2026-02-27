
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Plus, RefreshCw } from 'lucide-react';
import { WantlistItem, PriceAlert } from '../types';
import { wantlistService } from '../services/wantlistService';
import { supabase } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import SpinningRecord from './SpinningRecord';
import WantlistCard from './WantlistCard';
import DiscogsWantlistBrowser from './DiscogsWantlistBrowser';

interface WantlistViewProps {
  userId: string;
  onMarkAsOwned: (item: WantlistItem) => void;
  onRefreshCount: () => void;
  collectionDiscogsIds: Set<number>;
}

const WantlistView: React.FC<WantlistViewProps> = ({ userId, onMarkAsOwned, onRefreshCount, collectionDiscogsIds }) => {
  const [wantlist, setWantlist] = useState<WantlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showImportBrowser, setShowImportBrowser] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ artist: '', title: '', year: '', genre: '' });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const { showToast } = useToast();

  const importModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(importModalRef, () => setShowImportBrowser(false));
  const addModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(addModalRef, () => setShowAddModal(false));

  const alertedReleaseIds = useMemo(
    () => new Set(alerts.filter((a) => a.is_active).map((a) => a.discogs_release_id)),
    [alerts],
  );

  const fetchAlerts = useCallback(async () => {
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) return;

      const res = await fetch('/api/price-alerts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = (await res.json()) as { alerts: PriceAlert[] };
        setAlerts(body.alerts);
      }
    } catch {
      // Non-fatal — default to empty
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  const fetchWantlist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await wantlistService.getWantlist();
      setWantlist(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load wantlist';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWantlist();
    fetchAlerts();
  }, [fetchWantlist, fetchAlerts, userId]);

  // Fire-and-forget: fetch prices + cover art for newly added items, then refresh the list.
  async function backfillPricing(releaseIds: number[]) {
    if (releaseIds.length === 0) return;
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) return;

      const res = await fetch('/api/discogs-pricing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ release_ids: releaseIds }),
      });

      if (res.ok) {
        const updated = await wantlistService.getWantlist();
        setWantlist(updated);
      }
    } catch {
      // Non-fatal — prices will populate on next manual refresh
    }
  }

  async function handleRemove(id: string) {
    const previous = wantlist;
    setWantlist((prev) => prev.filter((item) => item.id !== id));

    try {
      await wantlistService.removeFromWantlist(id);
      showToast('Removed from wantlist', 'success');
      onRefreshCount();
    } catch {
      setWantlist(previous);
      showToast('Failed to remove from wantlist', 'error');
    }
  }

  async function handleRefreshPrices() {
    const releaseIds = wantlist
      .map((item) => item.discogs_release_id)
      .filter((id): id is number => id !== null);

    if (releaseIds.length === 0) {
      showToast('No Discogs-linked items to refresh', 'error');
      return;
    }

    setRefreshing(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) {
        showToast('Not authenticated', 'error');
        return;
      }

      const res = await fetch('/api/discogs-pricing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ release_ids: releaseIds }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Failed to refresh prices (${res.status})`);
      }

      const result = await res.json() as { updated: number; errors: string[] };

      // Re-fetch wantlist to get updated prices
      const updated = await wantlistService.getWantlist();
      setWantlist(updated);

      showToast(`Prices updated for ${result.updated} item${result.updated !== 1 ? 's' : ''}`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh prices';
      showToast(message, 'error');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSetAlert(item: WantlistItem, targetPrice: number, conditionMinimum: string) {
    const session = await supabase?.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (!token) {
      showToast('Not authenticated', 'error');
      throw new Error('Not authenticated');
    }

    const res = await fetch('/api/price-alerts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        discogs_release_id: item.discogs_release_id,
        artist: item.artist,
        title: item.title,
        cover_url: item.cover_url,
        target_price: targetPrice,
        condition_minimum: conditionMinimum,
      }),
    });

    if (res.status === 409) {
      showToast('You already have an alert for this record', 'error');
      throw new Error('Duplicate alert');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { error?: string }).error || `Failed to set alert (${res.status})`;
      showToast(msg, 'error');
      throw new Error(msg);
    }

    const { alert } = (await res.json()) as { alert: PriceAlert };
    setAlerts((prev) => [alert, ...prev]);
    showToast(`Alert set — we'll notify you when ${item.artist} — ${item.title} drops to $${targetPrice}`, 'success');
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    const artist = addForm.artist.trim();
    const title = addForm.title.trim();
    if (!artist || !title) return;

    setAddSubmitting(true);
    try {
      await wantlistService.addToWantlist({
        artist,
        title,
        year: addForm.year.trim() || null,
        genre: addForm.genre.trim() || null,
        cover_url: null,
        discogs_release_id: null,
        discogs_url: null,
        price_low: null,
        price_median: null,
        price_high: null,
      });
      showToast(`Added "${title}" by ${artist} to wantlist`, 'success');
      setAddForm({ artist: '', title: '', year: '', genre: '' });
      setShowAddModal(false);
      const updated = await wantlistService.getWantlist();
      setWantlist(updated);
      onRefreshCount();
    } catch {
      showToast('Failed to add to wantlist', 'error');
    } finally {
      setAddSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <SpinningRecord size="w-40 h-40" />
        <p className="font-label text-[10px] tracking-widest mt-8 text-th-text3 uppercase">
          Loading your wantlist...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-6">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-th-text tracking-tight">My Wantlist</h2>
          <span className="bg-[#dd6e42]/20 text-[#dd6e42] text-xs font-bold px-2.5 py-0.5 rounded-full">
            {wantlist.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshPrices}
            disabled={wantlist.length === 0 || !wantlist.some((item) => item.discogs_release_id) || refreshing}
            aria-label="Refresh marketplace prices for wantlist"
            className="text-xs font-medium px-4 py-2 rounded-lg border border-th-surface/[0.15] text-th-text3 hover:text-th-text hover:bg-th-surface/[0.06] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Prices
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            aria-label="Add record to wantlist manually"
            className="text-xs font-medium px-4 py-2 rounded-lg border border-th-surface/[0.15] text-th-text3 hover:text-th-text hover:bg-th-surface/[0.06] transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Manually
          </button>
          <button
            type="button"
            onClick={() => setShowImportBrowser(true)}
            className="text-xs font-medium px-4 py-2 rounded-lg border border-th-surface/[0.15] text-th-text3 hover:text-th-text hover:bg-th-surface/[0.06] transition-all"
          >
            Import from Discogs
          </button>
        </div>
      </div>

      {/* Empty state */}
      {wantlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center px-6">
          <Heart className="w-16 h-16 text-th-text3/30 mb-6" />
          <h3 className="text-xl font-bold text-th-text mb-2">Your wantlist is empty</h3>
          <p className="text-th-text3 text-sm max-w-md">
            Add records you're hunting for and track their market prices.
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#dd6e42] text-th-text text-sm font-bold hover:bg-[#c45a30] transition-all"
          >
            <Plus className="w-4 h-4" />
            Add a Record
          </button>
        </div>
      ) : (
        /* Wantlist grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
          {wantlist.map((item) => (
            <WantlistCard
              key={item.id}
              item={item}
              onRemove={handleRemove}
              onMarkAsOwned={onMarkAsOwned}
              isInCollection={item.discogs_release_id ? collectionDiscogsIds.has(item.discogs_release_id) : false}
              hasAlert={alertedReleaseIds.has(item.discogs_release_id ?? -1)}
              onSetAlert={handleSetAlert}
            />
          ))}
        </div>
      )}

      {/* Add Manually modal */}
      {showAddModal && (
        <div
          ref={addModalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Add record to wantlist"
          className="fixed inset-0 z-50 flex items-center justify-center bg-th-bg/95 p-4 md:p-8 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
        >
          <div className="relative w-full max-w-md glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] animate-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-th-surface/[0.06]">
              <h3 className="text-[#f0a882] text-[11px] font-label tracking-[0.3em] uppercase font-bold">
                Add to Wantlist
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-10 h-10 rounded-full bg-th-bg/50 text-th-text flex items-center justify-center hover:bg-th-text hover:text-th-bg transition-all"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleManualAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-th-text3 text-[10px] font-label tracking-widest uppercase mb-1.5">
                  Artist <span className="text-[#dd6e42]">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.artist}
                  onChange={e => setAddForm(prev => ({ ...prev, artist: e.target.value }))}
                  required
                  placeholder="e.g. Miles Davis"
                  className="w-full bg-th-surface/[0.06] border border-th-surface/[0.15] rounded-xl px-4 py-3 text-th-text text-sm placeholder-th-text3/40 focus:outline-none focus:border-[#dd6e42]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-th-text3 text-[10px] font-label tracking-widest uppercase mb-1.5">
                  Title <span className="text-[#dd6e42]">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={e => setAddForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="e.g. Kind of Blue"
                  className="w-full bg-th-surface/[0.06] border border-th-surface/[0.15] rounded-xl px-4 py-3 text-th-text text-sm placeholder-th-text3/40 focus:outline-none focus:border-[#dd6e42]/50 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-th-text3 text-[10px] font-label tracking-widest uppercase mb-1.5">Year</label>
                  <input
                    type="text"
                    value={addForm.year}
                    onChange={e => setAddForm(prev => ({ ...prev, year: e.target.value }))}
                    placeholder="e.g. 1959"
                    maxLength={4}
                    className="w-full bg-th-surface/[0.06] border border-th-surface/[0.15] rounded-xl px-4 py-3 text-th-text text-sm placeholder-th-text3/40 focus:outline-none focus:border-[#dd6e42]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-th-text3 text-[10px] font-label tracking-widest uppercase mb-1.5">Genre</label>
                  <input
                    type="text"
                    value={addForm.genre}
                    onChange={e => setAddForm(prev => ({ ...prev, genre: e.target.value }))}
                    placeholder="e.g. Jazz"
                    className="w-full bg-th-surface/[0.06] border border-th-surface/[0.15] rounded-xl px-4 py-3 text-th-text text-sm placeholder-th-text3/40 focus:outline-none focus:border-[#dd6e42]/50 transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-th-surface/[0.15] text-th-text3 hover:text-th-text text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting || !addForm.artist.trim() || !addForm.title.trim()}
                  className="flex-1 py-3 rounded-xl bg-[#dd6e42] text-th-text text-sm font-bold hover:bg-[#c45a30] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {addSubmitting ? 'Adding...' : 'Add to Wantlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import from Discogs modal */}
      {showImportBrowser && (
        <div
          ref={importModalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Import wantlist from Discogs"
          className="fixed inset-0 z-50 flex items-center justify-center bg-th-bg/95 p-4 md:p-8 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
        >
          <div className="relative w-full max-w-4xl max-h-[90vh] glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] flex flex-col animate-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-4 sm:py-6 border-b border-th-surface/[0.06]">
              <h3 className="text-[#f0a882] text-[11px] font-label tracking-[0.3em] uppercase font-bold">
                Import Wantlist from Discogs
              </h3>
              <button
                type="button"
                onClick={() => setShowImportBrowser(false)}
                className="w-10 h-10 rounded-full bg-th-bg/50 text-th-text flex items-center justify-center hover:bg-th-text hover:text-th-bg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              <DiscogsWantlistBrowser
                onImportComplete={async () => {
                  setShowImportBrowser(false);
                  const data = await wantlistService.getWantlist();
                  setWantlist(data);
                  setLoading(false);
                  onRefreshCount();

                  // Backfill pricing + cover art for items missing prices
                  const needsPricing = data
                    .filter(item => item.discogs_release_id !== null && item.price_median === null)
                    .map(item => item.discogs_release_id!);
                  backfillPricing(needsPricing);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WantlistView;
