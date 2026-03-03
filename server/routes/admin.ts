import { Router, type Request, type Response } from 'express';
import { Resend } from 'resend';
import { requireAdmin, type AdminAuthResult } from '../middleware/adminAuth.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

const router = Router();

// ── Customers ──────────────────────────────────────────────────────
async function handleCustomers(_req: Request, res: Response) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase admin not configured');

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) throw profilesError;

  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) throw usersError;

  const userMap = new Map(users.map(u => [u.id, u] as const));

  const { data: albumCounts } = await supabase
    .from('albums')
    .select('user_id');

  const albumCountMap = new Map<string, number>();
  for (const row of (albumCounts || []) as Array<{ user_id: string }>) {
    albumCountMap.set(row.user_id, (albumCountMap.get(row.user_id) || 0) + 1);
  }

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
      banned_until: (authUser as Record<string, unknown> | undefined)?.banned_until as string | null ?? null,
      album_count: albumCountMap.get(p.id) || 0,
      subscription_plan: sub?.plan || null,
      subscription_status: sub?.status || null,
    };
  });

  res.status(200).json(customers);
}

// ── Collections ────────────────────────────────────────────────────
async function handleCollections(_req: Request, res: Response) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase admin not configured');

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

  res.status(200).json({
    albums: allAlbums,
    stats: { totalAlbums: allAlbums.length, totalValue, genreBreakdown, decadeBreakdown },
  });
}

// ── Email Templates ────────────────────────────────────────────────
async function handleEmailTemplates(req: Request, res: Response) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase admin not configured');

  switch (req.method) {
    case 'GET': {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      res.status(200).json(data || []);
      return;
    }

    case 'POST': {
      const { name, subject, html_body } = req.body;
      if (!name || !subject || !html_body) {
        res.status(400).json({ error: 'name, subject, and html_body are required' });
        return;
      }
      const { data, error } = await supabase
        .from('email_templates')
        .insert([{ name, subject, html_body }])
        .select()
        .single();
      if (error) throw error;
      res.status(201).json(data);
      return;
    }

    case 'PUT': {
      const { id, ...updates } = req.body;
      if (!id) { res.status(400).json({ error: 'id is required' }); return; }
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
      res.status(200).json(data);
      return;
    }

    case 'DELETE': {
      const { id } = req.body;
      if (!id) { res.status(400).json({ error: 'id is required' }); return; }
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      res.status(204).end();
      return;
    }

    default:
      res.status(405).json({ error: 'Method not allowed' });
  }
}

// ── Send Email ─────────────────────────────────────────────────────
async function handleSendEmail(req: Request, res: Response) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    return;
  }

  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    res.status(400).json({ error: 'to, subject, and html are required' });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  try {
    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from: 'Rekkrd <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (result.error) {
      console.error('[admin] Resend API error:', result.error);
      res.status(400).json({ error: 'Failed to send email' });
      return;
    }

    res.status(200).json({
      id: result.data?.id,
      from: 'Rekkrd <onboarding@resend.dev>',
      to: [to],
      subject,
      created_at: new Date().toISOString(),
      status: 'sent',
    });
  } catch (err) {
    console.error('[admin] Failed to send email:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
}

// ── CMS Content ───────────────────────────────────────────────────
const VALID_CMS_PAGES = ['landing', 'privacy', 'terms'];

async function handleCmsContent(req: Request, res: Response) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase admin not configured');

  switch (req.method) {
    case 'GET': {
      const page = req.query.page as string;
      if (!page) { res.status(400).json({ error: 'page query param required' }); return; }
      if (!VALID_CMS_PAGES.includes(page)) {
        res.status(400).json({ error: 'Invalid page' });
        return;
      }

      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .eq('page', page)
        .order('section');
      if (error) throw error;
      res.status(200).json(data || []);
      return;
    }

    case 'PUT': {
      const { page, section, content } = req.body;
      if (!page || !section || content === undefined) {
        res.status(400).json({ error: 'page, section, and content are required' });
        return;
      }
      if (!VALID_CMS_PAGES.includes(page)) {
        res.status(400).json({ error: 'Invalid page' });
        return;
      }

      const { data, error } = await supabase
        .from('cms_content')
        .upsert(
          { page, section, content, updated_at: new Date().toISOString() },
          { onConflict: 'page,section' }
        )
        .select()
        .single();
      if (error) throw error;
      res.status(200).json(data);
      return;
    }

    default:
      res.status(405).json({ error: 'Method not allowed' });
  }
}

// ── UTM Stats ─────────────────────────────────────────────────────
interface ProfileUtmRow {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  onboarding_selected_tier: string | null;
  created_at: string;
}

function groupBy(rows: ProfileUtmRow[], key: keyof ProfileUtmRow): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const val = row[key] as string | null;
    if (val) {
      counts[val] = (counts[val] || 0) + 1;
    }
  }
  return counts;
}

