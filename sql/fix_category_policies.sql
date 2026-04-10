-- ==========================================
-- CHECK AND FIX CATEGORY TABLE POLICIES
-- ==========================================
-- Run this to diagnose and fix permission issues

-- Step 1: Check if RLS is enabled on categories table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'categories' 
AND schemaname = 'public';

-- Step 2: Check current policies on categories
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as using_expression,
    with_check::text as with_check_expression
FROM pg_policies 
WHERE tablename = 'categories' 
AND schemaname = 'public';

-- Step 3: Check if the table has the new columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'categories'
ORDER BY ordinal_position;

-- ==========================================
-- FIX: Add missing UPDATE policy for authenticated users
-- ==========================================

-- Drop any conflicting policies first
DROP POLICY IF EXISTS "Anyone can update categories (DEV)" ON categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categories;

-- Create the correct UPDATE policy
CREATE POLICY "Authenticated users can update categories"
ON categories FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Also ensure we have SELECT policy (for reading)
DROP POLICY IF EXISTS "Anyone can read categories" ON categories;

CREATE POLICY "Anyone can read categories"
ON categories FOR SELECT
TO public
USING (true);

-- And INSERT policy (for creating new categories)
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;

CREATE POLICY "Authenticated users can insert categories"
ON categories FOR INSERT
TO authenticated
WITH CHECK (true);

-- ==========================================
-- VERIFY THE FIX
-- ==========================================

-- Check all policies again
SELECT 
    policyname,
    cmd,
    roles::text,
    qual::text as using_check,
    with_check::text
FROM pg_policies 
WHERE tablename = 'categories'
ORDER BY cmd, policyname;

-- ==========================================
-- TEST QUERY (run this while logged in)
-- ==========================================

-- This should work if you're authenticated:
/*
UPDATE categories 
SET body = 'Test update at ' || now()::text
WHERE id = (SELECT id FROM categories LIMIT 1)
RETURNING *;
*/

-- ==========================================
-- ALTERNATIVE: If still not working
-- ==========================================
-- The issue might be that RLS is blocking even authenticated users
-- You can temporarily disable RLS for testing:

/*
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
*/

-- To re-enable later:
/*
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
*/
