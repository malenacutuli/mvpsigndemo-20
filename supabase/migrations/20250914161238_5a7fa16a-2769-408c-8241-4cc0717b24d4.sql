-- Fix RLS to allow public access to audio descriptions on public videos with status 'ready' or 'uploaded'

-- Drop the existing restrictive policy (if present)
DROP POLICY IF EXISTS "Public can view audio descriptions for public videos" ON public.audio_descriptions;

-- Recreate policy to allow both 'ready' and 'uploaded' statuses
CREATE POLICY "Public can view audio descriptions for public videos"
ON public.audio_descriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.videos
    WHERE videos.id = audio_descriptions.video_id
      AND videos.is_public = true
      AND videos.status = ANY (ARRAY['ready'::video_status, 'uploaded'::video_status])
  )
);
