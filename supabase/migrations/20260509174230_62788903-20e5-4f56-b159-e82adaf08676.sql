
-- 1. feature_usage: restrict INSERT to authenticated users for their own user_id
DROP POLICY IF EXISTS "Service role can insert usage" ON public.feature_usage;
CREATE POLICY "Users can insert their own usage"
  ON public.feature_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role can manage usage"
  ON public.feature_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. caption_templates: add DELETE policy for owners
CREATE POLICY "Users can delete own templates"
  ON public.caption_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- 3. SECURITY INVOKER on the view so RLS of underlying tables is enforced
ALTER VIEW public.v_transcript_segments_resolved SET (security_invoker = on);

-- 4. Replace all bypassable current_setting('role')='service_role' policies
--    with proper policies scoped to the service_role.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%current_setting(''role''::text) = ''service_role''::text%'
        OR with_check LIKE '%current_setting(''role''::text) = ''service_role''::text%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true)',
      r.policyname, r.tablename
    );
  END LOOP;
END$$;

-- 5. Tighten storage SELECT policies for sign language clip buckets so the
--    public can only read clips belonging to public + ready/uploaded videos.
--    Path layout: {video_id}/{filename}
DROP POLICY IF EXISTS "Users can view sign language clips" ON storage.objects;
CREATE POLICY "Public can view sign language clips for public videos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'sign-language-clips'
    AND EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id::text = (storage.foldername(name))[1]
        AND v.is_public = true
        AND v.status = ANY (ARRAY['ready'::video_status, 'uploaded'::video_status])
    )
  );
CREATE POLICY "Owners can view their sign language clips"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'sign-language-clips'
    AND EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id::text = (storage.foldername(name))[1]
        AND v.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "asl_public_read_sign_language_clips" ON storage.objects;
CREATE POLICY "asl_public_read_sign_language_clips_public_videos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'sign_language_clips'
    AND EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id::text = (storage.foldername(name))[1]
        AND v.is_public = true
        AND v.status = ANY (ARRAY['ready'::video_status, 'uploaded'::video_status])
    )
  );
CREATE POLICY "asl_owner_read_sign_language_clips"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'sign_language_clips'
    AND EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id::text = (storage.foldername(name))[1]
        AND v.user_id = auth.uid()
    )
  );
