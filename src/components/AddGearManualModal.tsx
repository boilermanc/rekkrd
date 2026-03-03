
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Gear, NewGear, GEAR_CATEGORIES, GearCategory } from '../types';
import { gearService } from '../services/gearService';
import { GearLimitError, checkGearLimit } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

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

const INPUT_CLS = 'w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3 text-sm text-th-text placeholder:text-th-text3/50 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50';
const LABEL_CLS = 'block text-th-text3/70 text-[10px] uppercase tracking-widest mb-1';

const CATEGORY_COLORS: Record<string, string> = {
  turntable: '#f59e0b',
  cartridge: '#3b82f6',
  phono_preamp: '#8b5cf6',
  preamp: '#a78bfa',
  amplifier: '#ef4444',
  receiver: '#22c55e',
  speakers: '#14b8a6',
  headphones: '#ec4899',
  dac: '#6366f1',
  subwoofer: '#f97316',
  cables_other: '#06b6d4',
};

const getCategoryColor = (cat: string | null) =>
  CATEGORY_COLORS[cat?.toLowerCase() ?? ''] ?? '#6b7280';

const SPEC_PRIORITY = ['drive_system', 'type', 'power_output', 'frequency_response', 'weight'] as const;

function getResultSubtitle(result: CatalogResult): string {
  if (result.description) {
    return result.description.length > 80
      ? result.description.slice(0, 80) + '\u2026'
      : result.description;
  }
  if (!result.specs) return '';
  const parts: string[] = [];
  for (const key of SPEC_PRIORITY) {
    if (parts.length >= 3) break;
    const val = result.specs[key];
    if (val !== undefined && val !== null && val !== '') {
      parts.push(String(val));
    }
  }
  return parts.join(' \u00B7 ');
}

interface CatalogResult {
  id: string;
  brand: string;
  model: string;
  category: string | null;
  year: number | null;
  description: string | null;
  specs: Record<string, string | number> | null;
  image_url: string | null;
  source_url: string | null;
}

