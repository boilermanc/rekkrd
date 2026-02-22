import type { DiscogsRelease } from '../types/discogs';
import type { NewAlbum } from '../types';

/**
 * NewAlbum extended with Discogs-specific metadata that doesn't exist
 * on the base type yet. These extra fields can be stored alongside the
 * album or used to enrich the record later.
 */
export interface DiscogsNewAlbum extends NewAlbum {
  discogsReleaseId: number;
  discogsMasterId: number | null;
  country: string;
  label: string;
  catalogNumber: string;
  subgenre: string;
  format: string;
}

/**
 * Extract the best cover image URL from a Discogs release.
 * Prefers the primary image, falls back to first available, then empty string.
 */
export function getDiscogsCoverUrl(release: DiscogsRelease): string {
  if (!release.images || release.images.length === 0) return '';
  const primary = release.images.find(img => img.type === 'primary');
  return primary?.uri ?? release.images[0].uri ?? '';
}

/**
 * Convert a Discogs release into Rekkrd's NewAlbum shape (plus Discogs extras).
 *
 * Mapping notes:
 * - title: Discogs often formats as "Artist - Title"; we split on " - "
 * - artist: joined from artists array, filtering out non-main roles
 * - tracklist: formatted as string[] since NewAlbum.tracklist is string[]
 * - year: converted to string (NewAlbum.year is string)
 * - notes: mapped to NewAlbum.description
 * - discogs_url: built from release.id
 */
export function mapDiscogsToAlbum(release: DiscogsRelease): DiscogsNewAlbum {
  // ── Artist ──────────────────────────────────────────────────────
  const artists = release.artists
    .filter(a => !a.role || a.role === '' || a.role.toLowerCase() === 'main')
    .map(a => a.name);
  const artist = artists.length > 0 ? artists.join(', ') : '';

  // ── Title ───────────────────────────────────────────────────────
  // Discogs titles are often "Artist - Album Title"
  let title = release.title;
  const separatorIdx = title.indexOf(' - ');
  if (separatorIdx !== -1) {
    title = title.substring(separatorIdx + 3);
  }

  // ── Year ────────────────────────────────────────────────────────
  const year = release.year > 0 ? String(release.year) : '';

  // ── Genre / Subgenre ────────────────────────────────────────────
  const genre = release.genres?.[0] ?? '';
  const subgenre = release.styles?.[0] ?? '';

  // ── Label / Catalog Number ──────────────────────────────────────
  const firstLabel = release.labels?.[0];
  const label = firstLabel?.name ?? '';
  const catalogNumber = firstLabel?.catno ?? '';

  // ── Format ──────────────────────────────────────────────────────
  const format = release.formats?.[0]?.name ?? '';

  // ── Cover URL ───────────────────────────────────────────────────
  const cover_url = getDiscogsCoverUrl(release);

  // ── Tracklist ───────────────────────────────────────────────────
  // NewAlbum.tracklist is string[], so format each track as a readable string
  const tracklist = release.tracklist
    .filter(t => t.type_ === 'track')
    .map(t => {
      const parts: string[] = [];
      if (t.position) parts.push(t.position);
      parts.push(t.title);
      if (t.duration) parts.push(`(${t.duration})`);
      return parts.join(' ');
    });

  // ── Discogs URL ─────────────────────────────────────────────────
  const discogs_url = `https://www.discogs.com/release/${release.id}`;

  return {
    artist,
    title,
    year,
    genre,
    cover_url,
    tracklist,
    description: release.notes ?? '',
    discogs_url,
    // Discogs-specific extras
    discogsReleaseId: release.id,
    discogsMasterId: release.master_id ?? null,
    country: release.country ?? '',
    label,
    catalogNumber,
    subgenre,
    format,
  };
}
