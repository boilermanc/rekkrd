
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Gear, SetupGuide, GearCategory } from '../types';
import { gearService } from '../services/gearService';
import { geminiService, UpgradeRequiredError } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import AddGearFlow from './AddGearFlow';
import AddGearManualModal from './AddGearManualModal';
import GearCard from './GearCard';
import GearDetailModal from './GearDetailModal';
import SetupGuideModal from './SetupGuideModal';
import SpinningRecord from './SpinningRecord';

type SortMode = 'position' | 'brand' | 'newest' | 'category';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'position', label: 'Signal Chain' },
  { value: 'brand', label: 'Brand A\u2013Z' },
  { value: 'newest', label: 'Newest First' },
  { value: 'category', label: 'Category' },
];

const CATEGORY_LABELS: Record<GearCategory, string> = {
  turntable: 'Turntable',
  cartridge: 'Cartridge',
  phono_preamp: 'Phono Preamp',
  preamp: 'Preamp',
  amplifier: 'Amplifier',
  receiver: 'Receiver',
  speakers: 'Speakers',
  headphones: 'Headphones',
  dac: 'DAC',
  subwoofer: 'Subwoofer',
  cables_other: 'Cables / Other',
};

interface StakkdPageProps {
  onUpgradeRequired?: (feature: string) => void;
}