// ── Catalog results subcomponent ────────────────────────────────
const GearFallbackIcon: React.FC = () => (
  <svg className="w-5 h-5 text-th-text3/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.212-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CatalogResults: React.FC<{
  results: CatalogResult[];
  query: string;
  onSelect: (r: CatalogResult) => void;
}> = ({ results, query, onSelect }) => {
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());

  // Group results by category
  const grouped = useMemo(() => {
    const map = new Map<string, CatalogResult[]>();
    for (const r of results) {
      const key = r.category ?? 'Other';
      const arr = map.get(key);
      if (arr) arr.push(r);
      else map.set(key, [r]);
    }
    return Array.from(map.entries());
  }, [results]);

  return (
    <div className="mt-3 space-y-1">
      <p className="text-[10px] text-th-text3/50 uppercase tracking-widest px-1">
        {results.length} result{results.length !== 1 ? 's' : ''} for &lsquo;{query.trim()}&rsquo;
      </p>
      <div className="rounded-xl border border-th-surface/[0.10] bg-th-bg/95 backdrop-blur-xl overflow-hidden">
        {grouped.map(([cat, items]) => {
          const color = getCategoryColor(cat);
          const catLabel = CATEGORY_LABELS[cat as GearCategory] ?? cat;
          return (
            <div key={cat}>
              {/* Category header */}
              <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                <div className="w-0.5 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-th-text3/50">
                  {catLabel}
                </span>
              </div>
              {/* Items in this category */}
              {items.map((result) => {
                const subtitle = getResultSubtitle(result);
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => onSelect(result)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-th-surface/[0.08] transition-colors"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    {/* Image / fallback */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-th-surface/[0.06] flex-shrink-0 flex items-center justify-center">
                      {result.image_url && !brokenImages.has(result.id) ? (
                        <img
                          src={result.image_url}
                          alt={`${result.brand} ${result.model}`}
                          className="w-full h-full object-cover"
                          onError={() => setBrokenImages(prev => new Set(prev).add(result.id))}
                        />
                      ) : (
                        <GearFallbackIcon />
                      )}
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-th-text truncate">
                        {result.brand} {result.model}
                      </span>
                      {subtitle && (
                        <span className="block text-[11px] text-th-text3/50 truncate mt-0.5">
                          {subtitle}
                        </span>
                      )}
                      {result.year && (
                        <span className="block text-[10px] text-th-text3/40 mt-0.5">
                          {result.year}
                        </span>
                      )}
                    </div>
                    {/* Category pill */}
                    <span
                      className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      {catLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface AddGearManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGearSaved: (gear: Gear) => void;
  onUpgradeRequired?: (feature: string) => void;
  onScanWithAI?: () => void;
}

const AddGearManualModal: React.FC<AddGearManualModalProps> = ({
  isOpen,
  onClose,
  onGearSaved,
  onUpgradeRequired,
  onScanWithAI,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);

  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<GearCategory>('turntable');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [notes, setNotes] = useState('');

  // Catalog search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [catalogMatch, setCatalogMatch] = useState(false);
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [selectedCatalogResult, setSelectedCatalogResult] = useState<CatalogResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Image management state
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [useOwnPhoto, setUseOwnPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Reset everything when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategory('turntable');
      setBrand('');
      setModel('');
      setYear('');
      setNotes('');
      setSaving(false);
      setSearchQuery('');
      setSearchResults([]);
      setSearching(false);
      setHasSearched(false);
      setShowForm(false);
      setCatalogMatch(false);
      setCatalogId(null);
      setSelectedCatalogResult(null);
      setUserPhotoUrl(null);
      setUseOwnPhoto(false);
      setUploadingPhoto(false);
    }
  }, [isOpen]);

  // Debounced catalog search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/gear/catalog/search?q=${encodeURIComponent(q)}&limit=10`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: CatalogResult[] = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error('Catalog search error:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
        setHasSearched(true);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  const canSave = brand.trim() !== '' && model.trim() !== '' && !saving;

  const handleSelectCatalogResult = (result: CatalogResult) => {
    setSelectedCatalogResult(result);
    setBrand(result.brand);
    setModel(result.model);
    // Map catalog category to GearCategory if it's valid
    if (result.category && (GEAR_CATEGORIES as readonly string[]).includes(result.category)) {
      setCategory(result.category as GearCategory);
    }
    setYear(result.year ? String(result.year) : '');
    setCatalogMatch(true);
    setCatalogId(result.id);
    setShowForm(true);
    setSearchResults([]);
  };

  const handleSearchAgain = () => {
    setShowForm(false);
    setCatalogMatch(false);
    setCatalogId(null);
    setSelectedCatalogResult(null);
    setUserPhotoUrl(null);
    setUseOwnPhoto(false);
    setBrand('');
    setModel('');
    setYear('');
    setNotes('');
    setCategory('turntable');
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // Server-side gear limit enforcement
      await checkGearLimit();

      const gear: NewGear = {
        category,
        brand: brand.trim(),
        model: model.trim(),
        year: year.trim() || undefined,
        notes: notes.trim() || undefined,
        ...(catalogMatch && selectedCatalogResult ? {
          description: selectedCatalogResult.description ?? undefined,
          specs: selectedCatalogResult.specs ?? undefined,
          catalog_id: catalogId ?? undefined,
        } : {}),
        image_url: userPhotoUrl ?? selectedCatalogResult?.image_url ?? undefined,
        original_photo_url: userPhotoUrl ?? undefined,
      };
      const saved = await gearService.saveGear(gear);
      showToast(`${gear.brand} ${gear.model} added to Stakkd!`, 'success');
      onGearSaved(saved);
      onClose();
    } catch (err) {
      if (err instanceof GearLimitError) {
        onUpgradeRequired?.('gear_limit');
        onClose();
      } else {
        console.error('Failed to save gear:', err);
        showToast('Failed to save gear. Please try again.', 'error');
      }
      setSaving(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file.', 'error');
      return;
    }

    setUploadingPhoto(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const publicUrl = await gearService.uploadPhoto(base64);
      if (publicUrl) {
        setUserPhotoUrl(publicUrl);
        setUseOwnPhoto(true);
      } else {
        showToast('Failed to upload photo.', 'error');
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      showToast('Failed to upload photo.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setUserPhotoUrl(null);
    if (selectedCatalogResult?.image_url) {
      setUseOwnPhoto(false);
    }
  };

  // Show "not found" when user has typed 3+ chars, finished searching, and got 0 results
  const showNotFound = hasSearched && !searching && searchResults.length === 0 && searchQuery.trim().length >= 3;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Add gear manually"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-th-bg/95 p-2 md:p-8 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="relative w-full max-w-lg max-h-[98vh] md:max-h-[95vh] glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] flex flex-col animate-in zoom-in-95 duration-500">

        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-th-surface/[0.10] flex-shrink-0">
          <h2 className="font-label text-[#dd6e42] font-bold tracking-widest text-sm uppercase">
            Add Gear
          </h2>
          <button
            onClick={onClose}
            className="text-th-text2 hover:text-th-text transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">

          {/* ── Catalog Search ──────────────────────────────── */}
          {!showForm && (
            <>
              <div className="relative">
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-th-text3/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searching && (
                    <svg
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-th-text3/50 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search our gear catalog..."
                    autoFocus
                    className={`${INPUT_CLS} pl-10`}
                  />
                </div>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <CatalogResults
                    results={searchResults}
                    query={searchQuery}
                    onSelect={handleSelectCatalogResult}
                  />
                )}
              </div>

              {/* Not found — offer AI scan or manual entry */}
              {showNotFound && (
                <div className="text-center py-6">
                  <p className="text-sm text-th-text3/60 mb-5">
                    Not in our catalog yet &mdash; identify it with AI or add it manually
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    {onScanWithAI && (
                      <button
                        type="button"
                        onClick={() => { onClose(); onScanWithAI(); }}
                        className="bg-[#dd6e42] text-th-text font-bold py-3 px-6 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                        </svg>
                        Scan with AI
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="border border-th-surface/[0.2] text-th-text2 font-bold py-3 px-6 rounded-xl hover:bg-th-surface/[0.08] hover:text-th-text transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                      Add Manually
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Manual Form (shown after catalog pick or manual entry) ── */}
          {showForm && (
            <>
              {/* Catalog match badge + search again */}
              {catalogMatch && (
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs text-green-400/90 bg-green-400/[0.08] border border-green-400/[0.15] rounded-full px-3 py-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Found in Stakkd catalog
                  </span>
                  <button
                    type="button"
                    onClick={handleSearchAgain}
                    className="text-[#dd6e42]/80 text-[10px] uppercase tracking-widest hover:text-[#dd6e42] transition-colors"
                  >
                    Search again
                  </button>
                </div>
              )}

              {/* Search again link for manual entry (no catalog match) */}
              {!catalogMatch && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSearchAgain}
                    className="text-[#dd6e42]/80 text-[10px] uppercase tracking-widest hover:text-[#dd6e42] transition-colors"
                  >
                    Search again
                  </button>
                </div>
              )}

              {/* Category */}
              <div>
                <label className={LABEL_CLS}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GearCategory)}
                  className={INPUT_CLS}
                >
                  {GEAR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Brand *</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Technics"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Model *</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. SL-1200MK7"
                    className={INPUT_CLS}
                  />
                </div>
              </div>

              {/* Year */}
              <div>
                <label className={LABEL_CLS}>Year</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 1972 or early 1980s"
                  className={INPUT_CLS}
                />
              </div>

              {/* Image */}
              <div>
                <label className={LABEL_CLS}>Photo</label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {selectedCatalogResult?.image_url && !useOwnPhoto && !userPhotoUrl ? (
                  <div className="flex items-start gap-4">
                    <div className="w-[120px] h-[120px] rounded-xl overflow-hidden bg-th-surface/[0.06] flex-shrink-0">
                      <img
                        src={selectedCatalogResult.image_url}
                        alt={`${brand} ${model}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-th-text3/50 text-[10px]">From Stakkd catalog</span>
                      <button
                        type="button"
                        onClick={() => {
                          setUseOwnPhoto(true);
                          setTimeout(() => photoInputRef.current?.click(), 0);
                        }}
                        disabled={uploadingPhoto}
                        className="inline-flex items-center gap-1.5 text-[#dd6e42]/80 text-[10px] uppercase tracking-widest hover:text-[#dd6e42] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                        </svg>
                        Use My Own Photo
                      </button>
                    </div>
                  </div>
                ) : userPhotoUrl ? (
                  <div className="flex items-start gap-4">
                    <div className="w-[120px] h-[120px] rounded-xl overflow-hidden bg-th-surface/[0.06] flex-shrink-0">
                      <img
                        src={userPhotoUrl}
                        alt={`${brand} ${model}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-th-text3/50 text-[10px]">Your photo</span>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-th-text3/60 text-[10px] uppercase tracking-widest hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-3 w-full border border-dashed border-th-surface/[0.15] rounded-xl px-4 py-4 text-th-text3/60 hover:border-[#dd6e42]/40 hover:text-th-text3 transition-all disabled:opacity-40"
                  >
                    {uploadingPhoto ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                        </svg>
                        <span className="text-sm">Upload Photo</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className={LABEL_CLS}>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Condition, where you bought it, serial number..."
                  rows={3}
                  className={`${INPUT_CLS} resize-none`}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-th-surface/[0.10] flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 border border-th-surface/[0.10] text-th-text font-bold py-3 rounded-xl hover:bg-th-surface/[0.08] transition-all uppercase tracking-[0.2em] text-[10px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 bg-[#dd6e42] text-th-text font-bold py-3 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save to Stakkd'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddGearManualModal;
