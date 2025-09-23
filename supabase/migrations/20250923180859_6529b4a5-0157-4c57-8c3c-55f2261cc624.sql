-- Create sign_language_clips table for storing time-synchronized ASL clips
CREATE TABLE public.sign_language_clips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL,
  transcript_segment_id UUID REFERENCES public.transcript_segments(id) ON DELETE CASCADE,
  start_time_ms INTEGER NOT NULL,
  end_time_ms INTEGER NOT NULL,
  clip_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.sign_language_clips ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view ASL clips for their videos" 
ON public.sign_language_clips 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.videos 
  WHERE videos.id = sign_language_clips.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "Public can view ASL clips for public videos" 
ON public.sign_language_clips 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.videos 
  WHERE videos.id = sign_language_clips.video_id 
  AND videos.is_public = true 
  AND videos.status IN ('ready', 'uploaded')
));

CREATE POLICY "Users can create ASL clips for their videos" 
ON public.sign_language_clips 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.videos 
  WHERE videos.id = sign_language_clips.video_id 
  AND videos.user_id = auth.uid()
) AND auth.uid() = created_by);

CREATE POLICY "Users can update ASL clips for their videos" 
ON public.sign_language_clips 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.videos 
  WHERE videos.id = sign_language_clips.video_id 
  AND videos.user_id = auth.uid()
) AND created_by = auth.uid());

CREATE POLICY "Users can delete ASL clips for their videos" 
ON public.sign_language_clips 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.videos 
  WHERE videos.id = sign_language_clips.video_id 
  AND videos.user_id = auth.uid()
) AND created_by = auth.uid());

-- System can manage all ASL clips
CREATE POLICY "System can manage all ASL clips" 
ON public.sign_language_clips 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Create index for efficient queries
CREATE INDEX idx_sign_language_clips_video_time ON public.sign_language_clips(video_id, start_time_ms, end_time_ms);
CREATE INDEX idx_sign_language_clips_segment ON public.sign_language_clips(transcript_segment_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sign_language_clips_updated_at
BEFORE UPDATE ON public.sign_language_clips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();