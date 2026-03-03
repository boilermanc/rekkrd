import Papa from 'papaparse';
import { supabase, getCurrentUserId } from '../services/supabaseService';
import type { CSVParseResult, RekkrdField, ColumnMapping, ImportCandidate, SkippedRow, ValidationResult, ImportError, ImportResult } from '../types/import';

const MAX_ROWS = 5000;

const DISCOGS_HEADERS = ['release_id', 'catalog#'];

const FIELD_PATTERNS: Record<RekkrdField, string[]> = {
  artist: ['artist', 'artist name', 'band', 'performer', 'artist(s)'],
  title: ['title', 'album', 'album title', 'release title', 'release_title'],
  year: ['year', 'released', 'release year', 'release_year', 'original year'],
  genre: ['genre', 'genres', 'style', 'styles'],
  format: ['format', 'media', 'media type', 'vinyl format'],
  condition: ['condition', 'media condition', 'sleeve condition', 'grade'],
  notes: ['notes', 'comments', 'description', 'private notes'],
  label: ['label', 'record label', 'publisher'],
  catalog_number: ['catalog', 'catalog#', 'catalog number', 'cat#', 'cat no'],
};

function parseWithEncoding(
  file: File,
  encoding: string
): Promise<Papa.ParseResult<Record<string, string>>> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      encoding,
      complete: (results) => resolve(results),
      error: (err: Error) => reject(err),
    });
  });
}

export async function parseCSVFile(file: File): Promise<CSVParseResult> {
  const errors: string[] = [];

  let result: Papa.ParseResult<Record<string, string>>;
  try {
    result = await parseWithEncoding(file, 'UTF-8');

    // If we got garbled data (mojibake indicator), retry with Latin-1
    const sample = JSON.stringify(result.data.slice(0, 3));
    if (sample.includes('�') || sample.includes('Ã')) {
      result = await parseWithEncoding(file, 'ISO-8859-1');
    }
  } catch {
    try {
      result = await parseWithEncoding(file, 'ISO-8859-1');
    } catch (fallbackErr) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        errors: [`Failed to parse CSV: ${fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error'}`],
        isDiscogs: false,
      };
    }
  }

  // Collect PapaParse errors
  for (const err of result.errors) {
    errors.push(`Row ${err.row ?? '?'}: ${err.message}`);
  }

  const headers = result.meta.fields ?? [];
  const allRows = result.data;
  const totalRows = allRows.length;

  let rows = allRows;
  if (totalRows > MAX_ROWS) {
    rows = allRows.slice(0, MAX_ROWS);
    errors.push(`File contains ${totalRows} rows. Only the first ${MAX_ROWS} will be imported.`);
  }

  const isDiscogs = headers.some(
    (h) => DISCOGS_HEADERS.includes(h.toLowerCase())
  );

  return { headers, rows, totalRows, errors, isDiscogs };
}

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = new Map();

  // Track which fields have already been assigned to avoid duplicates
  const assignedFields = new Set<RekkrdField>();

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    let matched: RekkrdField | null = null;

    for (const [field, patterns] of Object.entries(FIELD_PATTERNS) as [RekkrdField, string[]][]) {
      if (assignedFields.has(field)) continue;

      // Exact match first, then partial (header contains pattern or pattern contains header)
      if (
        patterns.includes(normalized) ||
        patterns.some((p) => normalized.includes(p) || p.includes(normalized))
      ) {
        matched = field;
        break;
      }
    }

    if (matched) {
      assignedFields.add(matched);
    }
    mapping.set(header, matched);
  }

  return mapping;
}

// ── Condition normalization ──────────────────────────────────────────

const CONDITION_MAP: Record<string, string> = {
  'm': 'Mint',
  'mint': 'Mint',
  'nm': 'Near Mint',
  'nm+': 'Near Mint',
  'nm-': 'Near Mint',
  'near mint': 'Near Mint',
  'vg+': 'Very Good Plus',
  'very good plus': 'Very Good Plus',
  'vg': 'Very Good',
  'very good': 'Very Good',
  'g+': 'Good Plus',
  'good plus': 'Good Plus',
  'g': 'Good',
  'good': 'Good',
  'f': 'Fair',
  'fair': 'Fair',
  'p': 'Poor',
  'poor': 'Poor',
};

function normalizeCondition(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const key = trimmed.toLowerCase().replace(/[()]/g, '').trim();
  return CONDITION_MAP[key] ?? trimmed; // keep original if no match
}

// ── Genre normalization ──────────────────────────────────────────────

function normalizeGenre(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  // Take first genre if slash-separated (e.g. "Rock/Pop" → "Rock")
  return trimmed.split(/[/,;]/).map(s => s.trim()).filter(Boolean)[0] || trimmed;
}

// ── Year validation ──────────────────────────────────────────────────

function validateYear(raw: string): { value: string | undefined; warning: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: undefined, warning: null };
  const num = parseInt(trimmed, 10);
  const currentYear = new Date().getFullYear();
  if (isNaN(num) || trimmed.length !== 4 || num < 1900 || num > currentYear + 1) {
    return { value: undefined, warning: `Invalid year "${trimmed}" — cleared` };
  }
  return { value: trimmed, warning: null };
}

// ── Validate mapped rows ────────────────────────────────────────────

