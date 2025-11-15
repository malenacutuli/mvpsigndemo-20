-- Create video_highlights table for social clips feature
CREATE TABLE IF NOT EXISTS public.video_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  engagement_score INTEGER CHECK (engagement_score >= 1 AND engagement_score <= 10),
  highlight_type TEXT DEFAULT 'auto',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_video_highlights_video_id ON public.video_highlights(video_id);
CREATE INDEX IF NOT EXISTS idx_video_highlights_created_by ON public.video_highlights(created_by);

-- Enable RLS
ALTER TABLE public.video_highlights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view highlights for their videos"
  ON public.video_highlights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos
      WHERE videos.id = video_highlights.video_id
      AND videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert highlights for their videos"
  ON public.video_highlights FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos
      WHERE videos.id = video_highlights.video_id
      AND videos.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own highlights"
  ON public.video_highlights FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own highlights"
  ON public.video_highlights FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "System can manage all highlights"
  ON public.video_highlights FOR ALL
  USING (current_setting('role') = 'service_role');