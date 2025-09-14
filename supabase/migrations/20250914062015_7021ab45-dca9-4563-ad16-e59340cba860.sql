-- Create speaker_mappings table to persist speaker-to-character mappings
CREATE TABLE public.speaker_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  mappings JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one mapping per video/language combination per user
  UNIQUE(video_id, language, created_by)
);

-- Enable RLS
ALTER TABLE public.speaker_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies for speaker mappings
CREATE POLICY "Users can view their own speaker mappings" 
ON public.speaker_mappings 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own speaker mappings" 
ON public.speaker_mappings 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own speaker mappings" 
ON public.speaker_mappings 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own speaker mappings" 
ON public.speaker_mappings 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_speaker_mappings_updated_at
BEFORE UPDATE ON public.speaker_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_speaker_mappings_video_lang ON public.speaker_mappings(video_id, language);
CREATE INDEX idx_speaker_mappings_user ON public.speaker_mappings(created_by);