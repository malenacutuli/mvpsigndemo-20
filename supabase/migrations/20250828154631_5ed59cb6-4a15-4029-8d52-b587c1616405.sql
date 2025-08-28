-- COMPREHENSIVE SECURITY FIXES - Part 2
-- Properly handle existing policies

-- 1. Make videos storage bucket PRIVATE (critical security fix)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'videos';

-- 2. Fix videos table - Drop ALL existing policies first
DROP POLICY IF EXISTS "Allow demo video viewing" ON public.videos;
DROP POLICY IF EXISTS "Allow demo video uploads" ON public.videos;
DROP POLICY IF EXISTS "Allow demo video updates" ON public.videos;
DROP POLICY IF EXISTS "Allow anonymous video viewing for demo" ON public.videos;
DROP POLICY IF EXISTS "Allow anonymous video uploads for demo" ON public.videos;
DROP POLICY IF EXISTS "Users can view their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can insert their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;

-- Recreate videos policies securely
CREATE POLICY "Users can view their own videos" 
ON public.videos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos" 
ON public.videos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" 
ON public.videos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos" 
ON public.videos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow anonymous access ONLY for embedded videos
CREATE POLICY "Anonymous access for embedded videos only" 
ON public.videos 
FOR SELECT 
USING (
  auth.uid() IS NULL 
  AND embed_enabled = true
);

-- 3. Fix tracks table - Drop ALL existing policies first
DROP POLICY IF EXISTS "Allow demo tracks viewing" ON public.tracks;
DROP POLICY IF EXISTS "Allow demo tracks creation" ON public.tracks;
DROP POLICY IF EXISTS "Allow anonymous tracks viewing for demo" ON public.tracks;
DROP POLICY IF EXISTS "Allow anonymous tracks creation for demo" ON public.tracks;
DROP POLICY IF EXISTS "Users can view tracks for their videos" ON public.tracks;
DROP POLICY IF EXISTS "Users can insert tracks for their videos" ON public.tracks;
DROP POLICY IF EXISTS "Users can update tracks for their videos" ON public.tracks;

-- Recreate tracks policies securely
CREATE POLICY "Users can view tracks for their videos" 
ON public.tracks 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = tracks.video_id 
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert tracks for their videos" 
ON public.tracks 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = tracks.video_id 
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update tracks for their videos" 
ON public.tracks 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = tracks.video_id 
    AND videos.user_id = auth.uid()
  )
);

-- Allow anonymous access ONLY for embedded videos
CREATE POLICY "Anonymous access for embedded tracks only" 
ON public.tracks 
FOR SELECT 
USING (
  auth.uid() IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = tracks.video_id 
    AND videos.embed_enabled = true
  )
);

-- 4. Fix emotion_spans table - Drop ALL existing policies first
DROP POLICY IF EXISTS "Allow demo emotion_spans viewing" ON public.emotion_spans;
DROP POLICY IF EXISTS "Allow demo emotion_spans creation" ON public.emotion_spans;
DROP POLICY IF EXISTS "Allow anonymous emotion spans viewing for demo" ON public.emotion_spans;
DROP POLICY IF EXISTS "Allow anonymous emotion spans creation for demo" ON public.emotion_spans;
DROP POLICY IF EXISTS "Users can view emotion spans for their videos" ON public.emotion_spans;
DROP POLICY IF EXISTS "Users can insert emotion spans for their videos" ON public.emotion_spans;

-- Recreate emotion_spans policies securely
CREATE POLICY "Users can view emotion spans for their videos" 
ON public.emotion_spans 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = emotion_spans.video_id 
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert emotion spans for their videos" 
ON public.emotion_spans 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = emotion_spans.video_id 
    AND videos.user_id = auth.uid()
  )
);

-- Allow anonymous access ONLY for embedded videos
CREATE POLICY "Anonymous access for embedded emotion spans only" 
ON public.emotion_spans 
FOR SELECT 
USING (
  auth.uid() IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = emotion_spans.video_id 
    AND videos.embed_enabled = true
  )
);

-- 5. Fix profiles table - Drop existing policy first
DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update their own profile (no role changes)" ON public.profiles;

-- Recreate with role protection
CREATE POLICY "Authenticated users can update their own profile (no role changes)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Allow role changes only if user is already admin
    (OLD.role = 'admin' AND NEW.role IN ('admin', 'user')) 
    OR 
    -- Prevent role changes for non-admin users
    (OLD.role != 'admin' AND NEW.role = OLD.role)
  )
);

-- 6. Add system role policies for processing
CREATE POLICY "System can manage videos" 
ON public.videos 
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

CREATE POLICY "System can manage tracks" 
ON public.tracks 
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

CREATE POLICY "System can manage emotion spans" 
ON public.emotion_spans 
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);