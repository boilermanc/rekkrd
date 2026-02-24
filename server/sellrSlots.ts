import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Map tier to slot count
export const TIER_SLOTS: Record<string, number> = {
  starter: 25,
  standard: 100,
  full: 500,
};

// Get current slot status for a user
export async function getSlotStatus(userId: string): Promise<{
  slots_purchased: number;
  slots_used: number;
  slots_remaining: number;
  last_tier: string | null;
}> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('sellr_accounts')
    .select('slots_purchased, slots_used, last_tier')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { slots_purchased: 0, slots_used: 0, slots_remaining: 0, last_tier: null };
  }

  return {
    ...data,
    slots_remaining: Math.max(0, data.slots_purchased - data.slots_used),
  };
}

// Increment slots_used by count (default 1)
// Returns false if would exceed slots_purchased
export async function consumeSlots(
  userId: string,
  count: number = 1,
): Promise<boolean> {
  const status = await getSlotStatus(userId);
  if (status.slots_remaining < count) return false;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('sellr_accounts')
    .update({
      slots_used: status.slots_used + count,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return !error;
}

// Release a slot when a record is deleted (floor at 0)
export async function releaseSlot(userId: string): Promise<boolean> {
  const status = await getSlotStatus(userId);
  if (status.slots_used <= 0) return true;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('sellr_accounts')
    .update({
      slots_used: Math.max(0, status.slots_used - 1),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return !error;
}

// Add slots after payment — upserts (inserts if no row exists)
export async function purchaseSlots(
  userId: string,
  slotsToAdd: number,
  tier: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const status = await getSlotStatus(userId);

  if (status.slots_purchased === 0 && status.last_tier === null) {
    // No existing row — insert
    const { error } = await supabase
      .from('sellr_accounts')
      .insert({
        user_id: userId,
        slots_purchased: slotsToAdd,
        slots_used: 0,
        last_tier: tier,
      });
    return !error;
  }

  // Existing row — increment slots_purchased
  const { error } = await supabase
    .from('sellr_accounts')
    .update({
      slots_purchased: status.slots_purchased + slotsToAdd,
      last_tier: tier,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return !error;
}
