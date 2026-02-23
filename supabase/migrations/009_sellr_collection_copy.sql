-- Add collection_ad_copy column to sellr_sessions for whole-collection FB posts
ALTER TABLE sellr_sessions
  ADD COLUMN IF NOT EXISTS collection_ad_copy text;
