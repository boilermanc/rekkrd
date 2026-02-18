
import React, { useState, useRef, useCallback } from 'react';
import { NewGear, GEAR_CATEGORIES, GearCategory } from '../types';
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

interface IdentifiedGear {
  category?: string;
  brand?: string;
  model?: string;
  year?: string;
  description?: string;
  specs?: Record<string, string | number>;
  manual_search_query?: string;
}

interface GearConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (gear: NewGear) => void;
  identifiedGear: IdentifiedGear;
  originalPhoto: string;
}

const GearConfirmModal: React.FC<GearConfirmModalProps> = ({
  isOpen,
  onClose,
  onSave,
  identifiedGear,
  originalPhoto,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);

  const [category, setCategory] = useState<GearCategory>(
    GEAR_CATEGORIES.includes(identifiedGear.category as GearCategory)
      ? (identifiedGear.category as GearCategory)
      : 'cables_other'
  );
  const [brand, setBrand] = useState(identifiedGear.brand || '');
  const [model, setModel] = useState(identifiedGear.model || '');
  const [year, setYear] = useState(identifiedGear.year || '');
  const [description, setDescription] = useState(identifiedGear.description || '');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const specs = identifiedGear.specs && typeof identifiedGear.specs === 'object'
    ? identifiedGear.specs
    : {};

  const handleSave = () => {
    const gear: NewGear = {
      category,
      brand: brand.trim(),
      model: model.trim(),
      year: year.trim() || undefined,
      description: description.trim() || undefined,
      specs: Object.keys(specs).length > 0 ? specs : undefined,
      original_photo_url: originalPhoto,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
      purchase_date: purchaseDate || undefined,
      notes: notes.trim() || undefined,
    };
    onSave(gear);
  };

  const canSave = brand.trim() !== '' && model.trim() !== '';

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm gear details"
      className="fixed inset-0 z-50 flex items-center justify-center bg-th-bg/95 p-2 md:p-8 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="relative w-full max-w-2xl max-h-[98vh] md:max-h-[95vh] glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] flex flex-col animate-in zoom-in-95 duration-500">

        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-th-surface/[0.10] flex-shrink-0">
          <h2 className="font-label text-[#dd6e42] font-bold tracking-widest text-sm uppercase">
            Confirm Gear
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          {/* Photo preview */}
          <div className="flex justify-center">
            <img
              src={originalPhoto}
              alt={`Captured photo of ${brand} ${model}`}
              className="w-full max-w-xs h-auto max-h-48 object-contain rounded-xl border border-th-surface/[0.10]"
            />
          </div>

          {/* AI-identified fields */}
          <div className="space-y-4">
            <h3 className="text-th-text3 text-[9px] uppercase tracking-widest border-b border-th-surface/[0.06] pb-2">
              Identified Details
            </h3>

            {/* Category */}
            <div>
              <label className="block text-th-text3/70 text-[10px] uppercase tracking-widest mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GearCategory)}
                className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3 text-sm text-th-text focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50"
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
                <label className="block text-th-text3/70 text-[10px] uppercase tracking-widest mb-1">
                  Brand *
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Technics"
                  className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3 text-sm text-th-text placeholder:text-th-text3/50 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50"
                />
              </div>
              <div>
                <label className="block text-th-text3/70 text-[10px] uppercase tracking-widest mb-1">
                  Model *
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. SL-1200MK7"
                  className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3 text-sm text-th-text placeholder:text-th-text3/50 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50"
                />
              </div>
            </div>

            {/* Year */}
            <div>
              <label className="block text-th-text3/70 text-[10px] uppercase tracking-widest mb-1">
                Year
              </label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 1972 or early 1980s"
                className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3 text-sm text-th-text placeholder:text-th-text3/50 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-th-text3/70 text-[10px] uppercase tracking-widest mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="AI-generated background..."
                rows={3}
                className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3 text-sm text-th-text/80 placeholder:text-th-text3/50 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50 resize-none"
              />
            </div>

            {/* Specs (read-only for v1) */}
            {Object.keys(specs).length > 0 && (
              <div>
                <label className="block text-th-text3/70 text-[10px] uppercase tracking-widest mb-2">
                  Specs
                </label>
                <div className="glass-morphism rounded-xl border border-th-surface/[0.06] p-4 space-y-2">
                  {Object.entries(specs).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-th-text3/70 capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-th-text font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User-supplied fields */}
          <div className="space-y-4">
            <h3 className="text-th-text3 text-[9px] uppercase tracking-widest border-b border-th-surface/[0.06] pb-2">
              Your Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Purchase Price */}
              <div>
                <label className="block text-th-text3/70 text-[10px] uppercase tracking-widest mb-1">
                  Purchase Price
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-th-text3/50 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl pl-8 pr-4 py-3 text-sm text-th-text placeholder:text-th-text3/50 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50"
                  />
                </div>
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-th-text3/70 text-[10px] uppercase tracking-widest mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3 text-sm text-th-text focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-th-text3/70 text-[10px] uppercase tracking-widest mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Personal notes, where you bought it, condition..."
                rows={2}
                className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3 text-sm text-th-text/80 placeholder:text-th-text3/50 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-th-surface/[0.10] flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 border border-th-surface/[0.10] text-th-text font-bold py-3 rounded-xl hover:bg-th-surface/[0.08] transition-all uppercase tracking-[0.2em] text-[10px]"
          >
            Rescan
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 bg-[#dd6e42] text-th-text font-bold py-3 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save to Stakkd
          </button>
        </div>
      </div>
    </div>
  );
};

export default GearConfirmModal;
