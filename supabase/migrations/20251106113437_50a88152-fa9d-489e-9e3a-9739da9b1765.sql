-- Add new RPC function to sync character properties to segments
-- This is additive and does not modify existing functionality
CREATE OR REPLACE FUNCTION public.sync_character_to_segments(
  p_video_id uuid,
  p_language text,
  p_character_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_character record;
  v_updated_count integer;
BEGIN
  -- Get character details
  SELECT name, color, is_off_camera 
  INTO v_character
  FROM public.characters
  WHERE id = p_character_id
    AND video_id = p_video_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character not found: %', p_character_id;
  END IF;

  -- Update all segments that match this character's speaker name
  -- This ensures color and is_off_camera consistency
  WITH updated AS (
    UPDATE public.transcript_segments_clean
    SET 
      character_id = p_character_id,
      speaker = v_character.name,
      speaker_color = v_character.color,
      is_off_camera = v_character.is_off_camera
    WHERE video_id = p_video_id
      AND language = p_language
      AND (
        speaker = v_character.name 
        OR speaker_asr_label = v_character.name
        OR character_id = p_character_id
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated;

  RETURN v_updated_count;
END;
$function$;