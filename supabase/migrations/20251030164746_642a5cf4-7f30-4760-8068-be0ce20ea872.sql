-- Create new clean transcript segments table with proper constraints
CREATE TABLE IF NOT EXISTS public.transcript_segments_clean (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID REFERENCES public.transcripts(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  idx INTEGER,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  text TEXT NOT NULL,
  speaker TEXT DEFAULT 'Speaker',
  speaker_color TEXT DEFAULT '#3B82F6',
  speaker_normalized TEXT GENERATED ALWAYS AS (lower(regexp_replace(trim(COALESCE(speaker, 'speaker')), '\s+', '_', 'g'))) STORED,
  character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  emphasis TEXT DEFAULT 'normal',
  pitch TEXT DEFAULT 'normal',
  confidence NUMERIC DEFAULT 0.95,
  segment_type TEXT DEFAULT 'dialogue',
  is_off_camera BOOLEAN DEFAULT false,
  words JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.transcript_segments_clean.words IS 'Word-level timing data with syllable breakdowns for accessibility features. Structure: [{"word": "text", "start": 0.0, "end": 1.0, "syllables": [...]}]';

-- Create indexes for performance
CREATE INDEX idx_segments_clean_video_lang ON public.transcript_segments_clean(video_id, language);
CREATE INDEX idx_segments_clean_transcript ON public.transcript_segments_clean(transcript_id);
CREATE INDEX idx_segments_clean_time ON public.transcript_segments_clean(video_id, start_time, end_time);
CREATE INDEX idx_segments_clean_speaker ON public.transcript_segments_clean(video_id, speaker_normalized);
CREATE INDEX idx_segments_clean_character ON public.transcript_segments_clean(character_id) WHERE character_id IS NOT NULL;

-- Unique constraint to prevent duplicates (within 100ms tolerance handled by app logic)
CREATE UNIQUE INDEX idx_segments_clean_unique ON public.transcript_segments_clean(video_id, language, start_time, end_time, text);

-- Enable RLS
ALTER TABLE public.transcript_segments_clean ENABLE ROW LEVEL SECURITY;

-- Copy RLS policies from original table
CREATE POLICY "Anonymous can view transcript segments for public videos"
ON public.transcript_segments_clean FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = transcript_segments_clean.video_id 
    AND videos.is_public = true 
    AND videos.status IN ('ready', 'uploaded')
  )
);

CREATE POLICY "Anonymous can view embedded transcript segments"
ON public.transcript_segments_clean FOR SELECT
USING (
  auth.uid() IS NULL 
  AND EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = transcript_segments_clean.video_id 
    AND videos.embed_enabled = true
  )
);

CREATE POLICY "Users can manage segments via transcript ownership"
ON public.transcript_segments_clean FOR ALL
USING (
  (transcript_id IS NULL AND EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = transcript_segments_clean.video_id 
    AND videos.user_id = auth.uid()
  ))
  OR
  (transcript_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM transcripts t 
    WHERE t.id = transcript_segments_clean.transcript_id 
    AND t.created_by = auth.uid()
  ))
)
WITH CHECK (
  (transcript_id IS NULL AND EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = transcript_segments_clean.video_id 
    AND videos.user_id = auth.uid()
  ))
  OR
  (transcript_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM transcripts t 
    WHERE t.id = transcript_segments_clean.transcript_id 
    AND t.created_by = auth.uid()
  ))
);

CREATE POLICY "System can manage all transcript segments"
ON public.transcript_segments_clean FOR ALL
USING (current_setting('role') = 'service_role');