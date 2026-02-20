import { supabase } from './supabaseService';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      return headers;
    }
  }

  const secret = import.meta.env.VITE_API_SECRET;
  if (secret) {
    headers['Authorization'] = `Bearer ${secret}`;
  }
  return headers;
}

export interface AdminCustomer {
  id: string;
  email: string;
  display_name: string | null;
  favorite_genres: string[] | null;
  listening_setup: string | null;
  collecting_goal: string | null;
  onboarding_completed: boolean;
  role: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  album_count: number;
  subscription_plan: string | null;
  subscription_status: string | null;
}

export interface AdminCollectionStats {
  totalAlbums: number;
  totalValue: number;
  genreBreakdown: Record<string, number>;
  decadeBreakdown: Record<string, number>;
}

export interface AdminAlbum {
  id: string;
  artist: string;
  title: string;
  year: string | null;
  genre: string | null;
  cover_url: string | null;
  condition: string | null;
  price_median: number | null;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  created_at: string;
  updated_at: string;
}

export interface SendEmailResult {
  id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
}

export interface ComposerSendResult {
  success: boolean;
  id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
}

export interface CmsContentRow {
  id: string;
  page: string;
  section: string;
  content: unknown;
  updated_at: string;
  updated_by: string | null;
}

export interface BlogPostAdmin {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  featured_image: string | null;
  tags: string[];
  author: string;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogIdeaAdmin {
  id: string;
  idea: string;
  tags: string[];
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface UtmRecentSignup {
  created_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  subscription_tier: string | null;
}

export interface UtmDateCount {
  date: string;
  count: number;
}

export interface UtmStats {
  total_signups: number;
  by_source: Record<string, number>;
  by_medium: Record<string, number>;
  by_campaign: Record<string, number>;
  by_tier: Record<string, number>;
  recent_signups: UtmRecentSignup[];
  by_date: UtmDateCount[];
}

export interface EmailPreset {
  id: string;
  name: string;
  category: 'transactional' | 'engagement' | 'marketing' | 'operational';
  description: string;
  templateId: 'light' | 'orange' | 'dark-blue';
  automated: boolean;
  variables: {
    preheader_text: string;
    headline: string;
    hero_body: string;
    body_content: string;
    cta_text: string;
    cta_url: string;
    secondary_content: string;
    subject: string;
    feature_1_label?: string;
    feature_1_text?: string;
    feature_2_label?: string;
    feature_2_text?: string;
  };
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export const adminService = {
  async getCustomers(): Promise<AdminCustomer[]> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/customers', { headers });
    if (!resp.ok) throw new Error(`Failed to fetch customers: ${resp.status}`);
    return resp.json();
  },

  async getCollections(): Promise<{ albums: AdminAlbum[]; stats: AdminCollectionStats }> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/collections', { headers });
    if (!resp.ok) throw new Error(`Failed to fetch collections: ${resp.status}`);
    return resp.json();
  },

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/email-templates', { headers });
    if (!resp.ok) throw new Error(`Failed to fetch templates: ${resp.status}`);
    return resp.json();
  },

