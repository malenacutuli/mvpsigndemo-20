-- Update v_transcript_segments_resolved to show "Speaker A/B/C" instead of naked "A"
-- This ensures the UI never sees plain ASR labels without context

CREATE OR REPLACE VIEW public.v_transcript_segments_resolved AS
WITH base AS (
  SELECT 
    t.id,
    t.video_id,
    t.language,
    t.idx,
    t.start_time,
    t.end_time,
    t.text,
    t.words,
    t.speaker,
    t.speaker_asr_label,
    (sm.mappings ->> t.speaker_asr_label)::uuid AS character_id
  FROM transcript_segments_clean t
  LEFT JOIN speaker_mappings sm ON sm.video_id = t.video_id AND sm.language = t.language
),
with_character AS (
  SELECT 
    b.id,
    b.video_id,
    b.language,
    b.idx,
    b.start_time,
    b.end_time,
    b.text,
    b.words,
    b.speaker,
    b.speaker_asr_label,
    b.character_id,
    c.name AS character_name,
    c.type AS character_type,
    c.color AS character_color,
    -- ✅ FIXED: Show "Speaker A/B/C" instead of naked "A" when no character mapping exists
    COALESCE(
      c.name,                                    -- Mapped character name (David, Rick, Kevin)
      CASE 
        WHEN b.speaker_asr_label IS NOT NULL 
        THEN 'Speaker ' || b.speaker_asr_label   -- "Speaker A", "Speaker B", etc.
        ELSE NULL
      END,
      'Unassigned'                               -- Last resort
    ) AS display_speaker,
    CASE
      WHEN c.type = 'main' THEN 'main'
      WHEN c.type = 'supporting' THEN 'supporting'
      WHEN c.type = 'minor' THEN 'minor'
      ELSE 'supporting'
    END AS display_pool,
    b.video_id::text || ':' || b.language AS color_seed
  FROM base b
  LEFT JOIN characters c ON c.id = b.character_id
),
color_idx AS (
  SELECT 
    x.*,
    CASE
      WHEN x.character_color IS NOT NULL THEN -1
      ELSE color_slot(
        x.color_seed, 
        COALESCE(x.speaker_asr_label, 'Unassigned'),
        (SELECT count(*)::int FROM cwi_palette p WHERE p.pool = x.display_pool)
      )
    END AS slot
  FROM with_character x
)
SELECT 
  id,
  video_id,
  language,
  idx,
  start_time,
  end_time,
  text,
  words,
  speaker,
  speaker_asr_label,
  character_id,
  character_name,
  character_type,
  character_color,
  display_speaker,
  display_pool,
  color_seed,
  slot,
  CASE
    WHEN character_color IS NOT NULL THEN character_color
    ELSE (SELECT p.hex FROM cwi_palette p WHERE p.pool = y.display_pool AND p.idx = y.slot)
  END AS display_color
FROM color_idx y;