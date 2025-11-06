-- Fix overlapping audio description segments
-- Adjust segment 2 end time from 56 to 55.5 to prevent overlap with segment 3
UPDATE audio_descriptions 
SET end_time = 55.5 
WHERE id = '36a4e23f-32b0-42a1-8159-7f1ef45ca635';