-- Words-only RPC: allowed even when frozen (identity fields guarded by trigger)
CREATE OR REPLACE FUNCTION public.update_words_only(
  p_video_id uuid,
  p_language text,
  p_start_time numeric,
  p_end_time numeric,
  p_text text,
  p_idx int,
  p_words jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.transcript_segments_clean t
     SET text       = p_text,
         idx        = p_idx,
         words      = p_words
   WHERE t.video_id   = p_video_id
     AND t.language   = p_language
     AND t.start_time = p_start_time
     AND t.end_time   = p_end_time;
END;
$$;

-- Identity freeze trigger: blocks identity changes when frozen
CREATE OR REPLACE FUNCTION public.prevent_identity_change_when_frozen()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.transcript_freeze f
     WHERE f.video_id = NEW.video_id
       AND f.language = NEW.language
  ) THEN
    IF OLD.speaker              IS DISTINCT FROM NEW.speaker
    OR OLD.speaker_color        IS DISTINCT FROM NEW.speaker_color
    OR OLD.speaker_asr_label    IS DISTINCT FROM NEW.speaker_asr_label
    OR OLD.character_id         IS DISTINCT FROM NEW.character_id THEN
      RAISE EXCEPTION 'Cannot modify speaker identity after transcript is frozen';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
DROP TRIGGER IF EXISTS enforce_freeze_on_identity_fields ON public.transcript_segments_clean;
CREATE TRIGGER enforce_freeze_on_identity_fields
  BEFORE UPDATE ON public.transcript_segments_clean
  FOR EACH ROW EXECUTE FUNCTION public.prevent_identity_change_when_frozen();