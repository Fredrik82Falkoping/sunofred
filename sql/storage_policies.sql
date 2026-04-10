-- ==========================================
-- STORAGE POLICIES FOR TRACKS BUCKET
-- ==========================================
-- Run this SQL in Supabase SQL Editor to allow public access to MP3 files

-- 1. Enable public access for reading files in the tracks bucket
CREATE POLICY "Public can read tracks files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tracks');

-- 2. Allow authenticated users to upload files (already working)
CREATE POLICY "Authenticated users can upload tracks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tracks');

-- 3. Allow authenticated users to update files
CREATE POLICY "Authenticated users can update tracks"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tracks')
WITH CHECK (bucket_id = 'tracks');

-- 4. Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete tracks"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tracks');

-- ==========================================
-- VERIFY BUCKET CONFIGURATION
-- ==========================================
-- Check if the tracks bucket exists and is configured correctly
SELECT 
    id, 
    name, 
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'tracks';

-- If the bucket doesn't exist, create it:
/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('tracks', 'tracks', false);
*/

-- ==========================================
-- TROUBLESHOOTING
-- ==========================================

-- List all existing policies on storage.objects
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- If you need to drop and recreate policies:
/*
DROP POLICY IF EXISTS "Public can read tracks files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload tracks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update tracks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete tracks" ON storage.objects;
*/
