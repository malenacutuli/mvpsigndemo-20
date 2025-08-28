-- Add RLS policy for storage objects to ensure users can only access their own video files
-- Drop the existing public read policy first
DROP POLICY IF EXISTS "Allow public read access to videos" ON storage.objects;

-- Create a more secure policy that allows access only to owners or for embedded videos
CREATE POLICY "Allow access to own videos or embedded videos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'videos' AND (
    -- Allow access if user owns the video
    (auth.uid() IS NOT NULL AND 
     EXISTS (
       SELECT 1 FROM videos 
       WHERE videos.storage_path = storage.objects.name 
       AND videos.user_id = auth.uid()
     )) 
    OR 
    -- Allow public access only for embedded videos
    (EXISTS (
       SELECT 1 FROM videos 
       WHERE videos.storage_path = storage.objects.name 
       AND videos.embed_enabled = true
     ))
  )
);