
import { Album, Playlist, PlaylistItem } from '../types';

export const geminiService = {
  async identifyAlbum(base64DataUrl: string): Promise<{ artist: string; title: string } | null> {
    try {
      const [header, base64Data] = base64DataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

      const response = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data, mimeType })
      });

      if (!response.ok) return null;
      const data = await response.json();
      if (!data || typeof data.artist !== 'string' || typeof data.title !== 'string') {
        return null;
      }
      return { artist: data.artist, title: data.title };
    } catch (error) {
      console.error('Identification Error:', error);
      return null;
    }
  },

  async fetchAlbumMetadata(artist: string, title: string): Promise<Partial<Album>> {
    try {
      const response = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  async generatePlaylist(albums: Album[], mood: string, type: 'album' | 'side' | 'song'): Promise<Playlist> {
    const response = await fetch('/api/playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        albums: albums.map(a => ({ id: a.id, artist: a.artist, title: a.title, genre: a.genre })),
        mood,
        type
      })
    });

    if (!response.ok) throw new Error('Failed to generate playlist');

    const result = await response.json();
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid playlist response');
    }
    const rawItems = Array.isArray(result.items) ? result.items : [];
    const itemsWithArt: PlaylistItem[] = rawItems
      .filter((item: any) =>
        item && typeof item.albumId === 'string' && typeof item.artist === 'string' &&
        typeof item.albumTitle === 'string' && typeof item.itemTitle === 'string'
      )
      .map((item: any) => {
        const album = albums.find(a => a.id === item.albumId);
        return {
          albumId: item.albumId,
          artist: item.artist,
          albumTitle: item.albumTitle,
          itemTitle: item.itemTitle,
          cover_url: album?.cover_url || '',
          type,
        };
      });

    return { id: crypto.randomUUID(), name: typeof result.playlistName === 'string' ? result.playlistName : 'Crate Mix', mood, items: itemsWithArt };
  }
};
