-- CMS Content table for admin-managed page content
CREATE TABLE cms_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page TEXT NOT NULL,
  section TEXT NOT NULL,
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(page, section)
);

CREATE INDEX idx_cms_content_page ON cms_content(page);

ALTER TABLE cms_content ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can read page content (it's public marketing/legal content)
CREATE POLICY "Public can read cms_content"
  ON cms_content FOR SELECT
  USING (true);

-- Writes happen via service role key in the admin API (bypasses RLS)
