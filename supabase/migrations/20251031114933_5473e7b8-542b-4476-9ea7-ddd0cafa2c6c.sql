-- Drop any duplicate/backup tables
DROP TABLE IF EXISTS public.speaker_mappings_backup CASCADE;
DROP TABLE IF EXISTS private.speaker_mappings CASCADE;

-- Drop the existing speaker_mappings table to recreate with correct schema
DROP TABLE IF EXISTS public.speaker_mappings CASCADE;

-- Create the canonical speaker_mappings table with simplified schema
CREATE TABLE public.speaker_mappings (
  video_id uuid NOT NULL,
  language text NOT NULL,
  mappings jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (video_id, language)
);

-- Enable RLS
ALTER TABLE public.speaker_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY sm_select ON public.speaker_mappings 
  FOR SELECT 
  USING (true);

CREATE POLICY sm_insert ON public.speaker_mappings 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY sm_update ON public.speaker_mappings 
  FOR UPDATE 
  USING (true);

CREATE POLICY sm_delete ON public.speaker_mappings 
  FOR DELETE 
  USING (true);

-- Note: Any existing mappings data will be lost with this recreation.
-- The transcription process will recreate mappings as needed.