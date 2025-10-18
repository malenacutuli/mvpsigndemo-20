-- Add character_id column to transcript_segments for single source of truth
ALTER TABLE transcript_segments 
ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transcript_segments_character_id 
ON transcript_segments(character_id);

-- Create index for faster speaker lookups
CREATE INDEX IF NOT EXISTS idx_transcript_segments_video_speaker 
ON transcript_segments(video_id, speaker);

COMMENT ON COLUMN transcript_segments.character_id IS 'Links segment to character for single source of truth - when set, speaker/color are managed via Character Manager only';