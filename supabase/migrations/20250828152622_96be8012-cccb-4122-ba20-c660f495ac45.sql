-- Fix embed_analytics security issues
-- Remove any potentially permissive policies and create strict ones

-- First, drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow anonymous embed analytics creation" ON public.embed_analytics;
DROP POLICY IF EXISTS "Users can view analytics for their videos" ON public.embed_analytics;

-- Create strict policies for embed_analytics

-- Policy 1: Only video owners can view analytics for their own videos
CREATE POLICY "Video owners can view their analytics" 
ON public.embed_analytics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = embed_analytics.video_id 
    AND videos.user_id = auth.uid()
    AND auth.uid() IS NOT NULL
  )
);

-- Policy 2: Allow anonymous insertion of analytics data (needed for embed tracking)
-- But restrict what can be inserted to prevent abuse
CREATE POLICY "Allow embed analytics tracking" 
ON public.embed_analytics 
FOR INSERT 
WITH CHECK (
  -- Ensure video exists and has embedding enabled
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = embed_analytics.video_id 
    AND videos.embed_enabled = true
  )
);

-- Policy 3: System/service role can manage all analytics (for edge function)
CREATE POLICY "System can manage analytics" 
ON public.embed_analytics 
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

-- Ensure RLS is enabled
ALTER TABLE public.embed_analytics ENABLE ROW LEVEL SECURITY;