-- Add unique constraint to ensure only one clip per transcript segment
alter table public.sign_language_clips
  add constraint sign_language_clips_transcript_segment_id_unique
  unique (transcript_segment_id);