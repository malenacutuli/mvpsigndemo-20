-- First, let's see what the current constraint looks like and remove the problematic unique constraint
-- The constraint seems to be too restrictive for our use case where we might have similar text at different times

-- Drop the problematic unique constraint
DROP INDEX IF EXISTS idx_transcript_segments_video_time_text;

-- Create a more appropriate unique constraint that allows for proper transcript segment management
-- This should prevent true duplicates while allowing legitimate re-processing
CREATE UNIQUE INDEX idx_transcript_segments_video_id_start_end_speaker 
ON transcript_segments (video_id, start_time, end_time, speaker, language) 
WHERE transcript_id IS NULL;

-- Also create a regular index for performance on common queries
CREATE INDEX IF NOT EXISTS idx_transcript_segments_video_language 
ON transcript_segments (video_id, language, start_time);

-- Create an index for transcript_id based segments
CREATE UNIQUE INDEX idx_transcript_segments_transcript_idx 
ON transcript_segments (transcript_id, idx) 
WHERE transcript_id IS NOT NULL;