-- ==========================================
-- FIX: Gör tracks bucket public
-- ==========================================

-- Alternativ 1: Gör bucketen public (REKOMMENDERAT)
UPDATE storage.buckets 
SET public = true 
WHERE name = 'tracks';

-- Verifiera att det fungerade
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE name = 'tracks';

-- ==========================================
-- Efter detta kommer URL:en att fungera:
-- https://[project].supabase.co/storage/v1/object/public/tracks/[filename]
-- ==========================================
