-- Make transcript_segment_id nullable to allow ASL clips for unsaved segments
ALTER TABLE public.sign_language_clips 
ALTER COLUMN transcript_segment_id DROP NOT NULL;