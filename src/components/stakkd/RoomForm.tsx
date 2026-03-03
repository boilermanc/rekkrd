import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { StakkdRoom, CreateRoomPayload } from '../../types/room';

// ── Props ────────────────────────────────────────────────────────────

interface RoomFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<StakkdRoom>;
  onSave: (payload: CreateRoomPayload) => Promise<void>;
  onCancel: () => void;
}

// ── Constants ────────────────────────────────────────────────────────

const SHAPES: { value: StakkdRoom['shape']; label: string }[] = [
  { value: 'rectangular', label: 'Rectangular' },
  { value: 'l_shaped', label: 'L-Shaped' },
  { value: 'open_concept', label: 'Open Concept' },
];

const FLOOR_TYPES: { value: StakkdRoom['floor_type']; label: string }[] = [
  { value: 'hardwood', label: 'Hardwood' },
  { value: 'carpet', label: 'Carpet' },
  { value: 'tile', label: 'Tile' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'mixed', label: 'Mixed' },
];

const LISTENING_POSITIONS: { value: StakkdRoom['listening_position']; label: string }[] = [
  { value: 'centered', label: 'Centered (middle of room)' },
  { value: 'desk', label: 'Desk (near wall)' },
  { value: 'couch', label: 'Couch (back third)' },
  { value: 'near_wall', label: 'Near Wall' },
];

// ── Helpers ──────────────────────────────────────────────────────────

interface FieldErrors {
  name?: string;
  width_ft?: string;
  length_ft?: string;
  height_ft?: string;
}

function validate(name: string, width: string, length: string, height: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) errors.name = 'Room name is required';

  const w = parseFloat(width);
  if (!width || isNaN(w)) errors.width_ft = 'Width is required';
  else if (w < 4 || w > 100) errors.width_ft = 'Must be 4–100 ft';

  const l = parseFloat(length);
  if (!length || isNaN(l)) errors.length_ft = 'Length is required';
  else if (l < 4 || l > 100) errors.length_ft = 'Must be 4–100 ft';

  const h = parseFloat(height);
  if (height && !isNaN(h) && (h < 6 || h > 20)) errors.height_ft = 'Must be 6–20 ft';

  return errors;
}

function validateStep(step: number, name: string, width: string, length: string, height: string): FieldErrors {
  if (step === 1) {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Room name is required';
    return errors;
  }
  if (step === 2) {
    const errors: FieldErrors = {};
    const w = parseFloat(width);
    if (!width || isNaN(w)) errors.width_ft = 'Width is required';
    else if (w < 4 || w > 100) errors.width_ft = 'Must be 4–100 ft';
    const l = parseFloat(length);
    if (!length || isNaN(l)) errors.length_ft = 'Length is required';
    else if (l < 4 || l > 100) errors.length_ft = 'Must be 4–100 ft';
    const h = parseFloat(height);
    if (height && !isNaN(h) && (h < 6 || h > 20)) errors.height_ft = 'Must be 6–20 ft';
    return errors;
  }
  return {};
}

const STEP_LABELS = ['Your Room', 'Dimensions', 'Setup'] as const;

// ── Component ────────────────────────────────────────────────────────

