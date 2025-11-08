-- Create storage bucket for dubbed audio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dubbed-audio',
  'dubbed-audio',
  true,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3']
)
ON CONFLICT (id) DO NOTHING;

-- Create video_dubbing table
CREATE TABLE IF NOT EXISTS public.video_dubbing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  source_language TEXT NOT NULL DEFAULT 'en',
  target_language TEXT NOT NULL,
  
  -- Content
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  
  -- Audio
  audio_url TEXT,
  audio_generation_status TEXT DEFAULT 'pending' CHECK (audio_generation_status IN ('pending', 'processing', 'completed', 'failed')),
  audio_error_message TEXT,
  audio_generated_at TIMESTAMPTZ,
  
  -- Voice configuration
  voice_id TEXT,
  voice_name TEXT,
  
  -- Metadata
  generation_params JSONB DEFAULT '{}'::jsonb,
  estimated_duration NUMERIC,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one dubbing per video+language combo
  UNIQUE(video_id, target_language)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_dubbing_video_id ON public.video_dubbing(video_id);
CREATE INDEX IF NOT EXISTS idx_video_dubbing_target_language ON public.video_dubbing(target_language);
CREATE INDEX IF NOT EXISTS idx_video_dubbing_status ON public.video_dubbing(audio_generation_status);

-- Enable RLS
ALTER TABLE public.video_dubbing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view dubbing for their videos" 
ON public.video_dubbing FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = video_dubbing.video_id 
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert dubbing for their videos" 
ON public.video_dubbing FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = video_dubbing.video_id 
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update dubbing for their videos" 
ON public.video_dubbing FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = video_dubbing.video_id 
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage all dubbing" 
ON public.video_dubbing FOR ALL 
USING (current_setting('role') = 'service_role');

CREATE POLICY "Public can view dubbing for public videos" 
ON public.video_dubbing FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = video_dubbing.video_id 
    AND videos.is_public = true 
    AND videos.status IN ('ready', 'uploaded')
  )
);

-- Storage policies for dubbed-audio bucket
CREATE POLICY "Users can upload dubbed audio for their videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'dubbed-audio' AND
  ((storage.foldername(name))[1])::uuid IN (
    SELECT id FROM public.videos WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update dubbed audio for their videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'dubbed-audio' AND
  ((storage.foldername(name))[1])::uuid IN (
    SELECT id FROM public.videos WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Public can view dubbed audio for public videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'dubbed-audio' AND
  ((storage.foldername(name))[1])::uuid IN (
    SELECT id FROM public.videos WHERE is_public = true
  )
);

CREATE POLICY "System can manage all dubbed audio"
ON storage.objects FOR ALL
USING (bucket_id = 'dubbed-audio');