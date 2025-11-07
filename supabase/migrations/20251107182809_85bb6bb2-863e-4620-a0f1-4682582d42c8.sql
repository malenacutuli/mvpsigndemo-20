-- Clean up Spanish speaker mappings for English-only video
-- This prevents language flickering in the voice selector
DELETE FROM speaker_mappings 
WHERE video_id = 'bfcb4953-7d50-493b-9618-79745e860fcb' 
AND language = 'es';