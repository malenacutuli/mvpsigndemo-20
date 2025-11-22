-- ================================================================
-- SECURITY HARDENING: Add NOT NULL constraints and CHECK constraints
-- ================================================================

-- Add NOT NULL constraints for security-critical columns
-- These prevent NULL values which could bypass RLS policies

-- keyboard_shortcuts: user_id must not be null
ALTER TABLE keyboard_shortcuts 
ALTER COLUMN user_id SET NOT NULL;

-- published_videos: user_id must not be null
ALTER TABLE published_videos 
ALTER COLUMN user_id SET NOT NULL;

-- project_comments: Both user_id and project_id must not be null
ALTER TABLE project_comments 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE project_comments 
ALTER COLUMN project_id SET NOT NULL;

-- project_versions: project_id must not be null
ALTER TABLE project_versions 
ALTER COLUMN project_id SET NOT NULL;

-- Add CHECK constraint: AI suggestions must have either video_id or project_id
ALTER TABLE ai_suggestions 
ADD CONSTRAINT ai_suggestions_requires_content
CHECK (video_id IS NOT NULL OR project_id IS NOT NULL);