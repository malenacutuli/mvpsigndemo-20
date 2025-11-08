-- Add emotion and intensity fields to transcript_segments_clean
ALTER TABLE transcript_segments_clean 
ADD COLUMN IF NOT EXISTS sentiment TEXT,
ADD COLUMN IF NOT EXISTS sentiment_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS emotion_metadata JSONB,
ADD COLUMN IF NOT EXISTS overall_intensity TEXT CHECK (
  overall_intensity IN ('whisper', 'quiet', 'normal', 'loud', 'yelling', 'screaming')
),
ADD COLUMN IF NOT EXISTS overall_pitch TEXT CHECK (
  overall_pitch IN ('low', 'normal', 'high')
);

-- Create indexes for querying
CREATE INDEX IF NOT EXISTS idx_segments_intensity 
ON transcript_segments_clean(overall_intensity) 
WHERE overall_intensity IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_segments_sentiment 
ON transcript_segments_clean(sentiment) 
WHERE sentiment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_segments_emotion_gin 
ON transcript_segments_clean USING GIN (emotion_metadata);

-- Add documentation comments
COMMENT ON COLUMN transcript_segments_clean.overall_intensity IS 
'Intensity spectrum: whisper < quiet < normal < loud < yelling < screaming';

COMMENT ON COLUMN transcript_segments_clean.sentiment IS 
'Sentiment from AssemblyAI or Hume AI: POSITIVE, NEGATIVE, or NEUTRAL';

COMMENT ON COLUMN transcript_segments_clean.emotion_metadata IS 
'Full emotion data: {provider, sentiment, confidence, top_emotion, top_5_emotions, prosody}';