import * as Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Album } from '../types';
import type { ExportOptions, ExportResult } from '../types/export';

// ── Export history ──────────────────────────────────────────────────

const EXPORT_HISTORY_KEY = 'rekkrd_export_history';
const MAX_EXPORT_HISTORY = 5;

export interface ExportHistoryEntry {
  date: string;
  filename: string;
  format: 'csv' | 'pdf';
  albumCount: number;
}

export function loadExportHistory(): ExportHistoryEntry[] {
  try {
    const raw = localStorage.getItem(EXPORT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_EXPORT_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveExportHistory(entry: ExportHistoryEntry): void {
  try {
    const history = loadExportHistory();
    history.unshift(entry);
    localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_EXPORT_HISTORY)));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

const ALL_FIELDS = [
  'artist',
  'title',
  'year',
  'genre',
  'format',
  'condition',
  'label',
  'catalog_number',
  'personal_notes',
  'created_at',
  'play_count',
  'isFavorite',
] as const;

const COLUMN_LABELS: Record<string, string> = {
  artist: 'Artist',
  title: 'Title',
  year: 'Year',
  genre: 'Genre',
  format: 'Format',
  condition: 'Condition',
  label: 'Label',
  catalog_number: 'Catalog Number',
  personal_notes: 'Notes',
  created_at: 'Date Added',
  play_count: 'Play Count',
  isFavorite: 'Is Favorite',
};

function formatDateAdded(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function sortAlbums(albums: Album[], sortBy: ExportOptions['sortBy']): Album[] {
  if (!sortBy) return albums;

  const sorted = [...albums];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'artist':
        return (a.artist ?? '').localeCompare(b.artist ?? '');
      case 'title':
        return (a.title ?? '').localeCompare(b.title ?? '');
      case 'year':
        return (a.year ?? '').localeCompare(b.year ?? '');
      case 'date_added':
        return (a.created_at ?? '').localeCompare(b.created_at ?? '');
      default:
        return 0;
    }
  });
  return sorted;
}

function albumToRow(album: Album, fields: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  for (const field of fields) {
    const label = COLUMN_LABELS[field] ?? field;
    switch (field) {
      case 'created_at':
        row[label] = formatDateAdded(album.created_at);
        break;
      case 'isFavorite':
        row[label] = album.isFavorite ? 'Yes' : 'No';
        break;
      case 'play_count':
        row[label] = String(album.play_count ?? 0);
        break;
      case 'personal_notes':
        row[label] = album.personal_notes ?? '';
        break;
      case 'catalog_number':
        row[label] = '';
        break;
      default:
        row[label] = String((album as unknown as Record<string, unknown>)[field] ?? '');
        break;
    }
  }
  return row;
}

export function triggerDownload(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportCollectionAsCSV(
  albums: Album[],
  options?: ExportOptions
): ExportResult {
  let filtered = albums;

  if (options?.filterFavorites) {
    filtered = filtered.filter((a) => a.isFavorite);
  }

  if (options?.sortBy) {
    filtered = sortAlbums(filtered, options.sortBy);
  }

  const fields = options?.includeFields?.length
    ? options.includeFields.filter((f) => ALL_FIELDS.includes(f as typeof ALL_FIELDS[number]))
    : [...ALL_FIELDS];

  const rows = filtered.map((album) => albumToRow(album, fields));

  const csv = Papa.unparse(rows);

  const today = new Date().toISOString().slice(0, 10);
  const filename = `rekkrd-collection-${today}.csv`;

  triggerDownload(csv, filename, 'text/csv;charset=utf-8;');

  saveExportHistory({ date: new Date().toISOString(), filename, format: 'csv', albumCount: filtered.length });

  return { success: true, albumCount: filtered.length, filename };
}

// ── PDF Export ──────────────────────────────────────────────────────

const BRAND_TEAL = '#4f6d7a';
const ROW_EVEN = '#fdf6f0';   // light peach
const ROW_ODD = '#fefcfa';    // cream

const PDF_MAX_CELL_LENGTH = 60;

function truncateForPDF(text: string, maxLen = PDF_MAX_CELL_LENGTH): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '\u2026';
}