const RoomForm: React.FC<RoomFormProps> = ({ mode, initialData, onSave, onCancel }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnCancel = useCallback(onCancel, [onCancel]);
  useFocusTrap(modalRef, stableOnCancel);

  // Form state
  const [name, setName] = useState('');
  const [widthFt, setWidthFt] = useState('');
  const [lengthFt, setLengthFt] = useState('');
  const [heightFt, setHeightFt] = useState('8.0');
  const [shape, setShape] = useState<StakkdRoom['shape']>('rectangular');
  const [floorType, setFloorType] = useState<StakkdRoom['floor_type']>('hardwood');
  const [listeningPosition, setListeningPosition] = useState<StakkdRoom['listening_position']>('centered');
  const [notes, setNotes] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Populate on mount / initialData change
  useEffect(() => {
    if (initialData) {
      setName(initialData.name ?? '');
      setWidthFt(initialData.width_ft != null ? String(initialData.width_ft) : '');
      setLengthFt(initialData.length_ft != null ? String(initialData.length_ft) : '');
      setHeightFt(initialData.height_ft != null ? String(initialData.height_ft) : '8.0');
      setShape(initialData.shape ?? 'rectangular');
      setFloorType(initialData.floor_type ?? 'hardwood');
      setListeningPosition(initialData.listening_position ?? 'centered');
      setNotes(initialData.notes ?? '');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validate(name, widthFt, lengthFt, heightFt);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const payload: CreateRoomPayload = {
      name: name.trim(),
      width_ft: parseFloat(widthFt),
      length_ft: parseFloat(lengthFt),
      height_ft: parseFloat(heightFt),
      shape,
      floor_type: floorType,
      listening_position: listeningPosition,
      notes: notes.trim() || undefined,
    };

    setSaving(true);
    try {
      await onSave(payload);
    } catch {
      // onSave handles toast — just stop spinner
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    const errors = validateStep(step, name, widthFt, lengthFt, heightFt);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setStep((step + 1) as 2 | 3);
  };

  const handleBack = () => {
    setFieldErrors({});
    setStep((step - 1) as 1 | 2);
  };

  // Shared input class matching GearCatalogEditor pattern
  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-th-surface/20 bg-th-bg text-th-text placeholder:text-th-text3/40 focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/30 focus:border-[#dd6e42]/60 transition-colors';
  const labelClass = 'block text-xs font-medium mb-1.5 text-th-text3';
  const errorBorder = 'border-red-400 focus:ring-red-400/30 focus:border-red-400';

  const stepTitle = step === 1 ? 'Your Room' : step === 2 ? 'Dimensions' : 'Setup & Notes';

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'Create new room' : 'Edit room'}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-th-bg/95 p-4 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="relative w-full max-w-lg max-h-[95vh] overflow-y-auto rounded-2xl border border-th-surface/[0.10] bg-th-bg shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-th-surface/10 bg-th-bg">
          <h2 className="text-base font-semibold text-th-text">
            {stepTitle}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-th-surface/10 transition-colors"
          >
            <svg className="w-5 h-5 text-th-text3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-5 pb-1" aria-label="Form progress" role="navigation">
          <div className="flex items-center justify-between">
            {STEP_LABELS.map((label, i) => {
              const stepNum = (i + 1) as 1 | 2 | 3;
              const isActive = step === stepNum;
              const isCompleted = step > stepNum;

              return (
                <React.Fragment key={label}>
                  {/* Connector line before step (skip for first) */}
                  {i > 0 && (
                    <div
                      className={`flex-1 h-px mx-2 transition-colors ${
                        isCompleted || isActive ? 'bg-[#dd6e42]' : 'bg-th-surface/[0.15]'
                      }`}
                    />
                  )}

                  {/* Step circle + label */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      aria-current={isActive ? 'step' : undefined}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#dd6e42] text-white ring-2 ring-[#dd6e42]/30'
                          : isCompleted
                            ? 'bg-[#dd6e42]/20 text-[#dd6e42]'
                            : 'border border-th-surface/[0.20] text-th-text3/50'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        stepNum
                      )}
                    </div>
                    <span
                      className={`hidden sm:inline text-[10px] font-medium tracking-wide ${
                        isActive ? 'text-th-text' : isCompleted ? 'text-th-text3/70' : 'text-th-text3/40'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Step 1: Your Room — Room Name */}
          {step === 1 && (
            <div key={1} className="animate-in fade-in duration-200 space-y-5">
              <div>
                <label htmlFor="room-name" className={labelClass}>
                  Room Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="room-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Living Room"
                  aria-label="Room name"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.name}
                  className={`${inputClass} ${fieldErrors.name ? errorBorder : ''}`}
                />
                {fieldErrors.name && (
                  <p className="text-xs mt-1 text-red-400" role="alert">{fieldErrors.name}</p>
                )}
              </div>

              {/* Room Shape */}
              <div>
                <label htmlFor="room-shape" className={labelClass}>Room Shape</label>
                <select
                  id="room-shape"
                  value={shape}
                  onChange={e => setShape(e.target.value as StakkdRoom['shape'])}
                  aria-label="Room shape"
                  className={inputClass}
                >
                  {SHAPES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Floor Type */}
              <div>
                <label htmlFor="room-floor" className={labelClass}>Floor Type</label>
                <select
                  id="room-floor"
                  value={floorType}
                  onChange={e => setFloorType(e.target.value as StakkdRoom['floor_type'])}
                  aria-label="Floor type"
                  className={inputClass}
                >
                  {FLOOR_TYPES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Dimensions */}
          {step === 2 && (
            <div key={2} className="animate-in fade-in duration-200">
              <fieldset>
                <legend className={`${labelClass} mb-3`}>
                  Dimensions <span className="text-red-400">*</span>
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="room-width" className={labelClass}>Width (ft)</label>
                    <input
                      id="room-width"
                      type="number"
                      value={widthFt}
                      onChange={e => setWidthFt(e.target.value)}
                      min={4}
                      max={100}
                      step={0.5}
                      placeholder="14"
                      aria-label="Room width in feet"
                      aria-required="true"
                      aria-invalid={!!fieldErrors.width_ft}
                      className={`${inputClass} ${fieldErrors.width_ft ? errorBorder : ''}`}
                    />
                    {fieldErrors.width_ft && (
                      <p className="text-xs mt-1 text-red-400" role="alert">{fieldErrors.width_ft}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="room-length" className={labelClass}>Length (ft)</label>
                    <input
                      id="room-length"
                      type="number"
                      value={lengthFt}
                      onChange={e => setLengthFt(e.target.value)}
                      min={4}
                      max={100}
                      step={0.5}
                      placeholder="12"
                      aria-label="Room length in feet"
                      aria-required="true"
                      aria-invalid={!!fieldErrors.length_ft}
                      className={`${inputClass} ${fieldErrors.length_ft ? errorBorder : ''}`}
                    />
                    {fieldErrors.length_ft && (
                      <p className="text-xs mt-1 text-red-400" role="alert">{fieldErrors.length_ft}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
                    <label htmlFor="room-height" className={labelClass}>Ceiling Height (ft)</label>
                    <input
                      id="room-height"
                      type="number"
                      value={heightFt}
                      onChange={e => setHeightFt(e.target.value)}
                      min={6}
                      max={20}
                      step={0.5}
                      placeholder="8.0"
                      aria-label="Ceiling height in feet"
                      aria-invalid={!!fieldErrors.height_ft}
                      className={`${inputClass} ${fieldErrors.height_ft ? errorBorder : ''}`}
                    />
                    {fieldErrors.height_ft && (
                      <p className="text-xs mt-1 text-red-400" role="alert">{fieldErrors.height_ft}</p>
                    )}
                  </div>
                </div>
              </fieldset>
            </div>
          )}

          {/* Step 3: Setup & Notes */}
          {step === 3 && (
            <div key={3} className="animate-in fade-in duration-200 space-y-5">
              {/* Listening Position */}
              <div>
                <label htmlFor="room-position" className={labelClass}>Listening Position</label>
                <select
                  id="room-position"
                  value={listeningPosition}
                  onChange={e => setListeningPosition(e.target.value as StakkdRoom['listening_position'])}
                  aria-label="Listening position"
                  className={inputClass}
                >
                  {LISTENING_POSITIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="room-notes" className={labelClass}>Notes</label>
                <textarea
                  id="room-notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything else about your space..."
                  aria-label="Room notes"
                  className={inputClass}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {step === 1 ? (
                <button
                  type="button"
                  onClick={onCancel}
                  aria-label="Cancel"
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-th-surface/10 text-th-text3 hover:bg-th-surface/20 transition-colors"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Go to previous step"
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-th-surface/10 text-th-text3 hover:bg-th-surface/20 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Back
                </button>
              )}
            </div>

            <div>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Go to next step"
                  className="text-sm font-medium px-5 py-2 rounded-lg text-white transition-colors flex items-center gap-1.5"
                  style={{ backgroundColor: '#dd6e42' }}
                  onMouseEnter={e => { (e.currentTarget.style.backgroundColor = '#c45a30'); }}
                  onMouseLeave={e => { (e.currentTarget.style.backgroundColor = '#dd6e42'); }}
                >
                  Next
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  aria-label={mode === 'create' ? 'Save room' : 'Update room'}
                  className="text-sm font-medium px-5 py-2 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: '#dd6e42' }}
                  onMouseEnter={e => { if (!saving) (e.currentTarget.style.backgroundColor = '#c45a30'); }}
                  onMouseLeave={e => { (e.currentTarget.style.backgroundColor = '#dd6e42'); }}
                >
                  {saving && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {saving ? 'Saving...' : (mode === 'edit' ? 'Update Room' : 'Create Room')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomForm;
