-- Add image field to categories table
-- Run this in Supabase SQL Editor

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add body/description field if it doesn't exist
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS body TEXT;

-- ==========================================
-- ENABLE RLS AND CREATE POLICIES FOR CATEGORIES TABLE
-- ==========================================

-- Enable RLS on categories if not already enabled
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can read categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON categories;

-- Create policies for categories table
CREATE POLICY "Anyone can read categories"
ON categories FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can insert categories"
ON categories FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
ON categories FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
ON categories FOR DELETE
TO authenticated
USING (true);

-- ==========================================
-- STORAGE BUCKET AND POLICIES
-- ==========================================

-- Create storage bucket for category images
-- Note: You need to create the bucket 'category-images' in Supabase Storage UI first
-- Then run the policies below

-- Storage policies for category-images bucket
-- Enable public read access
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload category images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'category-images');

-- Allow authenticated users to update images
CREATE POLICY "Authenticated users can update category images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'category-images');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete category images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'category-images');

-- Allow public read access to images
CREATE POLICY "Anyone can view category images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'category-images');
