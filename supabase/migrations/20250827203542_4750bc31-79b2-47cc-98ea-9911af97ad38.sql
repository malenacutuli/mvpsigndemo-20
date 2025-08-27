-- Update storage bucket size limits for videos bucket to 1GB to handle large 4K videos
UPDATE storage.buckets 
SET file_size_limit = 1073741824  -- 1GB in bytes (1024 * 1024 * 1024)
WHERE id = 'videos';