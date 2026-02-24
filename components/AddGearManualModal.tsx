
import React, { useState, useRef, useCallback, useEffect } from 'react';
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

interface CatalogResult {
  id: string;
  brand: string;
  model: string;
  category: string | null;
  year: number | null;
  specs: Record<string, string | number> | null;
  image_url: string | null;
  source_url: string | null;
}

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Show "not found" when user has typed 3+ chars, finished searching, and got 0 results
  const showNotFound = hasSearched && !searching && searchResults.length === 0 && searchQuery.trim().length >= 3;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Add gear manually"
      className="fixed inset-0 z-50 flex items-center justify-center bg-th-bg/95 p-2 md:p-8 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
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

                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                  <ul className="mt-2 rounded-xl border border-th-surface/[0.10] bg-th-bg/95 backdrop-blur-xl overflow-hidden divide-y divide-th-surface/[0.06]">
                    {searchResults.map((result) => (
                      <li key={result.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectCatalogResult(result)}
                          className="w-full text-left px-4 py-3 hover:bg-th-surface/[0.08] transition-colors"
                        >
                          <span className="block text-sm font-semibold text-th-text">
                            {result.brand} {result.model}
                          </span>
                          <span className="block text-xs text-th-text3/60 mt-0.5">
                            {result.category && CATEGORY_LABELS[result.category as GearCategory]
                              ? CATEGORY_LABELS[result.category as GearCategory]
                              : result.category}
                            {result.year ? ` \u00B7 ${result.year}` : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
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
