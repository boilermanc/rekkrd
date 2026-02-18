-- Gear catalog for Stakkd (signal-chain equipment tracking)
-- Run this in the Supabase SQL Editor

-- Gear table (one row per piece of equipment)
CREATE TABLE gear (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year TEXT,
  description TEXT,
  specs JSONB DEFAULT '{}',
  manual_url TEXT,
  image_url TEXT,
  original_photo_url TEXT,
  purchase_price NUMERIC,
  purchase_date TEXT,
  notes TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT gear_category_check CHECK (
    category IN (
      'turntable',
      'cartridge',
      'phono_preamp',
      'preamp',
      'amplifier',
      'receiver',
      'speakers',
      'headphones',
      'dac',
      'subwoofer',
      'cables_other'
    )
  )
);

-- Index for filtering by user
CREATE INDEX idx_gear_user_id ON gear(user_id);

-- Row Level Security: users can only access their own gear
ALTER TABLE gear ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own gear"
  ON gear FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gear"
  ON gear FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gear"
  ON gear FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gear"
  ON gear FOR DELETE
  USING (auth.uid() = user_id);
