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

export const adminService = {
  async getCustomers(): Promise<AdminCustomer[]> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin?action=customers', { headers });
    if (!resp.ok) throw new Error(`Failed to fetch customers: ${resp.status}`);
    return resp.json();
  },

  async getCollections(): Promise<{ albums: AdminAlbum[]; stats: AdminCollectionStats }> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin?action=collections', { headers });
    if (!resp.ok) throw new Error(`Failed to fetch collections: ${resp.status}`);
    return resp.json();
  },

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin?action=email-templates', { headers });
    if (!resp.ok) throw new Error(`Failed to fetch templates: ${resp.status}`);
    return resp.json();
  },

  async createEmailTemplate(template: { name: string; subject: string; html_body: string }): Promise<EmailTemplate> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin?action=email-templates', {
      method: 'POST',
      headers,
      body: JSON.stringify(template),
    });
    if (!resp.ok) throw new Error(`Failed to create template: ${resp.status}`);
    return resp.json();
  },

  async updateEmailTemplate(id: string, updates: { name?: string; subject?: string; html_body?: string }): Promise<EmailTemplate> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin?action=email-templates', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id, ...updates }),
    });
    if (!resp.ok) throw new Error(`Failed to update template: ${resp.status}`);
    return resp.json();
  },

  async deleteEmailTemplate(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin?action=email-templates', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ id }),
    });
    if (!resp.ok) throw new Error(`Failed to delete template: ${resp.status}`);
  },

  async sendTestEmail(payload: { to: string; subject: string; html: string }): Promise<SendEmailResult> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin?action=send-email', {
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
};
