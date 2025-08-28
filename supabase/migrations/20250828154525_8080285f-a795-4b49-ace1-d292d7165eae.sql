-- COMPREHENSIVE SECURITY FIXES

-- 1. Make videos storage bucket PRIVATE (critical security fix)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'videos';

-- 2. Fix videos table - Remove dangerous demo policies
DROP POLICY IF EXISTS "Allow demo video viewing" ON public.videos;
DROP POLICY IF EXISTS "Allow demo video uploads" ON public.videos;
DROP POLICY IF EXISTS "Allow demo video updates" ON public.videos;
DROP POLICY IF EXISTS "Allow anonymous video viewing for demo" ON public.videos;
DROP POLICY IF EXISTS "Allow anonymous video uploads for demo" ON public.videos;

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

-- 3. Fix tracks table - Remove dangerous demo policies
DROP POLICY IF EXISTS "Allow demo tracks viewing" ON public.tracks;
DROP POLICY IF EXISTS "Allow demo tracks creation" ON public.tracks;
DROP POLICY IF EXISTS "Allow anonymous tracks viewing for demo" ON public.tracks;
DROP POLICY IF EXISTS "Allow anonymous tracks creation for demo" ON public.tracks;

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

-- 4. Fix emotion_spans table - Remove dangerous demo policies
DROP POLICY IF EXISTS "Allow demo emotion_spans viewing" ON public.emotion_spans;
DROP POLICY IF EXISTS "Allow demo emotion_spans creation" ON public.emotion_spans;
DROP POLICY IF EXISTS "Allow anonymous emotion spans viewing for demo" ON public.emotion_spans;
DROP POLICY IF EXISTS "Allow anonymous emotion spans creation for demo" ON public.emotion_spans;

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

-- 5. Fix profiles table - Prevent role escalation
DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON public.profiles;

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

-- 6. Harden database functions with proper search_path
CREATE OR REPLACE FUNCTION public.generate_embed_token(video_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN encode(digest(video_uuid::text || extract(epoch from now())::text || random()::text, 'sha256'), 'hex');
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_embed_access(video_uuid uuid, token text DEFAULT NULL, referrer_domain text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  video_record RECORD;
BEGIN
  -- Get video embed settings
  SELECT embed_enabled, embed_domains, embed_token 
  INTO video_record
  FROM videos 
  WHERE id = video_uuid;
  
  -- Check if video exists and embedding is enabled
  IF NOT FOUND OR NOT video_record.embed_enabled THEN
    RETURN false;
  END IF;
  
  -- Check token if provided
  IF token IS NOT NULL AND video_record.embed_token IS NOT NULL THEN
    IF token != video_record.embed_token THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Check domain whitelist if provided
  IF referrer_domain IS NOT NULL AND video_record.embed_domains IS NOT NULL THEN
    IF NOT (referrer_domain = ANY(video_record.embed_domains)) THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$function$;

-- 7. Add system role policies for processing
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