async function handleUtmStats(_req: Request, res: Response) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase admin not configured');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('utm_source, utm_medium, utm_campaign, onboarding_selected_tier, created_at')
    .not('utm_source', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (profiles || []) as ProfileUtmRow[];

  const total_signups = rows.length;
  const by_source = groupBy(rows, 'utm_source');
  const by_medium = groupBy(rows, 'utm_medium');
  const by_campaign = groupBy(rows, 'utm_campaign');
  const by_tier = groupBy(rows, 'onboarding_selected_tier');

  const recent_signups = rows.slice(0, 10).map(r => ({
    created_at: r.created_at,
    utm_source: r.utm_source,
    utm_medium: r.utm_medium,
    utm_campaign: r.utm_campaign,
    onboarding_selected_tier: r.onboarding_selected_tier,
  }));

  // Daily signup counts for last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyCounts: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    dailyCounts[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of rows) {
    const date = row.created_at.slice(0, 10);
    if (date in dailyCounts) {
      dailyCounts[date]++;
    }
  }
  const by_date = Object.entries(dailyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  res.status(200).json({
    total_signups,
    by_source,
    by_medium,
    by_campaign,
    by_tier,
    recent_signups,
    by_date,
  });
}

// ── Update Subscription (admin override) ──────────────────────────
const VALID_PLANS = ['collector', 'curator', 'enthusiast'] as const;
const VALID_STATUSES = ['trialing', 'active', 'canceled', 'past_due', 'incomplete', 'expired'] as const;

async function handleUpdateSubscription(req: Request, res: Response) {
  const userId = req.params.id;
  const { plan, status } = req.body;

  if (!plan || !(VALID_PLANS as readonly string[]).includes(plan)) {
    res.status(400).json({ error: `Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}` });
    return;
  }
  if (!status || !(VALID_STATUSES as readonly string[]).includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const now = new Date();
    const isActivating = ['active', 'trialing'].includes(status);
    const periodEnd = isActivating
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
      : now.toISOString();

    const nextReset = new Date(now);
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);

    // Map status for profiles table (uses 'inactive' instead of 'expired'/'incomplete')
    const profileStatus = ['expired', 'incomplete'].includes(status) ? 'inactive' : status;

    const { error: subError } = await supabase
      .from('subscriptions')
      .update({
        plan,
        status,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd,
        ai_scans_used: 0,
        ai_scans_reset_at: nextReset.toISOString(),
      })
      .eq('user_id', userId);

    if (subError) {
      console.error('[admin] Subscription update failed:', subError);
      res.status(500).json({ error: 'Failed to update subscription' });
      return;
    }

    const { error: profError } = await supabase
      .from('profiles')
      .update({
        plan,
        subscription_status: profileStatus,
        plan_period_end: periodEnd,
      })
      .eq('id', userId);

    if (profError) {
      console.error('[admin] Profile update failed:', profError);
      res.status(500).json({ error: 'Failed to update profile' });
      return;
    }

    res.status(200).json({ user_id: userId, plan, status, period_end: periodEnd, scans_reset: true });
  } catch (err) {
    console.error('[admin] Subscription override error:', err);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
}

// ── User Deactivation ─────────────────────────────────────────────
function getAdminAuth(req: Request): AdminAuthResult {
  return (req as Request & { adminAuth: AdminAuthResult }).adminAuth;
}

async function handleDeactivateUser(req: Request, res: Response) {
  const userId = req.params.id as string;
  const adminAuth = getAdminAuth(req);

  if (adminAuth.userId === userId) {
    res.status(400).json({ error: 'Cannot deactivate your own account' });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase admin not configured');

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (!targetProfile) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (targetProfile.role === 'admin') {
    res.status(403).json({ error: 'Cannot deactivate admin users' });
    return;
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: '876000h',
  });

  if (error) {
    console.error('[admin] Failed to deactivate user:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
    return;
  }

  console.log(`[admin] User ${userId} deactivated by admin ${adminAuth.userId}`);
  res.status(200).json({ user_id: userId, status: 'deactivated' });
}

async function handleReactivateUser(req: Request, res: Response) {
  const userId = req.params.id as string;
  const adminAuth = getAdminAuth(req);
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase admin not configured');

  const { data: { user }, error: fetchError } = await supabase.auth.admin.getUserById(userId);
  if (fetchError || !user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  });

  if (error) {
    console.error('[admin] Failed to reactivate user:', error);
    res.status(500).json({ error: 'Failed to reactivate user' });
    return;
  }

  console.log(`[admin] User ${userId} reactivated by admin ${adminAuth.userId}`);
  res.status(200).json({ user_id: userId, status: 'active' });
}

// ── User Data Wipe ────────────────────────────────────────────────
function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

function collectStoragePaths(urls: (string | null | undefined)[], bucket: string): string[] {
  const paths: string[] = [];
  for (const url of urls) {
    if (!url) continue;
    const path = extractStoragePath(url, bucket);
    if (path) paths.push(path);
  }
  return paths;
}

