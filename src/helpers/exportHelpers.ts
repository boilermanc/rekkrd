import * as Papa from 'papaparse';
import type { Album } from '../../types';
import type { ExportOptions, ExportResult } from '../types/export';

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

  return { success: true, albumCount: filtered.length, filename };
}
