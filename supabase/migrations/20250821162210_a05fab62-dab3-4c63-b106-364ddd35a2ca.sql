-- Create RLS policies for uploads bucket (bucket already exists)
CREATE POLICY "Allow public uploads" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Allow public downloads of uploads" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'uploads');

CREATE POLICY "Allow users to update their uploads" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'uploads');

CREATE POLICY "Allow users to delete their uploads" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'uploads');