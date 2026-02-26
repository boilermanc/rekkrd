import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GearCatalogEntry {
  id: string;
  brand: string;
  model: string;
  category: string | null;
  year: string | null;
  description: string | null;
  specs: Record<string, unknown>;
  manual_url: string | null;
  manual_pdf_url: string | null;
  image_url: string | null;
  source: string | null;
  source_id: string | null;
  source_url: string | null;
  ai_confidence: number | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export type NewGearCatalogEntry = Omit<
  GearCatalogEntry,
  'id' | 'created_at' | 'updated_at'
>;

// ---------------------------------------------------------------------------
// Supabase admin client (service-role, bypasses RLS)
// ---------------------------------------------------------------------------

let _admin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (_admin) return _admin;
  _admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  return _admin;
}

const TABLE = 'gear_catalog';

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

interface SearchOptions {
  category?: string;
  approved?: boolean;
  limit?: number;
  offset?: number;
}

export async function searchGearCatalog(
  query: string,
  options: SearchOptions = {},
): Promise<{
  data: GearCatalogEntry[];
  total: number;
  error: string | null;
}> {
  const { category, approved, limit = 50, offset = 0 } = options;
  const supabase = getSupabaseAdmin();

  let builder = supabase
    .from(TABLE)
    .select('*', { count: 'exact' });

  // Full-text-ish search via ilike on brand / model
  if (query.trim()) {
    const q = `%${query.trim()}%`;
    builder = builder.or(`brand.ilike.${q},model.ilike.${q}`);
  }

  if (category) {
    builder = builder.eq('category', category);
  }

  if (approved !== undefined) {
    builder = builder.eq('is_approved', approved);
  }

  builder = builder
    .order('brand', { ascending: true })
    .order('model', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await builder;

  if (error) {
    return { data: [], total: 0, error: error.message };
  }

  return {
    data: (data ?? []) as unknown as GearCatalogEntry[],
    total: count ?? 0,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Get single entry
// ---------------------------------------------------------------------------

export async function getGearCatalogEntry(
  id: string,
): Promise<{ data: GearCatalogEntry | null; error: string | null }> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as GearCatalogEntry, error: null };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createGearCatalogEntry(
  input: NewGearCatalogEntry,
): Promise<{ data: GearCatalogEntry | null; error: string | null }> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...input, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as GearCatalogEntry, error: null };
}

// ---------------------------------------------------------------------------
// Update (partial patch)
// ---------------------------------------------------------------------------

export async function updateGearCatalogEntry(
  id: string,
  input: Partial<NewGearCatalogEntry & { is_approved: boolean }>,
): Promise<{ data: GearCatalogEntry | null; error: string | null }> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as GearCatalogEntry, error: null };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteGearCatalogEntry(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}

// ---------------------------------------------------------------------------
// Approve / unapprove
// ---------------------------------------------------------------------------

export async function approveGearCatalogEntry(
  id: string,
  approved: boolean,
): Promise<{ data: GearCatalogEntry | null; error: string | null }> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      is_approved: approved,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as GearCatalogEntry, error: null };
}
