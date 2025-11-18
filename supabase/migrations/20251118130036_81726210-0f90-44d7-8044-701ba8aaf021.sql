-- Create storage bucket for sign language clips if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sign-language-clips',
  'sign-language-clips',
  true,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload sign language clips" ON storage.objects;
DROP POLICY IF EXISTS "Users can view sign language clips" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own sign language clips" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own sign language clips" ON storage.objects;

-- Create RLS policies for sign-language-clips bucket
CREATE POLICY "Users can upload sign language clips"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sign-language-clips');

CREATE POLICY "Users can view sign language clips"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sign-language-clips');

CREATE POLICY "Users can delete their own sign language clips"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'sign-language-clips' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own sign language clips"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sign-language-clips' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);