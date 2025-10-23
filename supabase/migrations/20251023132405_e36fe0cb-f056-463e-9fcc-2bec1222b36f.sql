
-- Restore English transcript from base64-encoded checksum backup
-- The checksum contains the properly edited version with correct speaker names

-- Step 1: Delete corrupted segments
DELETE FROM transcript_segments
WHERE transcript_id = '70f0c6a0-72d3-4947-9186-0cb76ce08123';

-- Step 2: Decode base64 checksum and insert restored segments
WITH decoded_checksum AS (
  SELECT 
    id as transcript_id,
    video_id,
    language,
    convert_from(decode(checksum, 'base64'), 'UTF8')::jsonb as segments_json
  FROM transcripts
  WHERE id = '70f0c6a0-72d3-4947-9186-0cb76ce08123'
),
checksum_data AS (
  SELECT 
    transcript_id,
    video_id,
    language,
    jsonb_array_elements(segments_json) as segment
  FROM decoded_checksum
)
INSERT INTO transcript_segments (
  video_id,
  transcript_id,
  idx,
  start_time,
  end_time,
  text,
  speaker,
  speaker_color,
  emphasis,
  pitch,
  confidence,
  segment_type,
  is_off_camera,
  language,
  words,
  character_id
)
SELECT 
  cd.video_id,
  cd.transcript_id,
  (cd.segment->>'idx')::INTEGER,
  (cd.segment->>'startTime')::NUMERIC,
  (cd.segment->>'endTime')::NUMERIC,
  cd.segment->>'text',
  COALESCE(cd.segment->>'speaker', 'Speaker'),
  COALESCE(cd.segment->>'speakerColor', '#3B82F6'),
  COALESCE(cd.segment->>'emphasis', 'normal'),
  COALESCE(cd.segment->>'pitch', 'normal'),
  COALESCE((cd.segment->>'confidence')::NUMERIC, 0.95),
  COALESCE(cd.segment->>'segmentType', 'dialogue'),
  COALESCE((cd.segment->>'isOffCamera')::BOOLEAN, false),
  cd.language,
  CASE WHEN cd.segment->'words' IS NOT NULL THEN cd.segment->'words' ELSE NULL END,
  CASE 
    WHEN cd.segment ? 'characterId' THEN (cd.segment->>'characterId')::UUID
    WHEN cd.segment ? 'character_id' THEN (cd.segment->>'character_id')::UUID
    ELSE NULL
  END
FROM checksum_data cd
ORDER BY (cd.segment->>'idx')::INTEGER;
