
import { Album, NewAlbum, Playlist, PlaylistItem, RawPlaylistItem, IdentifiedGear, ManualSearchResult, SetupGuide, DiscogsMatch } from '../types';
import { supabase } from './supabaseService';

/**
 * Resize a base64 data URL image so its longest edge is at most `maxPx`.
 * Returns the original unchanged if it's already small enough.
 */
function resizeForAI(base64DataUrl: string, maxPx = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w <= maxPx && h <= maxPx) { resolve(base64DataUrl); return; }
      const scale = maxPx / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(base64DataUrl);
    img.src = base64DataUrl;
  });
}

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
  async identifyAlbum(base64DataUrl: string): Promise<{ artist: string; title: string; barcode?: string; discogsMatches?: DiscogsMatch[] } | null> {
    try {
      const resized = await resizeForAI(base64DataUrl);
      const [header, base64Data] = resized.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

      const response = await fetch('/api/identify', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ base64Data, mimeType })
      });

      if (!response.ok) {
        await handleGatingError(response);
        // Provide specific error context for debugging
        let detail = '';
        try {
          const errBody = await response.clone().json();
          detail = errBody.error || '';
        } catch { /* ignore parse errors */ }
        if (response.status === 401) {
          throw new Error('Authentication failed — please sign out and back in.');
        }
        if (response.status === 403) {
          throw new Error(detail || 'Access denied — subscription may be inactive.');
        }
        if (response.status === 504) {
          throw new Error('AI timed out — try a smaller or clearer image.');
        }
        if (response.status === 500) {
          throw new Error(detail || 'Server error — check server logs.');
        }
        throw new Error(`Server returned ${response.status}: ${detail || 'unknown error'}`);
      }
      const data = await response.json();
      if (!data || typeof data.artist !== 'string' || typeof data.title !== 'string') {
        return null;
      }
      const result: { artist: string; title: string; barcode?: string; discogsMatches?: DiscogsMatch[] } = {
        artist: data.artist,
        title: data.title,
      };
      if (typeof data.barcode === 'string' && data.barcode.length > 0) {
        result.barcode = data.barcode;
      }
      if (Array.isArray(data.discogsMatches) && data.discogsMatches.length > 0) {
        result.discogsMatches = data.discogsMatches;
      }
      return result;
    } catch (error) {
      if (error instanceof ScanLimitError || error instanceof UpgradeRequiredError) throw error;
      console.error('Identification Error:', error);
      throw error;
    }
  },

  async identifyGear(base64DataUrl: string): Promise<IdentifiedGear | null> {
    try {
      const resized = await resizeForAI(base64DataUrl);
      const [header, image] = resized.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

      const response = await fetch('/api/identify-gear', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ image, mimeType }),
      });

      if (!response.ok) {
        await handleGatingError(response);
        return null;
      }

      const data = await response.json();
      if (!data || typeof data.brand !== 'string' || typeof data.model !== 'string') {
        return null;
      }

      return {
        category: typeof data.category === 'string' ? data.category : 'cables_other',
        brand: data.brand,
        model: data.model,
        year: typeof data.year === 'string' ? data.year : '',
        description: typeof data.description === 'string' ? data.description : '',
        specs: data.specs && typeof data.specs === 'object' ? data.specs : {},
        manual_search_query: typeof data.manual_search_query === 'string' ? data.manual_search_query : '',
      };
    } catch (error) {
      if (error instanceof ScanLimitError || error instanceof UpgradeRequiredError) throw error;
      console.error('Gear Identification Error:', error);
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

  async findManual(brand: string, model: string, category?: string): Promise<ManualSearchResult> {
    const fallback: ManualSearchResult = {
      manual_url: null,
      source: '',
      confidence: 'low',
      alternative_urls: [],
      search_url: `https://www.google.com/search?q=${encodeURIComponent(`${brand} ${model} owner manual PDF`)}`,
    };

    try {
      const response = await fetch('/api/find-manual', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ brand, model, category }),
      });

      if (!response.ok) {
        await handleGatingError(response);
        return fallback;
      }

      const data = await response.json();
      return {
        manual_url: typeof data.manual_url === 'string' ? data.manual_url : null,
        source: typeof data.source === 'string' ? data.source : '',
        confidence: typeof data.confidence === 'string' ? data.confidence : 'low',
        alternative_urls: Array.isArray(data.alternative_urls) ? data.alternative_urls : [],
        search_url: typeof data.search_url === 'string' ? data.search_url : fallback.search_url,
      };
    } catch (error) {
      if (error instanceof ScanLimitError || error instanceof UpgradeRequiredError) throw error;
      console.error('Find Manual Error:', error);
      return fallback;
    }
  },

  async generateSetupGuide(gear: Array<{ category: string; brand: string; model: string; specs?: Record<string, unknown> }>): Promise<SetupGuide> {
    try {
      const response = await fetch('/api/setup-guide', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ gear }),
      });

      if (!response.ok) {
        await handleGatingError(response);
        throw new Error('Failed to generate setup guide');
      }

      const data = await response.json();
      return {
        signal_chain: Array.isArray(data.signal_chain) ? data.signal_chain : [],
        connections: Array.isArray(data.connections) ? data.connections : [],
        settings: Array.isArray(data.settings) ? data.settings : [],
        tips: Array.isArray(data.tips) ? data.tips : [],
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
      };
    } catch (error) {
      if (error instanceof ScanLimitError || error instanceof UpgradeRequiredError) throw error;
      console.error('Setup Guide Error:', error);
      throw error;
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
