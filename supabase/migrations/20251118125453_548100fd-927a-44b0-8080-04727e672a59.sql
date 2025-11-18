-- Add extended metadata fields for sign language clips
ALTER TABLE sign_language_clips
ADD COLUMN IF NOT EXISTS interpreter TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'ASL',
ADD COLUMN IF NOT EXISTS position TEXT DEFAULT 'bottom-right',
ADD COLUMN IF NOT EXISTS size TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS opacity DECIMAL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS border_radius INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS has_border BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS synced_with_character UUID REFERENCES characters(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sign_language_clips_video_id 
ON sign_language_clips(video_id);

CREATE INDEX IF NOT EXISTS idx_sign_language_clips_segment_id 
ON sign_language_clips(transcript_segment_id);

-- Add helpful comments
COMMENT ON COLUMN sign_language_clips.start_time_ms IS 'Start time in milliseconds';
COMMENT ON COLUMN sign_language_clips.end_time_ms IS 'End time in milliseconds';
COMMENT ON COLUMN sign_language_clips.interpreter IS 'Name of sign language interpreter';
COMMENT ON COLUMN sign_language_clips.language IS 'Sign language type: ASL, ISL, BSL, LSE, etc.';
COMMENT ON COLUMN sign_language_clips.position IS 'PiP position: bottom-right, bottom-left, top-right, top-left';
COMMENT ON COLUMN sign_language_clips.size IS 'Clip size: small, medium, large';
COMMENT ON COLUMN sign_language_clips.opacity IS 'Opacity 0.0 to 1.0';
COMMENT ON COLUMN sign_language_clips.synced_with_character IS 'Character this clip is synced with for border color';