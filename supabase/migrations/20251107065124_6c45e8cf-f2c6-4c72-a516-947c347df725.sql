-- Fix speaker_mappings RLS policies to prevent unauthorized access
-- This migration replaces permissive policies with video ownership checks

-- Drop existing permissive policies
DROP POLICY IF EXISTS "sm_select" ON speaker_mappings;
DROP POLICY IF EXISTS "sm_insert" ON speaker_mappings;
DROP POLICY IF EXISTS "sm_update" ON speaker_mappings;
DROP POLICY IF EXISTS "sm_delete" ON speaker_mappings;

-- Create secure policies based on video ownership
CREATE POLICY "Users can view speaker mappings for their videos"
ON speaker_mappings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = speaker_mappings.video_id 
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert speaker mappings for their videos"
ON speaker_mappings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = speaker_mappings.video_id 
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update speaker mappings for their videos"
ON speaker_mappings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = speaker_mappings.video_id 
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete speaker mappings for their videos"
ON speaker_mappings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = speaker_mappings.video_id 
    AND videos.user_id = auth.uid()
  )
);

-- Allow service role full access for system operations
CREATE POLICY "System can manage all speaker mappings"
ON speaker_mappings FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');