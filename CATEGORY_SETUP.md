# Category Image Setup Instructions

## Step 1: Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Enter bucket name: `category-images`
5. Set **Public bucket** to **ON** (enabled)
6. Click **Create bucket**

## Step 2: Run SQL Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy and paste the contents of `/sql/add_category_image.sql`
4. Click **Run** to execute the SQL

This will:
- Add `image_url` field to categories table
- Add `body` field to categories table (if not exists)
- Set up storage policies for the category-images bucket

## Step 3: Test the Feature

1. Go to `/admin/edit-categories.html`
2. Click **Edit** on any category
3. Try uploading an image
4. Update the name or description
5. Save changes

## Features Added

### 1. Auto-fill Track Title from Filename
- When you select an MP3 file in upload forms, the filename automatically fills the title field
- The title is cleaned up: removes extension, replaces underscores/hyphens with spaces, capitalizes words
- You can still edit the auto-filled title before submitting

### 2. Category Editor
- Edit category names
- Add/edit category descriptions (body field)
- Upload category images (stored in Supabase Storage)
- Images are displayed on category cards in the browse view

## Database Schema Changes

```sql
-- Categories table now has:
ALTER TABLE categories 
ADD COLUMN image_url TEXT;      -- URL to category image
ADD COLUMN body TEXT;            -- Category description
```

## Storage Structure

```
category-images/
  ├── {category-id}-{timestamp}.jpg
  ├── {category-id}-{timestamp}.png
  └── ...
```

Images are named with category ID and timestamp to avoid conflicts and allow easy updates.
