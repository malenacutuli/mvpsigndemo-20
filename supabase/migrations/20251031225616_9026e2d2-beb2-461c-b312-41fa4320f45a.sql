-- Create character if missing
CREATE OR REPLACE FUNCTION public.create_character_if_missing(
  p_video_id uuid,
  p_name text,
  p_color text DEFAULT NULL,
  p_type text DEFAULT 'minor'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM public.characters
  WHERE video_id = p_video_id AND name = p_name
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.characters (video_id, name, color, type)
    VALUES (p_video_id, p_name, COALESCE(p_color, '#47C2EB'), p_type)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Update one segment's identity by id OR (video_id, language, idx)
CREATE OR REPLACE FUNCTION public.update_segment_identity(
  p_segment_id uuid DEFAULT NULL,
  p_video_id uuid DEFAULT NULL,
  p_language text DEFAULT 'en',
  p_idx int DEFAULT NULL,
  p_character_id uuid DEFAULT NULL,
  p_character_name text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target_id uuid;
  v_char_id uuid;
BEGIN
  -- Resolve target segment
  IF p_segment_id IS NOT NULL THEN
    v_target_id := p_segment_id;
  ELSE
    SELECT id INTO v_target_id
    FROM public.transcript_segments_clean
    WHERE video_id = p_video_id AND language = p_language AND idx = p_idx
    LIMIT 1;
  END IF;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Segment not found';
  END IF;

  -- Resolve / create character
  IF p_character_id IS NULL THEN
    IF p_character_name IS NULL THEN
      RAISE EXCEPTION 'Provide p_character_id or p_character_name';
    END IF;
    v_char_id := public.create_character_if_missing(p_video_id, p_character_name, NULL, 'minor');
  ELSE
    v_char_id := p_character_id;
  END IF;

  -- Identity-only update; words/timing/text untouched
  UPDATE public.transcript_segments_clean t
  SET character_id = v_char_id,
      speaker      = (SELECT name  FROM public.characters c WHERE c.id = v_char_id),
      speaker_color= (SELECT color FROM public.characters c WHERE c.id = v_char_id)
  WHERE t.id = v_target_id;

  RETURN true;
END;
$$;