async function handleWipeUser(req: Request, res: Response) {
  const userId = req.params.id as string;
  const adminAuth = getAdminAuth(req);

  if (adminAuth.userId === userId) {
    res.status(400).json({ error: 'Cannot wipe your own account' });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase admin not configured');

  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError || !user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (targetProfile?.role === 'admin') {
    res.status(403).json({ error: 'Cannot wipe admin users' });
    return;
  }

  const summary = {
    user_id: userId,
    email: user.email || 'unknown',
    storage_files_deleted: 0,
    storage_errors: [] as string[],
    albums_deleted: 0,
    gear_deleted: 0,
    wantlist_deleted: 0,
    auth_user_deleted: false,
  };

  try {
    // Step 1: Gather storage URLs BEFORE deleting DB rows
    const { data: albums } = await supabase
      .from('albums')
      .select('id, original_photo_url, cover_url')
      .eq('user_id', userId);

    const albumPhotoPaths = collectStoragePaths(
      (albums || []).flatMap((a: Record<string, unknown>) => [a.original_photo_url as string, a.cover_url as string]),
      'album-photos'
    );

    const { data: gear } = await supabase
      .from('gear')
      .select('id, image_url, original_photo_url, manual_pdf_url')
      .eq('user_id', userId);

    const gearPhotoPaths = collectStoragePaths(
      (gear || []).flatMap((g: Record<string, unknown>) => [g.image_url as string, g.original_photo_url as string]),
      'gear-photos'
    );
    const gearManualPaths = collectStoragePaths(
      (gear || []).map((g: Record<string, unknown>) => g.manual_pdf_url as string),
      'gear-manuals'
    );

    summary.albums_deleted = (albums || []).length;
    summary.gear_deleted = (gear || []).length;

    // Step 2: Delete storage files
    const deleteFromBucket = async (bucket: string, paths: string[]) => {
      if (paths.length === 0) return;
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) {
        console.error(`[admin] Storage delete error (${bucket}):`, error.message);
        summary.storage_errors.push(`${bucket}: ${error.message}`);
      } else {
        summary.storage_files_deleted += paths.length;
      }
    };

    await deleteFromBucket('album-photos', albumPhotoPaths);
    await deleteFromBucket('gear-photos', gearPhotoPaths);
    await deleteFromBucket('gear-manuals', gearManualPaths);

    // Step 3: Delete database rows
    const { data: deletedWantlist } = await supabase
      .from('wantlist')
      .delete()
      .eq('user_id', userId)
      .select('id');
    summary.wantlist_deleted = (deletedWantlist || []).length;

    await supabase.from('albums').delete().eq('user_id', userId);
    await supabase.from('gear').delete().eq('user_id', userId);
    await supabase.from('subscriptions').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);

    // Step 4: Delete auth user
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error('[admin] Failed to delete auth user:', deleteAuthError.message);
    } else {
      summary.auth_user_deleted = true;
    }

    console.log(`[admin] User ${userId} (${summary.email}) wiped by admin ${adminAuth.userId}:`, JSON.stringify(summary));
    res.status(200).json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[admin] Wipe user error:', message, err);
    res.status(500).json({ error: message, partial_summary: summary });
  }
}

// ── Admin sub-routes ───────────────────────────────────────────────
// All admin routes require admin auth
router.get('/api/admin/customers', requireAdmin, async (req, res, next) => {
  try { await handleCustomers(req, res); } catch (err) { next(err); }
});

router.get('/api/admin/collections', requireAdmin, async (req, res, next) => {
  try { await handleCollections(req, res); } catch (err) { next(err); }
});

router.route('/api/admin/email-templates')
  .all(requireAdmin)
  .get(async (req, res, next) => {
    try { await handleEmailTemplates(req, res); } catch (err) { next(err); }
  })
  .post(async (req, res, next) => {
    try { await handleEmailTemplates(req, res); } catch (err) { next(err); }
  })
  .put(async (req, res, next) => {
    try { await handleEmailTemplates(req, res); } catch (err) { next(err); }
  })
  .delete(async (req, res, next) => {
    try { await handleEmailTemplates(req, res); } catch (err) { next(err); }
  });

router.post('/api/admin/send-email', requireAdmin, async (req, res, next) => {
  try { await handleSendEmail(req, res); } catch (err) { next(err); }
});

router.route('/api/admin/cms-content')
  .all(requireAdmin)
  .get(async (req, res, next) => {
    try { await handleCmsContent(req, res); } catch (err) { next(err); }
  })
  .put(async (req, res, next) => {
    try { await handleCmsContent(req, res); } catch (err) { next(err); }
  });

router.get('/api/admin/utm-stats', requireAdmin, async (req, res, next) => {
  try { await handleUtmStats(req, res); } catch (err) { next(err); }
});

router.put('/api/admin/customers/:id/subscription', requireAdmin, async (req, res, next) => {
  try { await handleUpdateSubscription(req, res); } catch (err) { next(err); }
});

router.post('/api/admin/customers/:id/deactivate', requireAdmin, async (req, res, next) => {
  try { await handleDeactivateUser(req, res); } catch (err) { next(err); }
});

router.post('/api/admin/customers/:id/reactivate', requireAdmin, async (req, res, next) => {
  try { await handleReactivateUser(req, res); } catch (err) { next(err); }
});

router.delete('/api/admin/customers/:id', requireAdmin, async (req, res, next) => {
  try { await handleWipeUser(req, res); } catch (err) { next(err); }
});

export default router;
