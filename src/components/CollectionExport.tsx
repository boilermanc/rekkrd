import React, { useState, useMemo } from 'react';
import type { Album } from '../../types';
import type { ExportOptions } from '../types/export';
import { exportCollectionAsCSV, exportCollectionAsPDF } from '../helpers/exportHelpers';
import { useToast } from '../../contexts/ToastContext';

const LARGE_COLLECTION_THRESHOLD = 500;

const SORT_OPTIONS: { value: ExportOptions['sortBy']; label: string }[] = [
  { value: 'artist', label: 'Artist A\u2013Z' },
  { value: 'title', label: 'Title A\u2013Z' },
  { value: 'year', label: 'Year' },
  { value: 'date_added', label: 'Date Added' },
];

const CSV_FIELDS = [
  { value: 'artist', label: 'Artist' },
  { value: 'title', label: 'Title' },
  { value: 'year', label: 'Year' },
  { value: 'genre', label: 'Genre' },
  { value: 'format', label: 'Format' },
  { value: 'condition', label: 'Condition' },
  { value: 'label', label: 'Label' },
  { value: 'catalog_number', label: 'Catalog Number' },
  { value: 'personal_notes', label: 'Notes' },
  { value: 'created_at', label: 'Date Added' },
  { value: 'play_count', label: 'Play Count' },
  { value: 'isFavorite', label: 'Is Favorite' },
];

interface CollectionExportProps {
  albums: Album[];
  userEmail: string;
}

