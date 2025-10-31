-- Fix speaker_mappings for current video
-- This ensures the mappings use canonical UUIDs for both "A/B/C" and "Speaker A/B/C" keys

UPDATE speaker_mappings
SET mappings = jsonb_build_object(
  'A', 'c3650711-7d85-4a20-9808-9b90624127a9',
  'B', '82550337-36ad-437a-a025-cab18bee1cc8',
  'C', 'd32f72ef-de99-4967-b9b0-8be2ca98e472',
  'Speaker A', 'c3650711-7d85-4a20-9808-9b90624127a9',
  'Speaker B', '82550337-36ad-437a-a025-cab18bee1cc8',
  'Speaker C', 'd32f72ef-de99-4967-b9b0-8be2ca98e472'
)
WHERE video_id = 'bfcb4953-7d50-493b-9618-79745e860fcb'
  AND language = 'en';

-- Log the fix
INSERT INTO migration_log (migration_name, notes, affected_rows)
VALUES (
  'fix_speaker_mappings_canonical_uuids',
  'Fixed speaker_mappings to use canonical UUIDs for both ASR labels (A/B/C) and full names (Speaker A/B/C)',
  (SELECT COUNT(*) FROM speaker_mappings WHERE video_id = 'bfcb4953-7d50-493b-9618-79745e860fcb')
);