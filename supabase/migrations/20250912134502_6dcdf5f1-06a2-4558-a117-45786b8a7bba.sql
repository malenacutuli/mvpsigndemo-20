-- Create storage bucket for processed accessible videos
INSERT INTO storage.buckets (id, name, public) VALUES ('processed-videos', 'processed-videos', true);

-- Create RLS policies for processed videos bucket
CREATE POLICY "Users can view processed videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'processed-videos');

CREATE POLICY "Users can upload processed videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'processed-videos');

CREATE POLICY "Users can update their processed videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'processed-videos');

CREATE POLICY "Users can delete their processed videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'processed-videos');