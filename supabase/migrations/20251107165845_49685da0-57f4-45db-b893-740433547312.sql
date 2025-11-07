-- Create RPC function to apply character mapping to transcript segments
-- This function updates segments to link them to a character based on speaker label
CREATE OR REPLACE FUNCTION public.apply_specific_mapping(
  p_video_id uuid,
  p_language text,
  p_asr_label text,
  p_character_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_character_color text;
  v_is_off_camera boolean;
BEGIN
  -- Get character properties
  SELECT color, is_off_camera
  INTO v_character_color, v_is_off_camera
  FROM characters
  WHERE id = p_character_id AND video_id = p_video_id;

  -- Update segments matching the ASR label
  -- Match both "A" and "Speaker A" formats
  UPDATE transcript_segments_clean
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

  -- Also update old transcript_segments table if it exists
  UPDATE transcript_segments
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