-- Extend transcript_segments table to support Captions with Intention methodology
ALTER TABLE transcript_segments 
ADD COLUMN language text NOT NULL DEFAULT 'en',
ADD COLUMN emphasis text DEFAULT 'normal' CHECK (emphasis IN ('normal', 'loud', 'quiet')),
ADD COLUMN pitch text DEFAULT 'normal' CHECK (pitch IN ('normal', 'high', 'low')),
ADD COLUMN speaker_color text DEFAULT '#3B82F6',
ADD COLUMN is_off_camera boolean DEFAULT false,
ADD COLUMN segment_type text DEFAULT 'dialogue' CHECK (segment_type IN ('dialogue', 'soundeffect', 'music'));

-- Create unique index for video_id + language + start_time to prevent duplicates
CREATE UNIQUE INDEX idx_transcript_segments_unique ON transcript_segments (video_id, language, start_time);

-- Create audio descriptions table
CREATE TABLE audio_descriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL,
  language text NOT NULL DEFAULT 'en',
  start_time numeric NOT NULL,
  end_time numeric NOT NULL,
  description text NOT NULL,
  description_type text DEFAULT 'visual' CHECK (description_type IN ('visual', 'action', 'emotion', 'setting')),
  confidence numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audio_descriptions
ALTER TABLE audio_descriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for audio_descriptions
CREATE POLICY "Users can view audio descriptions for their videos" 
ON audio_descriptions FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM videos 
  WHERE videos.id = audio_descriptions.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "Users can insert audio descriptions for their videos" 
ON audio_descriptions FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM videos 
  WHERE videos.id = audio_descriptions.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "Users can update audio descriptions for their videos" 
ON audio_descriptions FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM videos 
  WHERE videos.id = audio_descriptions.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "Users can delete audio descriptions for their videos" 
ON audio_descriptions FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM videos 
  WHERE videos.id = audio_descriptions.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "System can manage audio descriptions" 
ON audio_descriptions FOR ALL 
USING (current_setting('role') = 'service_role');

-- Create content generation cache table
CREATE TABLE content_generation_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL,
  language text NOT NULL DEFAULT 'en',
  content_type text NOT NULL CHECK (content_type IN ('transcript', 'captions', 'audio_description', 'dubbing', 'translation')),
  generation_params jsonb, -- Store parameters used for generation (voice, model, etc.)
  result_data jsonb NOT NULL, -- Store the generated content
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on content_generation_cache
ALTER TABLE content_generation_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for content_generation_cache
CREATE POLICY "Users can view generation cache for their videos" 
ON content_generation_cache FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM videos 
  WHERE videos.id = content_generation_cache.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "Users can insert generation cache for their videos" 
ON content_generation_cache FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM videos 
  WHERE videos.id = content_generation_cache.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "Users can update generation cache for their videos" 
ON content_generation_cache FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM videos 
  WHERE videos.id = content_generation_cache.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "Users can delete generation cache for their videos" 
ON content_generation_cache FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM videos 
  WHERE videos.id = content_generation_cache.video_id 
  AND videos.user_id = auth.uid()
));

CREATE POLICY "System can manage generation cache" 
ON content_generation_cache FOR ALL 
USING (current_setting('role') = 'service_role');

-- Create indexes for better performance
CREATE INDEX idx_audio_descriptions_video_language ON audio_descriptions (video_id, language);
CREATE INDEX idx_audio_descriptions_time ON audio_descriptions (video_id, start_time);
CREATE INDEX idx_content_cache_video_type ON content_generation_cache (video_id, content_type, language);

-- Create updated_at trigger for audio_descriptions
CREATE TRIGGER update_audio_descriptions_updated_at
  BEFORE UPDATE ON audio_descriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for content_generation_cache
CREATE TRIGGER update_content_cache_updated_at
  BEFORE UPDATE ON content_generation_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();