-- Create table for Twelve Labs video analysis mappings
CREATE TABLE public.twelve_labs_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  index_id TEXT,
  task_id TEXT,
  tl_video_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  UNIQUE(asset_id)
);

-- Create table for storing video analysis results 
CREATE TABLE public.video_analysis_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  language TEXT DEFAULT 'en'::text
);

-- Enable RLS
ALTER TABLE public.twelve_labs_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policies for twelve_labs_mappings
CREATE POLICY "Users can manage mappings for their videos" 
ON public.twelve_labs_mappings 
FOR ALL 
USING (EXISTS ( 
  SELECT 1 FROM videos 
  WHERE videos.id = twelve_labs_mappings.asset_id 
  AND videos.user_id = auth.uid()
))
WITH CHECK (EXISTS ( 
  SELECT 1 FROM videos 
  WHERE videos.id = twelve_labs_mappings.asset_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "System can manage all mappings" 
ON public.twelve_labs_mappings 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Create policies for video_analysis_results
CREATE POLICY "Users can manage analysis results for their videos" 
ON public.video_analysis_results 
FOR ALL 
USING (EXISTS ( 
  SELECT 1 FROM videos 
  WHERE videos.id = video_analysis_results.asset_id 
  AND videos.user_id = auth.uid()
))
WITH CHECK (EXISTS ( 
  SELECT 1 FROM videos 
  WHERE videos.id = video_analysis_results.asset_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "System can manage all analysis results" 
ON public.video_analysis_results 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Create updated_at trigger
CREATE TRIGGER update_twelve_labs_mappings_updated_at
  BEFORE UPDATE ON public.twelve_labs_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();