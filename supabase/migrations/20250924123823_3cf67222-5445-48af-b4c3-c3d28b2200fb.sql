-- Create exports storage bucket for private video exports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exports', 'exports', false) 
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for exports bucket - users can only access their own exports
CREATE POLICY "Users can read their own exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exports' 
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can upload their own exports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exports' 
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can delete their own exports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exports' 
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Create video_exports table to track finalized video exports
CREATE TABLE IF NOT EXISTS public.video_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  export_options jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'processing',
  storage_path text NOT NULL,
  file_size_bytes bigint,
  duration_seconds integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on video_exports
ALTER TABLE public.video_exports ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_exports - users can only access their own exports
CREATE POLICY "Users can view their own video exports"
ON public.video_exports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video exports"
ON public.video_exports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video exports"
ON public.video_exports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video exports"
ON public.video_exports FOR DELETE
USING (auth.uid() = user_id);

-- System can manage all exports
CREATE POLICY "System can manage all exports"
ON public.video_exports FOR ALL
USING (current_setting('role') = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS video_exports_user_video_idx ON public.video_exports(user_id, video_id);
CREATE INDEX IF NOT EXISTS video_exports_status_idx ON public.video_exports(status);
CREATE INDEX IF NOT EXISTS video_exports_created_at_idx ON public.video_exports(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_video_exports_updated_at
BEFORE UPDATE ON public.video_exports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();