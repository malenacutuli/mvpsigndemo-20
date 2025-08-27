-- Increase storage bucket size limit to 2GB to handle very large 4K videos
UPDATE storage.buckets 
SET file_size_limit = 2147483648  -- 2GB in bytes (2 * 1024 * 1024 * 1024)
WHERE id = 'videos';