-- Add words column to transcript_segments table to store word-level data
ALTER TABLE public.transcript_segments 
ADD COLUMN IF NOT EXISTS words JSONB;

-- Update the upsert function to handle word-level data
CREATE OR REPLACE FUNCTION public.upsert_transcript_segments(p_video_id uuid, p_language text, p_created_by uuid, p_segments jsonb, p_checksum text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
  v_transcript_id UUID;
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

  -- Replace all segments atomically
  DELETE FROM public.transcript_segments WHERE transcript_id = v_transcript_id;

  -- Insert new segments with word-level data
  INSERT INTO public.transcript_segments (
    transcript_id, idx, start_time, end_time, text, speaker, speaker_color,
    emphasis, pitch, confidence, segment_type, is_off_camera, video_id, language, words
  )
  SELECT 
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
    CASE WHEN seg->'words' IS NOT NULL THEN seg->'words' ELSE NULL END  -- Store word-level data as JSONB
  FROM jsonb_array_elements(p_segments) seg;
END;
$function$;