const StakkdPage: React.FC<StakkdPageProps> = ({ onUpgradeRequired }) => {
  const { showToast } = useToast();
  const { canUse, gearLimitReached: subGearLimitReached, gearLimit, refresh: refreshSubscription } = useSubscription();
  const [gear, setGear] = useState<Gear[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [addFlowOpen, setAddFlowOpen] = useState(false);
  const [selectedGear, setSelectedGear] = useState<Gear | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [justMovedId, setJustMovedId] = useState<string | null>(null);
  const [setupGuide, setSetupGuide] = useState<SetupGuide | null>(null);
  const [isGuideLoading, setIsGuideLoading] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<GearCategory | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('position');

  const isFreeTier = gearLimit !== -1;
  const gearLimitReached = subGearLimitReached;
  const canReorder = sortMode === 'position' && activeCategory === null;

  // ── Category chips (only categories the user has) ─────────────
  const categoryChips = useMemo(() => {
    const counts = new Map<GearCategory, number>();
    for (const g of gear) {
      counts.set(g.category, (counts.get(g.category) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([cat, count]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      count,
    }));
  }, [gear]);

  // ── Filter + sort → displayedGear ─────────────────────────────
  const displayedGear = useMemo(() => {
    let filtered = activeCategory
      ? gear.filter(g => g.category === activeCategory)
      : gear;

    switch (sortMode) {
      case 'brand':
        filtered = [...filtered].sort((a, b) => a.brand.localeCompare(b.brand));
        break;
      case 'newest':
        filtered = [...filtered].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case 'category':
        filtered = [...filtered].sort((a, b) => a.category.localeCompare(b.category));
        break;
      // 'position' — use array order as-is (already in position order)
    }

    return filtered;
  }, [gear, activeCategory, sortMode]);

  const fetchGear = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const data = await gearService.getGear();
      setGear(data);
    } catch (err) {
      console.error('Failed to fetch gear:', err);
      showToast('Failed to load your gear.', 'error');
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchGear();
  }, [fetchGear]);

  const handleGearSaved = useCallback((saved: Gear) => {
    setGear(prev => [...prev, saved]);
    refreshSubscription();
  }, [refreshSubscription]);

  const handleDelete = useCallback((id: string) => {
    setGear(prev => prev.filter(g => g.id !== id));
    setSelectedGear(null);
    refreshSubscription();
  }, [refreshSubscription]);

  const handleUpdate = useCallback((updated: Gear) => {
    setGear(prev => prev.map(g => g.id === updated.id ? updated : g));
    setSelectedGear(updated);
  }, []);

  // ── Drag-to-reorder ──────────────────────────────────────────────

  const persistReorder = useCallback(async (newGear: Gear[], movedId: string) => {
    const previousGear = gear;
    setGear(newGear);
    setJustMovedId(movedId);
    const timer = setTimeout(() => setJustMovedId(null), 1000);

    try {
      await gearService.reorderGear(newGear.map(g => g.id));
    } catch (err) {
      console.error('Failed to reorder gear:', err);
      clearTimeout(timer);
      setJustMovedId(null);
      setGear(previousGear);
      showToast('Failed to reorder gear.', 'error');
    }
  }, [gear, showToast]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  }, [dragIndex]);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newGear = [...gear];
    const [moved] = newGear.splice(dragIndex, 1);
    newGear.splice(targetIndex, 0, moved);

    persistReorder(newGear, moved.id);
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, gear, persistReorder]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const newGear = [...gear];
    const movedId = newGear[index].id;
    [newGear[index - 1], newGear[index]] = [newGear[index], newGear[index - 1]];
    persistReorder(newGear, movedId);
  }, [gear, persistReorder]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= gear.length - 1) return;
    const newGear = [...gear];
    const movedId = newGear[index].id;
    [newGear[index], newGear[index + 1]] = [newGear[index + 1], newGear[index]];
    persistReorder(newGear, movedId);
  }, [gear, persistReorder]);

  // ── Gear limit gate ────────────────────────────────────────────

  const handleAddGear = useCallback(() => {
    if (gearLimitReached) {
      onUpgradeRequired?.('gear_limit');
      return;
    }
    setAddFlowOpen(true);
  }, [gearLimitReached, onUpgradeRequired]);

  const handleAddManual = useCallback(() => {
    if (gearLimitReached) {
      onUpgradeRequired?.('gear_limit');
      return;
    }
    setManualModalOpen(true);
  }, [gearLimitReached, onUpgradeRequired]);

  // ── Setup Guide ─────────────────────────────────────────────────

  const handleGenerateGuide = useCallback(async () => {
    // Plan gate — free users get upgrade prompt
    if (!canUse('setup_guide')) {
      onUpgradeRequired?.('setup_guide');
      return;
    }

    setIsGuideLoading(true);
    setIsGuideModalOpen(true);
    setSetupGuide(null);

    try {
      const payload = gear.map(g => ({
        category: g.category,
        brand: g.brand,
        model: g.model,
        specs: g.specs,
      }));
      const guide = await geminiService.generateSetupGuide(payload);
      setSetupGuide(guide);
    } catch (err) {
      if (err instanceof UpgradeRequiredError) {
        setIsGuideModalOpen(false);
        onUpgradeRequired?.('setup_guide');
      } else {
        console.error('Setup guide error:', err);
        showToast('Failed to generate setup guide.', 'error');
        setIsGuideModalOpen(false);
      }
    } finally {
      setIsGuideLoading(false);
    }
  }, [gear, canUse, onUpgradeRequired, showToast]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <SpinningRecord size="w-24 h-24" />
        <p className="font-label text-[10px] tracking-widest mt-6 text-th-text3 uppercase">Loading Stakkd</p>
      </div>
    );
  }

  // Error state with retry
  if (fetchError && gear.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
        <svg className="w-16 h-16 text-th-text3/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-th-text2 text-sm mb-4">Could not load your gear</p>
        <button
          onClick={fetchGear}
          className="bg-[#dd6e42] text-th-text font-bold py-2.5 px-6 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px]"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (gear.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        {/* Signal chain illustration: turntable → amp → speaker */}
        <div className="flex items-center gap-2 mb-8">
          {/* Turntable */}
          <svg className="w-12 h-12 md:w-14 md:h-14 text-th-text3/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="12" cy="12" r="1" />
            <line x1="12" y1="8" x2="16" y2="5" />
          </svg>
          {/* Arrow */}
          <svg className="w-5 h-5 text-th-text3/15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          {/* Amplifier */}
          <svg className="w-12 h-12 md:w-14 md:h-14 text-th-text3/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <circle cx="8" cy="12" r="2.5" />
            <circle cx="16" cy="12" r="2.5" />
            <line x1="6" y1="16" x2="6" y2="16.5" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="10" y1="16" x2="10" y2="16.5" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
          {/* Arrow */}
          <svg className="w-5 h-5 text-th-text3/15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          {/* Speaker */}
          <svg className="w-12 h-12 md:w-14 md:h-14 text-th-text3/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
            <rect x="5" y="3" width="14" height="18" rx="2" />
            <circle cx="12" cy="11" r="4" />
            <circle cx="12" cy="11" r="1.5" />
            <circle cx="12" cy="18" r="1" />
          </svg>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-th-text mb-2">Build Your Stakkd</h2>
        <p className="text-th-text3 text-sm mb-8 max-w-md">
          Document your audio gear, get setup guides, and find manuals — all powered by AI
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-10">
          <button
            onClick={handleAddGear}
            className="bg-[#dd6e42] text-th-text font-bold py-3 px-8 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            Scan Gear
          </button>
          <button
            onClick={handleAddManual}
            className="border border-th-surface/[0.2] text-th-text2 font-bold py-3 px-8 rounded-xl hover:bg-th-surface/[0.08] hover:text-th-text transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Add Manually
          </button>
        </div>

        {/* Feature highlight cards */}
        <div className="w-full max-w-2xl">
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible">
            {/* AI Identification */}
            <div className="flex-shrink-0 w-56 md:w-auto snap-start rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-4 text-left">
              <svg className="w-6 h-6 text-[#dd6e42]/60 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <h3 className="text-th-text text-sm font-semibold mb-1">AI Identification</h3>
              <p className="text-th-text3 text-xs leading-relaxed">
                Snap a photo, we'll identify your gear and pull up its specs
              </p>
            </div>
            {/* Manual Finder */}
            <div className="flex-shrink-0 w-56 md:w-auto snap-start rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-4 text-left">
              <svg className="w-6 h-6 text-[#dd6e42]/60 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <h3 className="text-th-text text-sm font-semibold mb-1">Manual Finder</h3>
              <p className="text-th-text3 text-xs leading-relaxed">
                Lost your manual? We'll track down the PDF for you
              </p>
            </div>
            {/* Setup Guide */}
            <div className="flex-shrink-0 w-56 md:w-auto snap-start rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-4 text-left">
              <svg className="w-6 h-6 text-[#dd6e42]/60 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.82" />
              </svg>
              <h3 className="text-th-text text-sm font-semibold mb-1">Setup Guide</h3>
              <p className="text-th-text3 text-xs leading-relaxed">
                Get custom wiring instructions for your exact gear combination
              </p>
            </div>
          </div>
        </div>

        <AddGearFlow
          isOpen={addFlowOpen}
          onClose={() => setAddFlowOpen(false)}
          onGearSaved={handleGearSaved}
          onUpgradeRequired={onUpgradeRequired}
        />

        <AddGearManualModal
          isOpen={manualModalOpen}
          onClose={() => setManualModalOpen(false)}
          onGearSaved={handleGearSaved}
        />
      </div>
    );
  }

  // Gear list
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-label text-lg md:text-2xl font-bold tracking-tighter text-th-text">
            Stakkd
          </h2>
          {isFreeTier ? (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-th-text3 text-[10px] uppercase tracking-widest">
                {gear.length} of {gearLimit} gear
              </p>
              <div className="flex gap-0.5">
                {Array.from({ length: gearLimit }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i < gear.length ? 'bg-[#dd6e42]' : 'bg-th-surface/[0.2]'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-th-text3 text-[10px] uppercase tracking-widest mt-0.5">
              {gear.length} {gear.length === 1 ? 'piece' : 'pieces'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {gear.length >= 2 && (
            <button
              onClick={handleGenerateGuide}
              disabled={isGuideLoading}
              className="border border-th-surface/[0.3] text-th-text2 font-bold py-2.5 px-5 rounded-xl hover:bg-th-surface/[0.1] hover:text-th-text transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.82" />
              </svg>
              How to Connect
            </button>
          )}
          <button
            onClick={handleAddGear}
            className="bg-[#dd6e42] text-th-text font-bold py-2.5 px-5 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Gear
          </button>
          <button
            onClick={handleAddManual}
            className="border border-th-surface/[0.2] text-th-text2 font-bold py-2.5 px-4 rounded-xl hover:bg-th-surface/[0.08] hover:text-th-text transition-all uppercase tracking-[0.2em] text-[10px]"
            aria-label="Add gear manually"
            title="Add gear without AI scan"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter / Sort bar */}
      {gear.length > 1 && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Category filter chips */}
          <div
            className="flex gap-1.5 overflow-x-auto pb-1 snap-x"
            role="radiogroup"
            aria-label="Filter by category"
          >
            <button
              role="radio"
              aria-checked={activeCategory === null}
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeCategory === null
                  ? 'bg-[#dd6e42] text-th-text'
                  : 'border border-th-surface/[0.15] text-th-text3 hover:border-th-surface/[0.3] hover:text-th-text2'
              }`}
            >
              All ({gear.length})
            </button>
            {categoryChips.map(({ category, label, count }) => (
              <button
                key={category}
                role="radio"
                aria-checked={activeCategory === category}
                onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeCategory === category
                    ? 'bg-[#dd6e42] text-th-text'
                    : 'border border-th-surface/[0.15] text-th-text3 hover:border-th-surface/[0.3] hover:text-th-text2'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            aria-label="Sort gear by"
            className="shrink-0 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-th-text2 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50 sm:w-auto"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* First-time hint — visible for 1-2 gear items */}
      {gear.length >= 1 && gear.length <= 2 && !hintDismissed && (
        <div className="mb-4 rounded-xl border border-th-surface/[0.15] bg-th-surface/[0.05] px-4 py-3 flex items-center gap-3">
          <svg className="w-4 h-4 text-[#dd6e42]/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          <p className="text-th-text3 text-xs flex-1">
            Tip: Drag to reorder your gear into signal chain order — source to speakers
          </p>
          <button
            onClick={() => setHintDismissed(true)}
            className="text-th-text3/50 hover:text-th-text3 transition-colors p-0.5 shrink-0"
            aria-label="Dismiss tip"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Gear list */}
      <div
        className="space-y-0"
        {...(canReorder ? { 'aria-roledescription': 'sortable' } : {})}
        aria-label="Gear list"
      >
        {displayedGear.map((item, index) => (
          <div key={item.id}>
            {/* Drop indicator — shown above the hovered card */}
            {canReorder && dragOverIndex === index && dragIndex !== null && dragIndex !== index && (
              <div className="h-0.5 bg-[#dd6e42] rounded-full mx-4 my-1 shadow-[0_0_6px_rgba(221,110,66,0.5)]" />
            )}

            <div
              draggable={canReorder}
              onDragStart={(e) => {
                if (!canReorder) { e.preventDefault(); showToast('Switch to Signal Chain view to reorder', 'error'); return; }
                handleDragStart(e, index);
              }}
              onDragOver={(e) => canReorder ? handleDragOver(e, index) : undefined}
              onDrop={(e) => canReorder ? handleDrop(e, index) : undefined}
              onDragEnd={canReorder ? handleDragEnd : undefined}
              className={`relative transition-all duration-300 ${
                canReorder && dragIndex === index ? 'opacity-50 scale-[0.98]' : ''
              } ${
                justMovedId === item.id ? 'ring-2 ring-[#dd6e42]/60 rounded-xl' : ''
              }`}
              aria-label={canReorder
                ? `Drag to reorder. Currently position ${index + 1} of ${displayedGear.length}`
                : `${item.brand} ${item.model}`
              }
            >
              <GearCard gear={item} onClick={setSelectedGear} />

              {/* Mobile move buttons — only in signal chain order */}
              {canReorder && (
                <div className="flex md:hidden absolute right-2 top-1/2 -translate-y-1/2 flex-col gap-1 z-10">
                  {index > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                      className="bg-th-surface/[0.2] backdrop-blur-sm border border-th-surface/[0.15] p-1.5 rounded-full active:bg-[#dd6e42]/30 transition-colors"
                      aria-label={`Move ${item.brand} ${item.model} up in signal chain`}
                    >
                      <svg className="w-3.5 h-3.5 text-th-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                      </svg>
                    </button>
                  )}
                  {index < displayedGear.length - 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                      className="bg-th-surface/[0.2] backdrop-blur-sm border border-th-surface/[0.15] p-1.5 rounded-full active:bg-[#dd6e42]/30 transition-colors"
                      aria-label={`Move ${item.brand} ${item.model} down in signal chain`}
                    >
                      <svg className="w-3.5 h-3.5 text-th-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Signal chain connector line — only in position sort with no filter */}
            {canReorder && index < displayedGear.length - 1 && (
              <div className="flex justify-center py-1">
                <div className="flex flex-col items-center">
                  <div className="w-px h-3 bg-th-surface/[0.15]" />
                  <svg className="w-3 h-3 text-th-surface/[0.25]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                  </svg>
                  <div className="w-px h-3 bg-th-surface/[0.15]" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty filter result */}
      {displayedGear.length === 0 && gear.length > 0 && (
        <div className="py-12 text-center">
          <p className="text-th-text3 text-sm">No gear in this category</p>
        </div>
      )}

      <AddGearFlow
        isOpen={addFlowOpen}
        onClose={() => setAddFlowOpen(false)}
        onGearSaved={handleGearSaved}
        onUpgradeRequired={onUpgradeRequired}
      />

      <AddGearManualModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onGearSaved={handleGearSaved}
      />

      {selectedGear && (
        <GearDetailModal
          isOpen={true}
          gear={selectedGear}
          onClose={() => setSelectedGear(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onUpgradeRequired={onUpgradeRequired}
        />
      )}

      <SetupGuideModal
        guide={setupGuide}
        loading={isGuideLoading}
        isOpen={isGuideModalOpen}
        onClose={() => { setIsGuideModalOpen(false); setSetupGuide(null); }}
      />

      {/* Upgrade banner for free-tier users */}
      {isFreeTier && !bannerDismissed && (
        <div className="mt-8 mx-auto max-w-3xl rounded-xl border border-th-surface/[0.15] bg-th-surface/[0.05] px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-th-text3 text-xs flex-1">
            Unlock AI gear identification, manual finder, and setup guides with Curator
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onUpgradeRequired?.('gear_limit')}
              className="text-[#dd6e42] text-xs font-bold uppercase tracking-widest hover:underline"
            >
              Upgrade
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-th-text3/50 hover:text-th-text3 transition-colors p-0.5"
              aria-label="Dismiss upgrade banner"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StakkdPage;
