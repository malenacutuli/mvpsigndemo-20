-- Backfill start_ms and end_ms from start_time and end_time for legacy data
UPDATE transcript_segments_clean
SET 
  start_ms = ROUND(start_time * 1000)::integer,
  end_ms = ROUND(end_time * 1000)::integer
WHERE start_ms IS NULL 
  AND start_time IS NOT NULL 
  AND end_time IS NOT NULL;