  async createEmailTemplate(template: { name: string; subject: string; html_body: string }): Promise<EmailTemplate> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/email-templates', {
      method: 'POST',
      headers,
      body: JSON.stringify(template),
    });
    if (!resp.ok) throw new Error(`Failed to create template: ${resp.status}`);
    return resp.json();
  },

  async updateEmailTemplate(id: string, updates: { name?: string; subject?: string; html_body?: string }): Promise<EmailTemplate> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/email-templates', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id, ...updates }),
    });
    if (!resp.ok) throw new Error(`Failed to update template: ${resp.status}`);
    return resp.json();
  },

  async deleteEmailTemplate(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/email-templates', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ id }),
    });
    if (!resp.ok) throw new Error(`Failed to delete template: ${resp.status}`);
  },

  async getCmsContent(page: string): Promise<CmsContentRow[]> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`/api/admin/cms-content?page=${encodeURIComponent(page)}`, { headers });
    if (!resp.ok) throw new Error(`Failed to fetch CMS content: ${resp.status}`);
    return resp.json();
  },

  async saveCmsSection(page: string, section: string, content: unknown): Promise<CmsContentRow> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/cms-content', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ page, section, content }),
    });
    if (!resp.ok) throw new Error(`Failed to save CMS content: ${resp.status}`);
    return resp.json();
  },

  async sendTestEmail(payload: { to: string; subject: string; html: string }): Promise<SendEmailResult> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/send-email', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Send failed' }));
      throw new Error(err.error || `Failed to send email: ${resp.status}`);
    }
    return resp.json();
  },

  async getBlogPosts(): Promise<BlogPostAdmin[]> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${API_BASE}/api/blog/admin/posts`, { headers });
    if (!resp.ok) throw new Error(`Failed to fetch blog posts: ${resp.status}`);
    const data = await resp.json();
    return data.posts;
  },

  async getBlogPost(slug: string): Promise<BlogPostAdmin> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${API_BASE}/api/blog/admin/posts/${encodeURIComponent(slug)}`, { headers });
    if (!resp.ok) throw new Error(`Failed to fetch blog post: ${resp.status}`);
    return resp.json();
  },

  async createBlogPost(post: { title: string; body: string; excerpt?: string; featured_image?: string; tags?: string[]; author?: string; status?: string }): Promise<BlogPostAdmin> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${API_BASE}/api/blog/admin/posts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(post),
    });
    if (!resp.ok) throw new Error(`Failed to create blog post: ${resp.status}`);
    return resp.json();
  },

  async updateBlogPost(id: string, updates: { title?: string; slug?: string; body?: string; excerpt?: string; featured_image?: string; tags?: string[]; author?: string; status?: string }): Promise<BlogPostAdmin> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${API_BASE}/api/blog/admin/posts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!resp.ok) throw new Error(`Failed to update blog post: ${resp.status}`);
    return resp.json();
  },

  async deleteBlogPost(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${API_BASE}/api/blog/admin/posts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    if (!resp.ok) throw new Error(`Failed to delete blog post: ${resp.status}`);
  },

  async getBlogIdeas(): Promise<BlogIdeaAdmin[]> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${API_BASE}/api/blog/admin/ideas`, { headers });
    if (!resp.ok) throw new Error(`Failed to fetch blog ideas: ${resp.status}`);
    const data = await resp.json();
    return data.ideas;
  },

  async getUtmStats(): Promise<UtmStats> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/utm-stats', { headers });
    if (!resp.ok) throw new Error(`Failed to fetch UTM stats: ${resp.status}`);
    return resp.json();
  },

  async submitBlogIdea(data: { idea: string; tags: string[] }): Promise<BlogIdeaAdmin> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${API_BASE}/api/blog/admin/ideas`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error(`Failed to submit blog idea: ${resp.status}`);
    return resp.json();
  },

  async fetchEmailPresets(): Promise<EmailPreset[]> {
    const resp = await fetch('/api/email/presets');
    if (!resp.ok) throw new Error(`Failed to fetch presets: ${resp.status}`);
    return resp.json();
  },

  async fetchEmailTemplateHtml(templateId: string): Promise<string> {
    const resp = await fetch(`/api/email/templates/${encodeURIComponent(templateId)}`);
    if (!resp.ok) throw new Error(`Failed to fetch template: ${resp.status}`);
    return resp.text();
  },

  async updateCustomerSubscription(
    userId: string,
    payload: { plan: string; status: string }
  ): Promise<{ user_id: string; plan: string; status: string; period_end: string; scans_reset: boolean }> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`/api/admin/customers/${encodeURIComponent(userId)}/subscription`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Update failed' }));
      throw new Error(err.error || `Failed to update subscription: ${resp.status}`);
    }
    return resp.json();
  },

  async sendComposerTestEmail(payload: { templateId: string; variables: Record<string, string>; to: string; subject: string; presetId?: string }): Promise<ComposerSendResult> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/email/send-test', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Send test failed' }));
      throw new Error(err.error || `Failed to send test: ${resp.status}`);
    }
    return resp.json();
  },
};
