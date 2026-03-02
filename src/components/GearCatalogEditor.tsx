import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseService';

// ── Types ─────────────────────────────────────────────────────────────

interface GearCatalogEntry {
  id: string;
  brand: string;
  model: string;
  category: string | null;
  year: string | null;
  description: string | null;
  specs: Record<string, unknown>;
  manual_url: string | null;
  manual_pdf_url: string | null;
  image_url: string | null;
  source: string | null;
  source_id: string | null;
  source_url: string | null;
  ai_confidence: number | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

interface GearCatalogEditorProps {
  entry: GearCatalogEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (saved: GearCatalogEntry) => void;
}

interface SpecRow {
  key: string;
  value: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

const CATEGORIES = [
  'turntable', 'cartridge', 'phono_preamp', 'preamp', 'amplifier',
  'receiver', 'speakers', 'headphones', 'dac', 'subwoofer', 'cables_other',
] as const;

function formatCategory(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      return headers;
    }
  }
  const secret = import.meta.env.VITE_API_SECRET;
  if (secret) headers['Authorization'] = `Bearer ${secret}`;
  return headers;
}

function specsToRows(specs: Record<string, unknown> | null | undefined): SpecRow[] {
  if (!specs || typeof specs !== 'object') return [];
  const rows = Object.entries(specs).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value),
  }));
  return rows.length > 0 ? rows : [];
}

function rowsToSpecs(rows: SpecRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const k = row.key.trim();
    if (k) out[k] = row.value;
  }
  return out;
}

// ── Component ─────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(99,102,241)] focus:ring-opacity-20 focus:border-[rgb(99,102,241)]';

