-- Enable RLS on all missing tables (IF NOT ALREADY ENABLED)
ALTER TABLE public.api_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_freeze ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cwi_palette ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view freeze status for their videos" ON public.transcript_freeze;
DROP POLICY IF EXISTS "Users can freeze their own video transcripts" ON public.transcript_freeze;
DROP POLICY IF EXISTS "System can manage transcript freeze" ON public.transcript_freeze;
DROP POLICY IF EXISTS "Users can freeze their own transcripts" ON public.transcript_freeze;
DROP POLICY IF EXISTS "Users can view freeze status for their videos" ON public.transcript_freeze;
DROP POLICY IF EXISTS "transcript_freeze_system_can_manage" ON public.transcript_freeze;
DROP POLICY IF EXISTS "transcript_freeze_users_can_freeze_their_videos" ON public.transcript_freeze;
DROP POLICY IF EXISTS "transcript_freeze_users_can_view_their_freezes" ON public.transcript_freeze;

DROP POLICY IF EXISTS "Users can view own export jobs" ON public.export_jobs;
DROP POLICY IF EXISTS "Users can create own export jobs" ON public.export_jobs;
DROP POLICY IF EXISTS "Users can update own export jobs" ON public.export_jobs;

DROP POLICY IF EXISTS "cwi_palette_public_read" ON public.cwi_palette;

DROP POLICY IF EXISTS "security_events_block_public" ON public.security_events;
DROP POLICY IF EXISTS "security_events_service_only" ON public.security_events;

-- =====================================================
-- API Cost Tracking Policies
-- =====================================================
CREATE POLICY "Users can view their own API costs"
ON public.api_cost_tracking
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to API costs"
ON public.api_cost_tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- Transcript Freeze Policies (UPDATED)
-- =====================================================
CREATE POLICY "Users can freeze transcripts for their videos"
ON public.transcript_freeze
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.videos
    WHERE videos.id = transcript_freeze.video_id
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Users view freeze status for their videos"
ON public.transcript_freeze
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.videos
    WHERE videos.id = transcript_freeze.video_id
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Service role manages transcript freeze"
ON public.transcript_freeze
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- Security Events Policies (Service Role Only)
-- =====================================================
CREATE POLICY "Block public access to security events"
ON public.security_events
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Service role manages security events"
ON public.security_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- Export Jobs Policies (UPDATED)
-- =====================================================
CREATE POLICY "Users view their export jobs"
ON public.export_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users create their export jobs"
ON public.export_jobs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their export jobs"
ON public.export_jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages export jobs"
ON public.export_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- CWI Palette Policies (Public Read-Only)
-- =====================================================
CREATE POLICY "Public reads color palette"
ON public.cwi_palette
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Service role manages palette"
ON public.cwi_palette
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);