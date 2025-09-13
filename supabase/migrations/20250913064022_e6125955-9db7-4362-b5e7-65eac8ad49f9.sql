-- Increase per-bucket file size limits to 5GB for large video uploads
-- Note: Project-level Storage "File size limit" must be >= this value in the dashboard, otherwise uploads > project limit will still fail.

-- Ensure the buckets exist (no-op if they already exist)
insert into storage.buckets (id, name, public)
values
  ('videos', 'videos', true),
  ('processed-videos', 'processed-videos', true)
on conflict (id) do nothing;

-- Update file size limits and allowed mime types
update storage.buckets
set 
  file_size_limit = 5368709120, -- 5 GB in bytes
  allowed_mime_types = ARRAY['video/*']::text[]
where id in ('videos', 'processed-videos');
