-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE video_status AS ENUM ('uploading', 'uploaded', 'processing', 'ready', 'error');
CREATE TYPE job_type AS ENUM ('transcription', 'emotion_analysis', 'ad_generation', 'caption_generation', 'asl_generation');
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE track_kind AS ENUM ('captions', 'subtitles', 'audio_description', 'asl_video');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create videos table
CREATE TABLE public.videos (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  content_type TEXT DEFAULT 'education',
  status video_status NOT NULL DEFAULT 'uploading',
  storage_path TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create transcript_segments table
CREATE TABLE public.transcript_segments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  start_time DECIMAL NOT NULL,
  end_time DECIMAL NOT NULL,
  text TEXT NOT NULL,
  speaker TEXT,
  confidence DECIMAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create emotion_spans table
CREATE TABLE public.emotion_spans (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  start_time DECIMAL NOT NULL,
  end_time DECIMAL NOT NULL,
  emotion TEXT NOT NULL,
  intent TEXT,
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 5),
  confidence DECIMAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tracks table
CREATE TABLE public.tracks (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  kind track_kind NOT NULL,
  language TEXT,
  url TEXT NOT NULL,
  format TEXT,
  label TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  type job_type NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  payload JSONB,
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_spans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for videos
CREATE POLICY "Users can view their own videos" ON videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own videos" ON videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own videos" ON videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own videos" ON videos FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for transcript_segments
CREATE POLICY "Users can view transcript segments for their videos" ON transcript_segments FOR SELECT USING (
  EXISTS (SELECT 1 FROM videos WHERE videos.id = transcript_segments.video_id AND videos.user_id = auth.uid())
);
CREATE POLICY "Users can insert transcript segments for their videos" ON transcript_segments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM videos WHERE videos.id = transcript_segments.video_id AND videos.user_id = auth.uid())
);

-- Create RLS policies for emotion_spans
CREATE POLICY "Users can view emotion spans for their videos" ON emotion_spans FOR SELECT USING (
  EXISTS (SELECT 1 FROM videos WHERE videos.id = emotion_spans.video_id AND videos.user_id = auth.uid())
);
CREATE POLICY "Users can insert emotion spans for their videos" ON emotion_spans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM videos WHERE videos.id = emotion_spans.video_id AND videos.user_id = auth.uid())
);

-- Create RLS policies for tracks
CREATE POLICY "Users can view tracks for their videos" ON tracks FOR SELECT USING (
  EXISTS (SELECT 1 FROM videos WHERE videos.id = tracks.video_id AND videos.user_id = auth.uid())
);
CREATE POLICY "Users can insert tracks for their videos" ON tracks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM videos WHERE videos.id = tracks.video_id AND videos.user_id = auth.uid())
);
CREATE POLICY "Users can update tracks for their videos" ON tracks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM videos WHERE videos.id = tracks.video_id AND videos.user_id = auth.uid())
);

-- Create RLS policies for jobs
CREATE POLICY "Users can view jobs for their videos" ON jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM videos WHERE videos.id = jobs.video_id AND videos.user_id = auth.uid())
);
CREATE POLICY "System can manage all jobs" ON jobs FOR ALL USING (current_setting('role') = 'service_role');

-- Create storage buckets for video files and assets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('videos', 'videos', false),
  ('tracks', 'tracks', false),
  ('thumbnails', 'thumbnails', true);

-- Create storage policies for videos bucket
CREATE POLICY "Users can upload their own videos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can view their own videos" ON storage.objects FOR SELECT USING (
  bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can update their own videos" ON storage.objects FOR UPDATE USING (
  bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policies for tracks bucket
CREATE POLICY "Users can upload tracks for their videos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can view tracks for their videos" ON storage.objects FOR SELECT USING (
  bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policies for thumbnails bucket (public)
CREATE POLICY "Anyone can view thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Users can upload thumbnails" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'thumbnails');

-- Create indexes for performance
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_transcript_segments_video_id ON transcript_segments(video_id);
CREATE INDEX idx_transcript_segments_time ON transcript_segments(start_time, end_time);
CREATE INDEX idx_emotion_spans_video_id ON emotion_spans(video_id);
CREATE INDEX idx_emotion_spans_time ON emotion_spans(start_time, end_time);
CREATE INDEX idx_tracks_video_id ON tracks(video_id);
CREATE INDEX idx_tracks_kind ON tracks(kind);
CREATE INDEX idx_jobs_video_id ON jobs(video_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);