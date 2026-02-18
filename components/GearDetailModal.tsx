
import React, { useState, useRef, useCallback } from 'react';
import { Gear, NewGear, GEAR_CATEGORIES, GearCategory, ManualSearchResult } from '../types';
import { gearService } from '../services/gearService';
import { geminiService } from '../services/geminiService';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useToast } from '../contexts/ToastContext';
import { useSubscription } from '../contexts/SubscriptionContext';

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
  cables_other: 'Cables & Other',
};

function formatSpecKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Large category placeholder icon for the hero area. */
function HeroPlaceholderIcon({ category }: { category: GearCategory }) {
  const cls = "w-20 h-20 text-th-text3/15";
  switch (category) {
    case 'turntable':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'speakers':
    case 'subwoofer':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      );
    case 'headphones':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0118 0v6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" />
        </svg>
      );
    case 'amplifier':
    case 'receiver':
    case 'preamp':
    case 'phono_preamp':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      );
    case 'cartridge':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
      );
    case 'dac':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      );
  }
}

const INPUT_CLS = "w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3 text-sm text-th-text placeholder:text-th-text3/50 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50";
const LABEL_CLS = "block text-th-text3/70 text-[10px] uppercase tracking-widest mb-1";

interface GearDetailModalProps {
  gear: Gear | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedGear: Gear) => void;
  onDelete: (id: string) => void;
  onUpgradeRequired?: (feature: string) => void;
}

