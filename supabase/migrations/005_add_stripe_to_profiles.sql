-- Add Stripe subscription columns to profiles table
-- These provide quick-access subscription state on the user profile.
-- The subscriptions table (001) remains the full source of truth.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'collector',
  ADD COLUMN IF NOT EXISTS plan_period_end TIMESTAMPTZ;

-- Validate allowed values
ALTER TABLE profiles
  ADD CONSTRAINT profiles_subscription_status_check
    CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'inactive'));

ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_check
    CHECK (plan IN ('collector', 'curator', 'enthusiast'));

-- Index for Stripe webhook customer lookups on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
