-- ============================================================
-- Clean Up Duplicate Transcript Segments
-- ============================================================

-- This SQL removes duplicate segments, keeping only the most recent
-- based on created_at timestamp and id
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY video_id, language, idx 
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM transcript_segments_clean
)
DELETE FROM transcript_segments_clean
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add index to improve query performance for segment lookups
CREATE INDEX IF NOT EXISTS idx_transcript_segments_clean_video_lang_idx 
ON transcript_segments_clean(video_id, language, idx);

-- Log cleanup results
DO $$
DECLARE
  duplicate_count integer;
BEGIN
  -- Count remaining potential duplicates (should be 0)
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT video_id, language, idx, COUNT(*) as cnt
    FROM transcript_segments_clean
    GROUP BY video_id, language, idx
    HAVING COUNT(*) > 1
  ) dups;
  
  RAISE NOTICE 'Duplicate cleanup complete. Remaining duplicates: %', duplicate_count;
END $$;