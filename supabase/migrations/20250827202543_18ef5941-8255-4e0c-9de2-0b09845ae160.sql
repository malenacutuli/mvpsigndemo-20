-- Update storage bucket size limits for videos bucket to 500MB
UPDATE storage.buckets 
SET file_size_limit = 524288000  -- 500MB in bytes
WHERE id = 'videos';

-- If the bucket doesn't exist, create it with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('videos', 'videos', false, 524288000)
ON CONFLICT (id) 
DO UPDATE SET file_size_limit = 524288000;