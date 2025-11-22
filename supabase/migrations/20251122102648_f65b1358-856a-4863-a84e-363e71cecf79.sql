-- ================================================================
-- RLS POLICIES UPDATE: Add missing policies for 6 tables
-- ================================================================

-- ================================================================
-- 1. KEYBOARD_SHORTCUTS - Direct user_id ownership
-- ================================================================

CREATE POLICY "Users can view own keyboard shortcuts"
ON keyboard_shortcuts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own keyboard shortcuts"
ON keyboard_shortcuts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own keyboard shortcuts"
ON keyboard_shortcuts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own keyboard shortcuts"
ON keyboard_shortcuts FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to keyboard shortcuts"
ON keyboard_shortcuts FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- ================================================================
-- 2. CAPTION_STYLES - Has created_by + system styles
-- ================================================================

CREATE POLICY "Users can view caption styles"
ON caption_styles FOR SELECT
USING (
  auth.uid() = created_by OR 
  is_system = true
);

CREATE POLICY "Users can create own caption styles"
ON caption_styles FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own caption styles"
ON caption_styles FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own caption styles"
ON caption_styles FOR DELETE
USING (auth.uid() = created_by);

CREATE POLICY "Service role full access to caption styles"
ON caption_styles FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- ================================================================
-- 3. PUBLISHED_VIDEOS - Has user_id
-- ================================================================

CREATE POLICY "Users can view own published videos"
ON published_videos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Public can view public published videos"
ON published_videos FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can create own published videos"
ON published_videos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own published videos"
ON published_videos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own published videos"
ON published_videos FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to published videos"
ON published_videos FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- ================================================================
-- 4. PROJECT_COMMENTS - Links via project_id
-- ================================================================

CREATE POLICY "Users can view comments on own projects"
ON project_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM video_projects vp
    WHERE vp.id = project_comments.project_id
      AND vp.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create comments on own projects"
ON project_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1
    FROM video_projects vp
    WHERE vp.id = project_id
      AND vp.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update own comments"
ON project_comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments or comments on their projects"
ON project_comments FOR DELETE
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1
    FROM video_projects vp
    WHERE vp.id = project_comments.project_id
      AND vp.created_by = auth.uid()
  )
);

CREATE POLICY "Service role full access to project comments"
ON project_comments FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- ================================================================
-- 5. PROJECT_VERSIONS - Links via project_id
-- ================================================================

CREATE POLICY "Users can view versions of own projects"
ON project_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM video_projects vp
    WHERE vp.id = project_versions.project_id
      AND vp.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create versions for own projects"
ON project_versions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM video_projects vp
    WHERE vp.id = project_id
      AND vp.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update versions of own projects"
ON project_versions FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM video_projects vp
    WHERE vp.id = project_versions.project_id
      AND vp.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM video_projects vp
    WHERE vp.id = project_id
      AND vp.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete versions of own projects"
ON project_versions FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM video_projects vp
    WHERE vp.id = project_versions.project_id
      AND vp.created_by = auth.uid()
  )
);

CREATE POLICY "Service role full access to project versions"
ON project_versions FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- ================================================================
-- 6. AI_SUGGESTIONS - Links via video_id OR project_id
-- ================================================================

CREATE POLICY "Users can view AI suggestions for own content"
ON ai_suggestions FOR SELECT
USING (
  (video_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM videos v
    WHERE v.id = ai_suggestions.video_id
      AND v.user_id = auth.uid()
  ))
  OR
  (project_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM video_projects vp
    WHERE vp.id = ai_suggestions.project_id
      AND vp.created_by = auth.uid()
  ))
);

CREATE POLICY "System can create AI suggestions for user content"
ON ai_suggestions FOR INSERT
WITH CHECK (
  (video_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM videos v
    WHERE v.id = video_id
      AND v.user_id = auth.uid()
  ))
  OR
  (project_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM video_projects vp
    WHERE vp.id = project_id
      AND vp.created_by = auth.uid()
  ))
);

CREATE POLICY "Users can update AI suggestions for own content"
ON ai_suggestions FOR UPDATE
USING (
  (video_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM videos v
    WHERE v.id = ai_suggestions.video_id
      AND v.user_id = auth.uid()
  ))
  OR
  (project_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM video_projects vp
    WHERE vp.id = ai_suggestions.project_id
      AND vp.created_by = auth.uid()
  ))
)
WITH CHECK (
  (video_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM videos v
    WHERE v.id = video_id
      AND v.user_id = auth.uid()
  ))
  OR
  (project_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM video_projects vp
    WHERE vp.id = project_id
      AND vp.created_by = auth.uid()
  ))
);

CREATE POLICY "Users can delete AI suggestions for own content"
ON ai_suggestions FOR DELETE
USING (
  (video_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM videos v
    WHERE v.id = ai_suggestions.video_id
      AND v.user_id = auth.uid()
  ))
  OR
  (project_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM video_projects vp
    WHERE vp.id = ai_suggestions.project_id
      AND vp.created_by = auth.uid()
  ))
);

CREATE POLICY "Service role full access to AI suggestions"
ON ai_suggestions FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- ================================================================
-- PERFORMANCE INDEXES for efficient policy checks
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_video_id ON ai_suggestions(video_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_project_id ON ai_suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_caption_styles_created_by ON caption_styles(created_by);
CREATE INDEX IF NOT EXISTS idx_caption_styles_is_system ON caption_styles(is_system);
CREATE INDEX IF NOT EXISTS idx_keyboard_shortcuts_user_id ON keyboard_shortcuts(user_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_user_id ON project_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_published_videos_user_id ON published_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_published_videos_is_public ON published_videos(is_public);