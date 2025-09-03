-- Step 1: Create normalized transcript tables
CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  language TEXT NOT NULL,
  created_by UUID NOT NULL,
  checksum TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (video_id, language)
);

-- Update transcript_segments to reference transcripts table
ALTER TABLE public.transcript_segments 
ADD COLUMN transcript_id UUID REFERENCES public.transcripts(id) ON DELETE CASCADE,
ADD COLUMN idx INTEGER;

-- Step 2: Create atomic upsert function
CREATE OR REPLACE FUNCTION public.upsert_transcript_segments(
  p_video_id UUID,
  p_language TEXT,
  p_created_by UUID,
  p_segments JSONB,
  p_checksum TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE 
  v_transcript_id UUID;
BEGIN
  -- Upsert transcript header
  INSERT INTO public.transcripts (video_id, language, created_by, checksum, updated_at)
  VALUES (p_video_id, p_language, p_created_by, p_checksum, now())
  ON CONFLICT (video_id, language)
  DO UPDATE SET 
    checksum = EXCLUDED.checksum, 
    updated_at = now(),
    created_by = EXCLUDED.created_by
  RETURNING id INTO v_transcript_id;

  -- Replace all segments atomically
  DELETE FROM public.transcript_segments WHERE transcript_id = v_transcript_id;

  -- Insert new segments
  INSERT INTO public.transcript_segments (
    transcript_id, idx, start_time, end_time, text, speaker, speaker_color,
    emphasis, pitch, confidence, segment_type, is_off_camera, video_id, language
  )
  SELECT 
    v_transcript_id,
    (seg->>'idx')::INTEGER,
    (seg->>'startTime')::NUMERIC,
    (seg->>'endTime')::NUMERIC,
    seg->>'text',
    COALESCE(seg->>'speaker', 'Speaker'),
    COALESCE(seg->>'speakerColor', '#3B82F6'),
    COALESCE(seg->>'emphasis', 'normal'),
    COALESCE(seg->>'pitch', 'normal'),
    COALESCE((seg->>'confidence')::NUMERIC, 0.95),
    COALESCE(seg->>'segmentType', 'dialogue'),
    COALESCE((seg->>'isOffCamera')::BOOLEAN, false),
    p_video_id,
    p_language
  FROM jsonb_array_elements(p_segments) seg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 3: Setup RLS policies
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own transcripts" 
ON public.transcripts FOR ALL
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Update transcript_segments RLS to work with new structure
DROP POLICY IF EXISTS "System can manage transcripts" ON public.transcript_segments;
DROP POLICY IF EXISTS "Video owners can create transcripts" ON public.transcript_segments;
DROP POLICY IF EXISTS "Video owners can view their transcripts" ON public.transcript_segments;
DROP POLICY IF EXISTS "Anonymous access for embedded videos only" ON public.transcript_segments;

CREATE POLICY "Users can manage segments via transcript ownership"
ON public.transcript_segments FOR ALL
USING (
  transcript_id IS NULL AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = transcript_segments.video_id AND videos.user_id = auth.uid()
  )
  OR
  transcript_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.transcripts t
    WHERE t.id = transcript_segments.transcript_id AND t.created_by = auth.uid()
  )
)
WITH CHECK (
  transcript_id IS NULL AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = transcript_segments.video_id AND videos.user_id = auth.uid()
  )
  OR
  transcript_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.transcripts t
    WHERE t.id = transcript_segments.transcript_id AND t.created_by = auth.uid()
  )
);

CREATE POLICY "System can manage all transcript segments" 
ON public.transcript_segments FOR ALL
USING (current_setting('role'::text) = 'service_role'::text);

CREATE POLICY "Anonymous can view embedded transcript segments"
ON public.transcript_segments FOR SELECT
USING (
  auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM public.videos
    WHERE videos.id = transcript_segments.video_id AND videos.embed_enabled = true
  )
);

-- Add trigger for automatic timestamp updates on transcripts
CREATE TRIGGER update_transcripts_updated_at
  BEFORE UPDATE ON public.transcripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();