-- Update storage bucket size limits for videos bucket to 500MB
UPDATE storage.buckets 
SET file_size_limit = 524288000  -- 500MB in bytes
WHERE id = 'videos';

-- Ensure the bucket exists with proper configuration if not already created
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('videos', 'videos', false, 524288000)
ON CONFLICT (id) 
DO UPDATE SET file_size_limit = 524288000;

-- Update storage policies to reflect new size limits
DROP POLICY IF EXISTS "Videos upload size limit" ON storage.objects;
CREATE POLICY "Videos upload size limit" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'videos' AND 
  octet_length(decode(encode(raw_data, 'base64'), 'base64')) <= 524288000
);