-- Add sentiment analysis columns to transcript_segments_clean
ALTER TABLE transcript_segments_clean 
ADD COLUMN IF NOT EXISTS sentiment TEXT,
ADD COLUMN IF NOT EXISTS sentiment_confidence NUMERIC;

-- Create index for sentiment queries
CREATE INDEX IF NOT EXISTS idx_segments_sentiment 
ON transcript_segments_clean(sentiment) 
WHERE sentiment IS NOT NULL;

-- Create GIN index for emotion metadata (column already exists from previous migration)
CREATE INDEX IF NOT EXISTS idx_segments_emotion_metadata 
ON transcript_segments_clean USING GIN (emotion_metadata);

-- Add comments for documentation
COMMENT ON COLUMN transcript_segments_clean.sentiment IS 'Sentiment from AssemblyAI: POSITIVE, NEGATIVE, or NEUTRAL';
COMMENT ON COLUMN transcript_segments_clean.sentiment_confidence IS 'Confidence score 0.0 to 1.0 from sentiment analysis';
COMMENT ON COLUMN transcript_segments_clean.emotion_metadata IS 'Full emotion data from AssemblyAI or Hume AI in JSON format';