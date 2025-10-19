-- Add character_id column to transcript_segments for proper character tracking
ALTER TABLE public.transcript_segments 
ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transcript_segments_character_id 
ON public.transcript_segments(character_id);

-- Create function to sync character properties to segments
CREATE OR REPLACE FUNCTION public.sync_character_properties()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all segments linked to this character across all languages
  UPDATE public.transcript_segments
  SET 
    speaker = NEW.name,
    speaker_color = NEW.color,
    is_off_camera = NEW.is_off_camera,
    emphasis = NEW.emphasis,
    pitch = NEW.pitch
  WHERE character_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically sync character changes to segments
DROP TRIGGER IF EXISTS character_properties_sync ON public.characters;
CREATE TRIGGER character_properties_sync
AFTER UPDATE OF name, color, is_off_camera, emphasis, pitch ON public.characters
FOR EACH ROW
EXECUTE FUNCTION public.sync_character_properties();