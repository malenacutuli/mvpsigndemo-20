-- Drop the problematic unique constraint that's causing duplicate key violations
DROP INDEX IF EXISTS idx_transcript_segments_unique;

-- Create a new unique constraint that allows multiple segments with same start_time but requires unique combination of video_id, language, start_time, and text
-- This prevents actual duplicate segments while allowing segments with same timestamp but different content
CREATE UNIQUE INDEX idx_transcript_segments_video_time_text 
ON transcript_segments (video_id, language, start_time, text);

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_transcript_segments_video_time_text IS 'Prevents duplicate transcript segments while allowing multiple segments with same timestamp but different text content';