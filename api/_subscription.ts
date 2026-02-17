import type { VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export type Plan = 'collector' | 'curator' | 'enthusiast';
export type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'past_due' | 'incomplete' | 'expired';

export interface SubscriptionInfo {
  plan: Plan;
  status: SubscriptionStatus;
  trialEnd: string | null;
  aiScansUsed: number;
  aiScansResetAt: string;
}

export const PLAN_LIMITS: Record<Plan, { scans: number; albums: number }> = {
  collector: { scans: 10, albums: 100 },
  curator: { scans: Infinity, albums: Infinity },
  enthusiast: { scans: Infinity, albums: Infinity },
};

const TIER_LEVELS: Record<Plan, number> = {
  collector: 0,
  curator: 1,
  enthusiast: 2,
};

let _admin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (_admin) return _admin;
  _admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return _admin;
}

/**
 * Fetches subscription info for a user.
 * Returns free-tier defaults if no subscription row exists.
 */
export async function getSubscription(userId: string): Promise<SubscriptionInfo> {
  if (userId === '__legacy__') {
    return {
      plan: 'collector',
      status: 'active',
      trialEnd: null,
      aiScansUsed: 0,
      aiScansResetAt: new Date().toISOString(),
    };
  }

  const supabase = getSupabaseAdmin();
  interface SubRow {
    plan: string;
    status: string;
    trial_end: string | null;
    ai_scans_used: number;
    ai_scans_reset_at: string;
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, trial_end, ai_scans_used, ai_scans_reset_at')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return {
      plan: 'collector',
      status: 'active',
      trialEnd: null,
      aiScansUsed: 0,
      aiScansResetAt: new Date().toISOString(),
    };
  }

  const row = data as SubRow;
  let effectivePlan = row.plan as Plan;
  let effectiveStatus = row.status as SubscriptionStatus;

  // Check if trial has expired
  if (effectiveStatus === 'trialing' && row.trial_end) {
    if (new Date(row.trial_end) < new Date()) {
      effectivePlan = 'collector';
      effectiveStatus = 'expired';
      // Update in DB (fire-and-forget)
      supabase
        .from('subscriptions')
        .update({ plan: 'collector', status: 'expired' })
        .eq('user_id', userId)
        .then(() => {});
    }
  }

  // Check if scan counter needs monthly reset
  let scansUsed = row.ai_scans_used as number;
  if (new Date(row.ai_scans_reset_at) <= new Date()) {
    scansUsed = 0;
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);
    supabase
      .from('subscriptions')
      .update({ ai_scans_used: 0, ai_scans_reset_at: nextReset.toISOString() })
      .eq('user_id', userId)
      .then(() => {});
  }

  return {
    plan: effectivePlan,
    status: effectiveStatus,
    trialEnd: row.trial_end,
    aiScansUsed: scansUsed,
    aiScansResetAt: row.ai_scans_reset_at,
  };
}

/**
 * Increments the AI scan counter for a user.
 */
export async function incrementScanCount(userId: string): Promise<void> {
  if (userId === '__legacy__') return;
  const supabase = getSupabaseAdmin();
  await supabase.rpc('increment_scan_count', { p_user_id: userId });
}

/**
 * Checks if a plan meets or exceeds the required tier.
 */
export function hasAccess(userPlan: Plan, requiredPlan: Plan): boolean {
  return TIER_LEVELS[userPlan] >= TIER_LEVELS[requiredPlan];
}

/**
 * Middleware: require a minimum plan tier.
 * Returns subscription info if authorized, null if denied (403 already sent).
 */
export async function requirePlan(
  userId: string,
  requiredPlan: Plan,
  res: VercelResponse
): Promise<SubscriptionInfo | null> {
  const sub = await getSubscription(userId);

  const isActivePlan = ['active', 'trialing'].includes(sub.status);

  if (!isActivePlan || !hasAccess(sub.plan, requiredPlan)) {
    res.status(403).json({
      error: 'Upgrade required',
      requiredPlan,
      currentPlan: sub.plan,
      status: sub.status,
    });
    return null;
  }

  return sub;
}
