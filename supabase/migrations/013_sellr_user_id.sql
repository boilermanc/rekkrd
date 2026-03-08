-- ── Sellr: add user_id to sessions ──────────────────────────────────
-- Migration: 013_sellr_user_id.sql
-- Links sessions to authenticated Supabase users so the dashboard
-- can query sessions by user.

ALTER TABLE sellr_sessions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_sellr_sessions_user_id
  ON sellr_sessions(user_id);

-- Allow service_role (used by the Express API) to query by user_id.
-- Existing anon policies remain unchanged.
