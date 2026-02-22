import { supabase } from './supabaseService';

export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  display_name: string | null;
  favorite_genres: string[] | null;
  listening_setup: string | null;
  collecting_goal: string | null;
  onboarding_completed: boolean;
  role: UserRole;
  subscription_tier: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  discogs_username: string | null;
  discogs_user_id: number | null;
  discogs_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

function assertClient() {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }
}

// Columns safe to return to the frontend (excludes discogs_oauth_token, discogs_oauth_secret)
const PROFILE_COLUMNS = [
  'id', 'display_name', 'favorite_genres', 'listening_setup', 'collecting_goal',
  'onboarding_completed', 'role', 'subscription_tier',
  'utm_source', 'utm_medium', 'utm_campaign',
  'discogs_username', 'discogs_user_id', 'discogs_connected_at',
  'created_at', 'updated_at',
].join(', ');

export async function getProfile(userId: string): Promise<Profile | null> {
  assertClient();

  try {
    // Explicit column list — excludes discogs_oauth_token and discogs_oauth_secret
    const { data, error } = await supabase!
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as unknown as Profile;
  } catch (e) {
    console.error('Error fetching profile:', e);
    return null;
  }
}

export async function createProfile(
  profile: Partial<Profile> & { id: string }
): Promise<Profile> {
  assertClient();

  try {
    const { data, error } = await supabase!
      .from('profiles')
      .insert([profile])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }

    return data as Profile;
  } catch (e) {
    console.error('Error creating profile:', e);
    throw e;
  }
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<void> {
  assertClient();

  try {
    const { id, created_at, ...safeUpdates } = updates;

    const { error } = await supabase!
      .from('profiles')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  } catch (e) {
    console.error('Error updating profile:', e);
    throw e;
  }
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  try {
    const profile = await getProfile(userId);
    return profile?.onboarding_completed ?? false;
  } catch (e) {
    console.error('Error checking onboarding status:', e);
    return false;
  }
}

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const profile = await getProfile(userId);
    return profile?.role === 'admin';
  } catch (e) {
    console.error('Error checking admin status:', e);
    return false;
  }
}
