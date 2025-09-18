-- Update speaker mappings to correctly map detected speakers to characters
UPDATE speaker_mappings 
SET mappings = '{
  "Speaker 1": "David",
  "Speaker 2": "Rick", 
  "Speaker 3": "Kevin",
  "Speaker 4": "Photographer"
}'::jsonb
WHERE video_id = '2f9a71a2-0c14-44e7-b0c8-499eb996e28f';

-- Insert character definitions with appropriate colors following CI protocol
INSERT INTO characters (video_id, name, type, color, voice_type, emphasis, pitch)
VALUES 
  ('2f9a71a2-0c14-44e7-b0c8-499eb996e28f', 'David', 'main', '#3B82F6', 'native', 'normal', 'normal'),
  ('2f9a71a2-0c14-44e7-b0c8-499eb996e28f', 'Rick', 'supporting', '#10B981', 'native', 'normal', 'normal'),
  ('2f9a71a2-0c14-44e7-b0c8-499eb996e28f', 'Kevin', 'supporting', '#F59E0B', 'native', 'normal', 'normal'),
  ('2f9a71a2-0c14-44e7-b0c8-499eb996e28f', 'Photographer', 'minor', '#8B5CF6', 'native', 'normal', 'normal')
ON CONFLICT (video_id, name) DO UPDATE SET
  color = EXCLUDED.color,
  type = EXCLUDED.type;

-- Apply the character mappings to all transcript segments
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