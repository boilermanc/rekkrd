
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

interface AddGearManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGearSaved: (gear: Gear) => void;
  onUpgradeRequired?: (feature: string) => void;
}

const AddGearManualModal: React.FC<AddGearManualModalProps> = ({
  isOpen,
  onClose,
  onGearSaved,
  onUpgradeRequired,
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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategory('turntable');
      setBrand('');
      setModel('');
      setYear('');
      setNotes('');
      setSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canSave = brand.trim() !== '' && model.trim() !== '' && !saving;

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
