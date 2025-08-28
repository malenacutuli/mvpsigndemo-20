-- Fix transcript_segments security vulnerabilities
-- Remove dangerous demo policies that expose all transcripts to anonymous users

-- Drop all the dangerous demo policies
DROP POLICY IF EXISTS "Allow demo transcript_segments viewing" ON public.transcript_segments;
DROP POLICY IF EXISTS "Allow demo transcript_segments creation" ON public.transcript_segments;
DROP POLICY IF EXISTS "Allow anonymous transcript viewing for demo" ON public.transcript_segments;
DROP POLICY IF EXISTS "Allow anonymous transcript creation for demo" ON public.transcript_segments;

-- Drop existing user policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view transcript segments for their videos" ON public.transcript_segments;
DROP POLICY IF EXISTS "Users can insert transcript segments for their videos" ON public.transcript_segments;

-- Create secure policies

-- Policy 1: Authenticated users can view transcripts for their own videos
CREATE POLICY "Video owners can view their transcripts" 
ON public.transcript_segments 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = transcript_segments.video_id 
    AND videos.user_id = auth.uid()
  )
);

-- Policy 2: Authenticated users can insert transcripts for their own videos
CREATE POLICY "Video owners can create transcripts" 
ON public.transcript_segments 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = transcript_segments.video_id 
    AND videos.user_id = auth.uid()
  )
);

-- Policy 3: Allow anonymous access ONLY for embedded videos (needed for embed player)
CREATE POLICY "Anonymous access for embedded videos only" 
ON public.transcript_segments 
FOR SELECT 
USING (
  auth.uid() IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = transcript_segments.video_id 
    AND videos.embed_enabled = true
  )
);

-- Policy 4: System/service role can manage all transcripts (for processing)
CREATE POLICY "System can manage transcripts" 
ON public.transcript_segments 
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

-- Ensure RLS is enabled
ALTER TABLE public.transcript_segments ENABLE ROW LEVEL SECURITY;