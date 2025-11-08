-- Add millisecond precision timing columns to transcript_segments_clean
ALTER TABLE transcript_segments_clean 
ADD COLUMN IF NOT EXISTS start_ms INTEGER,
ADD COLUMN IF NOT EXISTS end_ms INTEGER,
ADD COLUMN IF NOT EXISTS words_source TEXT DEFAULT 'asr',
ADD COLUMN IF NOT EXISTS timing_confidence NUMERIC DEFAULT 0.95;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_segments_start_ms 
ON transcript_segments_clean(start_ms) 
WHERE start_ms IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_segments_timing 
ON transcript_segments_clean(video_id, language, start_ms, end_ms);

-- Add comments for documentation
COMMENT ON COLUMN transcript_segments_clean.start_ms IS 
'Start time in milliseconds (exact timing from ASR, no rounding)';

COMMENT ON COLUMN transcript_segments_clean.end_ms IS 
'End time in milliseconds (exact timing from ASR, no rounding)';

COMMENT ON COLUMN transcript_segments_clean.words_source IS 
'Source of word timings: asr (AssemblyAI), manual, or other';

COMMENT ON COLUMN transcript_segments_clean.timing_confidence IS 
'Confidence score for timing accuracy from ASR (0.0 to 1.0)';