const CollectionExport: React.FC<CollectionExportProps> = ({ albums, userEmail }) => {
  const { showToast } = useToast();
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [sortBy, setSortBy] = useState<ExportOptions['sortBy']>('artist');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [includeFields, setIncludeFields] = useState<string[]>(CSV_FIELDS.map((f) => f.value));
  const [exporting, setExporting] = useState(false);
  const [lastResult, setLastResult] = useState<{ filename: string; count: number } | null>(null);

  const previewCount = useMemo(() => {
    if (!favoritesOnly) return albums.length;
    return albums.filter((a) => a.isFavorite).length;
  }, [albums, favoritesOnly]);

  const isEmpty = albums.length === 0;
  const noFavorites = favoritesOnly && previewCount === 0;
  const isLargeCollection = previewCount > LARGE_COLLECTION_THRESHOLD && format === 'pdf';
  const canExport = previewCount > 0 && !exporting;

  const sortLabel = SORT_OPTIONS.find((s) => s.value === sortBy)?.label ?? 'Artist A\u2013Z';

  function toggleField(field: string) {
    setIncludeFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  }

  async function handleExport() {
    if (!canExport) return;

    setExporting(true);
    setLastResult(null);

    try {
      const options: ExportOptions = {
        format,
        sortBy,
        filterFavorites: favoritesOnly,
        includeFields: format === 'csv' ? includeFields : undefined,
      };

      const result = format === 'csv'
        ? exportCollectionAsCSV(albums, options)
        : await exportCollectionAsPDF(albums, userEmail, options);

      if (result.success) {
        setLastResult({ filename: result.filename, count: result.albumCount });
        showToast(`Downloaded ${result.filename}`, 'success');
      }
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Export failed — please try again', 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Format selector */}
      <div>
        <h3 className="font-label text-sm tracking-widest uppercase font-bold text-th-text2 mb-3">Format</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* CSV card */}
          <button
            onClick={() => setFormat('csv')}
            disabled={exporting}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              format === 'csv'
                ? 'border-[#4f6d7a] bg-[#4f6d7a]/[0.06]'
                : 'border-th-surface/[0.12] bg-th-surface/[0.04] hover:border-th-surface/[0.25]'
            } ${exporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${format === 'csv' ? 'bg-[#4f6d7a]/[0.15] text-[#4f6d7a]' : 'bg-th-surface/[0.08] text-th-text3'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                </svg>
              </div>
              <div>
                <span className={`font-label text-sm font-bold tracking-wide ${format === 'csv' ? 'text-[#4f6d7a]' : 'text-th-text'}`}>CSV</span>
                <p className="text-xs text-th-text3 mt-0.5">Compatible with Excel, Google Sheets, Discogs</p>
              </div>
            </div>
          </button>

          {/* PDF card */}
          <button
            onClick={() => setFormat('pdf')}
            disabled={exporting}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              format === 'pdf'
                ? 'border-[#4f6d7a] bg-[#4f6d7a]/[0.06]'
                : 'border-th-surface/[0.12] bg-th-surface/[0.04] hover:border-th-surface/[0.25]'
            } ${exporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${format === 'pdf' ? 'bg-[#4f6d7a]/[0.15] text-[#4f6d7a]' : 'bg-th-surface/[0.08] text-th-text3'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M9 15v-2h2a1 1 0 1 1 0 2H9z" />
                </svg>
              </div>
              <div>
                <span className={`font-label text-sm font-bold tracking-wide ${format === 'pdf' ? 'text-[#4f6d7a]' : 'text-th-text'}`}>PDF Catalog</span>
                <p className="text-xs text-th-text3 mt-0.5">Styled catalog — perfect for sharing or printing</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="glass-morphism rounded-xl border border-th-surface/[0.10] p-5">
        <h3 className="font-label text-sm tracking-widest uppercase font-bold text-th-text2 mb-4">Options</h3>
        <div className="space-y-4">
          {/* Sort by */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor="export-sort" className="text-sm text-th-text2 sm:w-24 flex-shrink-0">Sort by</label>
            <select
              id="export-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ExportOptions['sortBy'])}
              disabled={exporting}
              className="flex-1 bg-th-surface/[0.06] border border-th-surface/[0.15] rounded-lg px-3 py-2 text-sm text-th-text focus:outline-none focus:border-[#dd6e42]/50 disabled:opacity-50"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Favorites only */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(e) => setFavoritesOnly(e.target.checked)}
              disabled={exporting}
              className="w-4 h-4 rounded border-th-surface/[0.20] bg-th-surface/[0.06] text-[#dd6e42] focus:ring-[#dd6e42]/30 focus:ring-offset-0"
            />
            <span className="text-sm text-th-text2 group-hover:text-th-text transition-colors">Favorites only</span>
          </label>

          {/* Field selection — CSV only */}
          {format === 'csv' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-th-text2">Columns</span>
                <button
                  onClick={() =>
                    setIncludeFields(
                      includeFields.length === CSV_FIELDS.length ? ['artist', 'title'] : CSV_FIELDS.map((f) => f.value)
                    )
                  }
                  disabled={exporting}
                  className="text-xs text-[#dd6e42] hover:underline disabled:opacity-50"
                >
                  {includeFields.length === CSV_FIELDS.length ? 'Select minimum' : 'Select all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {CSV_FIELDS.map((field) => {
                  const checked = includeFields.includes(field.value);
                  const required = field.value === 'artist' || field.value === 'title';
                  return (
                    <button
                      key={field.value}
                      onClick={() => !required && toggleField(field.value)}
                      disabled={required || exporting}
                      className={`px-3 py-1.5 rounded-lg text-xs font-label tracking-wide transition-all ${
                        checked
                          ? 'bg-[#4f6d7a]/[0.15] text-[#4f6d7a] border border-[#4f6d7a]/30'
                          : 'bg-th-surface/[0.04] text-th-text3 border border-th-surface/[0.10] hover:border-th-surface/[0.20]'
                      } ${required || exporting ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
                    >
                      {field.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview / status messages */}
      <div className="flex items-center gap-2 px-1">
        <svg className="w-4 h-4 text-th-text3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        {isEmpty ? (
          <p className="text-sm text-th-text3">Nothing to export — add some records to your collection first.</p>
        ) : noFavorites ? (
          <p className="text-sm text-th-text3">No favorites found. Uncheck "Favorites only" or mark some albums as favorites.</p>
        ) : (
          <p className="text-sm text-th-text3">
            Exporting <span className="text-th-text font-medium">{previewCount} album{previewCount !== 1 ? 's' : ''}</span> as{' '}
            <span className="text-th-text font-medium">{format === 'csv' ? 'CSV' : 'PDF'}</span>, sorted by{' '}
            <span className="text-th-text font-medium">{sortLabel}</span>
            {favoritesOnly && <span className="text-[#dd6e42]"> (favorites only)</span>}
          </p>
        )}
      </div>

      {/* Large collection warning */}
      {isLargeCollection && !exporting && (
        <div className="flex items-center gap-2 px-1">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-xs text-amber-400/80">Large collection — PDF generation may take a moment.</p>
        </div>
      )}

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={!canExport}
        className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#dd6e42] text-white font-label tracking-wide text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {exporting ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {format === 'pdf' ? 'Generating PDF catalog\u2026' : 'Generating\u2026'}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {format === 'csv' ? 'Download CSV' : 'Download PDF'}
          </>
        )}
      </button>

      {/* Success feedback */}
      {lastResult && !exporting && (
        <div className="flex items-center gap-3 bg-emerald-500/[0.10] border border-emerald-500/30 rounded-xl px-4 py-3">
          <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="text-sm">
            <span className="text-emerald-400 font-medium">{lastResult.count} album{lastResult.count !== 1 ? 's' : ''} exported</span>
            <span className="text-th-text3 ml-1">— {lastResult.filename}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionExport;
