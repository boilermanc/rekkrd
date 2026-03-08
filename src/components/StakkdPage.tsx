
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Gear, SetupGuide, GearCategory } from '../types';
import { gearService } from '../services/gearService';
import { geminiService, UpgradeRequiredError } from '../services/geminiService';
import { supabase } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import AddGearFlow from './AddGearFlow';
import AddGearManualModal from './AddGearManualModal';
import AddGearMethodModal from './AddGearMethodModal';
import GearCard from './GearCard';
import GearDetailModal from './GearDetailModal';
import SetupGuideModal from './SetupGuideModal';
import SignalChainGuideModal from './SignalChainGuideModal';
import SpinningRecord from './SpinningRecord';
import { sortBySignalFlow } from '../config/signalChainOrder';
import SignalChainDiagram from './stakkd/SignalChainDiagram';
import MyRoomsSection from './stakkd/MyRoomsSection';
import ChainInsightsPanel from './stakkd/ChainInsightsPanel';
import SystemGoalsStep from './stakkd/SystemGoalsStep';
import type { SystemGoals } from './stakkd/SystemGoalsStep';
import { Sparkles, HelpCircle } from 'lucide-react';
import StakkdOnboarding from './StakkdOnboarding';
import StakkdGuideModal from './StakkdGuideModal';

interface SavedGuide {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }
  return headers;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

type SortMode = 'position' | 'brand' | 'newest' | 'category';
type ChainView = 'diagram' | 'list';

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
  tape_deck: 'Tape Deck',
  cables_other: 'Cables / Other',
};

// ── Chain Analysis types ──────────────────────────────────────────

interface ChainAnalysisNote {
  severity: 'info' | 'warning' | 'issue';
  title: string;
  description: string;
  affected_gear: string[];
}

interface ChainAnalysisGap {
  category: string;
  reason: string;
  insert_after: string;
  priority: 'required' | 'recommended' | 'nice_to_have';
}

interface ChainAnalysisTip {
  title: string;
  description: string;
}

export interface ChainAnalysisResult {
  overall_rating: 'excellent' | 'good' | 'needs_attention' | 'incomplete';
  summary: string;
  compatibility_notes: ChainAnalysisNote[];
  gaps: ChainAnalysisGap[];
  tips: ChainAnalysisTip[];
}

interface AnalysisCache {
  gearHash: string;
  analysis: ChainAnalysisResult;
  timestamp: number;
}

const ANALYSIS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/** Simple fingerprint of gear IDs + categories for cache invalidation. */
function hashGear(gear: Gear[]): string {
  return gear
    .map(g => `${g.id}:${g.category}`)
    .sort()
    .join('|');
}

interface StakkdPageProps {
  onUpgradeRequired?: (feature: string) => void;
  onGoHome?: () => void;
}

