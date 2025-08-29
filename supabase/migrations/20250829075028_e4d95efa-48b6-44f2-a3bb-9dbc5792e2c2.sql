-- Create characters table to store character data for videos
CREATE TABLE public.characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('main', 'supporting', 'minor')),
  color TEXT NOT NULL,
  is_off_camera BOOLEAN DEFAULT false,
  voice_id TEXT,
  voice_name TEXT,
  voice_type TEXT,
  emphasis TEXT DEFAULT 'normal',
  pitch TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Create policies for character access
CREATE POLICY "Users can view characters for their videos" 
ON public.characters 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.videos 
  WHERE videos.id = characters.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "Users can create characters for their videos" 
ON public.characters 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.videos 
  WHERE videos.id = characters.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "Users can update characters for their videos" 
ON public.characters 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.videos 
  WHERE videos.id = characters.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "Users can delete characters for their videos" 
ON public.characters 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.videos 
  WHERE videos.id = characters.video_id 
  AND videos.user_id = auth.uid()
));

-- System can manage characters
CREATE POLICY "System can manage characters" 
ON public.characters 
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();