-- Check current storage policies that might limit upload size
-- Remove any restrictive size policies and create proper upload policies

-- Remove old restrictive policies
DROP POLICY IF EXISTS "Videos upload size limit" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view videos" ON storage.objects;

-- Create proper policies for video uploads without size restrictions (bucket handles size)
CREATE POLICY "Users can upload videos to videos bucket" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Users can view videos in videos bucket" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'videos');

CREATE POLICY "Users can update videos in videos bucket" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'videos');

CREATE POLICY "Users can delete videos in videos bucket" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'videos');