-- Enable anonymous access to transcript segments for public videos
CREATE POLICY "Anonymous can view transcript segments for public videos"
ON transcript_segments FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = transcript_segments.video_id 
    AND videos.is_public = true 
    AND videos.status IN ('ready', 'uploaded')
  )
);

-- Enable anonymous access to tracks for public videos
CREATE POLICY "Anonymous can view tracks for public videos"
ON tracks FOR SELECT  
TO anon
USING (
  EXISTS (
    SELECT 1 FROM videos
    WHERE videos.id = tracks.video_id
    AND videos.is_public = true
    AND videos.status IN ('ready', 'uploaded')
  )
);

-- Ensure authenticated users can also access tracks for public videos
CREATE POLICY "Authenticated users can view tracks for public videos"
ON tracks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM videos
    WHERE videos.id = tracks.video_id  
    AND videos.is_public = true
    AND videos.status IN ('ready', 'uploaded')
  )
);

-- Add comment to document the accessibility policies
COMMENT ON POLICY "Anonymous can view transcript segments for public videos" ON transcript_segments IS 'Allows anonymous users to access captions and transcript segments for videos marked as public and ready';
COMMENT ON POLICY "Anonymous can view tracks for public videos" ON tracks IS 'Allows anonymous users to access subtitle tracks for videos marked as public and ready';
COMMENT ON POLICY "Authenticated users can view tracks for public videos" ON tracks IS 'Allows authenticated users to access subtitle tracks for videos marked as public and ready';