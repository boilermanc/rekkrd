import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { cors } from './_cors';
import { requireAdmin } from './_adminAuth';

export const config = { maxDuration: 15 };

let _admin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (_admin) return _admin;
  _admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _admin;
}

// ── Customers ──────────────────────────────────────────────────────
async function handleCustomers(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getSupabaseAdmin();

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) throw profilesError;

  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) throw usersError;

  const userMap = new Map(users.map(u => [u.id, u] as const));

  const { count: totalAlbums } = await supabase
    .from('albums')
    .select('*', { count: 'exact', head: true });

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('user_id, plan, status');

  interface SubRow { user_id: string; plan: string; status: string }
  const subMap = new Map<string, SubRow>(
    ((subscriptions || []) as SubRow[]).map(s => [s.user_id, s])
  );

  interface ProfileRow {
    id: string;
    display_name: string | null;
    favorite_genres: string[] | null;
    listening_setup: string | null;
    collecting_goal: string | null;
    onboarding_completed: boolean;
    role: string;
    created_at: string;
    updated_at: string;
  }

  const customers = ((profiles || []) as unknown as ProfileRow[]).map(p => {
    const authUser = userMap.get(p.id);
    const sub = subMap.get(p.id);
    return {
      id: p.id,
      email: authUser?.email || 'unknown',
      display_name: p.display_name,
      favorite_genres: p.favorite_genres,
      listening_setup: p.listening_setup,
      collecting_goal: p.collecting_goal,
      onboarding_completed: p.onboarding_completed,
      role: p.role || 'user',
      created_at: p.created_at,
      updated_at: p.updated_at,
      last_sign_in_at: authUser?.last_sign_in_at || null,
      album_count: totalAlbums || 0,
      subscription_plan: sub?.plan || null,
      subscription_status: sub?.status || null,
    };
  });

  return res.status(200).json(customers);
}

// ── Collections ────────────────────────────────────────────────────
async function handleCollections(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getSupabaseAdmin();

  const { data: albums, error } = await supabase
    .from('albums')
    .select('id, artist, title, year, genre, cover_url, condition, price_median, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const allAlbums = albums || [];
  const genreBreakdown: Record<string, number> = {};
  const decadeBreakdown: Record<string, number> = {};
  let totalValue = 0;

  allAlbums.forEach((a: Record<string, unknown>) => {
    const genre = (a.genre as string) || 'Unknown';
    genreBreakdown[genre] = (genreBreakdown[genre] || 0) + 1;

    const year = parseInt((a.year as string) || '0');
    if (year > 0) {
      const decade = Math.floor(year / 10) * 10 + 's';
      decadeBreakdown[decade] = (decadeBreakdown[decade] || 0) + 1;
    }

    totalValue += (a.price_median as number) || 0;
  });

  return res.status(200).json({
    albums: allAlbums,
    stats: { totalAlbums: allAlbums.length, totalValue, genreBreakdown, decadeBreakdown },
  });
}

// ── Email Templates ────────────────────────────────────────────────
async function handleEmailTemplates(req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabaseAdmin();

  switch (req.method) {
    case 'GET': {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    case 'POST': {
      const { name, subject, html_body } = req.body;
      if (!name || !subject || !html_body) {
        return res.status(400).json({ error: 'name, subject, and html_body are required' });
      }
      const { data, error } = await supabase
        .from('email_templates')
        .insert([{ name, subject, html_body }])
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    case 'PUT': {
      const { id, ...updates } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const allowedFields = ['name', 'subject', 'html_body'];
      const safeUpdates: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (key in updates) safeUpdates[key] = updates[key];
      }
      const { data, error } = await supabase
        .from('email_templates')
        .update(safeUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    case 'DELETE': {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.status(204).end();
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// ── Send Email ─────────────────────────────────────────────────────
async function handleSendEmail(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'to, subject, and html are required' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const resend = new Resend(resendKey);
  const result = await resend.emails.send({
    from: 'Rekkrd <onboarding@resend.dev>',
    to: [to],
    subject,
    html,
  });

  if (result.error) {
    return res.status(400).json({ error: result.error.message, details: result.error });
  }

  return res.status(200).json({
    id: result.data?.id,
    from: 'Rekkrd <onboarding@resend.dev>',
    to: [to],
    subject,
    created_at: new Date().toISOString(),
    status: 'sent',
  });
}

// ── Router ─────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res, 'GET, POST, PUT, DELETE')) return;

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const action = req.query.action as string;

  try {
    switch (action) {
      case 'customers':
        return await handleCustomers(req, res);
      case 'collections':
        return await handleCollections(req, res);
      case 'email-templates':
        return await handleEmailTemplates(req, res);
      case 'send-email':
        return await handleSendEmail(req, res);
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`Admin ${action} error:`, err);
    return res.status(500).json({ error: `Admin ${action} operation failed` });
  }
}
