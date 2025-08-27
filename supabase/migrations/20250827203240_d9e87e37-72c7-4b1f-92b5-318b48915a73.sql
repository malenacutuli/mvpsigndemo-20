-- Update storage bucket size limits for videos bucket to 200MB
UPDATE storage.buckets 
SET file_size_limit = 209715200  -- 200MB in bytes (200 * 1024 * 1024)
WHERE id = 'videos';

-- Also update other buckets if they exist
UPDATE storage.buckets 
SET file_size_limit = 209715200
WHERE id IN ('thumbnails', 'tracks');