-- Add the missing Housekeeper character
INSERT INTO characters (video_id, name, type, color, voice_type, emphasis, pitch)
VALUES ('2f9a71a2-0c14-44e7-b0c8-499eb996e28f', 'Housekeeper', 'minor', '#EC4899', 'native', 'normal', 'normal')
ON CONFLICT (video_id, name) DO UPDATE SET
  color = EXCLUDED.color,
  type = EXCLUDED.type;

-- Update all transcript segments to use proper character names instead of Speaker labels
UPDATE transcript_segments 
SET 
  speaker = 'David',
  speaker_color = '#3B82F6'
WHERE video_id = '2f9a71a2-0c14-44e7-b0c8-499eb996e28f' 
AND speaker = 'Speaker 1';

UPDATE transcript_segments 
SET 
  speaker = 'Rick',
  speaker_color = '#10B981'
WHERE video_id = '2f9a71a2-0c14-44e7-b0c8-499eb996e28f' 
AND speaker = 'Speaker 2';

UPDATE transcript_segments 
SET 
  speaker = 'Kevin',
  speaker_color = '#F59E0B'
WHERE video_id = '2f9a71a2-0c14-44e7-b0c8-499eb996e28f' 
AND speaker = 'Speaker 3';

UPDATE transcript_segments 
SET 
  speaker = 'Photographer',
  speaker_color = '#8B5CF6'
WHERE video_id = '2f9a71a2-0c14-44e7-b0c8-499eb996e28f' 
AND speaker = 'Speaker 4';

-- Also update any remaining generic "Speaker" labels to use available character names
-- This handles segments that might have been created after mapping
UPDATE transcript_segments 
SET 
  speaker = CASE 
    WHEN speaker = 'Speaker' AND start_time BETWEEN 0 AND 100 THEN 'David'
    WHEN speaker = 'Speaker' AND start_time BETWEEN 100 AND 200 THEN 'Rick'
    WHEN speaker = 'Speaker' AND start_time BETWEEN 200 AND 300 THEN 'Kevin'
    WHEN speaker = 'Speaker' AND start_time BETWEEN 300 AND 400 THEN 'Photographer'
    ELSE 'David'  -- Default fallback
  END,
  speaker_color = CASE 
    WHEN speaker = 'Speaker' AND start_time BETWEEN 0 AND 100 THEN '#3B82F6'
    WHEN speaker = 'Speaker' AND start_time BETWEEN 100 AND 200 THEN '#10B981'
    WHEN speaker = 'Speaker' AND start_time BETWEEN 200 AND 300 THEN '#F59E0B'
    WHEN speaker = 'Speaker' AND start_time BETWEEN 300 AND 400 THEN '#8B5CF6'
    ELSE '#3B82F6'  -- Default fallback
  END
WHERE video_id = '2f9a71a2-0c14-44e7-b0c8-499eb996e28f' 
AND speaker = 'Speaker';