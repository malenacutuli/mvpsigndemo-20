-- Allow public access to audio descriptions for public videos
CREATE POLICY "Public can view audio descriptions for public videos" 
ON public.audio_descriptions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = audio_descriptions.video_id 
    AND videos.is_public = true 
    AND videos.status = 'ready'
  )
);