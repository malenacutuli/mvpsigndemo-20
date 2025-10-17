-- Phase 1: Create function to consolidate duplicate speakers
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