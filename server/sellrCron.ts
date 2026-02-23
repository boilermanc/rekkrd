import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { sendAbandonedSessionEmail, sendRekkrdConversionEmail } from './sellrEmails.js';

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── Cron job history (in-memory, resets on server restart) ──────────

export interface JobRunResult {
  success: boolean;
  processed: number;
  error?: string;
}

export interface JobHistory {
  lastRun: string | null;
  lastResult: JobRunResult | null;
  runCount: number;
  errorCount: number;
}

const cronJobHistory = new Map<string, JobHistory>();

// Initialize all known jobs
for (const name of ['abandoned_sessions', 'expire_sessions', 'rekkrd_conversion']) {
  cronJobHistory.set(name, { lastRun: null, lastResult: null, runCount: 0, errorCount: 0 });
}

export function recordJobRun(jobName: string, result: JobRunResult): void {
  const existing = cronJobHistory.get(jobName) ?? { lastRun: null, lastResult: null, runCount: 0, errorCount: 0 };
  existing.lastRun = new Date().toISOString();
  existing.lastResult = result;
  existing.runCount += 1;
  if (!result.success) existing.errorCount += 1;
  cronJobHistory.set(jobName, existing);
}

export function getCronJobHistory(): Record<string, JobHistory> {
  const result: Record<string, JobHistory> = {};
  for (const [key, val] of cronJobHistory) {
    result[key] = { ...val };
  }
  return result;
}

// ── Job 1: Abandoned session emails (every hour) ────────────────────

async function runAbandonedSessionEmailsCounted(): Promise<number> {
  const supabase = getSupabaseAdmin();

  // Sessions created 20–28 hours ago that are still active with an email
  const now = new Date();
  const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();
  const twentyEightHoursAgo = new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString();

  const { data: sessions, error } = await supabase
    .from('sellr_sessions')
    .select('id, email, record_count')
    .eq('status', 'active')
    .not('email', 'is', null)
    .lte('created_at', twentyHoursAgo)
    .gte('created_at', twentyEightHoursAgo);

  if (error) {
    throw new Error(`Failed to fetch abandoned sessions: ${error.message}`);
  }

  if (!sessions || sessions.length === 0) return 0;

  // Filter out sessions that already received an abandoned_session email
  const sessionIds = sessions.map(s => s.id);
  const { data: existingLogs } = await supabase
    .from('sellr_email_log')
    .select('session_id')
    .eq('email_type', 'abandoned_session')
    .in('session_id', sessionIds);

  const alreadySent = new Set((existingLogs ?? []).map(l => l.session_id));
  const eligible = sessions.filter(s => !alreadySent.has(s.id));

  if (eligible.length === 0) return 0;

  console.log(`[sellr-cron] Sending abandoned session emails to ${eligible.length} session(s)`);

  for (const session of eligible) {
    // Compute total_median from records
    const { data: records } = await supabase
      .from('sellr_records')
      .select('price_median')
      .eq('session_id', session.id);

    const total_median = (records ?? []).reduce(
      (sum, r) => sum + (Number(r.price_median) || 0),
      0,
    );

    sendAbandonedSessionEmail({
      email: session.email,
      session_id: session.id,
      record_count: session.record_count ?? 0,
      total_median,
    }).catch(err => console.error('[sellr-cron] Abandoned email failed:', err));
  }

  return eligible.length;
}

// ── Job 2: Expire old sessions (daily at 2am) ──────────────────────

async function runExpireSessionsCounted(): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('sellr_sessions')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    throw new Error(`Failed to expire sessions: ${error.message}`);
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.log(`[sellr-cron] Expired ${count} session(s)`);
  }

  return count;
}

// ── Job 3: Rekkrd conversion emails (every hour) ───────────────────

async function runRekkrdConversionEmailsCounted(): Promise<number> {
  const supabase = getSupabaseAdmin();

  // Orders completed 47–49 hours ago
  const now = new Date();
  const fortySevenHoursAgo = new Date(now.getTime() - 47 * 60 * 60 * 1000).toISOString();
  const fortyNineHoursAgo = new Date(now.getTime() - 49 * 60 * 60 * 1000).toISOString();

  const { data: orders, error } = await supabase
    .from('sellr_orders')
    .select('id, email, session_id, report_token')
    .eq('status', 'complete')
    .lte('created_at', fortySevenHoursAgo)
    .gte('created_at', fortyNineHoursAgo);

  if (error) {
    throw new Error(`Failed to fetch orders for conversion: ${error.message}`);
  }

  if (!orders || orders.length === 0) return 0;

  // Filter out orders whose session already received a rekkrd_conversion email
  const sessionIds = orders.map(o => o.session_id).filter(Boolean);
  const { data: existingLogs } = await supabase
    .from('sellr_email_log')
    .select('session_id')
    .eq('email_type', 'rekkrd_conversion')
    .in('session_id', sessionIds);

  const alreadySent = new Set((existingLogs ?? []).map(l => l.session_id));
  const eligible = orders.filter(o => o.session_id && !alreadySent.has(o.session_id));

  if (eligible.length === 0) return 0;

  console.log(`[sellr-cron] Sending Rekkrd conversion emails to ${eligible.length} order(s)`);

  for (const order of eligible) {
    // Fetch session for record_count
    const { data: session } = await supabase
      .from('sellr_sessions')
      .select('record_count')
      .eq('id', order.session_id)
      .single();

    sendRekkrdConversionEmail({
      email: order.email,
      session_id: order.session_id,
      record_count: session?.record_count ?? 0,
      report_token: order.report_token,
    }).catch(err => console.error('[sellr-cron] Conversion email failed:', err));
  }

  return eligible.length;
}

// ── Exported entry point ────────────────────────────────────────────

// ── Wrapped runners that track history ──────────────────────────────

export async function runAbandonedSessionEmailsTracked(): Promise<void> {
  try {
    const count = await runAbandonedSessionEmailsCounted();
    recordJobRun('abandoned_sessions', { success: true, processed: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    recordJobRun('abandoned_sessions', { success: false, processed: 0, error: message });
    throw err;
  }
}

export async function runExpireSessionsTracked(): Promise<void> {
  try {
    const count = await runExpireSessionsCounted();
    recordJobRun('expire_sessions', { success: true, processed: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    recordJobRun('expire_sessions', { success: false, processed: 0, error: message });
    throw err;
  }
}

export async function runRekkrdConversionEmailsTracked(): Promise<void> {
  try {
    const count = await runRekkrdConversionEmailsCounted();
    recordJobRun('rekkrd_conversion', { success: true, processed: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    recordJobRun('rekkrd_conversion', { success: false, processed: 0, error: message });
    throw err;
  }
}

export function startSellrCron(): void {
  // Every hour at minute 0
  cron.schedule('0 * * * *', () => {
    console.log('[sellr-cron] Running abandoned session emails job');
    runAbandonedSessionEmailsTracked().catch(err =>
      console.error('[sellr-cron] Abandoned session job error:', err),
    );
  });

  // Daily at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    console.log('[sellr-cron] Running expire sessions job');
    runExpireSessionsTracked().catch(err =>
      console.error('[sellr-cron] Expire sessions job error:', err),
    );
  });

  // Every hour at minute 5 (offset from abandoned to spread load)
  cron.schedule('5 * * * *', () => {
    console.log('[sellr-cron] Running Rekkrd conversion emails job');
    runRekkrdConversionEmailsTracked().catch(err =>
      console.error('[sellr-cron] Conversion emails job error:', err),
    );
  });

  console.log('[sellr-cron] Sellr cron jobs started');
}
