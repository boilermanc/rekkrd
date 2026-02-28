import React, { useState, useEffect, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { supabase } from '../../services/supabaseService';
import {
  getShelfConfigs,
  upsertShelfConfig,
  deleteShelfConfig,
  getSortPreference,
  upsertSortPreference,
} from '../helpers/shelfHelpers';
import ShelfView from './ShelfView';
import ShelfOnboarding from './ShelfOnboarding';
import ShelfGuideModal from './ShelfGuideModal';
import type { Album } from '../../types';
import type { ShelfConfig } from '../../types/shelf';
import type { SortScheme } from '../../types/shelf';

const SORT_OPTIONS: { value: SortScheme; label: string }[] = [
  { value: 'artist_alpha', label: 'A\u2192Z by Artist' },
  { value: 'genre_artist', label: 'Genre, then Artist' },
  { value: 'year_asc', label: 'Oldest First' },
  { value: 'year_desc', label: 'Newest First' },
  { value: 'date_added', label: 'Date Added' },
  { value: 'custom', label: 'Custom' },
];

type Tab = 'setup' | 'view';

interface ShelfSetupProps {
  userId: string;
  albums: Album[];
  onUpgradeRequired?: (feature: string) => void;
}

const ShelfSetup: React.FC<ShelfSetupProps> = ({ userId, albums, onUpgradeRequired }) => {
  const { showToast } = useToast();
  const { canUse } = useSubscription();

  // ── Tab state ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('setup');

  // ── Shelf configs ─────────────────────────────────────────────
  const [shelves, setShelves] = useState<ShelfConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [albumCounts, setAlbumCounts] = useState<Record<string, number>>({});

  // Add form state
  const [newName, setNewName] = useState('');
  const [newUnits, setNewUnits] = useState<number>(4);
  const [newCapacity, setNewCapacity] = useState<number>(50);
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnits, setEditUnits] = useState<number>(4);
  const [editCapacity, setEditCapacity] = useState<number>(50);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Sort preference ───────────────────────────────────────────
  const [sortScheme, setSortScheme] = useState<SortScheme>('artist_alpha');

  // Selected shelf for the Shelf View tab
  const [viewShelfId, setViewShelfId] = useState<string | null>(null);

  // Onboarding + Guide state
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('rekkrd_shelf_onboarding_seen');
  });
  const [showGuide, setShowGuide] = useState(false);

  // ── Fetch data ────────────────────────────────────────────────
  const fetchShelves = useCallback(async () => {
    try {
      const data = await getShelfConfigs(userId);
      setShelves(data);
    } catch {
      showToast('Failed to load shelves', 'error');
    }
  }, [userId, showToast]);

  const fetchAlbumCounts = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('shelf_unit')
        .eq('user_id', userId)
        .not('shelf_unit', 'is', null);
      if (error) throw error;
      // Count albums per shelf_unit value
      const counts: Record<number, number> = {};
      for (const row of data ?? []) {
        const u = row.shelf_unit as number;
        counts[u] = (counts[u] || 0) + 1;
      }
      setAlbumCounts(counts);
    } catch {
      // Non-critical — just means counts won't display
    }
  }, [userId]);

  const fetchSortPref = useCallback(async () => {
    try {
      const pref = await getSortPreference(userId);
      if (pref) setSortScheme(pref.sort_scheme);
    } catch {
      // Use default
    }
  }, [userId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchShelves(), fetchAlbumCounts(), fetchSortPref()]);
      setLoading(false);
    };
    load();
  }, [fetchShelves, fetchAlbumCounts, fetchSortPref]);

  // ── Count albums assigned to a specific shelf config ──────────
  // A shelf config owns units 1..unit_count. But since shelf_unit is
  // a global integer, we need a convention. For now, count ALL albums
  // that have any non-null shelf_unit, grouped per config by matching
  // unit ranges. With a single shelf this is units 1..N. With multiple
  // shelves the ranges stack: shelf1 = 1..N1, shelf2 = N1+1..N1+N2, etc.
  // For simplicity we'll just show total assigned vs total capacity.
  function getAssignedCount(): number {
    let total = 0;
    for (const key in albumCounts) total += albumCounts[key];
    return total;
  }

  // ── Handlers ──────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newName.trim()) {
      showToast('Give your shelf a name', 'error');
      return;
    }
    setAdding(true);
    try {
      await upsertShelfConfig({
        user_id: userId,
        name: newName.trim(),
        unit_count: newUnits,
        capacity_per_unit: newCapacity,
      });
      showToast('Shelf added', 'success');
      setNewName('');
      setNewUnits(4);
      setNewCapacity(50);
      await fetchShelves();
    } catch {
      showToast('Failed to add shelf', 'error');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (shelf: ShelfConfig) => {
    setEditingId(shelf.id);
    setEditName(shelf.name);
    setEditUnits(shelf.unit_count);
    setEditCapacity(shelf.capacity_per_unit);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      await upsertShelfConfig({
        id: editingId,
        user_id: userId,
        name: editName.trim(),
        unit_count: editUnits,
        capacity_per_unit: editCapacity,
      });
      showToast('Shelf updated', 'success');
      setEditingId(null);
      await fetchShelves();
    } catch {
      showToast('Failed to update shelf', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteShelfConfig(id);
      showToast('Shelf deleted', 'success');
      setConfirmDeleteId(null);
      await fetchShelves();
    } catch {
      showToast('Failed to delete shelf', 'error');
    }
  };

  const handleSortChange = async (scheme: SortScheme) => {
    const prev = sortScheme;
    setSortScheme(scheme);
    try {
      await upsertSortPreference(userId, scheme);
      showToast('Sort preference saved', 'success');
    } catch {
      setSortScheme(prev);
      showToast('Failed to save sort preference', 'error');
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('rekkrd_shelf_onboarding_seen', '1');
    setShowOnboarding(false);
  };

  // ── Render ────────────────────────────────────────────────────

  // Gate: Enthusiast-only feature
  if (!canUse('shelf_organizer')) {
    return (
      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8 pb-8">
        <div className="flex flex-col items-center justify-center py-32">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-th-accent/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-th-accent">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-th-text">Shelf Organizer</h2>
          <p className="mb-6 text-sm text-th-muted text-center max-w-md">
            Map your digital collection to your physical shelves. Smart sorting, drag-and-drop placement, and rebalance suggestions.
          </p>
          <button
            onClick={() => onUpgradeRequired?.('shelf_organizer')}
            className="rounded-xl bg-th-accent px-6 py-3 font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Upgrade to Enthusiast
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8 pb-8">
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-10 h-10 border-2 border-[#dd6e42] border-t-transparent rounded-full animate-spin" />
          <p className="font-label text-[10px] tracking-widest mt-4 text-th-text3 uppercase">Loading shelves</p>
        </div>
      </main>
    );
  }

  const totalCapacity = shelves.reduce((sum, s) => sum + s.unit_count * s.capacity_per_unit, 0);
  const totalAssigned = getAssignedCount();

  const activeShelf = shelves.find(s => s.id === viewShelfId) ?? shelves[0] ?? null;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8 pb-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="font-label text-lg md:text-xl tracking-widest uppercase font-bold text-th-text">
            My Shelves
          </h2>
          <p className="text-th-text3/60 text-sm mt-1">
            Define your physical storage to get shelf placement recommendations
          </p>
        </div>

        {/* Tabs + Help */}
        <div className="flex items-center gap-3 self-start">
        <button
          onClick={() => setShowGuide(true)}
          className="p-2 rounded-lg text-th-text3/50 hover:text-th-text hover:bg-th-surface/[0.06] transition-colors"
          aria-label="Open shelf organizer guide"
          title="Shelf Organizer Guide"
        >
          <HelpCircle size={20} />
        </button>
        <div className="flex gap-1 bg-th-surface/[0.04] rounded-lg p-1" role="tablist" aria-label="Shelf page tabs">
          <button
            role="tab"
            aria-selected={activeTab === 'setup'}
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2 rounded-md text-sm font-label tracking-wide transition-all ${
              activeTab === 'setup'
                ? 'bg-[#dd6e42] text-white shadow'
                : 'text-th-text2 hover:text-th-text'
            }`}
          >
            Setup
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'view'}
            onClick={() => setActiveTab('view')}
            className={`px-4 py-2 rounded-md text-sm font-label tracking-wide transition-all ${
              activeTab === 'view'
                ? 'bg-[#dd6e42] text-white shadow'
                : 'text-th-text2 hover:text-th-text'
            }`}
          >
            Shelf View
          </button>
        </div>
        </div>
      </div>

      {/* ── Shelf View Tab ── */}
      {activeTab === 'view' && (
        <>
          {shelves.length === 0 ? (
            <div className="glass-morphism rounded-xl p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-th-text3/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              <p className="text-th-text3/50 text-sm mb-3">No shelf configured yet.</p>
              <button
                onClick={() => setActiveTab('setup')}
                className="text-[#dd6e42] text-sm font-label tracking-wide hover:underline"
                aria-label="Go to setup tab"
              >
                Set up a shelf first
              </button>
            </div>
          ) : (
            <>
              {/* Shelf selector (when multiple shelves) */}
              {shelves.length > 1 && (
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select shelf to view">
                  {shelves.map(s => (
                    <button
                      key={s.id}
                      role="radio"
                      aria-checked={(activeShelf?.id === s.id)}
                      onClick={() => setViewShelfId(s.id)}
                      className={`px-3.5 py-2 rounded-lg text-sm font-label tracking-wide transition-all border ${
                        activeShelf?.id === s.id
                          ? 'bg-[#dd6e42] border-[#dd6e42] text-white shadow-lg'
                          : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text2 hover:text-th-text hover:border-th-surface/[0.20]'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}

              {activeShelf && (
                <ShelfView
                  albums={albums}
                  shelfConfig={activeShelf}
                  sortScheme={sortScheme}
                  onAssignmentsSaved={fetchAlbumCounts}
                />
              )}
            </>
          )}
        </>
      )}

      {/* ── Setup Tab ── */}
      {activeTab === 'setup' && <>

      {/* Sort Preference */}
      <section className="glass-morphism rounded-xl p-5 space-y-3">
        <h3 className="font-label text-xs tracking-widest uppercase font-bold text-th-text2">
          Sort Scheme
        </h3>
        <p className="text-th-text3/50 text-xs">
          How should records be sorted on your shelves?
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sort scheme">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSortChange(opt.value)}
              role="radio"
              aria-checked={sortScheme === opt.value}
              className={`px-3.5 py-2 rounded-lg text-sm font-label tracking-wide transition-all border ${
                sortScheme === opt.value
                  ? 'bg-[#dd6e42] border-[#dd6e42] text-white shadow-lg'
                  : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text2 hover:text-th-text hover:border-th-surface/[0.20]'
              }`}
            >
              {sortScheme === opt.value && (
                <svg className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Add Shelf */}
      <section className="glass-morphism rounded-xl p-5 space-y-4">
        <h3 className="font-label text-xs tracking-widest uppercase font-bold text-th-text2">
          Add a Shelf
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3">
            <label htmlFor="shelf-name" className="block text-xs text-th-text3/60 mb-1">Name</label>
            <input
              id="shelf-name"
              type="text"
              placeholder="e.g. Kallax 4x4, Living Room Shelf"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-3 py-2.5 text-sm text-th-text placeholder:text-th-text3/40 focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50 transition-all"
              aria-label="Shelf name"
            />
          </div>
          <div>
            <label htmlFor="shelf-units" className="block text-xs text-th-text3/60 mb-1">Sections / Cubes</label>
            <input
              id="shelf-units"
              type="number"
              min={1}
              max={50}
              value={newUnits}
              onChange={(e) => setNewUnits(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-3 py-2.5 text-sm text-th-text focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50 transition-all"
              aria-label="Number of sections"
            />
          </div>
          <div>
            <label htmlFor="shelf-capacity" className="block text-xs text-th-text3/60 mb-1">Capacity per Section</label>
            <input
              id="shelf-capacity"
              type="number"
              min={10}
              max={200}
              value={newCapacity}
              onChange={(e) => setNewCapacity(Math.min(200, Math.max(10, Number(e.target.value) || 50)))}
              className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-3 py-2.5 text-sm text-th-text focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50 transition-all"
              aria-label="Capacity per section"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="w-full px-4 py-2.5 rounded-lg bg-[#dd6e42] text-white font-label text-sm tracking-wide hover:bg-[#c45a30] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Add shelf"
            >
              {adding ? 'Adding...' : 'Add Shelf'}
            </button>
          </div>
        </div>
      </section>

      {/* Existing Shelves */}
      {shelves.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-label text-xs tracking-widest uppercase font-bold text-th-text2">
              Your Shelves
            </h3>
            {totalCapacity > 0 && (
              <span className="text-xs text-th-text3/50">
                {totalAssigned} / {totalCapacity.toLocaleString()} total capacity
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shelves.map((shelf) => (
              <div
                key={shelf.id}
                className="glass-morphism rounded-xl p-5 space-y-3 transition-all"
              >
                {editingId === shelf.id ? (
                  /* ── Inline Edit Form ── */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-3 py-2 text-sm text-th-text focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50"
                      aria-label="Edit shelf name"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-th-text3/60 mb-1">Sections</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={editUnits}
                          onChange={(e) => setEditUnits(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                          className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-3 py-2 text-sm text-th-text focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50"
                          aria-label="Edit sections count"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-th-text3/60 mb-1">Per Section</label>
                        <input
                          type="number"
                          min={10}
                          max={200}
                          value={editCapacity}
                          onChange={(e) => setEditCapacity(Math.min(200, Math.max(10, Number(e.target.value) || 50)))}
                          className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-3 py-2 text-sm text-th-text focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50"
                          aria-label="Edit capacity per section"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving || !editName.trim()}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#dd6e42] text-white text-sm font-label tracking-wide hover:bg-[#c45a30] transition-colors disabled:opacity-40"
                        aria-label="Save shelf changes"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-2 rounded-lg bg-th-surface/[0.04] border border-th-surface/[0.10] text-th-text2 text-sm font-label tracking-wide hover:text-th-text transition-colors"
                        aria-label="Cancel editing"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Display Mode ── */
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-th-text font-label text-base font-bold tracking-wide">
                          {shelf.name}
                        </h4>
                        <p className="text-th-text3/50 text-xs mt-0.5">
                          {shelf.unit_count} section{shelf.unit_count !== 1 ? 's' : ''} &middot;{' '}
                          {shelf.capacity_per_unit} per section
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => startEdit(shelf)}
                          className="p-2 rounded-lg text-th-text3/50 hover:text-th-text hover:bg-th-surface/[0.06] transition-colors"
                          aria-label={`Edit ${shelf.name}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        {confirmDeleteId === shelf.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(shelf.id)}
                              className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-label tracking-wide hover:bg-red-500/30 transition-colors"
                              aria-label={`Confirm delete ${shelf.name}`}
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg text-th-text3/50 text-xs font-label tracking-wide hover:text-th-text transition-colors"
                              aria-label="Cancel delete"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(shelf.id)}
                            className="p-2 rounded-lg text-th-text3/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            aria-label={`Delete ${shelf.name}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Capacity bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-th-text3/50 mb-1">
                        <span>Total capacity</span>
                        <span className="font-label tracking-wide">
                          {(shelf.unit_count * shelf.capacity_per_unit).toLocaleString()} records
                        </span>
                      </div>
                      <div className="h-2 bg-th-surface/[0.08] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#dd6e42] rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (totalAssigned / (shelf.unit_count * shelf.capacity_per_unit)) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-th-text3/40 mt-1">
                        {totalAssigned} record{totalAssigned !== 1 ? 's' : ''} assigned across all shelves
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {shelves.length === 0 && (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-th-text3/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          <p className="text-th-text3/40 text-sm">No shelves configured yet. Add one above to get started.</p>
        </div>
      )}

      </>}

      {/* Onboarding overlay (first visit only) */}
      {showOnboarding && (
        <ShelfOnboarding onComplete={handleOnboardingComplete} />
      )}

      {/* User guide modal (always accessible) */}
      <ShelfGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </main>
  );
};

export default ShelfSetup;
