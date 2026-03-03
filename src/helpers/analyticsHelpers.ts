import type { Album } from '../types';
import type {
  GenreData,
  DecadeData,
  GrowthData,
  FormatData,
  CollectionStats,
} from '../types/analytics';

// ── Helpers ─────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const FORMAT_ALIASES: Record<string, string> = {
  '12"': '12" Vinyl',
  '12 inch': '12" Vinyl',
  '12"vinyl': '12" Vinyl',
  '12" vinyl': '12" Vinyl',
  '7"': '7" Vinyl',
  '7 inch': '7" Vinyl',
  '7"vinyl': '7" Vinyl',
  '7" vinyl': '7" Vinyl',
  '10"': '10" Vinyl',
  '10 inch': '10" Vinyl',
  '10"vinyl': '10" Vinyl',
  '10" vinyl': '10" Vinyl',
  'lp': 'LP',
  'vinyl': 'Vinyl',
  'cd': 'CD',
  'cassette': 'Cassette',
  'tape': 'Cassette',
};

function normalizeFormat(raw: string | undefined | null): string {
  if (!raw || !raw.trim()) return 'Unknown';
  const trimmed = raw.trim();
  const key = trimmed.toLowerCase();
  return FORMAT_ALIASES[key] ?? trimmed;
}

// ── Genre Breakdown ─────────────────────────────────────────────────

export function computeGenreBreakdown(albums: Album[]): GenreData[] {
  if (albums.length === 0) return [];

  const counts = new Map<string, number>();

  for (const album of albums) {
    const genre =
      album.genre && album.genre.trim()
        ? toTitleCase(album.genre.trim())
        : 'Unknown';
    counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }

  const sorted = Array.from(counts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);

  const total = albums.length;
  const MAX_GENRES = 10;

  if (sorted.length <= MAX_GENRES) {
    return sorted.map(({ genre, count }) => ({
      genre,
      count,
      percentage: round1((count / total) * 100),
    }));
  }

  const top = sorted.slice(0, MAX_GENRES);
  const otherCount = sorted
    .slice(MAX_GENRES)
    .reduce((sum, g) => sum + g.count, 0);

  const result: GenreData[] = top.map(({ genre, count }) => ({
    genre,
    count,
    percentage: round1((count / total) * 100),
  }));

  result.push({
    genre: 'Other',
    count: otherCount,
    percentage: round1((otherCount / total) * 100),
  });

  return result;
}

// ── Decade Distribution ─────────────────────────────────────────────

export function computeDecadeDistribution(albums: Album[]): DecadeData[] {
  const counts = new Map<string, number>();

  for (const album of albums) {
    if (!album.year) continue;
    const yearNum = parseInt(album.year, 10);
    if (isNaN(yearNum)) continue;

    const decadeStart = Math.floor(yearNum / 10) * 10;
    const label = `${decadeStart}s`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => {
      const numA = parseInt(a.decade, 10);
      const numB = parseInt(b.decade, 10);
      return numA - numB;
    });
}

// ── Collection Growth ───────────────────────────────────────────────

function getWeekKey(date: Date): string {
  // ISO week-based: use the Monday of the week
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getMonthKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export function computeCollectionGrowth(albums: Album[]): GrowthData[] {
  if (albums.length === 0) return [];

  // Sort by created_at ascending
  const sorted = [...albums].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const earliest = new Date(sorted[0].created_at);
  const latest = new Date(sorted[sorted.length - 1].created_at);

  // Determine grouping: if span < 3 months, group by week
  const spanMs = latest.getTime() - earliest.getTime();
  const threeMonthsMs = 3 * 30 * 24 * 60 * 60 * 1000;
  const useWeeks = spanMs < threeMonthsMs;

  const keyFn = useWeeks ? getWeekKey : getMonthKey;

  // Count albums per period
  const periodCounts = new Map<string, number>();
  for (const album of sorted) {
    const key = keyFn(new Date(album.created_at));
    periodCounts.set(key, (periodCounts.get(key) ?? 0) + 1);
  }

  // Build cumulative growth
  const periods = Array.from(periodCounts.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const result: GrowthData[] = [];
  let cumulative = 0;
  for (const [date, count] of periods) {
    cumulative += count;
    result.push({ date, totalAlbums: cumulative });
  }

  return result;
}

// ── Format Breakdown ────────────────────────────────────────────────

export function computeFormatBreakdown(albums: Album[]): FormatData[] {
  if (albums.length === 0) return [];

  const counts = new Map<string, number>();

  for (const album of albums) {
    const format = normalizeFormat(album.format);
    counts.set(format, (counts.get(format) ?? 0) + 1);
  }

  const total = albums.length;

  return Array.from(counts.entries())
    .map(([format, count]) => ({
      format,
      count,
      percentage: round1((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

// ── Collection Stats ────────────────────────────────────────────────

export function computeCollectionStats(albums: Album[]): CollectionStats {
  if (albums.length === 0) {
    return {
      totalAlbums: 0,
      totalArtists: 0,
      oldestAlbum: null,
      newestAlbum: null,
      mostCommonGenre: 'N/A',
      mostCommonDecade: 'N/A',
      avgAlbumsPerArtist: 0,
      collectionStartDate: 'N/A',
    };
  }

  // Unique artists
  const artists = new Set<string>();
  for (const album of albums) {
    if (album.artist && album.artist.trim()) {
      artists.add(album.artist.trim().toLowerCase());
    }
  }
  const totalArtists = artists.size;

  // Oldest / newest by release year
  let oldest: Album | null = null;
  let newest: Album | null = null;
  for (const album of albums) {
    if (!album.year) continue;
    const y = parseInt(album.year, 10);
    if (isNaN(y)) continue;

    if (!oldest || y < parseInt(oldest.year!, 10)) oldest = album;
    if (!newest || y > parseInt(newest.year!, 10)) newest = album;
  }

  // Most common genre
  const genreBreakdown = computeGenreBreakdown(albums);
  const topGenre = genreBreakdown.find(g => g.genre !== 'Unknown' && g.genre !== 'Other');
  const mostCommonGenre = topGenre?.genre ?? (genreBreakdown[0]?.genre ?? 'N/A');

  // Most common decade
  const decadeDistribution = computeDecadeDistribution(albums);
  const topDecade = decadeDistribution.length > 0
    ? [...decadeDistribution].sort((a, b) => b.count - a.count)[0].decade
    : 'N/A';

  // Avg albums per artist
  const avgAlbumsPerArtist = totalArtists > 0
    ? round1(albums.length / totalArtists)
    : 0;

  // Collection start date (earliest created_at)
  const earliestCreated = albums.reduce((min, a) =>
    new Date(a.created_at) < new Date(min.created_at) ? a : min,
  );
  const startDate = new Date(earliestCreated.created_at);
  const collectionStartDate = `${MONTH_NAMES[startDate.getMonth()]} ${startDate.getFullYear()}`;

  return {
    totalAlbums: albums.length,
    totalArtists,
    oldestAlbum: oldest
      ? { title: oldest.title, artist: oldest.artist, year: oldest.year! }
      : null,
    newestAlbum: newest
      ? { title: newest.title, artist: newest.artist, year: newest.year! }
      : null,
    mostCommonGenre,
    mostCommonDecade: topDecade,
    avgAlbumsPerArtist,
    collectionStartDate,
  };
}
