-- Clean up conflicting storage policies and create simplified ones
-- Remove all existing policies for videos bucket
DROP POLICY IF EXISTS "Allow anonymous video access from storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous video uploads to storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow demo video storage uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow demo video storage viewing" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete videos in videos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update videos in videos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload videos to videos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view videos in videos bucket" ON storage.objects;

-- Create simple, permissive policies for videos bucket
CREATE POLICY "Videos bucket - full access" 
ON storage.objects FOR ALL 
USING (bucket_id = 'videos') 
WITH CHECK (bucket_id = 'videos');

-- Ensure the bucket has the correct size limit
UPDATE storage.buckets 
SET file_size_limit = 1073741824  -- 1GB
WHERE id = 'videos';