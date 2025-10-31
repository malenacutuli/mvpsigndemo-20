-- Prevent updates to identity fields when frozen
CREATE OR REPLACE FUNCTION prevent_identity_change_when_frozen()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM transcript_freeze 
    WHERE video_id = NEW.video_id 
    AND language = NEW.language
  ) THEN
    -- Allow only these fields to be updated
    IF OLD.speaker IS DISTINCT FROM NEW.speaker OR
       OLD.speaker_color IS DISTINCT FROM NEW.speaker_color OR
       OLD.speaker_asr_label IS DISTINCT FROM NEW.speaker_asr_label OR
       OLD.character_id IS DISTINCT FROM NEW.character_id THEN
      RAISE EXCEPTION 'Cannot modify speaker identity after transcript is frozen';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_freeze_on_identity_fields
  BEFORE UPDATE ON transcript_segments_clean
  FOR EACH ROW
  EXECUTE FUNCTION prevent_identity_change_when_frozen();