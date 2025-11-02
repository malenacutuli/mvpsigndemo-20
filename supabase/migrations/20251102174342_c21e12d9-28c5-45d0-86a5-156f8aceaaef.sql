-- Create unique constraint for timing-based upserts on transcript_segments_clean
-- This allows upsert operations to work with timing + content as the conflict target

CREATE UNIQUE INDEX IF NOT EXISTS uq_transcript_timing_content 
ON public.transcript_segments_clean (video_id, language, start_time, end_time, text);

-- Log migration
INSERT INTO public.migration_log (migration_name, notes, affected_rows)
VALUES (
  'add_timing_content_unique_constraint',
  'Added unique constraint on (video_id, language, start_time, end_time, text) to support timing-based upserts',
  0
);