-- ==========================================
-- TAG SYSTEM TABLES
-- ==========================================
-- Run this SQL in Supabase SQL Editor to create the tag system tables

-- 1. Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- 3. Create many-to-many relationship table
CREATE TABLE IF NOT EXISTS track_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(track_id, tag_id)
);

-- 4. Create indexes for faster joins
CREATE INDEX IF NOT EXISTS idx_track_tags_track_id ON track_tags(track_id);
CREATE INDEX IF NOT EXISTS idx_track_tags_tag_id ON track_tags(tag_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on tags table
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Enable RLS on track_tags table
ALTER TABLE track_tags ENABLE ROW LEVEL SECURITY;

-- Tags policies
CREATE POLICY "Anyone can read tags"
ON tags FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can insert tags"
ON tags FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tags"
ON tags FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tags"
ON tags FOR DELETE
TO authenticated
USING (true);

-- Track_tags policies
CREATE POLICY "Anyone can read track_tags"
ON track_tags FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can insert track_tags"
ON track_tags FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete track_tags"
ON track_tags FOR DELETE
TO authenticated
USING (true);

-- ==========================================
-- OPTIONAL: INSERT SOME STARTER TAGS
-- ==========================================
-- Uncomment to add some example tags

/*
INSERT INTO tags (name, color) VALUES
  ('energetic', '#EF4444'),
  ('calm', '#3B82F6'),
  ('happy', '#F59E0B'),
  ('sad', '#6B7280'),
  ('epic', '#8B5CF6'),
  ('romantic', '#EC4899'),
  ('instrumental', '#10B981'),
  ('vocal', '#14B8A6'),
  ('summer', '#F97316'),
  ('winter', '#06B6D4'),
  ('dance', '#A855F7'),
  ('chill', '#84CC16')
ON CONFLICT (name) DO NOTHING;
*/
