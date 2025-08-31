-- Update storage bucket to allow larger files up to 5GB
UPDATE storage.buckets 
SET file_size_limit = 5368709120 -- 5GB in bytes
WHERE name = 'videos';

-- Also update any existing RLS policies to handle larger files
-- Check current bucket configuration
SELECT 
  name,
  file_size_limit,
  file_size_limit / (1024*1024*1024) as limit_gb,
  public,
  allowed_mime_types
FROM storage.buckets 
WHERE name = 'videos';