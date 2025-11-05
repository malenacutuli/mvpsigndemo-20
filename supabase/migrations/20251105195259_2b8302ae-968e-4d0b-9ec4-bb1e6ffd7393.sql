-- =====================================================
-- Standardize and De-duplicate RLS Policies
-- =====================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own API costs" ON public.api_cost_tracking;
DROP POLICY IF EXISTS "Service role full access to API costs" ON public.api_cost_tracking;

DROP POLICY IF EXISTS "Users can freeze transcripts for their videos" ON public.transcript_freeze;
DROP POLICY IF EXISTS "Users view freeze status for their videos" ON public.transcript_freeze;
DROP POLICY IF EXISTS "Service role manages transcript freeze" ON public.transcript_freeze;
DROP POLICY IF EXISTS "System can manage transcript freeze" ON public.transcript_freeze;
DROP POLICY IF EXISTS "Users can freeze their own transcripts" ON public.transcript_freeze;
DROP POLICY IF EXISTS "Users can view freeze status for their videos" ON public.transcript_freeze;
DROP POLICY IF EXISTS "transcript_freeze_system_can_manage" ON public.transcript_freeze;
DROP POLICY IF EXISTS "transcript_freeze_users_can_freeze_their_videos" ON public.transcript_freeze;
DROP POLICY IF EXISTS "transcript_freeze_users_can_view_their_freezes" ON public.transcript_freeze;

DROP POLICY IF EXISTS "Block public access to security events" ON public.security_events;
DROP POLICY IF EXISTS "Service role manages security events" ON public.security_events;
DROP POLICY IF EXISTS "security_events_block_public" ON public.security_events;
DROP POLICY IF EXISTS "security_events_service_only" ON public.security_events;

DROP POLICY IF EXISTS "Users view their export jobs" ON public.export_jobs;
DROP POLICY IF EXISTS "Users create their export jobs" ON public.export_jobs;
DROP POLICY IF EXISTS "Users update their export jobs" ON public.export_jobs;
DROP POLICY IF EXISTS "Service role manages export jobs" ON public.export_jobs;
DROP POLICY IF EXISTS "Users can view own export jobs" ON public.export_jobs;
DROP POLICY IF EXISTS "Users can create own export jobs" ON public.export_jobs;
DROP POLICY IF EXISTS "Users can update own export jobs" ON public.export_jobs;

DROP POLICY IF EXISTS "Public reads color palette" ON public.cwi_palette;
DROP POLICY IF EXISTS "Service role manages palette" ON public.cwi_palette;
DROP POLICY IF EXISTS "cwi_palette_public_read" ON public.cwi_palette;

-- =====================================================
-- API Cost Tracking - User owns data pattern
-- =====================================================
CREATE POLICY "api_cost_user_select"
ON public.api_cost_tracking
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "api_cost_service_all"
ON public.api_cost_tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- Transcript Freeze - Video ownership pattern
-- =====================================================
CREATE POLICY "transcript_freeze_user_insert"
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

CREATE POLICY "transcript_freeze_user_select"
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

CREATE POLICY "transcript_freeze_service_all"
ON public.transcript_freeze
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- Security Events - Service role only
-- =====================================================
CREATE POLICY "security_events_block_users"
ON public.security_events
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "security_events_service_all"
ON public.security_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- Export Jobs - User owns data pattern
-- =====================================================
CREATE POLICY "export_jobs_user_select"
ON public.export_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "export_jobs_user_insert"
ON public.export_jobs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "export_jobs_user_update"
ON public.export_jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "export_jobs_service_all"
ON public.export_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- CWI Palette - Public read-only pattern
-- =====================================================
CREATE POLICY "cwi_palette_public_select"
ON public.cwi_palette
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "cwi_palette_service_all"
ON public.cwi_palette
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);