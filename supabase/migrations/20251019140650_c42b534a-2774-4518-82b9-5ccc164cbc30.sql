-- Phase 1: Normalize language from 'auto' to 'en'
UPDATE transcript_segments 
SET language = 'en' 
WHERE video_id = '83072f96-8ab9-49b8-9d3d-ab89cff40fae' 
AND language = 'auto';

-- Phase 2: Consolidate generic "Speaker" labels
WITH first_appearances AS (
  SELECT 
    speaker_color,
    MIN(start_time) as first_time
  FROM transcript_segments
  WHERE video_id = '83072f96-8ab9-49b8-9d3d-ab89cff40fae'
  AND speaker = 'Speaker'
  GROUP BY speaker_color
),
speaker_clusters AS (
  SELECT 
    ts.id,
    DENSE_RANK() OVER (ORDER BY fa.first_time) as speaker_number
  FROM transcript_segments ts
  JOIN first_appearances fa ON ts.speaker_color = fa.speaker_color
  WHERE ts.video_id = '83072f96-8ab9-49b8-9d3d-ab89cff40fae'
  AND ts.speaker = 'Speaker'
)
UPDATE transcript_segments ts
SET speaker = 'Speaker ' || sc.speaker_number
FROM speaker_clusters sc
WHERE ts.id = sc.id;

-- Phase 3: Initialize speaker_mappings (using WHERE NOT EXISTS)
INSERT INTO speaker_mappings (video_id, language, mappings, created_by)
SELECT 
  '83072f96-8ab9-49b8-9d3d-ab89cff40fae'::uuid,
  'en',
  '{}'::jsonb,
  'e5721015-421d-40dc-919e-e91e1628af05'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM speaker_mappings 
  WHERE video_id = '83072f96-8ab9-49b8-9d3d-ab89cff40fae' 
  AND language = 'en'
);

-- Verification
SELECT 
  language,
  speaker,
  speaker_color,
  COUNT(*) as segment_count
FROM transcript_segments
WHERE video_id = '83072f96-8ab9-49b8-9d3d-ab89cff40fae'
GROUP BY language, speaker, speaker_color
ORDER BY speaker, segment_count DESC;