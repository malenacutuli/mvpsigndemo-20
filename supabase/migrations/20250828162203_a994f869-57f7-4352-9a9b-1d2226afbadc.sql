-- Make videos bucket public for embedding and playback
UPDATE storage.buckets 
SET public = true 
WHERE id = 'videos';

-- Add storage policy for public read access to videos bucket
CREATE POLICY "Allow public read access to videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'videos');