-- ── Sellr Import Flag ────────────────────────────────────────────────
-- Migration: 011_sellr_import_flag.sql
-- Tracks whether a Sellr session's records have been imported into the
-- authenticated user's Rekkrd collection.

ALTER TABLE sellr_sessions
  ADD COLUMN IF NOT EXISTS imported_to_rekkrd boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz;
