
-- ================================================================
-- CWI Database Restoration: Remove Duplicates & Add Constraints
-- ================================================================

-- Step 1: Remove duplicate transcript segments, keeping the best one per (video_id, language, idx)
-- Priority: Keep row with character_id populated, then with words populated
WITH ranked_segments AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY video_id, language, idx 
      ORDER BY 
        CASE WHEN character_id IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN words IS NOT NULL AND jsonb_array_length(words) > 0 THEN 0 ELSE 1 END,
        created_at DESC
    ) as rn
  FROM transcript_segments_clean
)
DELETE FROM transcript_segments_clean
WHERE id IN (
  SELECT id FROM ranked_segments WHERE rn > 1
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE transcript_segments_clean
ADD CONSTRAINT unique_segment_per_video_lang_idx 
UNIQUE (video_id, language, idx);

-- Step 3: Add check constraint for words structure
ALTER TABLE transcript_segments_clean
ADD CONSTRAINT words_valid_structure
CHECK (
  words IS NULL OR 
  (jsonb_typeof(words) = 'array')
);
