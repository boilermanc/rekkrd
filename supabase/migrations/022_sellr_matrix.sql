-- Add matrix/runout text column to sellr_records
ALTER TABLE sellr_records ADD COLUMN IF NOT EXISTS matrix text;
