-- Add EAD metadata columns to audio_descriptions table (each column needs separate ADD COLUMN)
ALTER TABLE audio_descriptions ADD COLUMN IF NOT EXISTS estimated_duration NUMERIC;
ALTER TABLE audio_descriptions ADD COLUMN IF NOT EXISTS requires_extension BOOLEAN DEFAULT FALSE;
ALTER TABLE audio_descriptions ADD COLUMN IF NOT EXISTS extension_duration NUMERIC DEFAULT 0;
ALTER TABLE audio_descriptions ADD COLUMN IF NOT EXISTS extension_type TEXT CHECK (extension_type IN ('pause', 'slowdown', 'none')) DEFAULT 'none';
ALTER TABLE audio_descriptions ADD COLUMN IF NOT EXISTS priority_level TEXT CHECK (priority_level IN ('critical', 'important', 'supplementary')) DEFAULT 'important';
ALTER TABLE audio_descriptions ADD COLUMN IF NOT EXISTS gap_duration NUMERIC;

-- Create user preferences table for EAD settings
CREATE TABLE IF NOT EXISTS user_ead_preferences (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  ead_enabled BOOLEAN DEFAULT FALSE,
  max_extension_duration NUMERIC DEFAULT 5.0,
  extension_strategy TEXT CHECK (extension_strategy IN ('pause', 'slowdown', 'hybrid')) DEFAULT 'pause',
  auto_resume BOOLEAN DEFAULT TRUE,
  show_visual_indicator BOOLEAN DEFAULT TRUE,
  skip_shortcut_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_ead_preferences
ALTER TABLE user_ead_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for user_ead_preferences
CREATE POLICY "Users can read own EAD preferences"
  ON user_ead_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own EAD preferences"
  ON user_ead_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own EAD preferences"
  ON user_ead_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audio_descriptions_ead_required 
  ON audio_descriptions(video_id, requires_extension) WHERE requires_extension = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_ead_preferences_user_id
  ON user_ead_preferences(user_id);

-- Add updated_at trigger for user_ead_preferences
CREATE TRIGGER update_user_ead_preferences_updated_at
  BEFORE UPDATE ON user_ead_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();