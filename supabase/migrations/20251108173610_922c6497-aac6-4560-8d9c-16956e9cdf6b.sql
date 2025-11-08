-- Add emotion_metadata column to transcript_segments_clean for storing sentiment analysis results
ALTER TABLE public.transcript_segments_clean 
ADD COLUMN IF NOT EXISTS emotion_metadata JSONB DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.transcript_segments_clean.emotion_metadata IS 'Stores sentiment analysis results from AssemblyAI including sentiment type, confidence, and related metadata';

-- Create an index for querying by sentiment
CREATE INDEX IF NOT EXISTS idx_transcript_segments_clean_emotion_metadata 
ON public.transcript_segments_clean USING GIN (emotion_metadata);

-- Log the migration
INSERT INTO public.migration_log (migration_name, notes, affected_rows)
VALUES (
  'add_emotion_metadata_to_transcript_segments_clean',
  'Added emotion_metadata JSONB column to store sentiment analysis from AssemblyAI',
  0
);