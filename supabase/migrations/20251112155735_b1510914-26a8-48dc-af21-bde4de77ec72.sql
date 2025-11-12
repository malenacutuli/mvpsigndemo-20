-- Drop unused GIN indexes on emotion_metadata that are causing UPSERT timeouts
-- These indexes have 0 scans and consume ~9.7MB, significantly slowing down saves

DROP INDEX IF EXISTS idx_transcript_segments_clean_emotion_metadata;
DROP INDEX IF EXISTS idx_segments_emotion_metadata;
DROP INDEX IF EXISTS idx_segments_emotion_gin;