const GearCatalogEditor: React.FC<GearCatalogEditorProps> = ({ entry, isOpen, onClose, onSave }) => {
  // Form state
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualPdfUrl, setManualPdfUrl] = useState('');
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [aiConfidence, setAiConfidence] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [specRows, setSpecRows] = useState<SpecRow[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ brand?: string; model?: string }>({});
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState<{ text: string; color: 'green' | 'amber' | 'red' } | null>(null);
  const enrichTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Populate / reset on open
  useEffect(() => {
    if (!isOpen) return;
    setStatusMsg(null);
    setFieldErrors({});
    if (entry) {
      setBrand(entry.brand);
      setModel(entry.model);
      setCategory(entry.category || '');
      setYear(entry.year || '');
      setDescription(entry.description || '');
      setImageUrl(entry.image_url || '');
      setManualUrl(entry.manual_url || '');
      setManualPdfUrl(entry.manual_pdf_url || '');
      setSource(entry.source || '');
      setSourceUrl(entry.source_url || '');
      setSourceId(entry.source_id || '');
      setAiConfidence(entry.ai_confidence != null ? String(entry.ai_confidence) : '');
      setIsApproved(entry.is_approved);
      setSpecRows(specsToRows(entry.specs));
    } else {
      setBrand('');
      setModel('');
      setCategory('');
      setYear('');
      setDescription('');
      setImageUrl('');
      setManualUrl('');
      setManualPdfUrl('');
      setSource('');
      setSourceUrl('');
      setSourceId('');
      setAiConfidence('');
      setIsApproved(false);
      setSpecRows([]);
    }
  }, [isOpen, entry]);

  // Spec rows helpers
  const addSpecRow = () => setSpecRows(prev => [...prev, { key: '', value: '' }]);
  const removeSpecRow = (idx: number) => setSpecRows(prev => prev.filter((_, i) => i !== idx));
  const updateSpecRow = (idx: number, field: 'key' | 'value', val: string) => {
    setSpecRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };

  // Enrich with AI
  const handleEnrich = async () => {
    setIsEnriching(true);
    setEnrichMsg(null);
    clearTimeout(enrichTimerRef.current);

    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/admin/gear-catalog/enrich', {
        method: 'POST',
        headers,
        body: JSON.stringify({ brand: brand.trim(), model: model.trim(), category: category || undefined }),
      });

      if (resp.status === 422) {
        setEnrichMsg({ text: 'Gear not recognized — fill in manually', color: 'amber' });
      } else if (!resp.ok) {
        setEnrichMsg({ text: 'Enrichment failed', color: 'red' });
      } else {
        const data = await resp.json();
        if (data.category && !category) setCategory(data.category);
        if (data.year && !year) setYear(data.year);
        if (data.description && !description) setDescription(data.description);
        if (data.specs && typeof data.specs === 'object' && specRows.length === 0) {
          setSpecRows(specsToRows(data.specs));
        }
        if (data.confidence != null && !aiConfidence) setAiConfidence(String(data.confidence));
        setEnrichMsg({ text: 'Fields populated from AI — review before saving', color: 'green' });
      }
    } catch {
      setEnrichMsg({ text: 'Enrichment failed', color: 'red' });
    } finally {
      setIsEnriching(false);
      enrichTimerRef.current = setTimeout(() => setEnrichMsg(null), 3000);
    }
  };

  // Submit
  const handleSave = async () => {
    // Validate
    const errors: { brand?: string; model?: string } = {};
    if (!brand.trim()) errors.brand = 'Brand is required';
    if (!model.trim()) errors.model = 'Model is required';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    setStatusMsg(null);

    const body: Record<string, unknown> = {
      brand: brand.trim(),
      model: model.trim(),
      category: category || null,
      year: year.trim() || null,
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      manual_url: manualUrl.trim() || null,
      manual_pdf_url: manualPdfUrl.trim() || null,
      source: source.trim() || null,
      source_url: sourceUrl.trim() || null,
      source_id: sourceId.trim() || null,
      ai_confidence: aiConfidence !== '' ? parseFloat(aiConfidence) : null,
      is_approved: isApproved,
      specs: rowsToSpecs(specRows),
    };

    try {
      const headers = await getAuthHeaders();
      const isEdit = !!entry?.id;
      const url = isEdit
        ? `/api/admin/gear-catalog/${entry!.id}`
        : '/api/admin/gear-catalog';

      const resp = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const saved: GearCatalogEntry = await resp.json();
      onSave(saved);
    } catch (err) {
      setStatusMsg({
        text: err instanceof Error ? err.message : 'Failed to save',
        isError: true,
      });
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div
        className="w-full max-w-2xl h-full overflow-y-auto border-l shadow-xl"
        style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'rgb(229,231,235)', backgroundColor: 'rgb(255,255,255)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>
            {entry?.id ? 'Edit Gear Entry' : 'Add Gear Entry'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[rgb(243,244,246)] transition-colors"
          >
            <svg className="w-4 h-4" style={{ color: 'rgb(107,114,128)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status message */}
        {statusMsg && (
          <div
            className="mx-6 mt-4 rounded-lg px-4 py-3 text-sm"
            style={{
              backgroundColor: statusMsg.isError ? 'rgb(254,242,242)' : 'rgb(240,253,244)',
              color: statusMsg.isError ? 'rgb(239,68,68)' : 'rgb(22,163,74)',
            }}
          >
            {statusMsg.text}
          </div>
        )}

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Brand */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>
              Brand <span style={{ color: 'rgb(239,68,68)' }}>*</span>
            </label>
            <input
              type="text"
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="e.g. Technics"
              className={INPUT_CLASS}
              style={{ borderColor: fieldErrors.brand ? 'rgb(239,68,68)' : 'rgb(229,231,235)' }}
            />
            {fieldErrors.brand && (
              <p className="text-xs mt-1" style={{ color: 'rgb(239,68,68)' }}>{fieldErrors.brand}</p>
            )}
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>
              Model <span style={{ color: 'rgb(239,68,68)' }}>*</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="e.g. SL-1200MK7"
              className={INPUT_CLASS}
              style={{ borderColor: fieldErrors.model ? 'rgb(239,68,68)' : 'rgb(229,231,235)' }}
            />
            {fieldErrors.model && (
              <p className="text-xs mt-1" style={{ color: 'rgb(239,68,68)' }}>{fieldErrors.model}</p>
            )}
          </div>

          {/* Enrich with AI */}
          {brand.trim() && model.trim() && (
            <div>
              <button
                type="button"
                onClick={handleEnrich}
                disabled={isEnriching || saving}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: 'rgb(238,242,255)', color: 'rgb(99,102,241)' }}
              >
                {isEnriching ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[rgb(99,102,241)] border-t-transparent rounded-full animate-spin" />
                    Fetching gear data...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                    Enrich with AI
                  </>
                )}
              </button>
              {enrichMsg && (
                <p
                  className="text-xs mt-1.5"
                  style={{
                    color: enrichMsg.color === 'green' ? 'rgb(22,163,74)'
                      : enrichMsg.color === 'amber' ? 'rgb(217,119,6)'
                      : 'rgb(239,68,68)',
                  }}
                >
                  {enrichMsg.text}
                </p>
              )}
            </div>
          )}

          {/* Category + Year row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={INPUT_CLASS}
                style={{ borderColor: 'rgb(229,231,235)' }}
              >
                <option value="">Unknown</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{formatCategory(cat)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Year</label>
              <input
                type="text"
                value={year}
                onChange={e => setYear(e.target.value)}
                placeholder="e.g. 1978 or Late 1970s"
                className={INPUT_CLASS}
                style={{ borderColor: 'rgb(229,231,235)' }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className={INPUT_CLASS}
              style={{ borderColor: 'rgb(229,231,235)', resize: 'vertical' }}
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Image URL</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://..."
                className={`${INPUT_CLASS} flex-1`}
                style={{ borderColor: 'rgb(229,231,235)' }}
              />
              {imageUrl.trim() && (
                <img
                  src={imageUrl.trim()}
                  alt="Preview"
                  className="w-16 h-16 rounded-lg object-cover shrink-0 border"
                  style={{ borderColor: 'rgb(229,231,235)' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>
          </div>

          {/* Manual URL + Manual PDF URL */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Manual URL</label>
              <input
                type="text"
                value={manualUrl}
                onChange={e => setManualUrl(e.target.value)}
                placeholder="https://..."
                className={INPUT_CLASS}
                style={{ borderColor: 'rgb(229,231,235)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Manual PDF URL</label>
              <input
                type="text"
                value={manualPdfUrl}
                onChange={e => setManualPdfUrl(e.target.value)}
                placeholder="https://..."
                className={INPUT_CLASS}
                style={{ borderColor: 'rgb(229,231,235)' }}
              />
            </div>
          </div>

          {/* Source + Source URL + Source ID */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Source</label>
              <input
                type="text"
                value={source}
                onChange={e => setSource(e.target.value)}
                placeholder="e.g. gearogs, manual, scrape"
                className={INPUT_CLASS}
                style={{ borderColor: 'rgb(229,231,235)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Source URL</label>
              <input
                type="text"
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className={INPUT_CLASS}
                style={{ borderColor: 'rgb(229,231,235)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Source ID</label>
              <input
                type="text"
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                className={INPUT_CLASS}
                style={{ borderColor: 'rgb(229,231,235)' }}
              />
            </div>
          </div>

          {/* AI Confidence + Approved */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>AI Confidence</label>
              <input
                type="number"
                value={aiConfidence}
                onChange={e => setAiConfidence(e.target.value)}
                min={0}
                max={1}
                step={0.01}
                placeholder="0.00 – 1.00"
                className={INPUT_CLASS}
                style={{ borderColor: 'rgb(229,231,235)' }}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isApproved}
                  onChange={e => setIsApproved(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[rgb(99,102,241)] focus:ring-[rgb(99,102,241)]"
                />
                <span className="text-sm font-medium" style={{ color: 'rgb(17,24,39)' }}>Approved</span>
              </label>
            </div>
          </div>

          {/* Specs key/value editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium" style={{ color: 'rgb(107,114,128)' }}>Specs</label>
              <button
                type="button"
                onClick={addSpecRow}
                className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                style={{ backgroundColor: 'rgb(238,242,255)', color: 'rgb(99,102,241)' }}
              >
                + Add Spec
              </button>
            </div>
            {specRows.length === 0 ? (
              <p className="text-xs py-2" style={{ color: 'rgb(156,163,175)' }}>
                No specs. Click "Add Spec" to add key/value pairs.
              </p>
            ) : (
              <div className="space-y-2">
                {specRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.key}
                      onChange={e => updateSpecRow(idx, 'key', e.target.value)}
                      placeholder="Key"
                      className={`${INPUT_CLASS} flex-1`}
                      style={{ borderColor: 'rgb(229,231,235)' }}
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={e => updateSpecRow(idx, 'value', e.target.value)}
                      placeholder="Value"
                      className={`${INPUT_CLASS} flex-1`}
                      style={{ borderColor: 'rgb(229,231,235)' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecRow(idx)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                      title="Remove spec"
                    >
                      <svg className="w-4 h-4 text-[rgb(239,68,68)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: 'rgb(229,231,235)', backgroundColor: 'rgb(255,255,255)' }}>
          <button
            onClick={onClose}
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'rgb(243,244,246)', color: 'rgb(107,114,128)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: 'rgb(99,102,241)' }}
          >
            {saving && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {saving ? 'Saving...' : (entry?.id ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GearCatalogEditor;
