-- Fix project-photos storage bucket
-- Run this in Supabase SQL Editor

-- 1. Create the bucket if it doesn't exist, and make it PUBLIC
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-photos',
  'project-photos',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage RLS policies on storage.objects
-- Allow authenticated users to upload to their own folder
DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view photos in the public bucket
DROP POLICY IF EXISTS "Public can view project photos" ON storage.objects;
CREATE POLICY "Public can view project photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-photos');

-- Allow users to delete their own photos
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Update any existing stored URLs to use public URL format
-- (so old photos also work after the bucket is made public)
-- This is a no-op if URLs are already in the right format
UPDATE project_photos
SET url = REGEXP_REPLACE(
  url,
  '/storage/v1/object/sign/project-photos/([^?]+).*',
  '/storage/v1/object/public/project-photos/\1'
)
WHERE url LIKE '%/storage/v1/object/sign/project-photos/%';
