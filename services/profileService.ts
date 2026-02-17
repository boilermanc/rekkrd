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
  created_at: string;
  updated_at: string;
}

function assertClient() {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  assertClient();

  try {
    const { data, error } = await supabase!
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as Profile;
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
