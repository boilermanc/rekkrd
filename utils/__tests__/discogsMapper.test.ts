import { describe, it, expect } from 'vitest';
import { mapDiscogsToAlbum, getDiscogsCoverUrl } from '../discogsMapper';
import type { DiscogsRelease } from '../../types/discogs';

// ── Helpers ───────────────────────────────────────────────────────

function makeRelease(overrides: Partial<DiscogsRelease> = {}): DiscogsRelease {
  return {
    id: 249504,
    title: 'Rick Astley - Whenever You Need Somebody',
    artists: [
      { id: 72872, name: 'Rick Astley', resource_url: 'https://api.discogs.com/artists/72872' },
    ],
    year: 1987,
    genres: ['Electronic', 'Pop'],
    styles: ['Synth-pop', 'Euro House'],
    tracklist: [
      { position: 'A1', title: 'Never Gonna Give You Up', duration: '3:33', type_: 'track' },
      { position: 'A2', title: 'Whenever You Need Somebody', duration: '3:24', type_: 'track' },
      { position: '',   title: 'Side B',                     duration: '',     type_: 'heading' },
      { position: 'B1', title: 'Together Forever',            duration: '3:23', type_: 'track' },
    ],
    images: [
      { type: 'secondary', uri: 'https://img.discogs.com/sec.jpg', uri150: 'https://img.discogs.com/sec150.jpg', width: 600, height: 600 },
      { type: 'primary',   uri: 'https://img.discogs.com/pri.jpg', uri150: 'https://img.discogs.com/pri150.jpg', width: 600, height: 600 },
    ],
    labels: [
      { id: 895, name: 'RCA', catno: 'PL 71529' },
    ],
    formats: [
      { name: 'Vinyl', qty: '1', descriptions: ['LP', 'Album'] },
    ],
    country: 'UK',
    released: '1987-11-16',
    notes: 'Debut studio album.',
    community: { rating: { average: 3.5, count: 200 }, have: 5000, want: 1000 },
    master_id: 35792,
    master_url: 'https://api.discogs.com/masters/35792',
    resource_url: 'https://api.discogs.com/releases/249504',
    ...overrides,
  };
}

// ── mapDiscogsToAlbum ─────────────────────────────────────────────

describe('mapDiscogsToAlbum', () => {
  it('maps a full DiscogsRelease correctly', () => {
    const album = mapDiscogsToAlbum(makeRelease());

    expect(album.artist).toBe('Rick Astley');
    expect(album.title).toBe('Whenever You Need Somebody');
    expect(album.year).toBe('1987');
    expect(album.genre).toBe('Electronic');
    expect(album.subgenre).toBe('Synth-pop');
    expect(album.label).toBe('RCA');
    expect(album.catalogNumber).toBe('PL 71529');
    expect(album.format).toBe('Vinyl');
    expect(album.country).toBe('UK');
    expect(album.description).toBe('Debut studio album.');
    expect(album.discogs_url).toBe('https://www.discogs.com/release/249504');
    expect(album.discogsReleaseId).toBe(249504);
    expect(album.discogsMasterId).toBe(35792);
    expect(album.cover_url).toBe('https://img.discogs.com/pri.jpg');
  });

  it('splits "Artist - Title" style title strings correctly', () => {
    const album = mapDiscogsToAlbum(makeRelease({
      title: 'Led Zeppelin - Houses of the Holy',
    }));

    expect(album.title).toBe('Houses of the Holy');
  });

  it('handles releases where title has no " - " separator', () => {
    const album = mapDiscogsToAlbum(makeRelease({
      title: 'Abbey Road',
    }));

    expect(album.title).toBe('Abbey Road');
  });

  it('defaults missing optional fields to empty strings, never undefined', () => {
    const album = mapDiscogsToAlbum(makeRelease({
      images: undefined,
      labels: undefined,
      formats: undefined,
      styles: [],
      notes: undefined,
      country: undefined,
      master_id: undefined,
    }));

    expect(album.cover_url).toBe('');
    expect(album.label).toBe('');
    expect(album.catalogNumber).toBe('');
    expect(album.format).toBe('');
    expect(album.subgenre).toBe('');
    expect(album.description).toBe('');
    expect(album.country).toBe('');
    expect(album.discogsMasterId).toBeNull();
  });

  it('joins multiple artists with ", "', () => {
    const album = mapDiscogsToAlbum(makeRelease({
      artists: [
        { id: 1, name: 'John Lennon', resource_url: '' },
        { id: 2, name: 'Yoko Ono', resource_url: '' },
      ],
    }));

    expect(album.artist).toBe('John Lennon, Yoko Ono');
  });

  it('preserves "Various Artists" as artist name', () => {
    const album = mapDiscogsToAlbum(makeRelease({
      artists: [
        { id: 194, name: 'Various', resource_url: '' },
      ],
      title: 'Now That\'s What I Call Music!',
    }));

    expect(album.artist).toBe('Various');
  });

  it('filters tracklist to type === "track" only and formats correctly', () => {
    const album = mapDiscogsToAlbum(makeRelease());

    // The heading "Side B" should be filtered out
    expect(album.tracklist).toHaveLength(3);
    expect(album.tracklist![0]).toBe('A1 Never Gonna Give You Up (3:33)');
    expect(album.tracklist![1]).toBe('A2 Whenever You Need Somebody (3:24)');
    expect(album.tracklist![2]).toBe('B1 Together Forever (3:23)');
  });

  it('handles tracks without position or duration', () => {
    const album = mapDiscogsToAlbum(makeRelease({
      tracklist: [
        { position: '', title: 'Untitled', duration: '', type_: 'track' },
      ],
    }));

    expect(album.tracklist).toEqual(['Untitled']);
  });

  it('returns empty tracklist when all entries are non-track types', () => {
    const album = mapDiscogsToAlbum(makeRelease({
      tracklist: [
        { position: '', title: 'Side A', duration: '', type_: 'heading' },
        { position: '', title: 'Side B', duration: '', type_: 'heading' },
      ],
    }));

    expect(album.tracklist).toEqual([]);
  });
});

// ── getDiscogsCoverUrl ────────────────────────────────────────────

describe('getDiscogsCoverUrl', () => {
  it('returns primary image URI', () => {
    const url = getDiscogsCoverUrl(makeRelease());
    expect(url).toBe('https://img.discogs.com/pri.jpg');
  });

  it('falls back to first image when no primary exists', () => {
    const url = getDiscogsCoverUrl(makeRelease({
      images: [
        { type: 'secondary', uri: 'https://img.discogs.com/fallback.jpg', uri150: '', width: 300, height: 300 },
      ],
    }));

    expect(url).toBe('https://img.discogs.com/fallback.jpg');
  });

  it('returns empty string when images is undefined', () => {
    const url = getDiscogsCoverUrl(makeRelease({ images: undefined }));
    expect(url).toBe('');
  });

  it('returns empty string when images is empty array', () => {
    const url = getDiscogsCoverUrl(makeRelease({ images: [] }));
    expect(url).toBe('');
  });
});