const StakkdPage: React.FC<StakkdPageProps> = ({ onUpgradeRequired, onGoHome }) => {
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
  const [isViewingSavedGuide, setIsViewingSavedGuide] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [uploadFlowOpen, setUploadFlowOpen] = useState(false);
  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<GearCategory | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('position');
  const [signalChainGuideOpen, setSignalChainGuideOpen] = useState(false);
  const [isCustomOrder, setIsCustomOrder] = useState(false);
  const [chainView, setChainView] = useState<ChainView>('diagram');

  // Onboarding + Guide state
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('rekkrd_stakkd_onboarding_seen');
  });
  const [showGuide, setShowGuide] = useState(false);

  // Chain analysis state
  const [chainAnalysis, setChainAnalysis] = useState<ChainAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisCacheRef = useRef<AnalysisCache | null>(null);
  const [systemGoals, setSystemGoals] = useState<SystemGoals | null>(null);
  const [showGoalsStep, setShowGoalsStep] = useState(false);

  // Saved guides state
  const [savedGuides, setSavedGuides] = useState<SavedGuide[]>([]);
  const [isLoadingGuides, setIsLoadingGuides] = useState(false);
  const [loadingSavedGuideId, setLoadingSavedGuideId] = useState<string | null>(null);

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
      case 'position':
        if (!isCustomOrder) {
          filtered = sortBySignalFlow(filtered);
        }
        break;
    }

    return filtered;
  }, [gear, activeCategory, sortMode, isCustomOrder]);

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

  // ── Saved Guides ──────────────────────────────────────────────────

  const fetchSavedGuides = useCallback(async () => {
    setIsLoadingGuides(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/setup-guides', { headers });
      if (resp.ok) {
        const data = await resp.json();
        setSavedGuides(data.guides || []);
      }
    } catch (err) {
      console.error('Failed to fetch saved guides:', err);
    } finally {
      setIsLoadingGuides(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedGuides();
  }, [fetchSavedGuides]);

  const handleSaveGuide = useCallback(async (name: string) => {
    if (!setupGuide) throw new Error('No guide to save');
    const headers = await getAuthHeaders();
    const gearSnapshot = gear.map(g => ({
      category: g.category,
      brand: g.brand,
      model: g.model,
      specs: g.specs,
    }));
    const resp = await fetch('/api/setup-guides', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, gear_snapshot: gearSnapshot, guide: setupGuide }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }
    fetchSavedGuides();
  }, [setupGuide, gear, fetchSavedGuides]);

  const handleDownloadPdf = useCallback(async () => {
    if (!setupGuide) throw new Error('No guide to download');
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/setup-guides/pdf', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        guide: setupGuide,
        name: 'My Setup Guide',
        gear: gear.map(g => ({ brand: g.brand, model: g.model })),
      }),
    });
    if (!resp.ok) {
      showToast('Failed to generate PDF', 'error');
      throw new Error(`HTTP ${resp.status}`);
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rekkrd-setup-guide.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }, [setupGuide, gear, showToast]);

  const handleDeleteSavedGuide = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/setup-guides/${id}`, { method: 'DELETE', headers });
      if (resp.ok || resp.status === 204) {
        setSavedGuides(prev => prev.filter(g => g.id !== id));
        showToast('Guide deleted.', 'success');
      } else {
        showToast('Failed to delete guide.', 'error');
      }
    } catch (err) {
      console.error('Failed to delete saved guide:', err);
      showToast('Failed to delete guide.', 'error');
    }
  }, [showToast]);

  const handleOpenSavedGuide = useCallback(async (id: string) => {
    setLoadingSavedGuideId(id);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/setup-guides/${id}`, { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setSetupGuide(data.guide as SetupGuide);
      setIsViewingSavedGuide(true);
      setIsGuideModalOpen(true);
    } catch (err) {
      console.error('Failed to load saved guide:', err);
      showToast('Failed to load guide.', 'error');
    } finally {
      setLoadingSavedGuideId(null);
    }
  }, [showToast]);

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

    setIsCustomOrder(true);
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
    setIsCustomOrder(true);
    persistReorder(newGear, movedId);
  }, [gear, persistReorder]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= gear.length - 1) return;
    const newGear = [...gear];
    const movedId = newGear[index].id;
    [newGear[index], newGear[index + 1]] = [newGear[index + 1], newGear[index]];
    setIsCustomOrder(true);
    persistReorder(newGear, movedId);
  }, [gear, persistReorder]);

  // ── Gear limit gate ────────────────────────────────────────────

  const handleOpenMethodModal = useCallback(() => {
    if (gearLimitReached) {
      onUpgradeRequired?.('gear_limit');
      return;
    }
    setMethodModalOpen(true);
  }, [gearLimitReached, onUpgradeRequired]);

  const handleSelectCamera = useCallback(() => {
    setAddFlowOpen(true);
  }, []);

  const handleSelectUpload = useCallback(() => {
    setUploadFlowOpen(true);
  }, []);

  const handleSelectManual = useCallback(() => {
    setManualModalOpen(true);
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('rekkrd_stakkd_onboarding_seen', '1');
    setShowOnboarding(false);
  };

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
    setIsViewingSavedGuide(false);

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

  // ── Chain Analysis ──────────────────────────────────────────────

  const handleAnalyzeChain = useCallback(async (goals?: SystemGoals | null) => {
    // Check client-side cache (only when no goals — goals change the prompt)
    const currentHash = hashGear(gear);
    const cached = analysisCacheRef.current;
    if (!goals && cached && cached.gearHash === currentHash && Date.now() - cached.timestamp < ANALYSIS_CACHE_TTL) {
      setChainAnalysis(cached.analysis);
      showToast('Analysis loaded from cache.', 'success');
      return;
    }

    setIsAnalyzing(true);
    setChainAnalysis(null);

    try {
      const headers = await getAuthHeaders();
      const payload = gear.map(g => ({
        id: g.id,
        name: `${g.brand} ${g.model}`,
        brand: g.brand,
        category: g.category,
        notes: g.notes,
      }));

      const body: Record<string, unknown> = { gear: payload };
      if (goals) body.goals = goals;

      const resp = await fetch('/api/analyze-chain', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const analysis: ChainAnalysisResult = await resp.json();
      setChainAnalysis(analysis);

      // Update cache (skip caching when goals were provided)
      if (!goals) {
        analysisCacheRef.current = { gearHash: currentHash, analysis, timestamp: Date.now() };
      }

      showToast('Analysis complete.', 'success');
    } catch (err) {
      console.error('[analyze-chain] Error:', err);
      const message = err instanceof Error ? err.message : 'Failed to analyze chain';
      showToast(message, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [gear, showToast]);

  // Invalidate cache when gear changes
  useEffect(() => {
    const cached = analysisCacheRef.current;
    if (cached && cached.gearHash !== hashGear(gear)) {
      analysisCacheRef.current = null;
      setChainAnalysis(null);
    }
  }, [gear]);

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

        {/* Action button */}
        <div className="mb-10">
          <button
            onClick={handleOpenMethodModal}
            className="bg-[#dd6e42] text-th-text font-bold py-3 px-8 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Gear
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

        <AddGearMethodModal
          isOpen={methodModalOpen}
          onClose={() => setMethodModalOpen(false)}
          onSelectCamera={handleSelectCamera}
          onSelectUpload={handleSelectUpload}
          onSelectManual={handleSelectManual}
        />

        <AddGearFlow
          isOpen={addFlowOpen}
          onClose={() => setAddFlowOpen(false)}
          onGearSaved={handleGearSaved}
          onUpgradeRequired={onUpgradeRequired}
        />

        <AddGearFlow
          isOpen={uploadFlowOpen}
          onClose={() => setUploadFlowOpen(false)}
          onGearSaved={handleGearSaved}
          onUpgradeRequired={onUpgradeRequired}
          mode="upload"
        />

        <AddGearManualModal
          isOpen={manualModalOpen}
          onClose={() => setManualModalOpen(false)}
          onGearSaved={handleGearSaved}
          onUpgradeRequired={onUpgradeRequired}
          onScanWithAI={() => { setManualModalOpen(false); setAddFlowOpen(true); }}
        />

        {/* Onboarding overlay (first visit only) */}
        {showOnboarding && (
          <StakkdOnboarding onComplete={handleOnboardingComplete} onGoHome={onGoHome} />
        )}
      </div>
    );
  }

  // Gear list
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowGuide(true)}
            className="p-2 rounded-lg text-th-text3/50 hover:text-th-text hover:bg-th-surface/[0.06] transition-colors"
            aria-label="Open Stakkd guide"
            title="Stakkd Guide"
          >
            <HelpCircle size={20} />
          </button>
          <button
            onClick={() => setSignalChainGuideOpen(true)}
            className="border border-th-surface/[0.3] text-th-text2 font-bold py-2.5 px-5 rounded-xl hover:bg-th-surface/[0.1] hover:text-th-text transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            Signal Chain Guide
          </button>
          <button
            onClick={gear.length >= 2 ? handleGenerateGuide : undefined}
            disabled={gear.length < 2 || isGuideLoading}
            title={gear.length === 0
              ? 'Add gear to your Stakkd to generate a setup guide'
              : gear.length === 1
                ? 'Add at least 2 pieces of gear to generate a setup guide'
                : undefined}
            className="border border-th-surface/[0.3] text-th-text2 font-bold py-2.5 px-5 rounded-xl hover:bg-th-surface/[0.1] hover:text-th-text transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-th-text2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.82" />
            </svg>
            How to Connect
          </button>
          <button
            onClick={handleOpenMethodModal}
            className="bg-[#dd6e42] text-th-text font-bold py-2.5 px-5 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Gear
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

          {/* Sort dropdown + reset */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label="Sort gear by"
              className="bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-th-text2 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50 sm:w-auto"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {sortMode === 'position' && isCustomOrder && (
              <button
                onClick={() => setIsCustomOrder(false)}
                aria-label="Reset to automatic signal flow order"
                className="text-[#dd6e42]/80 hover:text-[#dd6e42] text-[10px] font-semibold tracking-wide transition-colors whitespace-nowrap"
              >
                Reset flow
              </button>
            )}
          </div>
        </div>
      )}

      {/* Saved Guides */}
      {savedGuides.length > 0 && (
        <div className="mb-6 rounded-xl border border-th-surface/[0.25] bg-th-surface/[0.08] p-4">
          <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-3">Saved Guides</h4>
          <div className="space-y-2">
            {savedGuides.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-3 group"
              >
                <button
                  onClick={() => handleOpenSavedGuide(g.id)}
                  disabled={loadingSavedGuideId === g.id}
                  className="flex-1 flex items-center gap-3 rounded-lg px-3 py-2.5 bg-th-surface/[0.08] border border-th-surface/[0.15] hover:bg-th-surface/[0.18] hover:border-[#dd6e42]/30 transition-all text-left disabled:opacity-50"
                >
                  {loadingSavedGuideId === g.id ? (
                    <svg className="w-3.5 h-3.5 text-[#dd6e42] animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-[#dd6e42]/90 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                    </svg>
                  )}
                  <span className="text-th-text text-sm font-semibold truncate">{g.name}</span>
                  <span className="text-th-text3/70 text-[10px] tracking-widest ml-auto shrink-0">{formatTimeAgo(g.created_at)}</span>
                </button>
                <button
                  onClick={() => handleDeleteSavedGuide(g.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-th-text3/40 hover:text-red-400 transition-all shrink-0"
                  aria-label={`Delete ${g.name}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
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

      {/* View toggle — only in Signal Chain sort mode */}
      {sortMode === 'position' && displayedGear.length > 0 && (
        <div className="flex items-center gap-1 mb-4" role="tablist" aria-label="Signal chain view">
          <button
            role="tab"
            aria-selected={chainView === 'diagram'}
            onClick={() => setChainView('diagram')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              chainView === 'diagram'
                ? 'bg-th-surface/[0.12] text-th-text'
                : 'text-th-text3 hover:text-th-text2'
            }`}
          >
            Diagram
          </button>
          <button
            role="tab"
            aria-selected={chainView === 'list'}
            onClick={() => setChainView('list')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              chainView === 'list'
                ? 'bg-th-surface/[0.12] text-th-text'
                : 'text-th-text3 hover:text-th-text2'
            }`}
          >
            List
          </button>

          {/* Analyze button — only with 2+ gear */}
          {gear.length >= 2 && (
            <button
              onClick={() => setShowGoalsStep(true)}
              disabled={isAnalyzing}
              aria-label="Analyze your signal chain for compatibility and recommendations"
              aria-busy={isAnalyzing}
              className="ml-auto border border-th-surface/[0.3] text-th-text2 font-bold py-1.5 px-4 rounded-xl hover:bg-th-surface/[0.1] hover:text-th-text transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-th-text2"
            >
              {isAnalyzing ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Analyze My Chain'}
            </button>
          )}
        </div>
      )}

      {/* Signal chain diagram view — pass gaps={chainAnalysis?.gaps} when analysis is wired up */}
      {sortMode === 'position' && chainView === 'diagram' ? (
        <SignalChainDiagram gear={displayedGear} onClickGear={setSelectedGear} onAddGear={handleOpenMethodModal} />
      ) : (
        /* Gear list view */
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
      )}

      {/* Chain analysis results panel */}
      {chainAnalysis && sortMode === 'position' && (
        <ChainInsightsPanel
          analysis={chainAnalysis}
          onClose={() => setChainAnalysis(null)}
          onAddGear={handleOpenMethodModal}
        />
      )}

      {/* Empty filter result */}
      {displayedGear.length === 0 && gear.length > 0 && (
        <div className="py-12 text-center">
          <p className="text-th-text3 text-sm">No gear in this category</p>
        </div>
      )}

      {/* My Rooms section */}
      <MyRoomsSection onGoHome={onGoHome} />

      <AddGearMethodModal
        isOpen={methodModalOpen}
        onClose={() => setMethodModalOpen(false)}
        onSelectCamera={handleSelectCamera}
        onSelectUpload={handleSelectUpload}
        onSelectManual={handleSelectManual}
      />

      <AddGearFlow
        isOpen={addFlowOpen}
        onClose={() => setAddFlowOpen(false)}
        onGearSaved={handleGearSaved}
        onUpgradeRequired={onUpgradeRequired}
      />

      <AddGearFlow
        isOpen={uploadFlowOpen}
        onClose={() => setUploadFlowOpen(false)}
        onGearSaved={handleGearSaved}
        onUpgradeRequired={onUpgradeRequired}
        mode="upload"
      />

      <AddGearManualModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onGearSaved={handleGearSaved}
        onUpgradeRequired={onUpgradeRequired}
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
        onSave={isViewingSavedGuide ? undefined : handleSaveGuide}
        onDownloadPdf={handleDownloadPdf}
      />

      <SignalChainGuideModal
        isOpen={signalChainGuideOpen}
        onClose={() => setSignalChainGuideOpen(false)}
      />

      {/* System Goals step — shown before AI analysis */}
      {showGoalsStep && (
        <SystemGoalsStep
          gearItems={gear.map(g => ({ id: g.id, name: `${g.brand} ${g.model}` }))}
          onComplete={(goals) => {
            setSystemGoals(goals);
            setShowGoalsStep(false);
            handleAnalyzeChain(goals);
          }}
          onSkip={() => {
            setShowGoalsStep(false);
            handleAnalyzeChain(null);
          }}
        />
      )}

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

      {/* Onboarding overlay (first visit only) */}
      {showOnboarding && (
        <StakkdOnboarding onComplete={handleOnboardingComplete} onGoHome={onGoHome} />
      )}

      {/* User guide modal (always accessible) */}
      <StakkdGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
};

export default StakkdPage;
