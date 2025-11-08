-- ============================================================
-- Fix apply_specific_mapping to update speaker field with character names
-- Must DROP first because return type is changing
-- ============================================================

DROP FUNCTION IF EXISTS public.apply_specific_mapping(uuid, text, text, uuid);

CREATE FUNCTION public.apply_specific_mapping(
  p_video_id uuid,
  p_language text,
  p_asr_label text,
  p_character_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_character_name text;
  v_character_color text;
  v_is_off_camera boolean;
  v_updated_count integer := 0;
  v_skipped_count integer := 0;
BEGIN
  -- Get character properties INCLUDING name
  SELECT name, color, is_off_camera
  INTO v_character_name, v_character_color, v_is_off_camera
  FROM public.characters
  WHERE id = p_character_id AND video_id = p_video_id;

  IF v_character_name IS NULL THEN
    RAISE EXCEPTION 'Character not found: %', p_character_id;
  END IF;

  -- ✅ KEY FIX: Update speaker field to character name
  UPDATE public.transcript_segments_clean
  SET
    character_id = p_character_id,
    speaker = v_character_name,
    speaker_color = v_character_color,
    is_off_camera = v_is_off_camera,
    last_edited_by = 'human',
    last_edited_at = now()
  WHERE
    video_id = p_video_id
    AND language = p_language
    AND (
      speaker_asr_label = p_asr_label
      OR speaker_asr_label = 'Speaker ' || p_asr_label
      OR speaker = p_asr_label
      OR speaker = 'Speaker ' || p_asr_label
    )
    AND COALESCE(locked_by_user, FALSE) = FALSE;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  SELECT COUNT(*) INTO v_skipped_count
  FROM public.transcript_segments_clean
  WHERE video_id = p_video_id
    AND language = p_language
    AND (speaker_asr_label = p_asr_label OR speaker_asr_label = 'Speaker ' || p_asr_label)
    AND locked_by_user = TRUE;

  UPDATE public.transcript_segments
  SET
    character_id = p_character_id,
    speaker = v_character_name,
    speaker_color = v_character_color,
    is_off_camera = v_is_off_camera
  WHERE video_id = p_video_id
    AND language = p_language
    AND (speaker = p_asr_label OR speaker = 'Speaker ' || p_asr_label);

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'skipped_count', v_skipped_count,
    'character_id', p_character_id,
    'character_name', v_character_name,
    'asr_label', p_asr_label
  );
END;
$$;

-- Repair existing data
UPDATE transcript_segments_clean tsc
SET 
  speaker = c.name,
  speaker_color = c.color,
  is_off_camera = c.is_off_camera,
  last_edited_by = 'system',
  last_edited_at = now()
FROM characters c
WHERE tsc.character_id = c.id
  AND tsc.character_id IS NOT NULL
  AND tsc.speaker != c.name;

UPDATE transcript_segments ts
SET 
  speaker = c.name,
  speaker_color = c.color,
  is_off_camera = c.is_off_camera
FROM characters c
WHERE ts.character_id = c.id
  AND ts.character_id IS NOT NULL
  AND ts.speaker != c.name;