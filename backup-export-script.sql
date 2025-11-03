-- ================================================================
-- AXESSIBLE DATABASE BACKUP EXPORT SCRIPT
-- Generated: 2025-11-03
-- Project: faeyekynudyzeotbjfsj.supabase.co
-- ================================================================
-- 
-- INSTRUCTIONS:
-- 1. Run each SELECT query below in Supabase SQL Editor
-- 2. Click "Download CSV" for each result
-- 3. Store CSV files safely for backup
-- 4. Use the IMPORT section at bottom to restore data
--
-- ================================================================

-- ================================================================
-- EXPORT QUERIES (Run these in Supabase SQL Editor)
-- ================================================================

-- ----------------------------------------------------------------
-- 1. TRANSCRIPT SEGMENTS CLEAN (764 rows) - CRITICAL
-- ----------------------------------------------------------------
-- Contains all your caption data with speaker info, timing, and words
-- File: backup_transcript_segments_clean.csv

SELECT 
  id,
  video_id,
  transcript_id,
  idx,
  start_time,
  end_time,
  text,
  speaker,
  speaker_color,
  speaker_normalized,
  speaker_norm,
  speaker_asr_label,
  speaker_asr_norm,
  character_id,
  emphasis,
  pitch,
  vocal_intensity,
  confidence,
  segment_type,
  is_off_camera,
  is_music,
  is_sound_effect,
  language,
  words,
  created_at
FROM transcript_segments_clean
ORDER BY video_id, language, idx;


-- ----------------------------------------------------------------
-- 2. CHARACTERS (65 rows) - CRITICAL
-- ----------------------------------------------------------------
-- Contains all character/speaker definitions with colors and voice settings
-- File: backup_characters.csv

SELECT 
  id,
  video_id,
  name,
  type,
  color,
  voice_id,
  voice_name,
  voice_type,
  emphasis,
  pitch,
  is_off_camera,
  created_at,
  updated_at
FROM characters
ORDER BY video_id, type, name;


-- ----------------------------------------------------------------
-- 3. SPEAKER MAPPINGS (3 rows) - CRITICAL
-- ----------------------------------------------------------------
-- Contains ASR label to character ID mappings
-- File: backup_speaker_mappings.csv

SELECT 
  video_id,
  language,
  mappings
FROM speaker_mappings
ORDER BY video_id, language;


-- ----------------------------------------------------------------
-- 4. VIDEOS (51 rows) - CRITICAL
-- ----------------------------------------------------------------
-- Contains all video metadata and settings
-- File: backup_videos.csv

SELECT 
  id,
  user_id,
  title,
  description,
  url,
  thumbnail_url,
  duration,
  status,
  is_public,
  channel_id,
  view_count,
  embed_enabled,
  embed_token,
  embed_domains,
  privacy_level,
  created_at,
  updated_at
FROM videos
ORDER BY created_at DESC;


-- ----------------------------------------------------------------
-- 5. AUDIO DESCRIPTIONS (290 rows)
-- ----------------------------------------------------------------
-- Contains all audio description data
-- File: backup_audio_descriptions.csv

SELECT 
  id,
  video_id,
  language,
  start_time,
  end_time,
  description,
  description_type,
  confidence,
  voice_id,
  voice_name,
  audio_url,
  audio_generation_status,
  audio_error_message,
  audio_generated_at,
  created_at,
  updated_at
FROM audio_descriptions
ORDER BY video_id, language, start_time;


-- ----------------------------------------------------------------
-- 6. TRANSCRIPTS (Header records)
-- ----------------------------------------------------------------
-- Contains transcript metadata
-- File: backup_transcripts.csv

SELECT 
  id,
  video_id,
  language,
  created_by,
  checksum,
  updated_at
FROM transcripts
ORDER BY video_id, language;


-- ----------------------------------------------------------------
-- 7. TRANSCRIPT FREEZE (0 rows currently)
-- ----------------------------------------------------------------
-- Contains frozen transcript records
-- File: backup_transcript_freeze.csv

SELECT 
  id,
  video_id,
  language,
  frozen_at
FROM transcript_freeze
ORDER BY video_id, language;


-- ----------------------------------------------------------------
-- 8. CHANNELS (if you have any)
-- ----------------------------------------------------------------
-- File: backup_channels.csv

SELECT 
  id,
  user_id,
  name,
  description,
  avatar_url,
  banner_url,
  is_public,
  video_count,
  subscriber_count,
  created_at,
  updated_at
FROM channels
ORDER BY created_at DESC;


-- ================================================================
-- IMPORT/RESTORE QUERIES (Use these to restore data)
-- ================================================================

-- ----------------------------------------------------------------
-- RESTORE INSTRUCTIONS:
-- ----------------------------------------------------------------
-- 1. Create a NEW Supabase project first
-- 2. Run all migrations to create tables
-- 3. Use these queries to restore data from CSV files
-- 4. Update UUIDs if needed for new project
-- ----------------------------------------------------------------

-- EXAMPLE RESTORE FOR CHARACTERS:
-- 
-- COPY characters (id, video_id, name, type, color, voice_id, voice_name, voice_type, emphasis, pitch, is_off_camera, created_at, updated_at)
-- FROM '/path/to/backup_characters.csv'
-- WITH (FORMAT CSV, HEADER true);

-- EXAMPLE RESTORE FOR TRANSCRIPT SEGMENTS:
-- 
-- COPY transcript_segments_clean (id, video_id, transcript_id, idx, start_time, end_time, text, speaker, speaker_color, speaker_normalized, speaker_norm, speaker_asr_label, speaker_asr_norm, character_id, emphasis, pitch, vocal_intensity, confidence, segment_type, is_off_camera, is_music, is_sound_effect, language, words, created_at)
-- FROM '/path/to/backup_transcript_segments_clean.csv'
-- WITH (FORMAT CSV, HEADER true);


-- ================================================================
-- DATABASE STATISTICS
-- ================================================================

-- Current row counts:
SELECT 
  'transcript_segments_clean' as table_name, 
  COUNT(*) as row_count 
FROM transcript_segments_clean
UNION ALL
SELECT 'characters', COUNT(*) FROM characters
UNION ALL
SELECT 'speaker_mappings', COUNT(*) FROM speaker_mappings
UNION ALL
SELECT 'videos', COUNT(*) FROM videos
UNION ALL
SELECT 'audio_descriptions', COUNT(*) FROM audio_descriptions
UNION ALL
SELECT 'transcripts', COUNT(*) FROM transcripts
UNION ALL
SELECT 'transcript_freeze', COUNT(*) FROM transcript_freeze
ORDER BY row_count DESC;


-- ================================================================
-- VALIDATION QUERIES (Run after restore to verify data)
-- ================================================================

-- Check video-transcript relationship integrity:
SELECT 
  v.id as video_id,
  v.title,
  COUNT(DISTINCT ts.id) as segment_count,
  COUNT(DISTINCT c.id) as character_count
FROM videos v
LEFT JOIN transcript_segments_clean ts ON ts.video_id = v.id
LEFT JOIN characters c ON c.video_id = v.id
GROUP BY v.id, v.title
ORDER BY segment_count DESC;

-- Check character assignments:
SELECT 
  c.name,
  c.color,
  COUNT(ts.id) as segment_count
FROM characters c
LEFT JOIN transcript_segments_clean ts ON ts.character_id = c.id
GROUP BY c.id, c.name, c.color
ORDER BY segment_count DESC;

-- ================================================================
-- END OF EXPORT SCRIPT
-- ================================================================
