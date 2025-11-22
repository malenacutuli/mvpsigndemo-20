-- Update videos bucket to support 100GB files (Supabase's new limit)
UPDATE storage.buckets
SET file_size_limit = 107374182400  -- 100GB in bytes
WHERE id = 'videos';