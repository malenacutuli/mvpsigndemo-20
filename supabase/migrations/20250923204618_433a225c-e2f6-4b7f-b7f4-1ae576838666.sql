-- Fix the upsert_transcript_segments function to preserve segment IDs and sign language clip relationships
CREATE OR REPLACE FUNCTION public.upsert_transcript_segments(p_video_id uuid, p_language text, p_created_by uuid, p_segments jsonb, p_checksum text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
  v_transcript_id UUID;
  seg JSONB;
  existing_segment_id UUID;
BEGIN
  -- Upsert transcript header
  INSERT INTO public.transcripts (video_id, language, created_by, checksum, updated_at)
  VALUES (p_video_id, p_language, p_created_by, p_checksum, now())
  ON CONFLICT (video_id, language)
  DO UPDATE SET 
    checksum = EXCLUDED.checksum, 
    updated_at = now(),
    created_by = EXCLUDED.created_by
  RETURNING id INTO v_transcript_id;

  -- Process each segment individually to preserve existing IDs
  FOR seg IN SELECT * FROM jsonb_array_elements(p_segments) LOOP
    -- Check if a segment with this idx already exists
    SELECT id INTO existing_segment_id
    FROM public.transcript_segments 
    WHERE transcript_id = v_transcript_id 
    AND idx = (seg->>'idx')::INTEGER;

    IF existing_segment_id IS NOT NULL THEN
      -- Update existing segment (preserves ID and sign language clip relationships)
      UPDATE public.transcript_segments SET
        start_time = (seg->>'startTime')::NUMERIC,
        end_time = (seg->>'endTime')::NUMERIC,
        text = seg->>'text',
        speaker = COALESCE(seg->>'speaker', 'Speaker'),
        speaker_color = COALESCE(seg->>'speakerColor', '#3B82F6'),
        emphasis = COALESCE(seg->>'emphasis', 'normal'),
        pitch = COALESCE(seg->>'pitch', 'normal'),
        confidence = COALESCE((seg->>'confidence')::NUMERIC, 0.95),
        segment_type = COALESCE(seg->>'segmentType', 'dialogue'),
        is_off_camera = COALESCE((seg->>'isOffCamera')::BOOLEAN, false),
        words = CASE WHEN seg->'words' IS NOT NULL THEN seg->'words' ELSE NULL END
      WHERE id = existing_segment_id;
    ELSE
      -- Insert new segment
      INSERT INTO public.transcript_segments (
        transcript_id, idx, start_time, end_time, text, speaker, speaker_color,
        emphasis, pitch, confidence, segment_type, is_off_camera, video_id, language, words
      ) VALUES (
        v_transcript_id,
        (seg->>'idx')::INTEGER,
        (seg->>'startTime')::NUMERIC,
        (seg->>'endTime')::NUMERIC,
        seg->>'text',
        COALESCE(seg->>'speaker', 'Speaker'),
        COALESCE(seg->>'speakerColor', '#3B82F6'),
        COALESCE(seg->>'emphasis', 'normal'),
        COALESCE(seg->>'pitch', 'normal'),
        COALESCE((seg->>'confidence')::NUMERIC, 0.95),
        COALESCE(seg->>'segmentType', 'dialogue'),
        COALESCE((seg->>'isOffCamera')::BOOLEAN, false),
        p_video_id,
        p_language,
        CASE WHEN seg->'words' IS NOT NULL THEN seg->'words' ELSE NULL END
      );
    END IF;
  END LOOP;

  -- Remove segments that are no longer in the new segments array
  DELETE FROM public.transcript_segments 
  WHERE transcript_id = v_transcript_id 
  AND idx NOT IN (
    SELECT (seg->>'idx')::INTEGER 
    FROM jsonb_array_elements(p_segments) seg
  );
END;
$function$;