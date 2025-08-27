-- Update storage bucket limits to ensure 500MB limit is properly applied
UPDATE storage.buckets SET 
  file_size_limit = 524288000, -- 500MB in bytes (500 * 1024 * 1024)
  allowed_mime_types = '{video/mp4,video/avi,video/mov,video/mkv,video/webm,video/quicktime,video/x-msvideo}'
WHERE id = 'videos';

UPDATE storage.buckets SET 
  file_size_limit = 104857600 -- 100MB in bytes  
WHERE id = 'tracks';

UPDATE storage.buckets SET 
  file_size_limit = 10485760 -- 10MB in bytes
WHERE id = 'thumbnails';