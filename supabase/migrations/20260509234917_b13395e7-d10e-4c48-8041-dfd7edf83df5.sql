
-- 1. transcription_test_results: remove user-readable access (api_key_used column was exposed)
DROP POLICY IF EXISTS "Users can view test results for their videos" ON public.transcription_test_results;

-- 2. project_collaborators: replace public-read with ownership-scoped policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.project_collaborators;
CREATE POLICY "Collaborators and owners can view collaborator rows"
ON public.project_collaborators
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.video_projects vp
    WHERE vp.id = project_collaborators.project_id
      AND vp.created_by = auth.uid()
  )
);

-- 3. usage_notifications: restrict insert to service_role only
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.usage_notifications;
CREATE POLICY "Service role can insert notifications"
ON public.usage_notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. Storage: social-clips bucket — restrict writes to owner folder
DROP POLICY IF EXISTS "Social Clips l6c7ur_1" ON storage.objects;
DROP POLICY IF EXISTS "Social Clips l6c7ur_2" ON storage.objects;
DROP POLICY IF EXISTS "Social Clips l6c7ur_3" ON storage.objects;

CREATE POLICY "social-clips owner can insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'social-clips' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "social-clips owner can update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'social-clips' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'social-clips' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "social-clips owner can delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'social-clips' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Storage: Axessvideo bucket — restrict reads + writes to owner folder
DROP POLICY IF EXISTS "Axessvideo 4oyulp_0" ON storage.objects;
DROP POLICY IF EXISTS "Axessvideo 4oyulp_1" ON storage.objects;
DROP POLICY IF EXISTS "Axessvideo 4oyulp_2" ON storage.objects;
DROP POLICY IF EXISTS "Axessvideo 4oyulp_3" ON storage.objects;

CREATE POLICY "Axessvideo owner can read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'Axessvideo' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Axessvideo owner can insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'Axessvideo' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Axessvideo owner can update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'Axessvideo' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'Axessvideo' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Axessvideo owner can delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'Axessvideo' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 6. Storage: processed-videos bucket — add ownership check
DROP POLICY IF EXISTS "Users can upload processed videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their processed videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their processed videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view processed videos" ON storage.objects;

CREATE POLICY "processed-videos owner can read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'processed-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "processed-videos owner can insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'processed-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "processed-videos owner can update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'processed-videos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'processed-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "processed-videos owner can delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'processed-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
