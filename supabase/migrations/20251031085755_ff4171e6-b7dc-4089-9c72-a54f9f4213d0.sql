-- Phase 1: Database Migration - Eliminate 'auto' language
-- ============================================================

-- Step 1: Update videos that have transcripts (match segment language)
UPDATE videos v
SET language = (
  SELECT DISTINCT ts.language 
  FROM transcript_segments_clean ts 
  WHERE ts.video_id = v.id 
  LIMIT 1
)
WHERE v.language = 'auto'
AND EXISTS (
  SELECT 1 FROM transcript_segments_clean ts 
  WHERE ts.video_id = v.id
);

-- Step 2: Update videos without transcripts to default 'en'
UPDATE videos
SET language = 'en'
WHERE language = 'auto'
AND NOT EXISTS (
  SELECT 1 FROM transcript_segments_clean ts 
  WHERE ts.video_id = videos.id
);

-- Step 3: Add check constraint to prevent 'auto' in future
ALTER TABLE videos 
ADD CONSTRAINT language_must_be_explicit 
CHECK (language != 'auto');

-- Step 4: Create migration log table if not exists
CREATE TABLE IF NOT EXISTS migration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name text NOT NULL,
  executed_at timestamptz DEFAULT now(),
  affected_rows integer,
  notes text
);

-- Step 5: Log this migration
INSERT INTO migration_log (migration_name, notes)
VALUES (
  'eliminate_auto_language_2025',
  'Converted all auto language entries to explicit language codes and added constraint to prevent future auto entries'
);