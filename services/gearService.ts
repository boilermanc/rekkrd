
import { supabase } from './supabaseService';
import { Gear, NewGear } from '../types';

const GEAR_PHOTOS_BUCKET = 'gear-photos';

function assertClient() {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }
}

/** Upload a base64 data URL to Supabase Storage and return the public URL. */
async function uploadGearPhoto(base64Data: string): Promise<string | null> {
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

    const { error } = await supabase!.storage
      .from(GEAR_PHOTOS_BUCKET)
      .upload(fileName, blob);

    if (error) throw error;

    const { data: { publicUrl } } = supabase!.storage
      .from(GEAR_PHOTOS_BUCKET)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (e) {
    console.error('Gear photo upload error:', e);
    return null;
  }
}

/** Extract the Storage file path from a Supabase public URL for the gear-photos bucket. */
function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${GEAR_PHOTOS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

/** Delete a file from the gear-photos bucket if the URL points to Supabase Storage. */
async function deleteStorageFile(url: string): Promise<void> {
  const path = extractStoragePath(url);
  if (!path) return;

  const { error } = await supabase!.storage
    .from(GEAR_PHOTOS_BUCKET)
    .remove([path]);

  if (error) {
    console.error('Error deleting gear photo from storage:', error);
  }
}

const UPDATABLE_FIELDS: (keyof NewGear)[] = [
  'category', 'brand', 'model', 'year', 'description', 'specs',
  'manual_url', 'image_url', 'original_photo_url',
  'purchase_price', 'purchase_date', 'notes', 'position',
];

export const gearService = {
  async getGear(): Promise<Gear[]> {
    assertClient();

    const { data, error } = await supabase!
      .from('gear')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching gear:', error);
      return [];
    }

    return data || [];
  },

  async saveGear(gear: NewGear): Promise<Gear> {
    assertClient();

    let photoUrl: string | undefined = undefined;

    if (gear.original_photo_url && gear.original_photo_url.startsWith('data:image')) {
      const uploadedUrl = await uploadGearPhoto(gear.original_photo_url);
      if (uploadedUrl) {
        photoUrl = uploadedUrl;
      } else {
        console.warn('Failed to upload gear photo to Storage; falling back to base64');
        photoUrl = gear.original_photo_url;
      }
    } else if (gear.original_photo_url) {
      photoUrl = gear.original_photo_url;
    }

    // For v1, use the uploaded photo as the display image if no separate image_url is provided
    const imageUrl = gear.image_url || photoUrl;

    const { data, error } = await supabase!
      .from('gear')
      .insert([{
        category: gear.category,
        brand: gear.brand,
        model: gear.model,
        year: gear.year,
        description: gear.description,
        specs: gear.specs,
        manual_url: gear.manual_url,
        image_url: imageUrl,
        original_photo_url: photoUrl,
        purchase_price: gear.purchase_price,
        purchase_date: gear.purchase_date,
        notes: gear.notes,
        position: gear.position ?? 0,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving gear:', error);
      throw error;
    }

    return data;
  },

  async updateGear(id: string, updates: Partial<NewGear>): Promise<Gear> {
    assertClient();

    const dbUpdates: Record<string, unknown> = {};
    for (const key of UPDATABLE_FIELDS) {
      if (key in updates) {
        dbUpdates[key] = updates[key];
      }
    }

    const { data, error } = await supabase!
      .from('gear')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating gear:', error);
      throw error;
    }

    return data;
  },

  async deleteGear(id: string): Promise<void> {
    assertClient();

    // Fetch the gear item first to get storage URLs for cleanup
    const { data: gear, error: fetchError } = await supabase!
      .from('gear')
      .select('image_url, original_photo_url')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching gear for deletion:', fetchError);
      throw fetchError;
    }

    // Delete associated photos from Storage
    if (gear?.image_url) await deleteStorageFile(gear.image_url);
    if (gear?.original_photo_url) await deleteStorageFile(gear.original_photo_url);

    const { error } = await supabase!
      .from('gear')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting gear:', error);
      throw error;
    }
  },

  async reorderGear(orderedIds: string[]): Promise<void> {
    assertClient();

    // Batch update positions — each ID gets its array index as position
    const updates = orderedIds.map((id, index) =>
      supabase!
        .from('gear')
        .update({ position: index })
        .eq('id', id)
    );

    const results = await Promise.all(updates);

    for (const result of results) {
      if (result.error) {
        console.error('Error reordering gear:', result.error);
        throw result.error;
      }
    }
  },
};
