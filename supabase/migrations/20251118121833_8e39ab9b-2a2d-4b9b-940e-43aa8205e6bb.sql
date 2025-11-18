-- Enable RLS and add owner-based policies for scene_layers

-- Ensure RLS is enabled on scene_layers
ALTER TABLE public.scene_layers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (no error if not exist)
DROP POLICY IF EXISTS "Users can view scene layers for their projects" ON public.scene_layers;
DROP POLICY IF EXISTS "Users can create scene layers for their projects" ON public.scene_layers;
DROP POLICY IF EXISTS "Users can update scene layers for their projects" ON public.scene_layers;
DROP POLICY IF EXISTS "Users can delete scene layers for their projects" ON public.scene_layers;

-- Policy: users can view scene layers for their own projects
CREATE POLICY "Users can view scene layers for their projects"
ON public.scene_layers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.project_scenes ps
    JOIN public.video_projects vp ON vp.id = ps.project_id
    WHERE ps.id = scene_layers.scene_id
      AND vp.created_by = auth.uid()
  )
);

-- Policy: users can create scene layers for their own projects
CREATE POLICY "Users can create scene layers for their projects"
ON public.scene_layers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.project_scenes ps
    JOIN public.video_projects vp ON vp.id = ps.project_id
    WHERE ps.id = scene_layers.scene_id
      AND vp.created_by = auth.uid()
  )
);

-- Policy: users can update scene layers for their own projects
CREATE POLICY "Users can update scene layers for their projects"
ON public.scene_layers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.project_scenes ps
    JOIN public.video_projects vp ON vp.id = ps.project_id
    WHERE ps.id = scene_layers.scene_id
      AND vp.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.project_scenes ps
    JOIN public.video_projects vp ON vp.id = ps.project_id
    WHERE ps.id = scene_layers.scene_id
      AND vp.created_by = auth.uid()
  )
);

-- Policy: users can delete scene layers for their own projects
CREATE POLICY "Users can delete scene layers for their projects"
ON public.scene_layers
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.project_scenes ps
    JOIN public.video_projects vp ON vp.id = ps.project_id
    WHERE ps.id = scene_layers.scene_id
      AND vp.created_by = auth.uid()
  )
);

-- Fix premium_transcript_segments policies (uses project_id, not video_id)
DROP POLICY IF EXISTS "Users can SELECT their own segments" ON public.premium_transcript_segments;

CREATE POLICY "Users can SELECT their own segments"
ON public.premium_transcript_segments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.video_projects vp
    WHERE vp.id = premium_transcript_segments.project_id
      AND vp.created_by = auth.uid()
  )
);

-- Fix project_scenes policies (already exist, but let's make sure they work)
DROP POLICY IF EXISTS "Users can SELECT scenes from their projects" ON public.project_scenes;

CREATE POLICY "Users can SELECT scenes from their projects"
ON public.project_scenes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.video_projects vp
    WHERE vp.id = project_scenes.project_id
      AND vp.created_by = auth.uid()
  )
);

-- Characters and audio_descriptions policies should already exist and work correctly
-- But let's ensure they're properly optimized with EXISTS instead of IN

DROP POLICY IF EXISTS "Users can SELECT characters for their videos" ON public.characters;
CREATE POLICY "Users can SELECT characters for their videos"
ON public.characters
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.videos v
    WHERE v.id = characters.video_id
      AND v.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can SELECT audio descriptions for their videos" ON public.audio_descriptions;
CREATE POLICY "Users can SELECT audio descriptions for their videos"
ON public.audio_descriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.videos v
    WHERE v.id = audio_descriptions.video_id
      AND v.user_id = auth.uid()
  )
);