function getTopGenre(albums: Album[]): string {
  const counts: Record<string, number> = {};
  for (const a of albums) {
    const g = a.genre?.trim();
    if (g) counts[g] = (counts[g] ?? 0) + 1;
  }
  let top = '—';
  let max = 0;
  for (const [genre, count] of Object.entries(counts)) {
    if (count > max) { max = count; top = genre; }
  }
  return top;
}

function getCollectionStartDate(albums: Album[]): string {
  if (albums.length === 0) return '—';
  let earliest = albums[0].created_at;
  for (const a of albums) {
    if (a.created_at < earliest) earliest = a.created_at;
  }
  return formatDateAdded(earliest);
}

export async function exportCollectionAsPDF(
  albums: Album[],
  username: string,
  options?: ExportOptions
): Promise<ExportResult> {
  let filtered = albums;

  if (options?.filterFavorites) {
    filtered = filtered.filter((a) => a.isFavorite);
  }

  // Default sort: artist A-Z
  filtered = sortAlbums(filtered, options?.sortBy ?? 'artist');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── Cover page ──────────────────────────────────────────────────

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(BRAND_TEAL);
  doc.text('My Vinyl Collection', pageWidth / 2, 80, { align: 'center' });

  // Divider line
  doc.setDrawColor(BRAND_TEAL);
  doc.setLineWidth(0.5);
  doc.line(60, 90, pageWidth - 60, 90);

  // Stats
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor('#333333');

  const stats = [
    `Collector: ${username}`,
    `Total Albums: ${filtered.length}`,
    `Top Genre: ${getTopGenre(filtered)}`,
    `Collection Since: ${getCollectionStartDate(filtered)}`,
    `Exported: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
  ];

  let statsY = 108;
  for (const line of stats) {
    doc.text(line, pageWidth / 2, statsY, { align: 'center' });
    statsY += 10;
  }

  // Cover footer
  doc.setFontSize(10);
  doc.setTextColor('#999999');
  doc.text('Generated by Rekkrd', pageWidth / 2, pageHeight - 20, { align: 'center' });

  // ── Table pages ─────────────────────────────────────────────────

  doc.addPage();

  const tableColumns = ['#', 'Artist', 'Title', 'Year', 'Genre', 'Format', 'Condition'];

  // Yield to let the UI render loading state before heavy PDF work
  await new Promise((r) => setTimeout(r, 0));

  const tableRows = filtered.map((album, i) => [
    String(i + 1),
    truncateForPDF(album.artist ?? ''),
    truncateForPDF(album.title ?? ''),
    album.year ?? '',
    truncateForPDF(album.genre ?? '', 30),
    album.format ?? '',
    album.condition ?? '',
  ]);

  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: 15,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak',
      textColor: '#333333',
    },
    headStyles: {
      fillColor: BRAND_TEAL,
      textColor: '#ffffff',
      fontStyle: 'bold',
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: ROW_EVEN,
    },
    bodyStyles: {
      fillColor: ROW_ODD,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },  // #
      1: { cellWidth: 38 },                     // Artist
      2: { cellWidth: 45 },                     // Title
      3: { cellWidth: 15, halign: 'center' },   // Year
      4: { cellWidth: 30 },                     // Genre
      5: { cellWidth: 22 },                     // Format
      6: { cellWidth: 22 },                     // Condition
    },
    margin: { top: 15, bottom: 20 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const currentPage = data.pageNumber + 1; // +1 for cover page
      doc.setFontSize(8);
      doc.setTextColor('#999999');
      doc.text(
        `Page ${currentPage} of {{total}}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text('Generated by Rekkrd', pageWidth - 14, pageHeight - 10, { align: 'right' });
    },
  });

  // Replace page count placeholder on all pages (cover + table pages)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor('#999999');
    // putTotalPages replaces the {{total}} placeholder
  }
  doc.putTotalPages('{{total}}');

  const today = new Date().toISOString().slice(0, 10);
  const filename = `rekkrd-catalog-${today}.pdf`;
  const blob = doc.output('blob');

  triggerDownload(blob, filename, 'application/pdf');

  saveExportHistory({ date: new Date().toISOString(), filename, format: 'pdf', albumCount: filtered.length });

  return { success: true, albumCount: filtered.length, filename };
}
