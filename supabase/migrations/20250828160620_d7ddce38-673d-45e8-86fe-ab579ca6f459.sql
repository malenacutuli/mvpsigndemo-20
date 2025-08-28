-- Fix video embedding by creating proper storage policies for embedded videos
-- This allows embedded videos to be accessed without authentication when embedding is enabled

-- Create policy to allow public read access to videos when they have embedding enabled
CREATE POLICY "Public access for embedded videos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'videos' 
  AND (
    EXISTS (
      SELECT 1 FROM videos 
      WHERE storage_path = storage.objects.name 
      AND embed_enabled = true
    )
  )
);