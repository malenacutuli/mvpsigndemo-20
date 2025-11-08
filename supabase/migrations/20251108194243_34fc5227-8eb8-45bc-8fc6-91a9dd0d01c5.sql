-- Fix apply_specific_mapping to bypass RLS by setting service_role context
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
  v_original_role text;
BEGIN
  -- Store original role and switch to service_role to bypass RLS
  v_original_role := current_setting('role', true);
  PERFORM set_config('role', 'service_role', true);
  
  -- Get character properties
  SELECT color, is_off_camera
  INTO v_character_color, v_is_off_camera
  FROM characters
  WHERE id = p_character_id AND video_id = p_video_id;

  -- Update segments matching the ASR label (RLS bypassed)
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
    
  -- Restore original role
  PERFORM set_config('role', COALESCE(v_original_role, 'authenticator'), true);
  
EXCEPTION
  WHEN OTHERS THEN
    -- Restore role on error
    PERFORM set_config('role', COALESCE(v_original_role, 'authenticator'), true);
    RAISE;
END;
$$;

-- Fix sync_character_to_segments to bypass RLS
CREATE OR REPLACE FUNCTION public.sync_character_to_segments(
  p_video_id uuid,
  p_language text,
  p_character_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_character record;
  v_updated_count integer;
  v_original_role text;
BEGIN
  -- Store original role and switch to service_role to bypass RLS
  v_original_role := current_setting('role', true);
  PERFORM set_config('role', 'service_role', true);
  
  -- Get character details
  SELECT name, color, is_off_camera 
  INTO v_character
  FROM public.characters
  WHERE id = p_character_id
    AND video_id = p_video_id;

  IF NOT FOUND THEN
    PERFORM set_config('role', COALESCE(v_original_role, 'authenticator'), true);
    RAISE EXCEPTION 'Character not found: %', p_character_id;
  END IF;

  -- Update all segments that match this character (RLS bypassed)
  UPDATE public.transcript_segments_clean
  SET 
    character_id = p_character_id,
    speaker = v_character.name,
    speaker_color = v_character.color,
    is_off_camera = v_character.is_off_camera
  WHERE video_id = p_video_id
    AND language = p_language
    AND (character_id = p_character_id OR speaker = v_character.name);
    
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Restore original role
  PERFORM set_config('role', COALESCE(v_original_role, 'authenticator'), true);
  
  RETURN v_updated_count;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Restore role on error
    PERFORM set_config('role', COALESCE(v_original_role, 'authenticator'), true);
    RAISE;
END;
$$;