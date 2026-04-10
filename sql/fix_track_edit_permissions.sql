-- ==========================================
-- FIX TRACK EDIT PERMISSIONS
-- ==========================================
-- Run this in Supabase SQL Editor to allow editing tracks

-- Step 1: Check current policies on tracks table
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
WHERE tablename = 'tracks' 
AND schemaname = 'public';

-- Step 2: Enable RLS if not already enabled
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop any conflicting policies
DROP POLICY IF EXISTS "Anyone can update tracks (DEV)" ON tracks;
DROP POLICY IF EXISTS "Authenticated users can update tracks" ON tracks;
DROP POLICY IF EXISTS "Authenticated users can delete tracks" ON tracks;

-- Step 4: Create proper UPDATE policy for authenticated users
CREATE POLICY "Authenticated users can update tracks"
ON tracks FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 5: Create DELETE policy for authenticated users
CREATE POLICY "Authenticated users can delete tracks"
ON tracks FOR DELETE
TO authenticated
USING (true);

-- Step 6: Ensure SELECT policy exists (for reading)
DROP POLICY IF EXISTS "Anyone can read tracks" ON tracks;

CREATE POLICY "Anyone can read tracks"
ON tracks FOR SELECT
TO public
USING (true);

-- Step 7: Ensure INSERT policy exists (for creating)
DROP POLICY IF EXISTS "Authenticated users can insert tracks" ON tracks;

CREATE POLICY "Authenticated users can insert tracks"
ON tracks FOR INSERT
TO authenticated
WITH CHECK (true);

-- ==========================================
-- VERIFY THE POLICIES
-- ==========================================

-- Check all policies on tracks table
SELECT 
    policyname,
    cmd,
    roles::text,
    qual::text as using_check,
    with_check::text
FROM pg_policies 
WHERE tablename = 'tracks'
ORDER BY cmd, policyname;

-- ==========================================
-- TEST UPDATE (while logged in)
-- ==========================================

-- This should work if you're authenticated:
/*
UPDATE tracks 
SET title = 'Test update at ' || now()::text
WHERE id = (SELECT id FROM tracks LIMIT 1)
RETURNING id, title;
*/

-- ==========================================
-- ALTERNATIVE: Disable RLS temporarily (DEV ONLY)
-- ==========================================
-- Only use this for testing, NOT for production

/*
ALTER TABLE tracks DISABLE ROW LEVEL SECURITY;
*/

-- To re-enable:
/*
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
*/
