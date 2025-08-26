-- Allow demo uploads by temporarily adding policies for anonymous users
-- This will enable uploads to work while we set up Google OAuth

-- Allow anonymous video uploads for demo
CREATE POLICY "Allow demo video uploads" 
ON public.videos 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Allow anonymous video viewing for demo
CREATE POLICY "Allow demo video viewing" 
ON public.videos 
FOR SELECT 
TO anon
USING (true);

-- Allow anonymous video updates for demo (needed for setting storage_path)
CREATE POLICY "Allow demo video updates" 
ON public.videos 
FOR UPDATE 
TO anon
USING (true);

-- Allow anonymous storage access for video uploads
CREATE POLICY "Allow demo video storage uploads"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Allow demo video storage viewing"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'videos');

-- Allow anonymous tracks, transcript_segments, and emotion_spans for demo
CREATE POLICY "Allow demo tracks creation"
ON public.tracks
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow demo tracks viewing"
ON public.tracks
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow demo transcript_segments creation"
ON public.transcript_segments
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow demo transcript_segments viewing"
ON public.transcript_segments
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow demo emotion_spans creation"
ON public.emotion_spans
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow demo emotion_spans viewing"
ON public.emotion_spans
FOR SELECT
TO anon
USING (true);