
import { Album, NewAlbum, Playlist, PlaylistItem, RawPlaylistItem } from '../types';
import { supabase } from './supabaseService';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Prefer Supabase session JWT for per-user identification
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      return headers;
    }
  }

  // Fallback to legacy API_SECRET during migration
  const secret = import.meta.env.VITE_API_SECRET;
  if (secret) {
    headers['Authorization'] = `Bearer ${secret}`;
  }

  return headers;
}

export class ScanLimitError extends Error {
  constructor(public limit: number, public used: number, public resetsAt: string) {
    super('Monthly scan limit reached');
    this.name = 'ScanLimitError';
  }
}

export class UpgradeRequiredError extends Error {
  constructor(public requiredPlan: string, public currentPlan: string) {
    super('Upgrade required');
    this.name = 'UpgradeRequiredError';
  }
}

async function handleGatingError(response: Response): Promise<void> {
  if (response.status !== 403) return;
  try {
    const body = await response.clone().json();
    if (body.code === 'SCAN_LIMIT_REACHED') {
      throw new ScanLimitError(body.limit, body.used, body.resetsAt);
    }
    if (body.error === 'Upgrade required') {
      throw new UpgradeRequiredError(body.requiredPlan, body.currentPlan);
    }
  } catch (e) {
    if (e instanceof ScanLimitError || e instanceof UpgradeRequiredError) throw e;
  }
}

export const geminiService = {
  async identifyAlbum(base64DataUrl: string): Promise<{ artist: string; title: string } | null> {
    try {
      const [header, base64Data] = base64DataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

      const response = await fetch('/api/identify', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ base64Data, mimeType })
      });

      if (!response.ok) {
        await handleGatingError(response);
        return null;
      }
      const data = await response.json();
      if (!data || typeof data.artist !== 'string' || typeof data.title !== 'string') {
        return null;
      }
      return { artist: data.artist, title: data.title };
    } catch (error) {
      if (error instanceof ScanLimitError || error instanceof UpgradeRequiredError) throw error;
      console.error('Identification Error:', error);
      return null;
    }
  },

  async fetchAlbumMetadata(artist: string, title: string): Promise<Partial<NewAlbum>> {
    try {
      const response = await fetch('/api/metadata', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ artist, title })
      });

      if (!response.ok) return { artist, title, year: 'Unknown', genre: 'Unknown' };
      const data = await response.json();
      if (!data || typeof data !== 'object') {
        return { artist, title, year: 'Unknown', genre: 'Unknown' };
      }
      return {
        artist: typeof data.artist === 'string' ? data.artist : artist,
        title: typeof data.title === 'string' ? data.title : title,
        year: typeof data.year === 'string' ? data.year : 'Unknown',
        genre: typeof data.genre === 'string' ? data.genre : 'Unknown',
        description: typeof data.description === 'string' ? data.description : undefined,
        cover_url: typeof data.cover_url === 'string' ? data.cover_url : '',
        tracklist: Array.isArray(data.tracklist) ? data.tracklist.filter((t: unknown) => typeof t === 'string') : [],
        tags: Array.isArray(data.tags) ? data.tags.filter((t: unknown) => typeof t === 'string') : [],
        discogs_url: typeof data.discogs_url === 'string' ? data.discogs_url : undefined,
        musicbrainz_url: typeof data.musicbrainz_url === 'string' ? data.musicbrainz_url : undefined,
        sample_url: typeof data.sample_url === 'string' ? data.sample_url : undefined,
        price_low: typeof data.price_low === 'number' ? data.price_low : undefined,
        price_median: typeof data.price_median === 'number' ? data.price_median : undefined,
        price_high: typeof data.price_high === 'number' ? data.price_high : undefined,
      };
    } catch (error) {
      console.error('Metadata Fetch Error:', error);
      return { artist, title, year: 'Unknown', genre: 'Unknown' };
    }
  },

  async fetchLyrics(artist: string, track: string, album?: string): Promise<{ lyrics: string | null; syncedLyrics: string | null }> {
    try {
      const response = await fetch('/api/lyrics', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ artist, track, album })
      });

      if (!response.ok) {
        await handleGatingError(response);
        return { lyrics: null, syncedLyrics: null };
      }
      const data = await response.json();
      return {
        lyrics: typeof data.lyrics === 'string' ? data.lyrics : null,
        syncedLyrics: typeof data.syncedLyrics === 'string' ? data.syncedLyrics : null,
      };
    } catch (error) {
      if (error instanceof ScanLimitError || error instanceof UpgradeRequiredError) throw error;
      console.error('Lyrics Fetch Error:', error);
      return { lyrics: null, syncedLyrics: null };
    }
  },

  async fetchCovers(artist: string, title: string): Promise<Array<{ url: string; source: string; label?: string }>> {
    try {
      const response = await fetch('/api/covers', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ artist, title })
      });

      if (!response.ok) {
        await handleGatingError(response);
        return [];
      }
      const data = await response.json();
      if (!Array.isArray(data.covers)) return [];
      return data.covers.filter((item: unknown) => {
        if (!item || typeof item !== 'object') {
          console.warn('fetchCovers: skipping non-object item', item);
          return false;
        }
        const obj = item as Record<string, unknown>;
        if (typeof obj.url !== 'string' || !obj.url.match(/^https?:\/\//)) {
          console.warn('fetchCovers: skipping item with invalid url', obj.url);
          return false;
        }
        if (typeof obj.source !== 'string' || obj.source.length === 0) {
          console.warn('fetchCovers: skipping item with invalid source', obj.source);
          return false;
        }
        if (obj.label !== undefined && typeof obj.label !== 'string') {
          obj.label = undefined;
        }
        return true;
      });
    } catch (error) {
      if (error instanceof ScanLimitError || error instanceof UpgradeRequiredError) throw error;
      console.error('Cover Fetch Error:', error);
      return [];
    }
  },

  async generatePlaylist(albums: Album[], mood: string, type: 'album' | 'side' | 'song'): Promise<Playlist> {
    try {
      const response = await fetch('/api/playlist', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          albums: albums.map(a => ({ id: a.id, artist: a.artist, title: a.title, genre: a.genre, tags: a.tags, tracklist: a.tracklist })),
          mood,
          type
        })
      });

      if (!response.ok) {
        await handleGatingError(response);
        throw new Error('Failed to generate playlist');
      }

      const result = await response.json();
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid playlist response');
      }
      const rawItems = Array.isArray(result.items) ? result.items : [];
      const itemsWithArt: PlaylistItem[] = rawItems
        .filter((item: RawPlaylistItem) =>
          item && typeof item.albumId === 'string' && typeof item.artist === 'string' &&
          typeof item.albumTitle === 'string' && typeof item.itemTitle === 'string'
        )
        .map((item: RawPlaylistItem) => {
          const album = albums.find(a => a.id === item.albumId);
          if (!album) return null;
          return {
            albumId: item.albumId,
            artist: item.artist,
            albumTitle: item.albumTitle,
            itemTitle: item.itemTitle,
            cover_url: album.cover_url || '',
            type,
          };
        })
        .filter((item): item is PlaylistItem => item !== null);

      return { id: crypto.randomUUID(), name: typeof result.playlistName === 'string' ? result.playlistName : 'Crate Mix', mood, items: itemsWithArt };
    } catch (error) {
      if (error instanceof ScanLimitError || error instanceof UpgradeRequiredError) throw error;
      console.error('Playlist Generation Error:', error);
      return { id: crypto.randomUUID(), name: 'Crate Mix', mood, items: [] };
    }
  }
};
