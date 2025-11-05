-- =====================================================
-- Add Ownership Verification to Character Management Functions
-- =====================================================

-- 1. consolidate_video_speakers - Add ownership check
CREATE OR REPLACE FUNCTION public.consolidate_video_speakers(
  target_video_id uuid, 
  target_language text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  consolidated_count int := 0;
  speaker_info jsonb;
BEGIN
  -- SECURITY: Verify video ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.videos 
    WHERE id = target_video_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User does not own video %', target_video_id;
  END IF;

  -- Get all unique speakers before consolidation
  WITH speaker_stats AS (
    SELECT 
      speaker,
      speaker_color,
      COUNT(*) as segment_count,
      MIN(start_time) as first_appearance
    FROM transcript_segments
    WHERE video_id = target_video_id 
      AND language = target_language
      AND speaker IS NOT NULL
    GROUP BY speaker, speaker_color
    ORDER BY first_appearance, segment_count DESC
  ),
  -- Normalize speaker names (e.g., "Speaker" -> "Speaker 1")
  primary_speakers AS (
    SELECT 
      CASE 
        WHEN speaker ~ '^Speaker \d+$' THEN speaker
        WHEN speaker = 'Speaker' THEN 'Speaker 1'
        ELSE speaker
      END as normalized_speaker,
      speaker as original_speaker,
      speaker_color,
      segment_count,
      ROW_NUMBER() OVER (PARTITION BY 
        CASE 
          WHEN speaker ~ '^Speaker \d+$' THEN speaker
          WHEN speaker = 'Speaker' THEN 'Speaker 1'
          ELSE speaker
        END 
        ORDER BY segment_count DESC, first_appearance ASC
      ) as priority
    FROM speaker_stats
  )
  -- Update segments to use normalized speaker names and primary color
  UPDATE transcript_segments ts
  SET 
    speaker = ps.normalized_speaker,
    speaker_color = ps.speaker_color
  FROM primary_speakers ps
  WHERE ts.video_id = target_video_id
    AND ts.language = target_language
    AND ts.speaker = ps.original_speaker
    AND ps.priority = 1;  -- Use only the primary color for each speaker
  
  GET DIAGNOSTICS consolidated_count = ROW_COUNT;
  
  -- Get summary of consolidated speakers
  SELECT jsonb_agg(
    jsonb_build_object(
      'speaker', speaker,
      'color', speaker_color,
      'segments', COUNT(*)
    )
  ) INTO speaker_info
  FROM transcript_segments
  WHERE video_id = target_video_id
    AND language = target_language
  GROUP BY speaker, speaker_color;
  
  RETURN jsonb_build_object(
    'success', true,
    'segments_updated', consolidated_count,
    'speakers', speaker_info,
    'message', 'Speakers consolidated successfully'
  );
END;
$$;

-- 2. create_character_if_missing - Add ownership check
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
  -- SECURITY: Verify video ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.videos 
    WHERE id = p_video_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User does not own video %', p_video_id;
  END IF;

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

-- 3. update_segment_identity - Add ownership check
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
  v_video_id uuid;
BEGIN
  -- Resolve target segment and video_id
  IF p_segment_id IS NOT NULL THEN
    v_target_id := p_segment_id;
    -- Get video_id from segment
    SELECT video_id INTO v_video_id
    FROM public.transcript_segments_clean
    WHERE id = p_segment_id;
  ELSE
    v_target_id := NULL;
    v_video_id := p_video_id;
    SELECT id INTO v_target_id
    FROM public.transcript_segments_clean
    WHERE video_id = p_video_id AND language = p_language AND idx = p_idx
    LIMIT 1;
  END IF;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Segment not found';
  END IF;

  -- SECURITY: Verify video ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.videos 
    WHERE id = v_video_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User does not own video %', v_video_id;
  END IF;

  -- Resolve / create character
  IF p_character_id IS NULL THEN
    IF p_character_name IS NULL THEN
      RAISE EXCEPTION 'Provide p_character_id or p_character_name';
    END IF;
    v_char_id := public.create_character_if_missing(v_video_id, p_character_name, NULL, 'minor');
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