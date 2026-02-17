import { supabase } from './supabaseService';

export type Plan = 'collector' | 'curator' | 'enthusiast';
export type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'past_due' | 'incomplete' | 'expired';

export interface Subscription {
  plan: Plan;
  status: SubscriptionStatus;
  trial_start: string | null;
  trial_end: string | null;
  ai_scans_used: number;
  ai_scans_reset_at: string;
  stripe_customer_id: string | null;
  current_period_end: string | null;
}

function assertClient() {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  assertClient();

  try {
    const { data, error } = await supabase!
      .from('subscriptions')
      .select('plan, status, trial_start, trial_end, ai_scans_used, ai_scans_reset_at, stripe_customer_id, current_period_end')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found — user has no subscription
        return null;
      }
      throw error;
    }

    return data as Subscription;
  } catch (e) {
    console.error('Error fetching subscription:', e);
    return null;
  }
}
