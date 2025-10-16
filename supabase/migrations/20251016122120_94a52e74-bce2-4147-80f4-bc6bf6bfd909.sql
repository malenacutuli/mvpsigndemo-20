-- Phase 1: Add Audio Storage Infrastructure to audio_descriptions table

-- Add audio file storage columns
ALTER TABLE audio_descriptions 
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS audio_generation_status TEXT DEFAULT 'pending' 
  CHECK (audio_generation_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS audio_error_message TEXT,
ADD COLUMN IF NOT EXISTS voice_id TEXT,
ADD COLUMN IF NOT EXISTS voice_name TEXT;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_audio_descriptions_status 
ON audio_descriptions(audio_generation_status);

CREATE INDEX IF NOT EXISTS idx_audio_descriptions_video_id 
ON audio_descriptions(video_id);

-- Create storage bucket for audio descriptions if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-descriptions',
  'audio-descriptions',
  true,
  10485760, -- 10MB limit per file
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "ad_storage_upload" ON storage.objects;
DROP POLICY IF EXISTS "ad_storage_read" ON storage.objects;
DROP POLICY IF EXISTS "ad_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "ad_storage_delete" ON storage.objects;

-- Create RLS policies for audio-descriptions bucket
CREATE POLICY "ad_storage_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-descriptions' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM videos WHERE user_id = auth.uid()
  )
);

CREATE POLICY "ad_storage_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-descriptions');

CREATE POLICY "ad_storage_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audio-descriptions' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM videos WHERE user_id = auth.uid()
  )
);

CREATE POLICY "ad_storage_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-descriptions' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM videos WHERE user_id = auth.uid()
  )
);