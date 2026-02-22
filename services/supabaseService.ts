
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Album, NewAlbum } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fix: Export the supabase variable so it can be accessed in App.tsx
export let supabase: SupabaseClient | null = null;

// Only initialize if keys are present to avoid startup crashes
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn("Supabase credentials missing. Database functionality will be disabled until SUPABASE_URL and SUPABASE_ANON_KEY are set in environment variables.");
}

function assertClient() {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }
}

async function requireUserId(): Promise<string> {
  assertClient();
  const { data: { session } } = await supabase!.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
  return session.user.id;
}

export const supabaseService = {
  async getAlbums(): Promise<Album[]> {
    assertClient();
    const userId = await requireUserId();

    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching albums:', error);
      return [];
    }

    return (data || []).map(a => ({
      ...a,
      isFavorite: a.is_favorite
    }));
  },

  async uploadPhoto(base64Data: string): Promise<string | null> {
    assertClient();
    
    try {
      const mimeMatch = base64Data.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const extMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
      };
      const ext = extMap[mimeType] || '.jpg';

      const fileName = `${crypto.randomUUID()}${ext}`;
      const base64Content = base64Data.split(',')[1];
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      const { data, error } = await supabase.storage
        .from('album-photos')
        .upload(fileName, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('album-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (e) {
      console.error('Upload error:', e);
      return null;
    }
  },

  async saveAlbum(album: NewAlbum): Promise<Album> {
    assertClient();
    const userId = await requireUserId();

    let photoUrl: string | undefined = undefined;

    if (album.original_photo_url && album.original_photo_url.startsWith('data:image')) {
      const uploadedUrl = await this.uploadPhoto(album.original_photo_url);
      if (uploadedUrl) {
        photoUrl = uploadedUrl;
      } else {
        console.warn('Failed to upload original photo to Storage; falling back to base64');
        photoUrl = album.original_photo_url;
      }
    } else if (album.original_photo_url) {
      photoUrl = album.original_photo_url;
    }

    const { data, error } = await supabase
      .from('albums')
      .insert([{
        user_id: userId,
        artist: album.artist,
        title: album.title,
        year: album.year,
        genre: album.genre,
        cover_url: album.cover_url,
        original_photo_url: photoUrl,
        description: album.description,
        tracklist: album.tracklist,
        tags: album.tags,
        is_favorite: album.isFavorite,
        condition: album.condition,
        personal_notes: album.personal_notes,
        price_low: album.price_low,
        price_median: album.price_median,
        price_high: album.price_high,
        play_count: album.play_count || 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving album:', error);
      throw error;
    }

    return { ...data, isFavorite: data.is_favorite };
  },

  async updateAlbum(id: string, updates: Partial<Album>): Promise<void> {
    assertClient();

    // Allowlist of fields that can be written to the database.
    // Prevents client-only or protected columns (id, created_at) from being
    // overwritten via the ...rest spread that was here before.
    const UPDATABLE_FIELDS: (keyof NewAlbum)[] = [
      'title', 'artist', 'year', 'genre', 'cover_url', 'original_photo_url',
      'description', 'tracklist', 'tags', 'condition', 'personal_notes',
      'price_low', 'price_median', 'price_high', 'play_count',
      'discogs_url', 'musicbrainz_url', 'sample_url',
    ];

    const dbUpdates: Record<string, unknown> = {};
    for (const key of UPDATABLE_FIELDS) {
      if (key in updates) {
        dbUpdates[key] = updates[key];
      }
    }
    if (updates.isFavorite !== undefined) {
      dbUpdates.is_favorite = updates.isFavorite;
    }

    const userId = await requireUserId();
    const { error } = await supabase
      .from('albums')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating album:', error);
      throw error;
    }
  },

  async deleteAlbum(id: string): Promise<void> {
    assertClient();
    const userId = await requireUserId();

    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting album:', error);
      throw error;
    }
  }
};
