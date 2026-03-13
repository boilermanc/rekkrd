import { supabase } from './supabaseService';
import type { DiscogsSearchResult } from '../types/discogs';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  return headers;
}

export async function searchDiscogsLabel(
  catalogNumber: string | null,
  labelName: string | null,
  artist: string | null,
  title: string | null,
  signal?: AbortSignal,
): Promise<DiscogsSearchResult[]> {
  try {
    const response = await fetch('/api/discogs/label-search', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        catalog_number: catalogNumber,
        label_name: labelName,
        artist,
        title,
      }),
      signal,
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (error) {
    console.error('Discogs label search error:', error);
    return [];
  }
}
