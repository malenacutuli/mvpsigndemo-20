
-- ============================================
-- Fix critical storage + RLS findings
-- ============================================

-- 1) project_collaborators: INSERT must require project ownership
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.project_collaborators;
CREATE POLICY "Only project owners can add collaborators"
ON public.project_collaborators
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.video_projects vp
    WHERE vp.id = project_collaborators.project_id
      AND vp.created_by = auth.uid()
  )
);

-- 2) videos bucket: drop overly broad policies
DROP POLICY IF EXISTS "Public video access" ON storage.objects;
DROP POLICY IF EXISTS "Videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Videos bucket - full access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to videos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;

-- Owner-scoped INSERT/UPDATE/DELETE on videos bucket
CREATE POLICY "videos_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "videos_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "videos_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3) dubbed-audio: restrict "System can manage all dubbed audio" to service_role
DROP POLICY IF EXISTS "System can manage all dubbed audio" ON storage.objects;
CREATE POLICY "Service role manages dubbed audio"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'dubbed-audio')
WITH CHECK (bucket_id = 'dubbed-audio');

-- 4) sign_language_clips (underscore) bucket: enforce path-based ownership
DROP POLICY IF EXISTS "asl_auth_insert_sign_language_clips" ON storage.objects;
DROP POLICY IF EXISTS "asl_auth_update_sign_language_clips" ON storage.objects;
DROP POLICY IF EXISTS "asl_auth_delete_sign_language_clips" ON storage.objects;

CREATE POLICY "sign_language_clips_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'sign_language_clips'
  AND EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.user_id = auth.uid()
  )
);

CREATE POLICY "sign_language_clips_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'sign_language_clips'
  AND EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.user_id = auth.uid()
  )
);

CREATE POLICY "sign_language_clips_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'sign_language_clips'
  AND EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.user_id = auth.uid()
  )
);

-- 5) sign-language-clips (hyphen) INSERT: enforce ownership
DROP POLICY IF EXISTS "Users can upload sign language clips" ON storage.objects;
CREATE POLICY "sign-language-clips_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'sign-language-clips'
  AND EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.user_id = auth.uid()
  )
);

-- 6) thumbnails: drop unscoped INSERT
DROP POLICY IF EXISTS "Users can upload thumbnails" ON storage.objects;
