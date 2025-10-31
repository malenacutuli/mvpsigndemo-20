-- Safer color_slot function that never returns NULL
CREATE OR REPLACE FUNCTION public.color_slot(p_seed text, p_key text, p_mod int)
RETURNS int 
LANGUAGE plpgsql 
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  m int := CASE WHEN p_mod IS NULL OR p_mod <= 0 THEN 1 ELSE p_mod END;
BEGIN
  RETURN abs(('x'||substr(encode(digest(coalesce(p_seed,'')||'::'||coalesce(p_key,''), 'sha256'),'hex'),1,8))::bit(32)::int) % m;
END;
$$;

-- Add uniqueness constraint on cwi_palette (with conditional check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cwi_palette_unique_pool_idx'
  ) THEN
    ALTER TABLE public.cwi_palette
      ADD CONSTRAINT cwi_palette_unique_pool_idx UNIQUE (pool, idx);
  END IF;
END $$;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS tsc_vid_lang_start ON public.transcript_segments_clean (video_id, language, start_time);
CREATE INDEX IF NOT EXISTS sm_vid_lang ON public.speaker_mappings (video_id, language);
CREATE INDEX IF NOT EXISTS ch_vid ON public.characters (video_id);