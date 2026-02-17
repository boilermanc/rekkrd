-- Subscription system for Rekkrd
-- Run this in the Supabase SQL Editor

-- Plan and status enums
CREATE TYPE subscription_plan AS ENUM ('collector', 'curator', 'enthusiast');
CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'canceled', 'past_due', 'incomplete', 'expired'
);

-- Subscriptions table (one row per user)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan subscription_plan NOT NULL DEFAULT 'collector',
  status subscription_status NOT NULL DEFAULT 'trialing',
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  ai_scans_used INTEGER NOT NULL DEFAULT 0,
  ai_scans_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id)
);

-- Indexes for Stripe webhook lookups
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);

-- Row Level Security: users can read their own subscription, all writes via service role
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Auto-create 14-day Curator trial when a profile is created (new user signup)
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status, trial_start, trial_end)
  VALUES (NEW.id, 'curator', 'trialing', now(), now() + interval '14 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_create_trial
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_trial_subscription();

-- Atomic scan counter increment (called via supabase.rpc)
CREATE OR REPLACE FUNCTION increment_scan_count(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET ai_scans_used = ai_scans_used + 1
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: create subscription rows for existing users who don't have one
-- (existing users get Collector/free since their trial window has passed)
INSERT INTO subscriptions (user_id, plan, status)
SELECT p.id, 'collector', 'active'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.user_id = p.id
);
