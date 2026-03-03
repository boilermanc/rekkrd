import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { parseCSVFile, autoDetectMapping, validateMappedRows, detectDuplicates, executeBulkImport } from '../helpers/csvImportHelpers';
import { REKKRD_FIELDS } from '../types/import';
import type { CSVParseResult, RekkrdField, ColumnMapping, ImportCandidate, SkippedRow, ImportResult, ImportError } from '../types/import';
import { useSubscription } from '../contexts/SubscriptionContext';

type ReviewFilter = 'all' | 'duplicates' | 'skipped';

interface BulkImportProps {
  onUpgradeRequired: (feature: string) => void;
  albums: { artist: string; title: string }[];
  onImportComplete: () => void;
  onNavigate: (view: string) => void;
  embedded?: boolean;
}

interface ImportHistoryEntry {
  date: string; // ISO string
  fileName: string;
  count: number;
}

const ACCEPTED_EXTENSIONS = '.csv,.tsv,.txt';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const IMPORT_HISTORY_KEY = 'rekkrd_import_history';
const MAX_HISTORY = 3;

function loadImportHistory(): ImportHistoryEntry[] {
  try {
    const raw = localStorage.getItem(IMPORT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveImportHistory(entry: ImportHistoryEntry): void {
  try {
    const history = loadImportHistory();
    history.unshift(entry);
    localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

function clearImportHistory(): void {
  try {
    localStorage.removeItem(IMPORT_HISTORY_KEY);
  } catch {
    // silently ignore
  }
}

const BulkImport: React.FC<BulkImportProps> = ({ onUpgradeRequired, albums, onImportComplete, onNavigate, embedded }) => {
  const { albumLimitReached, albumLimit } = useSubscription();
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(new Map());
  const [defaultMapping, setDefaultMapping] = useState<ColumnMapping>(new Map());
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>(loadImportHistory);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 — Review state
  const [step, setStep] = useState<'mapping' | 'review' | 'importing' | 'complete'>('mapping');
  const [reviewCandidates, setReviewCandidates] = useState<ImportCandidate[]>([]);
  const [skippedRows, setSkippedRows] = useState<SkippedRow[]>([]);
  const [reviewWarnings, setReviewWarnings] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');

  // Step 4 — Import progress state
  const [importProgress, setImportProgress] = useState({ inserted: 0, total: 0 });
  const [importStartTime, setImportStartTime] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const importingRef = useRef(false);

  // Warn before leaving during import
  useEffect(() => {
    if (step !== 'importing') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [step]);

  // Which RekkrdFields are currently assigned
  const assignedFields = useMemo(() => {
    const set = new Set<RekkrdField>();
    for (const val of mapping.values()) {
      if (val) set.add(val);
    }
    return set;
  }, [mapping]);

  const artistMapped = assignedFields.has('artist');
  const titleMapped = assignedFields.has('title');
  const canProceed = artistMapped && titleMapped;

  const handleFile = useCallback(async (file: File) => {
    setFileError(null);
    setParseResult(null);
    setFileName(file.name);

    // File size gate
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 5 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setParsing(true);

    const result = await parseCSVFile(file);

    // Empty file gate
    if (result.rows.length === 0) {
      setFileError('No data rows found. Make sure your file has a header row and at least one data row.');
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const detected = autoDetectMapping(result.headers);

    setParseResult(result);
    setMapping(new Map(detected));
    setDefaultMapping(new Map(detected));
    setParsing(false);
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const updateMapping = useCallback((header: string, value: RekkrdField | null) => {
    setMapping(prev => {
      const next = new Map(prev);
      next.set(header, value);
      return next;
    });
  }, []);

  const resetMappings = useCallback(() => {
    setMapping(new Map(defaultMapping));
  }, [defaultMapping]);

  // Preview data: first 5 rows with current mapping applied
  const previewData = useMemo(() => {
    if (!parseResult) return { headers: [] as { csvHeader: string; rekkrdField: RekkrdField | null }[], rows: [] as Record<string, string>[] };

    const activeHeaders = parseResult.headers
      .map(h => ({ csvHeader: h, rekkrdField: mapping.get(h) ?? null }))
      .filter(h => h.rekkrdField !== null);

    const rows = parseResult.rows.slice(0, 5).map(row => {
      const mapped: Record<string, string> = {};
      for (const { csvHeader, rekkrdField } of activeHeaders) {
        if (rekkrdField) mapped[rekkrdField] = row[csvHeader] ?? '';
      }
      return mapped;
    });

    return { headers: activeHeaders, rows };
  }, [parseResult, mapping]);

  // Proceed from mapping → review
  const handleProceedToReview = useCallback(() => {
    if (!parseResult) return;
    const { valid, skipped, warnings } = validateMappedRows(parseResult.rows, mapping);
    const withDuplicates = detectDuplicates(valid, albums);

    setReviewCandidates(withDuplicates);
    setSkippedRows(skipped);
    setReviewWarnings(warnings);
    setReviewFilter('all');

    // Select all by default, except exact duplicates
    const selected = new Set<number>();
    for (const c of withDuplicates) {
      if (c.duplicateStatus !== 'exact_duplicate') {
        selected.add(c.csvRowNumber);
      }
    }
    setSelectedRows(selected);
    setStep('review');
  }, [parseResult, mapping, albums]);

  const handleBackToMapping = useCallback(() => {
    setStep('mapping');
  }, []);

  const toggleRow = useCallback((rowNum: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowNum)) next.delete(rowNum);
      else next.add(rowNum);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedRows(new Set(reviewCandidates.map(c => c.csvRowNumber)));
  }, [reviewCandidates]);

  const deselectDuplicates = useCallback(() => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      for (const c of reviewCandidates) {
        if (c.duplicateStatus === 'exact_duplicate' || c.duplicateStatus === 'likely_duplicate') {
          next.delete(c.csvRowNumber);
        }
      }
      return next;
    });
  }, [reviewCandidates]);

  // Filtered view for review
  const duplicateCount = useMemo(
    () => reviewCandidates.filter(c => c.duplicateStatus === 'exact_duplicate' || c.duplicateStatus === 'likely_duplicate').length,
    [reviewCandidates]
  );

  const filteredCandidates = useMemo(() => {
    if (reviewFilter === 'duplicates') {
      return reviewCandidates.filter(c => c.duplicateStatus === 'exact_duplicate' || c.duplicateStatus === 'likely_duplicate');
    }
    return reviewCandidates;
  }, [reviewCandidates, reviewFilter]);

  // Start bulk import
  const handleStartImport = useCallback(async () => {
    const selected = reviewCandidates.filter(c => selectedRows.has(c.csvRowNumber));
    if (selected.length === 0) return;

    // Album limit check
    if (albumLimit !== -1) {
      const afterImport = albums.length + selected.length;
      if (albumLimitReached(afterImport)) {
        const remaining = Math.max(0, albumLimit - albums.length);
        if (remaining === 0) {
          onUpgradeRequired('album_limit');
          return;
        }
        // Cap to remaining capacity (shouldn't normally happen since bulk import is Enthusiast-only, but safe guard)
        selected.splice(remaining);
      }
    }

    importingRef.current = true;
    setStep('importing');
    setImportStartTime(Date.now());
    setImportProgress({ inserted: 0, total: selected.length });
    setImportResult(null);

    try {
      const result = await executeBulkImport(selected, (inserted, total) => {
        setImportProgress({ inserted, total });
      });
      setImportResult(result);
      if (result.totalInserted > 0) {
        const entry: ImportHistoryEntry = {
          date: new Date().toISOString(),
          fileName,
          count: result.totalInserted,
        };
        saveImportHistory(entry);
        setImportHistory(loadImportHistory());
        onImportComplete(); // Refresh album list in parent
      }
    } catch (err) {
      setImportResult({
        totalAttempted: selected.length,
        totalInserted: importProgress.inserted,
        totalFailed: selected.length - importProgress.inserted,
        errors: [{ rowNumber: 0, error: err instanceof Error ? err.message : 'Import failed' }],
        durationMs: Date.now() - importStartTime,
      });
    } finally {
      importingRef.current = false;
      setStep('complete');
    }
  }, [reviewCandidates, selectedRows, albums.length, albumLimit, albumLimitReached, onUpgradeRequired, onImportComplete, importProgress.inserted, importStartTime]);

  // Reset to start over
  const handleImportMore = useCallback(() => {
    setParseResult(null);
    setMapping(new Map());
    setDefaultMapping(new Map());
    setFileName('');
    setFileError(null);
    setStep('mapping');
    setReviewCandidates([]);
    setSkippedRows([]);
    setReviewWarnings([]);
    setSelectedRows(new Set());
    setReviewFilter('all');
    setImportResult(null);
    setImportProgress({ inserted: 0, total: 0 });
    setShowErrors(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Elapsed time during import
  const elapsedSeconds = step === 'importing' ? Math.floor((Date.now() - importStartTime) / 1000) : 0;

  const content = (
    <div className={embedded ? 'space-y-6' : 'max-w-5xl mx-auto px-4 md:px-6 pt-6 space-y-6'}>
      {/* Page header — hidden when embedded inside ImportExportPage */}
      {!embedded && (
        <div>
          <h1 className="font-label text-lg md:text-xl tracking-widest uppercase font-bold text-th-text">
            Bulk Import
          </h1>
          <p className="text-th-text3/60 text-sm mt-1">
            Import your collection from a CSV, TSV, or text file
          </p>
        </div>
      )}

        {/* Step 1 — File Upload */}
        {!parseResult && !parsing && (
          <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-6 md:p-8">
            {fileError && (
              <div className="rounded-xl bg-red-500/[0.12] border border-red-400/30 px-5 py-4 mb-5" role="alert">
                <p className="text-red-300 text-sm">{fileError}</p>
              </div>
            )}
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop a CSV file here or click to browse"
              className={`relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 md:p-14 transition-all cursor-pointer ${
                dragOver
                  ? 'border-[#4f6d7a] bg-[#4f6d7a]/[0.06]'
                  : 'border-th-surface/[0.15] hover:border-th-surface/[0.30]'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              <svg className="w-12 h-12 text-th-text3/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div className="text-center">
                <p className="text-th-text font-medium">
                  Drop your file here, or <span className="text-[#dd6e42] underline underline-offset-2">browse</span>
                </p>
                <p className="text-th-text3/50 text-xs mt-1">
                  Supports CSV, TSV, and TXT files — up to 5,000 records (5 MB max)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={onFileChange}
                className="hidden"
                aria-label="Select CSV file"
              />
            </div>

            {/* Recent imports */}
            {importHistory.length > 0 && (
              <div className="mt-5 pt-4 border-t border-th-surface/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-th-text3/50 font-label">Recent Imports</p>
                  <button
                    onClick={() => { clearImportHistory(); setImportHistory([]); }}
                    className="text-[10px] text-th-text3/40 hover:text-th-text3 transition-colors underline underline-offset-2"
                  >
                    Clear history
                  </button>
                </div>
                <div className="space-y-1.5">
                  {importHistory.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-th-text3">
                      <span className="truncate mr-3">{entry.fileName}</span>
                      <span className="shrink-0 text-th-text3/50">
                        {entry.count} {entry.count === 1 ? 'record' : 'records'} &middot; {new Date(entry.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Loading spinner */}
        {parsing && (
          <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-10 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-th-surface/[0.15] border-t-[#dd6e42] rounded-full animate-spin" />
            <p className="text-th-text2 text-sm">Parsing {fileName}...</p>
          </section>
        )}

        {/* Parse result — errors, badges, stats */}
        {parseResult && !parsing && step === 'mapping' && (
          <>
            {/* Error banner */}
            {parseResult.errors.length > 0 && (
              <div className="rounded-xl bg-red-500/[0.12] border border-red-400/30 px-5 py-4" role="alert">
                <p className="text-red-300 font-medium text-sm mb-1">Heads up</p>
                <ul className="text-red-300/80 text-xs space-y-0.5 list-disc list-inside">
                  {parseResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                  {parseResult.errors.length > 5 && (
                    <li>...and {parseResult.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Stats bar */}
            <div className="flex flex-wrap items-center gap-3">
              {parseResult.isDiscogs && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/[0.15] border border-teal-400/30 px-3 py-1 text-xs font-medium text-teal-300">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Discogs export detected — columns auto-mapped
                </span>
              )}
              <span className="text-th-text2 text-sm">
                Found <strong className="text-th-text">{parseResult.totalRows.toLocaleString()}</strong> records
                with <strong className="text-th-text">{parseResult.headers.length}</strong> columns
              </span>
              <button
                onClick={handleImportMore}
                className="ml-auto text-xs text-th-text3/60 hover:text-th-text transition-colors underline underline-offset-2"
                aria-label="Choose a different file"
              >
                Choose different file
              </button>
            </div>

            {/* Step 2 — Column Mapping */}
            <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-5 md:p-7">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-label text-base tracking-widest uppercase font-bold text-th-text">
                  Map Columns
                </h2>
                <button
                  onClick={resetMappings}
                  className="text-xs text-th-text3/60 hover:text-th-text transition-colors underline underline-offset-2"
                  aria-label="Reset column mappings to auto-detected defaults"
                >
                  Reset Mappings
                </button>
              </div>

              {/* Required fields warning */}
              {(!artistMapped || !titleMapped) && (
                <div className="flex items-center gap-2 rounded-lg bg-orange-500/[0.10] border border-orange-400/25 px-4 py-2.5 mb-5" role="alert">
                  <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                  <p className="text-orange-300/90 text-xs">
                    {!artistMapped && !titleMapped
                      ? 'Artist and Album Title must be mapped to continue.'
                      : !artistMapped
                        ? 'Artist must be mapped to continue.'
                        : 'Album Title must be mapped to continue.'}
                  </p>
                </div>
              )}

              {/* Mapping rows */}
              <div className="space-y-2">
                {/* Header labels (desktop) */}
                <div className="hidden md:grid grid-cols-[1fr_auto_1fr] gap-3 px-1 pb-1 text-[10px] uppercase tracking-widest text-th-text3/50 font-label">
                  <span>Your CSV Columns</span>
                  <span className="w-6" />
                  <span>Rekkrd Fields</span>
                </div>

                {parseResult.headers.map(header => {
                  const value = mapping.get(header) ?? null;
                  const isMapped = value !== null;

                  return (
                    <div
                      key={header}
                      className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 md:gap-3 items-center rounded-lg px-3 py-2.5 bg-th-surface/[0.03] border border-th-surface/[0.06]"
                    >
                      {/* CSV column name */}
                      <div className="flex items-center gap-2 min-w-0">
                        {isMapped ? (
                          <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="w-4 h-4 flex items-center justify-center text-th-text3/30 flex-shrink-0">—</span>
                        )}
                        <span className="text-sm text-th-text truncate" title={header}>{header}</span>
                      </div>

                      {/* Arrow (desktop only) */}
                      <svg className="hidden md:block w-4 h-4 text-th-text3/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>

                      {/* Dropdown */}
                      <select
                        value={value ?? ''}
                        onChange={(e) => updateMapping(header, (e.target.value || null) as RekkrdField | null)}
                        aria-label={`Map "${header}" to a Rekkrd field`}
                        className="w-full rounded-lg bg-th-surface/[0.06] border border-th-surface/[0.10] text-sm text-th-text px-3 py-2 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50 transition-colors"
                      >
                        <option value="">Skip this column</option>
                        {REKKRD_FIELDS.map(f => {
                          const disabled = assignedFields.has(f.value) && f.value !== value;
                          return (
                            <option key={f.value} value={f.value} disabled={disabled}>
                              {f.label}{disabled ? ' (already mapped)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Data Preview */}
            {previewData.headers.length > 0 && (
              <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-5 md:p-7">
                <h2 className="font-label text-base tracking-widest uppercase font-bold text-th-text mb-4">
                  Preview
                </h2>
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm" role="table" aria-label="CSV data preview">
                    <thead>
                      <tr className="border-b border-th-surface/[0.10]">
                        {previewData.headers.map(({ rekkrdField }) => {
                          const label = REKKRD_FIELDS.find(f => f.value === rekkrdField)?.label ?? 'Skipped';
                          return (
                            <th
                              key={rekkrdField}
                              className="text-left text-[10px] uppercase tracking-widest text-th-text3/50 font-label px-3 py-2 whitespace-nowrap"
                              role="columnheader"
                            >
                              {label}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row, i) => (
                        <tr key={i} className="border-b border-th-surface/[0.05] last:border-0">
                          {previewData.headers.map(({ rekkrdField }) => (
                            <td
                              key={rekkrdField}
                              className="px-3 py-2 text-th-text2 truncate max-w-[200px]"
                              title={rekkrdField ? row[rekkrdField] : ''}
                            >
                              {rekkrdField ? row[rekkrdField] || '—' : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parseResult.rows.length > 5 && (
                  <p className="text-th-text3/40 text-xs mt-3 px-3">
                    Showing 5 of {parseResult.totalRows.toLocaleString()} records
                  </p>
                )}
              </section>
            )}

            {/* Navigation */}
            <div className="flex justify-end">
              <button
                onClick={handleProceedToReview}
                disabled={!canProceed}
                aria-label="Proceed to review import"
                className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                  canProceed
                    ? 'bg-[#dd6e42] text-white hover:brightness-110 active:scale-[0.98] shadow-lg'
                    : 'bg-th-surface/[0.08] text-th-text3/30 cursor-not-allowed'
                }`}
              >
                Next: Review
              </button>
            </div>
          </>
        )}

        {/* Step 3 — Review & Confirm */}
        {parseResult && !parsing && step === 'review' && reviewCandidates.length === 0 && (
          <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-8 md:p-12 flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-th-text font-bold text-lg">No importable records found</p>
              <p className="text-th-text3 text-sm mt-1 max-w-md mx-auto">
                All {skippedRows.length} {skippedRows.length === 1 ? 'row was' : 'rows were'} skipped — most likely because Artist or Title is missing.
                Check your column mapping and try again.
              </p>
            </div>
            <button
              onClick={handleBackToMapping}
              className="px-6 py-3 rounded-xl bg-[#dd6e42] text-white font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
            >
              Back to Mapping
            </button>
          </section>
        )}

        {parseResult && !parsing && step === 'review' && reviewCandidates.length > 0 && (
          <>
            {/* Warnings banner */}
            {reviewWarnings.length > 0 && (
              <div className="rounded-xl bg-amber-500/[0.10] border border-amber-400/25 px-5 py-4" role="alert">
                <p className="text-amber-300 font-medium text-sm mb-1">Validation notes</p>
                <ul className="text-amber-300/80 text-xs space-y-0.5 list-disc list-inside">
                  {reviewWarnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}
                  {reviewWarnings.length > 8 && (
                    <li>...and {reviewWarnings.length - 8} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-th-text2">
                <strong className="text-th-text">{reviewCandidates.length.toLocaleString()}</strong> ready to import
              </span>
              <span className="text-th-text3/30">&middot;</span>
              <span className="text-th-text2">
                <strong className="text-amber-400">{duplicateCount}</strong> {duplicateCount === 1 ? 'duplicate' : 'duplicates'} found
              </span>
              <span className="text-th-text3/30">&middot;</span>
              <span className="text-th-text2">
                <strong className="text-red-400">{skippedRows.length}</strong> skipped
              </span>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2" role="tablist" aria-label="Filter import records">
              {([
                { key: 'all' as const, label: `All (${reviewCandidates.length})` },
                { key: 'duplicates' as const, label: `Duplicates (${duplicateCount})` },
                { key: 'skipped' as const, label: `Skipped (${skippedRows.length})` },
              ]).map(tab => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={reviewFilter === tab.key}
                  onClick={() => setReviewFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    reviewFilter === tab.key
                      ? 'bg-[#dd6e42]/15 text-[#dd6e42] border border-[#dd6e42]/30'
                      : 'text-th-text3 hover:text-th-text2 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Bulk actions */}
            {reviewFilter !== 'skipped' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={selectAll}
                  className="text-xs text-th-text3 hover:text-th-text transition-colors underline underline-offset-2"
                >
                  Select All
                </button>
                {duplicateCount > 0 && (
                  <button
                    onClick={deselectDuplicates}
                    className="text-xs text-th-text3 hover:text-th-text transition-colors underline underline-offset-2"
                  >
                    Deselect Duplicates
                  </button>
                )}
                <span className="ml-auto text-xs text-th-text3">
                  <strong className="text-th-text">{selectedRows.size}</strong> {selectedRows.size === 1 ? 'record' : 'records'} selected for import
                </span>
              </div>
            )}

            {/* Record list */}
            <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] overflow-hidden">
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-th-surface/[0.06]">
                {/* Skipped rows view */}
                {reviewFilter === 'skipped' && (
                  skippedRows.length === 0 ? (
                    <div className="p-8 text-center text-th-text3/50 text-sm">No skipped rows</div>
                  ) : (
                    skippedRows.map(row => (
                      <div key={row.rowNumber} className="flex items-center gap-3 px-4 py-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-th-text2 truncate">
                            Row {row.rowNumber}: {Object.values(row.rawData).filter(Boolean).slice(0, 3).join(' — ') || '(empty)'}
                          </p>
                          <p className="text-xs text-red-400/80">{row.reason}</p>
                        </div>
                      </div>
                    ))
                  )
                )}

                {/* Candidate rows view (All or Duplicates filter) */}
                {reviewFilter !== 'skipped' && (
                  filteredCandidates.length === 0 ? (
                    <div className="p-8 text-center text-th-text3/50 text-sm">
                      {reviewFilter === 'duplicates' ? 'No duplicates found' : 'No records to display'}
                    </div>
                  ) : (
                    filteredCandidates.map(candidate => {
                      const isSelected = selectedRows.has(candidate.csvRowNumber);
                      const isDuplicate = candidate.duplicateStatus === 'exact_duplicate' || candidate.duplicateStatus === 'likely_duplicate';
                      const dotColor = isDuplicate ? 'bg-amber-400' : 'bg-emerald-400';
                      const dotLabel = isDuplicate ? 'Duplicate record' : 'New record';

                      return (
                        <label
                          key={candidate.csvRowNumber}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-th-surface/[0.02]' : 'opacity-50'
                          } hover:bg-th-surface/[0.05]`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(candidate.csvRowNumber)}
                            className="w-4 h-4 rounded border-th-surface/[0.20] bg-th-surface/[0.06] text-[#dd6e42] focus:ring-[#dd6e42]/50 shrink-0"
                            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${candidate.artist} — ${candidate.title}`}
                          />
                          <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} aria-label={dotLabel} role="img" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-th-text truncate">
                              <span className="font-medium">{candidate.artist}</span>
                              <span className="text-th-text3 mx-1.5">&mdash;</span>
                              {candidate.title}
                              {candidate.year && <span className="text-th-text3 ml-1.5">({candidate.year})</span>}
                            </p>
                            {isDuplicate && candidate.matchedAlbum && (
                              <p className="text-xs text-amber-400/80 truncate">
                                {candidate.duplicateStatus === 'exact_duplicate' ? 'Exact match' : 'Similar to'}: {candidate.matchedAlbum.artist} — {candidate.matchedAlbum.title}
                              </p>
                            )}
                          </div>
                          {isDuplicate && (
                            <span className="shrink-0 text-[10px] font-label font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-400/25">
                              Duplicate
                            </span>
                          )}
                        </label>
                      );
                    })
                  )
                )}
              </div>
            </section>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToMapping}
                className="px-5 py-2.5 rounded-xl border border-th-surface/[0.15] text-sm font-medium text-th-text3 hover:text-th-text hover:border-th-surface/[0.30] transition-all"
              >
                Back to Mapping
              </button>
              <button
                onClick={handleStartImport}
                disabled={selectedRows.size === 0}
                aria-label={`Import ${selectedRows.size} selected records`}
                className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                  selectedRows.size > 0
                    ? 'bg-[#dd6e42] text-white hover:brightness-110 active:scale-[0.98] shadow-lg'
                    : 'bg-th-surface/[0.08] text-th-text3/30 cursor-not-allowed'
                }`}
              >
                Import {selectedRows.size.toLocaleString()} {selectedRows.size === 1 ? 'Record' : 'Records'}
              </button>
            </div>
          </>
        )}

        {/* Step 4 — Import Progress */}
        {step === 'importing' && (
          <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-8 md:p-12 flex flex-col items-center gap-6">
            {/* Spinning vinyl */}
            <div className="relative w-20 h-20">
              <div className="w-20 h-20 rounded-full border-[6px] border-th-surface/[0.15] border-t-[#dd6e42] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-th-surface/[0.20]" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-th-text font-semibold text-lg">
                Importing... {importProgress.inserted.toLocaleString()} / {importProgress.total.toLocaleString()} records
              </p>
              <p className="text-th-text3 text-sm mt-1">
                {importProgress.total > 0
                  ? `${Math.round((importProgress.inserted / importProgress.total) * 100)}%`
                  : '0%'}
                {elapsedSeconds > 0 && ` \u00B7 ${elapsedSeconds}s elapsed`}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md h-2 rounded-full bg-th-surface/[0.10] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#4f6d7a] transition-all duration-300"
                style={{ width: importProgress.total > 0 ? `${(importProgress.inserted / importProgress.total) * 100}%` : '0%' }}
              />
            </div>

            <p className="text-th-text3/50 text-xs">Don't close this page while the import is running</p>
          </section>
        )}

        {/* Step 5 — Import Complete */}
        {step === 'complete' && importResult && (
          <>
            <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-8 md:p-12 flex flex-col items-center gap-5">
              {/* Success / partial success icon */}
              {importResult.totalFailed === 0 ? (
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-400" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
                  <svg className="w-8 h-8 text-amber-400" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                </div>
              )}

              <div className="text-center">
                <p className="text-th-text font-bold text-xl">
                  Imported {importResult.totalInserted.toLocaleString()} {importResult.totalInserted === 1 ? 'record' : 'records'}
                  {' '}in {(importResult.durationMs / 1000).toFixed(1)}s
                </p>
                {importResult.totalFailed > 0 && (
                  <p className="text-amber-400 text-sm mt-1">
                    {importResult.totalFailed} {importResult.totalFailed === 1 ? 'record' : 'records'} failed to import
                  </p>
                )}
              </div>

              {/* Errors (expandable) */}
              {importResult.errors.length > 0 && (
                <div className="w-full max-w-lg">
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="flex items-center gap-2 text-xs text-th-text3 hover:text-th-text transition-colors"
                  >
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${showErrors ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    {showErrors ? 'Hide' : 'Show'} {importResult.errors.length} {importResult.errors.length === 1 ? 'error' : 'errors'}
                  </button>
                  {showErrors && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-red-500/[0.08] border border-red-400/20 p-3">
                      <ul className="text-xs text-red-300/80 space-y-1">
                        {importResult.errors.map((e, i) => (
                          <li key={i}>
                            {e.rowNumber > 0 ? `Row ${e.rowNumber}: ` : ''}{e.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => onNavigate('grid')}
                  className="px-6 py-3 rounded-xl bg-[#dd6e42] text-white font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
                >
                  View Collection
                </button>
                <button
                  onClick={handleImportMore}
                  className="px-5 py-2.5 rounded-xl border border-th-surface/[0.15] text-sm font-medium text-th-text3 hover:text-th-text hover:border-th-surface/[0.30] transition-all"
                >
                  Import More
                </button>
              </div>
            </section>
          </>
        )}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {content}
    </div>
  );
};

export default BulkImport;
