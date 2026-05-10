
-- 1) embed_analytics: replace open authenticated INSERT with embed_enabled check
DROP POLICY IF EXISTS "Authenticated users can track analytics" ON public.embed_analytics;
CREATE POLICY "Authenticated users can track analytics"
ON public.embed_analytics
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = embed_analytics.video_id
      AND v.embed_enabled = true
  )
);

-- 2) public_video_views: restrict both anon and authenticated INSERT
DROP POLICY IF EXISTS "Allow anonymous view tracking" ON public.public_video_views;
DROP POLICY IF EXISTS "Authenticated users can track video views" ON public.public_video_views;

CREATE POLICY "Anonymous can track views on public/embed videos"
ON public.public_video_views
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = public_video_views.video_id
      AND (v.is_public = true OR v.embed_enabled = true)
  )
);

CREATE POLICY "Authenticated can track views on public/embed videos"
ON public.public_video_views
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = public_video_views.video_id
      AND (v.is_public = true OR v.embed_enabled = true)
  )
);

-- 3) Ensure v_transcript_segments_resolved view enforces invoker RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_transcript_segments_resolved') THEN
    EXECUTE 'ALTER VIEW public.v_transcript_segments_resolved SET (security_invoker = true)';
  END IF;
END $$;
