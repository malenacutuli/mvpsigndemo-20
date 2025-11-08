-- ============================================================
-- Fix apply_specific_mapping Function for Real Names
-- ============================================================

-- Replace the function with a working version that:
-- 1. Uses SECURITY DEFINER (no set_config role hacks)
-- 2. Properly sets search_path for security
-- 3. Matches on both speaker and speaker_asr_label
-- 4. Updates transcript_segments_clean AND transcript_segments

CREATE OR REPLACE FUNCTION public.apply_specific_mapping(
  p_video_id uuid,
  p_language text,
  p_asr_label text,
  p_character_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_character_color text;
  v_is_off_camera boolean;
BEGIN
  -- Get character properties
  SELECT color, is_off_camera
  INTO v_character_color, v_is_off_camera
  FROM public.characters
  WHERE id = p_character_id AND video_id = p_video_id;

  -- Update transcript_segments_clean
  -- Match on both raw label "A" and "Speaker A" format
  UPDATE public.transcript_segments_clean
  SET
    character_id = p_character_id,
    speaker_color = v_character_color,
    is_off_camera = v_is_off_camera
  WHERE
    video_id = p_video_id
    AND language = p_language
    AND (
      speaker_asr_label = p_asr_label
      OR speaker_asr_label = 'Speaker ' || p_asr_label
      OR speaker = p_asr_label
      OR speaker = 'Speaker ' || p_asr_label
    );

  -- Update transcript_segments (legacy table)
  UPDATE public.transcript_segments
  SET
    character_id = p_character_id,
    speaker_color = v_character_color,
    is_off_camera = v_is_off_camera
  WHERE
    video_id = p_video_id
    AND language = p_language
    AND (
      speaker = p_asr_label
      OR speaker = 'Speaker ' || p_asr_label
    );
END;
$$;