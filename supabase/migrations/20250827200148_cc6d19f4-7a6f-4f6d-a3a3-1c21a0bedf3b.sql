-- Increase file size limits for video uploads
-- Set videos bucket to 500MB limit
UPDATE storage.buckets 
SET file_size_limit = 524288000 -- 500MB in bytes
WHERE id = 'videos';

-- Set tracks bucket to 100MB limit (for audio tracks)
UPDATE storage.buckets 
SET file_size_limit = 104857600 -- 100MB in bytes
WHERE id = 'tracks';

-- Set thumbnails bucket to 10MB limit
UPDATE storage.buckets 
SET file_size_limit = 10485760 -- 10MB in bytes
WHERE id = 'thumbnails';