export function validateMappedRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): ValidationResult {
  const valid: ImportCandidate[] = [];
  const skipped: SkippedRow[] = [];
  const warnings: string[] = [];

  // Build reverse map: RekkrdField → CSV header
  const fieldToHeader = new Map<RekkrdField, string>();
  for (const [header, field] of mapping.entries()) {
    if (field) fieldToHeader.set(field, header);
  }

  const artistHeader = fieldToHeader.get('artist');
  const titleHeader = fieldToHeader.get('title');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2: 1-indexed + header row

    const artist = artistHeader ? (row[artistHeader] ?? '').trim() : '';
    const title = titleHeader ? (row[titleHeader] ?? '').trim() : '';

    if (!artist || !title) {
      skipped.push({
        rowNumber,
        reason: !artist && !title ? 'Missing artist and title' : !artist ? 'Missing artist' : 'Missing title',
        rawData: row,
      });
      continue;
    }

    const candidate: ImportCandidate = { artist, title, csvRowNumber: rowNumber };

    // Year
    const yearHeader = fieldToHeader.get('year');
    if (yearHeader && row[yearHeader]) {
      const { value, warning } = validateYear(row[yearHeader]);
      candidate.year = value;
      if (warning) warnings.push(`Row ${rowNumber}: ${warning}`);
    }

    // Genre
    const genreHeader = fieldToHeader.get('genre');
    if (genreHeader && row[genreHeader]) {
      candidate.genre = normalizeGenre(row[genreHeader]);
    }

    // Condition
    const condHeader = fieldToHeader.get('condition');
    if (condHeader && row[condHeader]) {
      candidate.condition = normalizeCondition(row[condHeader]);
    }

    // Simple string fields
    const simpleFields: RekkrdField[] = ['format', 'notes', 'label', 'catalog_number'];
    for (const field of simpleFields) {
      const header = fieldToHeader.get(field);
      if (header && row[header]?.trim()) {
        candidate[field] = row[header].trim();
      }
    }

    valid.push(candidate);
  }

  return { valid, skipped, warnings };
}

// ── Duplicate detection ─────────────────────────────────────────────

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/^the\s+/i, '')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ');
}

export function detectDuplicates(
  candidates: ImportCandidate[],
  existingAlbums: { artist: string; title: string }[]
): ImportCandidate[] {
  // Pre-normalize existing albums
  const existing = existingAlbums.map(a => ({
    artist: normalizeForMatch(a.artist),
    title: normalizeForMatch(a.title),
    original: a,
  }));

  return candidates.map(candidate => {
    const candArtist = normalizeForMatch(candidate.artist);
    const candTitle = normalizeForMatch(candidate.title);

    for (const ex of existing) {
      // Exact duplicate: both artist and title match after normalization
      if (candArtist === ex.artist && candTitle === ex.title) {
        return {
          ...candidate,
          duplicateStatus: 'exact_duplicate' as const,
          matchedAlbum: ex.original,
        };
      }

      // Likely duplicate: artist matches + title is very similar
      if (candArtist === ex.artist) {
        // Check if one title contains the other (handles "The" prefix on titles)
        if (candTitle.includes(ex.title) || ex.title.includes(candTitle)) {
          return {
            ...candidate,
            duplicateStatus: 'likely_duplicate' as const,
            matchedAlbum: ex.original,
          };
        }
      }
    }

    return { ...candidate, duplicateStatus: 'new' as const };
  });
}

// ── Bulk import engine ──────────────────────────────────────────────

const CHUNK_SIZE = 25;

function candidateToRow(candidate: ImportCandidate, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    artist: candidate.artist,
    title: candidate.title,
    year: candidate.year || null,
    genre: candidate.genre || null,
    format: candidate.format || 'Vinyl',
    condition: candidate.condition || null,
    personal_notes: candidate.notes ? `${candidate.notes}\n[CSV import]` : '[CSV import]',
    cover_url: '',
    play_count: 0,
    is_favorite: false,
  };
}

export async function executeBulkImport(
  candidates: ImportCandidate[],
  onProgress: (inserted: number, total: number) => void
): Promise<ImportResult> {
  if (!supabase) throw new Error('Supabase not initialized');

  // Resolve user ID once
  let resolvedUserId = getCurrentUserId();
  if (!resolvedUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    resolvedUserId = session?.user?.id ?? null;
  }
  if (!resolvedUserId) throw new Error('Not authenticated');

  const startTime = Date.now();
  let totalInserted = 0;
  const errors: ImportError[] = [];

  // Process in chunks
  for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
    const chunk = candidates.slice(i, i + CHUNK_SIZE);
    const rows = chunk.map(c => candidateToRow(c, resolvedUserId));

    try {
      const { data, error } = await supabase
        .from('albums')
        .insert(rows)
        .select('id');

      if (error) {
        // Chunk-level failure: log each row in the chunk as failed
        for (const c of chunk) {
          errors.push({ rowNumber: c.csvRowNumber, error: error.message });
        }
      } else {
        totalInserted += data?.length ?? chunk.length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      for (const c of chunk) {
        errors.push({ rowNumber: c.csvRowNumber, error: msg });
      }
    }

    onProgress(totalInserted, candidates.length);
  }

  return {
    totalAttempted: candidates.length,
    totalInserted,
    totalFailed: candidates.length - totalInserted,
    errors,
    durationMs: Date.now() - startTime,
  };
}
