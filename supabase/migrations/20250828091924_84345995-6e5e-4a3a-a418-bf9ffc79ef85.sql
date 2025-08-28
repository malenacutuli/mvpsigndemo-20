-- Update existing videos bucket to be public for direct video access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'videos';

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Public video access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;

-- Create public access policy for videos bucket
CREATE POLICY "Public video access" ON storage.objects
FOR SELECT 
USING (bucket_id = 'videos');

-- Allow authenticated users to upload videos
CREATE POLICY "Authenticated users can upload videos" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'videos' 
  AND auth.role() = 'authenticated'
);

-- Allow users to manage their own video files
CREATE POLICY "Users can update their own videos" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own videos" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);