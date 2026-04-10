-- ==========================================
-- DEVELOPMENT MODE: Less Secure Policies
-- ==========================================
-- WARNING: Use this ONLY for development/testing
-- For production, use authenticated user policies instead

-- ==========================================
-- OPTION 1: Keep Authentication (Recommended)
-- ==========================================
-- Just make sure you're logged in at /login.html first
-- The edit-categories.html page will redirect you if not logged in

-- ==========================================
-- OPTION 2: Allow Public Updates (DEV ONLY)
-- ==========================================
-- Uncomment the sections below to allow anyone to edit categories
-- without authentication (NOT RECOMMENDED for production)

/*
-- Drop existing restrictive policies on categories table
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON categories;

-- Create permissive policies for development
CREATE POLICY "Anyone can insert categories (DEV)"
ON categories FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update categories (DEV)"
ON categories FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete categories (DEV)"
ON categories FOR DELETE
TO public
USING (true);

-- Drop existing restrictive policies on storage.objects for category-images
DROP POLICY IF EXISTS "Authenticated users can upload category images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update category images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete category images" ON storage.objects;

-- Create permissive policies for storage
CREATE POLICY "Anyone can upload category images (DEV)"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "Anyone can update category images (DEV)"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'category-images');

CREATE POLICY "Anyone can delete category images (DEV)"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'category-images');
*/

-- ==========================================
-- HOW TO USE
-- ==========================================

-- Method 1 (Recommended): Use Authentication
-- 1. Go to /login.html
-- 2. Login with your Supabase user credentials
-- 3. Then go to /admin/edit-categories.html
-- 4. You should now be able to edit categories

-- Method 2 (Dev Only): Remove Auth Requirement
-- 1. Uncomment the SQL above (remove /* and */)
-- 2. Run this file in Supabase SQL Editor
-- 3. You can now edit without logging in
-- 4. REMEMBER to re-enable authentication for production!

-- ==========================================
-- CHECK CURRENT POLICIES
-- ==========================================

-- View all policies on categories table
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual::text as using_expression,
    with_check::text as with_check_expression
FROM pg_policies 
WHERE tablename = 'categories' 
AND schemaname = 'public';

-- View all policies on storage.objects for category-images
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual::text as using_expression,
    with_check::text as with_check_expression
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%category%';

-- ==========================================
-- CHECK IF YOU'RE AUTHENTICATED
-- ==========================================

-- Run this in Supabase SQL Editor to see current user
SELECT 
    auth.uid() as user_id,
    auth.role() as current_role;

-- If user_id is NULL, you're not authenticated
-- If current_role is 'authenticated', you have proper access
-- If current_role is 'anon', you need to login first
