-- Temporarily allow anonymous video uploads for demo purposes
-- This adds a policy that allows inserts when there's no authenticated user

CREATE POLICY "Allow anonymous video uploads for demo" 
ON public.videos 
FOR INSERT 
WITH CHECK (
  -- Allow insert if no auth user (for demo) OR if auth user matches user_id
  auth.uid() IS NULL OR auth.uid() = user_id
);

-- Also allow anonymous users to view videos for demo
CREATE POLICY "Allow anonymous video viewing for demo" 
ON public.videos 
FOR SELECT 
USING (
  -- Allow viewing if no auth user (for demo) OR if auth user matches user_id
  auth.uid() IS NULL OR auth.uid() = user_id
);

-- Update other tables to allow anonymous access for demo
CREATE POLICY "Allow anonymous transcript viewing for demo" 
ON public.transcript_segments 
FOR SELECT 
USING (
  auth.uid() IS NULL OR 
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = transcript_segments.video_id 
    AND (videos.user_id = auth.uid() OR auth.uid() IS NULL)
  )
);

CREATE POLICY "Allow anonymous transcript creation for demo" 
ON public.transcript_segments 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NULL OR 
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = transcript_segments.video_id 
    AND (videos.user_id = auth.uid() OR auth.uid() IS NULL)
  )
);

CREATE POLICY "Allow anonymous emotion spans viewing for demo" 
ON public.emotion_spans 
FOR SELECT 
USING (
  auth.uid() IS NULL OR 
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = emotion_spans.video_id 
    AND (videos.user_id = auth.uid() OR auth.uid() IS NULL)
  )
);

CREATE POLICY "Allow anonymous emotion spans creation for demo" 
ON public.emotion_spans 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NULL OR 
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = emotion_spans.video_id 
    AND (videos.user_id = auth.uid() OR auth.uid() IS NULL)
  )
);

CREATE POLICY "Allow anonymous tracks viewing for demo" 
ON public.tracks 
FOR SELECT 
USING (
  auth.uid() IS NULL OR 
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = tracks.video_id 
    AND (videos.user_id = auth.uid() OR auth.uid() IS NULL)
  )
);

CREATE POLICY "Allow anonymous tracks creation for demo" 
ON public.tracks 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NULL OR 
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = tracks.video_id 
    AND (videos.user_id = auth.uid() OR auth.uid() IS NULL)
  )
);

-- Allow anonymous storage uploads for videos bucket
CREATE POLICY "Allow anonymous video uploads to storage" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Allow anonymous video access from storage" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'videos');