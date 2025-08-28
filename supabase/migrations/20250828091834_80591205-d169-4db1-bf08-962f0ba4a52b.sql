-- Make videos bucket public for easier video access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'videos';

-- Ensure proper storage policies exist
DO $$
BEGIN
  -- Drop and recreate policies to avoid conflicts
  DROP POLICY IF EXISTS "Public video access" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
  
  -- Create new policies for public video access
  CREATE POLICY "Videos are publicly accessible" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'videos');
  
  CREATE POLICY "Authenticated users can upload to videos bucket" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'videos' 
    AND auth.role() = 'authenticated'
  );
  
  CREATE POLICY "Users can update their own video files" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'videos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
  
  CREATE POLICY "Users can delete their own video files" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'videos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
  
EXCEPTION WHEN OTHERS THEN
  -- If policies already exist, just continue
  NULL;
END $$;