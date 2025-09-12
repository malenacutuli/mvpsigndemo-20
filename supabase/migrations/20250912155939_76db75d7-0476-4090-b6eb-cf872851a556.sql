-- Add public visibility and view tracking to videos table
ALTER TABLE public.videos 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN published_at TIMESTAMP WITH TIME ZONE NULL;

-- Create public_video_views table for detailed view tracking
CREATE TABLE public.public_video_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  viewer_ip INET NULL,
  user_agent TEXT NULL,
  referrer TEXT NULL,
  view_duration_seconds INTEGER NULL,
  watched_percentage NUMERIC(5,2) NULL,
  accessibility_features_used JSONB NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id TEXT NULL
);

-- Enable RLS on public_video_views
ALTER TABLE public.public_video_views ENABLE ROW LEVEL SECURITY;

-- Create policies for public_video_views
CREATE POLICY "Allow anonymous view tracking" 
ON public.public_video_views 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Video owners can view their video analytics" 
ON public.public_video_views 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.videos 
  WHERE videos.id = public_video_views.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "System can manage view tracking" 
ON public.public_video_views 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Create policy to allow public viewing of public videos
CREATE POLICY "Allow public viewing of public videos" 
ON public.videos 
FOR SELECT 
USING (is_public = true);

-- Create function to increment view count
CREATE OR REPLACE FUNCTION public.increment_video_views(video_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.videos 
  SET view_count = view_count + 1 
  WHERE id = video_uuid AND is_public = true;
END;
$$;

-- Add index for better performance on public video queries
CREATE INDEX idx_videos_public_published ON public.videos(is_public, published_at) WHERE is_public = true;