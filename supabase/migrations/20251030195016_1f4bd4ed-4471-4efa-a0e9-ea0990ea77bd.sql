-- Create table for transcription test results
CREATE TABLE IF NOT EXISTS transcription_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('AssemblyAI-TEST', 'Deepgram', 'TwelveLabs')),
  
  -- Quality metrics
  segment_count INTEGER,
  word_count INTEGER,
  speaker_count INTEGER,
  avg_confidence NUMERIC,
  has_word_timings BOOLEAN,
  
  -- Cost tracking
  api_key_used TEXT CHECK (api_key_used IN ('TEST', 'PRODUCTION')),
  estimated_cost_usd NUMERIC,
  
  -- Timing
  processing_time_ms INTEGER,
  video_duration_sec NUMERIC,
  
  -- Full result
  raw_result JSONB,
  
  -- Metadata
  video_size_mb INTEGER,
  language TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_test_results_video ON transcription_test_results(video_id);
CREATE INDEX idx_test_results_provider ON transcription_test_results(provider);
CREATE INDEX idx_test_results_created ON transcription_test_results(created_at DESC);

-- Enable RLS
ALTER TABLE transcription_test_results ENABLE ROW LEVEL SECURITY;

-- Users can view test results for their own videos
CREATE POLICY "Users can view test results for their videos"
ON transcription_test_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM videos
    WHERE videos.id = transcription_test_results.video_id
    AND videos.user_id = auth.uid()
  )
);

-- System can manage all test results
CREATE POLICY "System can manage test results"
ON transcription_test_results
FOR ALL
USING (current_setting('role') = 'service_role');