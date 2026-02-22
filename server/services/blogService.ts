import { createClient } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────────

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  featured_image: string | null;
  tags: string[];
  author: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePostInput {
  title: string;
  body: string;
  excerpt?: string;
  featured_image?: string;
  tags?: string[];
  author?: string;
  status?: 'draft' | 'published';
}

export interface UpdatePostInput {
  title?: string;
  slug?: string;
  body?: string;
  excerpt?: string;
  featured_image?: string;
  tags?: string[];
  author?: string;
  status?: 'draft' | 'published';
}

// ── Supabase client (service role — bypasses RLS) ──────────────────

let _admin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (_admin) return _admin;
  _admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return _admin;
}

// ── Helpers ────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Public queries ─────────────────────────────────────────────────

export async function getPublishedPosts(options?: {
  limit?: number;
  offset?: number;
  tag?: string;
}): Promise<{ posts: BlogPost[]; total: number }> {
  const limit = options?.limit ?? 10;
  const offset = options?.offset ?? 0;
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (options?.tag) {
    query = query.contains('tags', [options.tag]);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  return { posts: (data || []) as BlogPost[], total: count ?? 0 };
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no rows
    throw error;
  }

  return data as BlogPost;
}

// ── Admin queries ──────────────────────────────────────────────────

export async function getPostBySlugAdmin(slug: string): Promise<BlogPost | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as BlogPost;
}

export async function getAllPostsAdmin(): Promise<BlogPost[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data || []) as BlogPost[];
}

// ── Mutations ──────────────────────────────────────────────────────

export async function createPost(input: CreatePostInput): Promise<BlogPost> {
  const supabase = getSupabaseAdmin();
  const status = input.status ?? 'draft';

  const row = {
    title: input.title,
    slug: slugify(input.title),
    body: input.body,
    excerpt: input.excerpt ?? null,
    featured_image: input.featured_image ?? null,
    tags: input.tags ?? [],
    author: input.author ?? null,
    status,
    published_at: status === 'published' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Blog createPost error:', error);
    throw error;
  }

  return data as BlogPost;
}

export async function updatePost(id: string, input: UpdatePostInput): Promise<BlogPost> {
  const supabase = getSupabaseAdmin();

  // Build update payload — only include provided fields
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.slug !== undefined) updates.slug = input.slug;
  if (input.body !== undefined) updates.body = input.body;
  if (input.excerpt !== undefined) updates.excerpt = input.excerpt;
  if (input.featured_image !== undefined) updates.featured_image = input.featured_image;
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.author !== undefined) updates.author = input.author;
  if (input.status !== undefined) updates.status = input.status;

  // If publishing for the first time, set published_at
  if (input.status === 'published') {
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('published_at')
      .eq('id', id)
      .single();

    if (existing && !existing.published_at) {
      updates.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // When a post is published, transition any linked blog ideas to "published"
  if (input.status === 'published') {
    const { error: ideaError } = await supabase
      .from('blog_ideas')
      .update({ status: 'published' })
      .eq('blog_post_id', id);

    if (ideaError) {
      console.error('Failed to update linked blog idea status:', ideaError);
      // Non-fatal — the post itself was saved successfully
    }
  }

  return data as BlogPost;
}

export async function deletePost(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // Unlink any blog_ideas that reference this post
  const { error: unlinkError } = await supabase
    .from('blog_ideas')
    .update({ blog_post_id: null })
    .eq('blog_post_id', id);

  if (unlinkError) throw unlinkError;

  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', id);

  if (error) throw error;

  return true;
}

// ── Blog Ideas ────────────────────────────────────────────────────

export interface BlogIdea {
  id: string;
  idea: string;
  tags: string[];
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface CreateIdeaInput {
  idea: string;
  tags?: string[];
  status?: string;
  source?: string;
}

export interface UpdateIdeaInput {
  idea?: string;
  tags?: string[];
  status?: string;
  source?: string;
}

export async function createIdea(input: CreateIdeaInput): Promise<BlogIdea> {
  const supabase = getSupabaseAdmin();

  const row = {
    idea: input.idea,
    tags: input.tags ?? [],
    status: input.status ?? 'pending',
    source: input.source ?? 'admin',
  };

  const { data, error } = await supabase
    .from('blog_ideas')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Blog createIdea error:', error);
    throw error;
  }

  return data as BlogIdea;
}

export async function getAllIdeas(): Promise<BlogIdea[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('blog_ideas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []) as BlogIdea[];
}

export async function getIdeaById(id: string): Promise<BlogIdea | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('blog_ideas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as BlogIdea;
}

export async function updateIdea(id: string, input: UpdateIdeaInput): Promise<BlogIdea> {
  const supabase = getSupabaseAdmin();

  const updates: Record<string, unknown> = {};
  if (input.idea !== undefined) updates.idea = input.idea;
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.status !== undefined) updates.status = input.status;
  if (input.source !== undefined) updates.source = input.source;

  const { data, error } = await supabase
    .from('blog_ideas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return data as BlogIdea;
}
