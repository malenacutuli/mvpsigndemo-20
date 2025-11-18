-- Create thumbnails storage bucket for timeline previews
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,
  2097152, -- 2MB limit per thumbnail
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for thumbnails bucket

-- Allow authenticated users to upload thumbnails for their own projects
CREATE POLICY "Users can upload thumbnails for their projects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails' AND
  (storage.foldername(name))[1] IN (
    SELECT vp.id::text
    FROM premium_projects vp
    WHERE vp.user_id = auth.uid()
  )
);

-- Allow authenticated users to update thumbnails for their own projects
CREATE POLICY "Users can update their project thumbnails"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'thumbnails' AND
  (storage.foldername(name))[1] IN (
    SELECT vp.id::text
    FROM premium_projects vp
    WHERE vp.user_id = auth.uid()
  )
);

-- Allow authenticated users to delete thumbnails for their own projects
CREATE POLICY "Users can delete their project thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'thumbnails' AND
  (storage.foldername(name))[1] IN (
    SELECT vp.id::text
    FROM premium_projects vp
    WHERE vp.user_id = auth.uid()
  )
);

-- Allow public read access to thumbnails (since bucket is public)
CREATE POLICY "Public read access to thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'thumbnails');