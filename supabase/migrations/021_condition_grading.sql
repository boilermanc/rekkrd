-- Add condition grading and My Copy fields to albums table
-- Part of Batch 37-41: Condition Grading feature

-- Add condition grade column (short format: M, NM, VG+, VG, G+, G, F, P)
ALTER TABLE albums
ADD COLUMN IF NOT EXISTS condition TEXT;

-- Add My Copy fields
ALTER TABLE albums
ADD COLUMN IF NOT EXISTS label TEXT,
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS acquired_date DATE,
ADD COLUMN IF NOT EXISTS acquired_from TEXT,
ADD COLUMN IF NOT EXISTS copy_notes TEXT,
ADD COLUMN IF NOT EXISTS pressing_country TEXT,
ADD COLUMN IF NOT EXISTS pressing_year INTEGER,
ADD COLUMN IF NOT EXISTS catalog_number TEXT,
ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN DEFAULT false;

-- Add Discogs price cache table with 24hr TTL
CREATE TABLE IF NOT EXISTS discogs_price_cache (
  release_id TEXT PRIMARY KEY,
  price_data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on fetched_at for TTL queries
CREATE INDEX IF NOT EXISTS idx_discogs_price_cache_fetched_at
ON discogs_price_cache(fetched_at);

-- Add check constraint for condition grade values
ALTER TABLE albums
DROP CONSTRAINT IF EXISTS albums_condition_check;

ALTER TABLE albums
ADD CONSTRAINT albums_condition_check
CHECK (condition IS NULL OR condition IN ('M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'));

-- Migration for existing data: convert legacy condition values to new short format
-- This handles albums that may have old condition values like 'Mint', 'Near Mint', etc.
UPDATE albums
SET condition = CASE
  WHEN condition = 'Mint' THEN 'M'
  WHEN condition = 'Near Mint' THEN 'NM'
  WHEN condition = 'Very Good Plus' THEN 'VG+'
  WHEN condition = 'Very Good' THEN 'VG'
  WHEN condition = 'Good Plus' THEN 'G+'
  WHEN condition = 'Good' THEN 'G'
  WHEN condition = 'Fair' THEN 'F'
  WHEN condition = 'Poor' THEN 'P'
  ELSE condition
END
WHERE condition IS NOT NULL
  AND condition NOT IN ('M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P');
