import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabaseService';
import GearCatalogEditor from '../../src/components/GearCatalogEditor';

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

interface IdentifyResult {
  brand: string | null;
  model: string | null;
  category: string | null;
  year: string | null;
  confidence: number;
  notes: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

const CATEGORIES = [
  'turntable', 'cartridge', 'phono_preamp', 'preamp', 'amplifier',
  'receiver', 'speakers', 'headphones', 'dac', 'subwoofer', 'cables_other',
] as const;

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

function formatCategory(cat: string | null): string {
  if (!cat) return '—';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Component ─────────────────────────────────────────────────────────

const GearCatalogPage: React.FC = () => {
  // Search
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'true' | 'false'>('all');

  // Results
  const [results, setResults] = useState<GearCatalogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Editor
  const [selectedEntry, setSelectedEntry] = useState<GearCatalogEntry | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Image search
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [identifyResult, setIdentifyResult] = useState<IdentifyResult | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const PAGE_SIZE = 50;

  // ── Debounced search query ──────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(inputValue), 400);
    return () => clearTimeout(t);
  }, [inputValue]);

  // ── Fetch results ───────────────────────────────────────────────────

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('approved', approvalFilter);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));

      const resp = await fetch(`/api/admin/gear-catalog?${params}`, { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setResults(data.data);
      setTotal(data.total);
    } catch (err) {
      setStatusMsg({ text: err instanceof Error ? err.message : 'Failed to fetch', isError: true });
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, selectedCategory, approvalFilter, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // ── Toggle approval ─────────────────────────────────────────────────

  const handleToggleApproval = async (entry: GearCatalogEntry) => {
    const newApproved = !entry.is_approved;
    // Optimistic update
    setResults(prev => prev.map(e => e.id === entry.id ? { ...e, is_approved: newApproved } : e));
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/gear-catalog/${entry.id}/approve`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ approved: newApproved }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
      // Revert
      setResults(prev => prev.map(e => e.id === entry.id ? { ...e, is_approved: entry.is_approved } : e));
      setStatusMsg({ text: 'Failed to update approval', isError: true });
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/gear-catalog/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setResults(prev => prev.filter(e => e.id !== id));
      setTotal(prev => prev - 1);
      setStatusMsg({ text: 'Entry deleted.', isError: false });
    } catch (err) {
      setStatusMsg({ text: err instanceof Error ? err.message : 'Failed to delete', isError: true });
    } finally {
      setDeletingId(null);
      setDeleteLoading(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  // ── Image identify ──────────────────────────────────────────────────

  const handleFileSelect = (file: File) => {
    setImageFile(file);
    setIdentifyResult(null);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFileSelect(file);
  };

  const handleIdentify = async () => {
    if (!imageFile) return;
    setIsIdentifying(true);
    setIdentifyResult(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Strip data URL prefix
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const headers = await getAuthHeaders();
      const resp = await fetch('/api/admin/gear-catalog/identify-image', {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: base64, mimeType: imageFile.type }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Identification failed' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const result: IdentifyResult = await resp.json();
      setIdentifyResult(result);

      // Auto-populate search and switch to text tab
      const searchStr = [result.brand, result.model].filter(Boolean).join(' ');
      if (searchStr) {
        setInputValue(searchStr);
        setPage(0);
        setActiveTab('text');
      }
    } catch (err) {
      setStatusMsg({ text: err instanceof Error ? err.message : 'Identification failed', isError: true });
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setIsIdentifying(false);
    }
  };

  // ── Pagination helpers ──────────────────────────────────────────────

  const startIdx = page * PAGE_SIZE + 1;
  const endIdx = Math.min((page + 1) * PAGE_SIZE, total);
  const hasNext = endIdx < total;
  const hasPrev = page > 0;

  // ── Skeleton rows ───────────────────────────────────────────────────

  const SkeletonRows = () => (
    <>
      {[1, 2, 3, 4, 5].map(i => (
        <tr key={i}>
          <td className="px-5 py-3"><div className="w-12 h-12 rounded bg-gray-100 animate-pulse" /></td>
          <td className="px-5 py-3"><div className="h-4 w-24 bg-gray-100 rounded animate-pulse" /></td>
          <td className="px-5 py-3"><div className="h-4 w-32 bg-gray-100 rounded animate-pulse" /></td>
          <td className="px-5 py-3 hidden md:table-cell"><div className="h-4 w-20 bg-gray-100 rounded animate-pulse" /></td>
          <td className="px-5 py-3 hidden lg:table-cell"><div className="h-4 w-12 bg-gray-100 rounded animate-pulse" /></td>
          <td className="px-5 py-3 hidden lg:table-cell"><div className="h-4 w-16 bg-gray-100 rounded animate-pulse" /></td>
          <td className="px-5 py-3"><div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" /></td>
          <td className="px-5 py-3"><div className="h-4 w-16 bg-gray-100 rounded animate-pulse" /></td>
        </tr>
      ))}
    </>
  );

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>Gear Catalog</h1>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'rgb(238,242,255)', color: 'rgb(99,102,241)' }}
            >
              {total}
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: 'rgb(107,114,128)' }}>
            Manage the Stakkd gear database
          </p>
        </div>
        <button
          onClick={() => { setSelectedEntry(null); setIsEditorOpen(true); }}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'rgb(99,102,241)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Entry
        </button>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div
          className="rounded-lg px-4 py-3 text-sm mb-4"
          style={{
            backgroundColor: statusMsg.isError ? 'rgb(254,242,242)' : 'rgb(240,253,244)',
            color: statusMsg.isError ? 'rgb(239,68,68)' : 'rgb(22,163,74)',
          }}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: 'rgb(243,244,246)' }}>
        <button
          onClick={() => setActiveTab('text')}
          className="flex-1 text-sm font-medium px-4 py-2 rounded-md transition-colors"
          style={activeTab === 'text'
            ? { backgroundColor: 'rgb(255,255,255)', color: 'rgb(17,24,39)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
            : { color: 'rgb(107,114,128)' }
          }
        >
          Text Search
        </button>
        <button
          onClick={() => setActiveTab('image')}
          className="flex-1 text-sm font-medium px-4 py-2 rounded-md transition-colors"
          style={activeTab === 'image'
            ? { backgroundColor: 'rgb(255,255,255)', color: 'rgb(17,24,39)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
            : { color: 'rgb(107,114,128)' }
          }
        >
          Image Search
        </button>
      </div>

      {/* Text Search controls */}
      {activeTab === 'text' && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setPage(0); }}
            placeholder="Search brand, model..."
            className="flex-1 min-w-[200px] text-sm px-3 py-2 rounded-lg border outline-none transition-colors focus:border-[rgb(99,102,241)]"
            style={{ borderColor: 'rgb(229,231,235)' }}
          />
          <select
            value={selectedCategory}
            onChange={e => { setSelectedCategory(e.target.value); setPage(0); }}
            className="text-sm px-3 py-2 rounded-lg border outline-none"
            style={{ borderColor: 'rgb(229,231,235)' }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{formatCategory(cat)}</option>
            ))}
          </select>
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'rgb(229,231,235)' }}>
            {(['all', 'true', 'false'] as const).map(val => (
              <button
                key={val}
                onClick={() => { setApprovalFilter(val); setPage(0); }}
                className="text-xs font-medium px-3 py-2 transition-colors"
                style={approvalFilter === val
                  ? { backgroundColor: 'rgb(238,242,255)', color: 'rgb(99,102,241)' }
                  : { backgroundColor: 'rgb(255,255,255)', color: 'rgb(107,114,128)' }
                }
              >
                {val === 'all' ? 'All' : val === 'true' ? 'Approved' : 'Pending'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Search controls */}
      {activeTab === 'image' && (
        <div className="mb-4 space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-[rgb(99,102,241)]"
            style={{ borderColor: 'rgb(229,231,235)' }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            {imagePreview ? (
              <div className="flex items-center justify-center gap-4">
                <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg" />
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: 'rgb(17,24,39)' }}>{imageFile?.name}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgb(107,114,128)' }}>Click to change</p>
                </div>
              </div>
            ) : (
              <>
                <svg className="w-10 h-10 mx-auto mb-2" style={{ color: 'rgb(156,163,175)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm" style={{ color: 'rgb(107,114,128)' }}>
                  Drop a gear photo or click to upload
                </p>
              </>
            )}
          </div>

          {imageFile && (
            <button
              onClick={handleIdentify}
              disabled={isIdentifying}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'rgb(99,102,241)' }}
            >
              {isIdentifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                'Identify with AI'
              )}
            </button>
          )}

          {identifyResult && (
            <div className="rounded-xl border p-4" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'rgb(17,24,39)' }}>Identification Result</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span style={{ color: 'rgb(107,114,128)' }}>Brand:</span>{' '}
                  <span style={{ color: 'rgb(17,24,39)' }}>{identifyResult.brand || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'rgb(107,114,128)' }}>Model:</span>{' '}
                  <span style={{ color: 'rgb(17,24,39)' }}>{identifyResult.model || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'rgb(107,114,128)' }}>Category:</span>{' '}
                  <span style={{ color: 'rgb(17,24,39)' }}>{formatCategory(identifyResult.category)}</span>
                </div>
                <div>
                  <span style={{ color: 'rgb(107,114,128)' }}>Confidence:</span>{' '}
                  <span style={{ color: 'rgb(17,24,39)' }}>{Math.round(identifyResult.confidence * 100)}%</span>
                </div>
              </div>
              {identifyResult.notes && (
                <p className="text-xs mt-2" style={{ color: 'rgb(107,114,128)' }}>{identifyResult.notes}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'rgb(229,231,235)', backgroundColor: 'rgb(249,250,251)' }}>
              <th className="text-left px-5 py-3 font-medium" style={{ color: 'rgb(107,114,128)', width: '60px' }}></th>
              <th className="text-left px-5 py-3 font-medium" style={{ color: 'rgb(107,114,128)' }}>Brand</th>
              <th className="text-left px-5 py-3 font-medium" style={{ color: 'rgb(107,114,128)' }}>Model</th>
              <th className="text-left px-5 py-3 font-medium hidden md:table-cell" style={{ color: 'rgb(107,114,128)' }}>Category</th>
              <th className="text-left px-5 py-3 font-medium hidden lg:table-cell" style={{ color: 'rgb(107,114,128)' }}>Year</th>
              <th className="text-left px-5 py-3 font-medium hidden lg:table-cell" style={{ color: 'rgb(107,114,128)' }}>Source</th>
              <th className="text-left px-5 py-3 font-medium" style={{ color: 'rgb(107,114,128)' }}>Status</th>
              <th className="text-right px-5 py-3 font-medium" style={{ color: 'rgb(107,114,128)' }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgb(243,244,246)' }}>
            {isLoading ? (
              <SkeletonRows />
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <svg className="w-10 h-10 mx-auto mb-2" style={{ color: 'rgb(156,163,175)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm" style={{ color: 'rgb(156,163,175)' }}>No entries found</p>
                </td>
              </tr>
            ) : (
              results.map(entry => (
                <tr key={entry.id} className="hover:bg-[rgb(249,250,251)] transition-colors">
                  {/* Thumbnail */}
                  <td className="px-5 py-3">
                    {entry.image_url ? (
                      <img src={entry.image_url} alt="" className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(243,244,246)' }}>
                        <svg className="w-5 h-5" style={{ color: 'rgb(156,163,175)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 font-medium" style={{ color: 'rgb(17,24,39)' }}>{entry.brand}</td>
                  <td className="px-5 py-3" style={{ color: 'rgb(17,24,39)' }}>{entry.model}</td>
                  <td className="px-5 py-3 hidden md:table-cell" style={{ color: 'rgb(107,114,128)' }}>{formatCategory(entry.category)}</td>
                  <td className="px-5 py-3 hidden lg:table-cell" style={{ color: 'rgb(107,114,128)' }}>{entry.year || '—'}</td>
                  <td className="px-5 py-3 hidden lg:table-cell" style={{ color: 'rgb(107,114,128)' }}>{entry.source || '—'}</td>
                  {/* Status badge */}
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggleApproval(entry)}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer"
                      style={entry.is_approved
                        ? { backgroundColor: 'rgb(240,253,244)', color: 'rgb(22,163,74)' }
                        : { backgroundColor: 'rgb(254,252,232)', color: 'rgb(161,98,7)' }
                      }
                    >
                      {entry.is_approved ? 'Approved' : 'Pending'}
                    </button>
                  </td>
                  {/* Actions */}
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setSelectedEntry(entry); setIsEditorOpen(true); }}
                        className="p-1.5 rounded-lg hover:bg-[rgb(238,242,255)] transition-colors"
                        title="Edit entry"
                      >
                        <svg className="w-4 h-4" style={{ color: 'rgb(99,102,241)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingId(entry.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete entry"
                      >
                        <svg className="w-4 h-4 text-[rgb(239,68,68)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs" style={{ color: 'rgb(107,114,128)' }}>
            Showing {startIdx}–{endIdx} of {total} entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={!hasPrev}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40"
              style={{ borderColor: 'rgb(229,231,235)', color: 'rgb(107,114,128)' }}
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNext}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40"
              style={{ borderColor: 'rgb(229,231,235)', color: 'rgb(107,114,128)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* GearCatalogEditor placeholder — will be created in Task 5 */}
      {isEditorOpen && (
        <GearCatalogEditor
          entry={selectedEntry}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={() => { setIsEditorOpen(false); fetchResults(); }}
        />
      )}

      {/* Delete confirmation overlay */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-xl border p-6 max-w-sm w-full mx-4 shadow-lg" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgb(254,242,242)' }}>
                <svg className="w-5 h-5 text-[rgb(239,68,68)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>Delete entry?</h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgb(107,114,128)' }}>
                  This action cannot be undone. The entry will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                disabled={deleteLoading}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'rgb(243,244,246)', color: 'rgb(107,114,128)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={deleteLoading}
                className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: 'rgb(239,68,68)' }}
              >
                {deleteLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GearCatalogPage;
