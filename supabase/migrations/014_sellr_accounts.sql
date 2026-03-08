-- ── Sellr Accounts (slot tracking) ──────────────────────────────────
-- Migration: 014_sellr_accounts.sql
-- Tracks purchased and used scan slots per user for Sellr.

CREATE TABLE IF NOT EXISTS sellr_accounts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL UNIQUE REFERENCES auth.users(id),
  slots_purchased  int         NOT NULL DEFAULT 0,
  slots_used       int         NOT NULL DEFAULT 0,
  last_tier        text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sellr_accounts ENABLE ROW LEVEL SECURITY;

-- Only service_role accesses this table (Express API with service role key).
-- No anon policies needed — service role bypasses RLS by default.

CREATE INDEX IF NOT EXISTS idx_sellr_accounts_user_id
  ON sellr_accounts(user_id);
