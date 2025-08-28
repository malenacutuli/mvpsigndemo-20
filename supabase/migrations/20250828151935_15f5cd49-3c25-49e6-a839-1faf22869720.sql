-- Create embed analytics table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.embed_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL,
  embed_token text,
  referrer_domain text,
  user_agent text,
  ip_address inet,
  view_count integer DEFAULT 1,
  duration_watched numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on embed_analytics
ALTER TABLE public.embed_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for embed_analytics
CREATE POLICY "Users can view analytics for their videos" 
ON public.embed_analytics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM videos 
  WHERE videos.id = embed_analytics.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "Allow anonymous embed analytics creation" 
ON public.embed_analytics 
FOR INSERT 
WITH CHECK (true);

-- Create function to generate embed tokens
CREATE OR REPLACE FUNCTION public.generate_embed_token(video_uuid uuid)
RETURNS text AS $$
BEGIN
  RETURN encode(digest(video_uuid::text || extract(epoch from now())::text || random()::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate embed access
CREATE OR REPLACE FUNCTION public.validate_embed_access(
  video_uuid uuid,
  token text DEFAULT NULL,
  referrer_domain text DEFAULT NULL
)
RETURNS boolean AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_embed_analytics_video_id ON public.embed_analytics(video_id);
CREATE INDEX IF NOT EXISTS idx_embed_analytics_created_at ON public.embed_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_videos_embed_enabled ON public.videos(embed_enabled) WHERE embed_enabled = true;