const GearDetailModal: React.FC<GearDetailModalProps> = ({
  gear,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onUpgradeRequired,
}) => {
  const { showToast } = useToast();
  const { canUse } = useSubscription();
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle');

  // Edit form state — initialized from gear when entering edit mode
  const [editCategory, setEditCategory] = useState<GearCategory>('cables_other');
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Find Manual flow state
  const [manualSearching, setManualSearching] = useState(false);
  const [manualResult, setManualResult] = useState<ManualSearchResult | null>(null);

  if (!isOpen || !gear) return null;

  const imageUrl = gear.image_url || gear.original_photo_url;
  const label = CATEGORY_LABELS[gear.category] || gear.category;
  const specs = gear.specs && typeof gear.specs === 'object' ? gear.specs : {};
  const specEntries = Object.entries(specs);

  const enterEditMode = () => {
    setEditCategory(gear.category);
    setEditBrand(gear.brand);
    setEditModel(gear.model);
    setEditYear(gear.year || '');
    setEditDescription(gear.description || '');
    setEditPurchasePrice(gear.purchase_price != null ? String(gear.purchase_price) : '');
    setEditPurchaseDate(gear.purchase_date || '');
    setEditNotes(gear.notes || '');
    setEditing(true);
    setDeleteStep('idle');
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!editBrand.trim() || !editModel.trim()) {
      showToast('Brand and model are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const updates: Partial<NewGear> = {
        category: editCategory,
        brand: editBrand.trim(),
        model: editModel.trim(),
        year: editYear.trim() || undefined,
        description: editDescription.trim() || undefined,
        purchase_price: editPurchasePrice ? parseFloat(editPurchasePrice) : undefined,
        purchase_date: editPurchaseDate || undefined,
        notes: editNotes.trim() || undefined,
      };

      const updated = await gearService.updateGear(gear.id, updates);
      showToast('Gear updated.', 'success');
      onUpdate(updated);
      setEditing(false);
    } catch (err) {
      console.error('Failed to update gear:', err);
      showToast('Failed to update gear.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteStep === 'idle') {
      setDeleteStep('confirm');
      return;
    }

    try {
      await gearService.deleteGear(gear.id);
      showToast(`${gear.brand} ${gear.model} removed.`, 'success');
      onDelete(gear.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete gear:', err);
      showToast('Failed to delete gear.', 'error');
      setDeleteStep('idle');
    }
  };

  const handleFindManual = async () => {
    if (!canUse('manual_finder')) {
      onUpgradeRequired?.('manual_finder');
      return;
    }
    setManualSearching(true);
    setManualResult(null);
    try {
      const result = await geminiService.findManual(gear.brand, gear.model, gear.category);

      if (result.manual_url && (result.confidence === 'high' || result.confidence === 'medium')) {
        // Auto-save the found manual URL
        const updated = await gearService.updateGear(gear.id, { manual_url: result.manual_url });
        showToast('Manual found! Saved to your gear.', 'success');
        onUpdate(updated);
      } else {
        // Show alternatives for user to pick from
        setManualResult(result);
      }
    } catch (err) {
      console.error('Find manual failed:', err);
      showToast('Failed to search for manual.', 'error');
      // Show fallback search link
      setManualResult({
        manual_url: null,
        source: '',
        confidence: 'low',
        alternative_urls: [],
        search_url: `https://www.google.com/search?q=${encodeURIComponent(`${gear.brand} ${gear.model} owner manual PDF`)}`,
      });
    } finally {
      setManualSearching(false);
    }
  };

  const handlePickAlternative = async (url: string) => {
    try {
      const updated = await gearService.updateGear(gear.id, { manual_url: url });
      showToast('Manual saved to your gear.', 'success');
      onUpdate(updated);
      setManualResult(null);
    } catch (err) {
      console.error('Failed to save manual URL:', err);
      showToast('Failed to save manual link.', 'error');
    }
  };

  const canSave = editBrand.trim() !== '' && editModel.trim() !== '';

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Gear details for ${gear.brand} ${gear.model}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-th-bg/95 p-2 md:p-8 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="relative w-full max-w-2xl max-h-[98vh] md:max-h-[95vh] glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] flex flex-col animate-in zoom-in-95 duration-500">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-th-bg/50 text-th-text flex items-center justify-center hover:bg-th-text hover:text-th-bg transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero image */}
        <div className="w-full h-48 md:h-64 overflow-hidden bg-th-bg flex items-center justify-center flex-shrink-0 relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${gear.brand} ${gear.model}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <HeroPlaceholderIcon category={gear.category} />
          )}
          {/* Gradient overlay at bottom for text readability */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-th-bg/80 to-transparent" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

          {/* Header */}
          <header>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block bg-[#dd6e42]/15 border border-[#dd6e42]/25 text-[#f0a882] text-[9px] font-label font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full">
                {editing ? (
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as GearCategory)}
                    className="bg-transparent text-[#f0a882] text-[9px] font-bold uppercase tracking-[0.15em] border-none outline-none cursor-pointer"
                  >
                    {GEAR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                    ))}
                  </select>
                ) : label}
              </span>
              {!editing && gear.year && (
                <span className="text-th-text3/50 text-[10px] uppercase tracking-widest">{gear.year}</span>
              )}
              {gear.position != null && (
                <span className="text-th-text3/40 text-[9px] uppercase tracking-widest ml-auto">
                  Position #{gear.position + 1}
                </span>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Brand *</label>
                    <input type="text" value={editBrand} onChange={(e) => setEditBrand(e.target.value)} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Model *</label>
                    <input type="text" value={editModel} onChange={(e) => setEditModel(e.target.value)} className={INPUT_CLS} />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>Year</label>
                  <input type="text" value={editYear} onChange={(e) => setEditYear(e.target.value)} placeholder="e.g. 1972" className={INPUT_CLS} />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl md:text-3xl font-bold text-th-text leading-tight">
                  {gear.brand} {gear.model}
                </h2>
                {gear.year && (
                  <p className="text-th-text3 text-sm mt-1">{gear.year}</p>
                )}
              </>
            )}
          </header>

          {/* Description */}
          <section>
            <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-3">Background</h4>
            {editing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                placeholder="History and background..."
                className={`${INPUT_CLS} resize-none text-th-text/80`}
              />
            ) : gear.description ? (
              <p className="text-th-text/70 leading-relaxed text-sm italic">"{gear.description}"</p>
            ) : (
              <p className="text-th-text3/40 text-sm italic">No description available</p>
            )}
          </section>

          {/* Specs */}
          <section>
            <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-3">Specifications</h4>
            {specEntries.length > 0 ? (
              <div className="glass-morphism rounded-xl border border-th-surface/[0.06] p-4 space-y-2.5">
                {specEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm gap-4">
                    <span className="text-th-text3/70">{formatSpecKey(key)}</span>
                    <span className="text-th-text font-medium text-right">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-th-text3/40 text-sm italic">No specs available</p>
            )}
          </section>

          {/* Manual */}
          <section>
            <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-3">Manual</h4>

            {gear.manual_url ? (
              <div>
                <a
                  href={gear.manual_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-2.5 text-sm text-th-text hover:bg-th-surface/[0.08] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  View Manual
                </a>
                <button
                  onClick={handleFindManual}
                  disabled={manualSearching}
                  className="block mt-2 text-[#f0a882]/70 text-[10px] tracking-widest hover:text-[#dd6e42] transition-colors disabled:opacity-40"
                >
                  {manualSearching ? 'Searching...' : 'Find a different manual'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleFindManual}
                disabled={manualSearching}
                className="inline-flex items-center gap-2 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-2.5 text-sm text-th-text hover:bg-th-surface/[0.08] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {manualSearching ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    Find Manual
                  </>
                )}
              </button>
            )}

            {/* Low-confidence results — alternatives for user to pick */}
            {manualResult && (
              <div className="mt-4 glass-morphism rounded-xl border border-th-surface/[0.06] p-4 space-y-3">
                {manualResult.manual_url ? (
                  <div>
                    <p className="text-th-text3/60 text-[10px] uppercase tracking-widest mb-2">
                      Best match ({manualResult.confidence} confidence)
                    </p>
                    <button
                      onClick={() => handlePickAlternative(manualResult.manual_url!)}
                      className="text-[#f0a882] text-sm hover:text-[#dd6e42] transition-colors underline underline-offset-2 break-all text-left"
                    >
                      {manualResult.source || manualResult.manual_url}
                    </button>
                  </div>
                ) : (
                  <p className="text-th-text3/50 text-sm">No confident match found</p>
                )}

                {manualResult.alternative_urls.length > 0 && (
                  <div>
                    <p className="text-th-text3/60 text-[10px] uppercase tracking-widest mb-2">Other sources</p>
                    <ul className="space-y-1.5">
                      {manualResult.alternative_urls.map((url, i) => (
                        <li key={i}>
                          <button
                            onClick={() => handlePickAlternative(url)}
                            className="text-[#f0a882] text-sm hover:text-[#dd6e42] transition-colors underline underline-offset-2 break-all text-left"
                          >
                            {url}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <a
                  href={manualResult.search_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-th-text3/60 text-[10px] uppercase tracking-widest hover:text-[#dd6e42] transition-colors mt-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Search Google for manual
                </a>
              </div>
            )}
          </section>

          {/* Personal info */}
          <section>
            <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-3">Personal Info</h4>
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Purchase Price</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-th-text3/50 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editPurchasePrice}
                        onChange={(e) => setEditPurchasePrice(e.target.value)}
                        placeholder="0.00"
                        className={`${INPUT_CLS} pl-8`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Purchase Date</label>
                    <input
                      type="date"
                      value={editPurchaseDate}
                      onChange={(e) => setEditPurchaseDate(e.target.value)}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    placeholder="Personal notes..."
                    className={`${INPUT_CLS} resize-none text-th-text/80`}
                  />
                </div>
              </div>
            ) : (
              <div className="glass-morphism rounded-xl border border-th-surface/[0.06] p-4 space-y-3">
                <div className="grid grid-cols-2 gap-y-3">
                  <div>
                    <p className="text-th-text3/50 text-[9px] uppercase mb-0.5">Purchase Price</p>
                    <p className="text-th-text font-bold text-sm">
                      {gear.purchase_price != null ? `$${Number(gear.purchase_price).toFixed(2)}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-th-text3/50 text-[9px] uppercase mb-0.5">Purchase Date</p>
                    <p className="text-th-text font-bold text-sm">
                      {gear.purchase_date || '—'}
                    </p>
                  </div>
                </div>
                {gear.notes && (
                  <div className="pt-2 border-t border-th-surface/[0.06]">
                    <p className="text-th-text3/50 text-[9px] uppercase mb-1">Notes</p>
                    <p className="text-th-text/70 text-sm leading-relaxed">{gear.notes}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-th-surface/[0.10] flex-shrink-0">
          {editing ? (
            <div className="flex gap-3">
              <button
                onClick={cancelEdit}
                className="flex-1 border border-th-surface/[0.10] text-th-text font-bold py-3 rounded-xl hover:bg-th-surface/[0.08] transition-all uppercase tracking-[0.2em] text-[10px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="flex-1 bg-[#dd6e42] text-th-text font-bold py-3 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                onBlur={() => setDeleteStep('idle')}
                className={`py-3 px-5 rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] transition-all ${
                  deleteStep === 'confirm'
                    ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
                    : 'border border-th-surface/[0.10] text-th-text3 hover:text-red-400 hover:border-red-400/30'
                }`}
              >
                {deleteStep === 'confirm' ? 'Confirm Delete?' : 'Delete'}
              </button>
              <button
                onClick={enterEditMode}
                className="flex-1 bg-[#dd6e42] text-th-text font-bold py-3 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px]"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GearDetailModal;
