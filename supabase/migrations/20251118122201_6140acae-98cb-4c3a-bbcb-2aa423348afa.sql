-- Add performance indexes for frequently queried tables

-- Indexes for project_scenes
CREATE INDEX IF NOT EXISTS idx_scenes_project_id 
ON project_scenes(project_id);

CREATE INDEX IF NOT EXISTS idx_scenes_timeline_start 
ON project_scenes(project_id, timeline_start);

-- Indexes for characters
CREATE INDEX IF NOT EXISTS idx_characters_video_id 
ON characters(video_id);

-- Indexes for audio_descriptions
CREATE INDEX IF NOT EXISTS idx_audio_descriptions_video_id 
ON audio_descriptions(video_id);

CREATE INDEX IF NOT EXISTS idx_audio_descriptions_start_time 
ON audio_descriptions(video_id, start_time);

-- Indexes for scene_layers (newly added policies need indexes)
CREATE INDEX IF NOT EXISTS idx_scene_layers_scene_id 
ON scene_layers(scene_id);

-- Indexes for video_projects (frequently joined)
CREATE INDEX IF NOT EXISTS idx_video_projects_created_by 
ON video_projects(created_by);

-- Indexes for videos (base table)
CREATE INDEX IF NOT EXISTS idx_videos_user_id 
ON videos(user_id);

-- Indexes for premium_transcript_segments
CREATE INDEX IF NOT EXISTS idx_premium_segments_project_id 
ON premium_transcript_segments(project_id);

CREATE INDEX IF NOT EXISTS idx_premium_segments_start_time 
ON premium_transcript_segments(project_id, start_time);

-- Indexes for media_library
CREATE INDEX IF NOT EXISTS idx_media_library_user_id 
ON media_library(user_id);

CREATE INDEX IF NOT EXISTS idx_media_library_project_id 
ON media_library(project_id);

-- Indexes for premium_projects
CREATE INDEX IF NOT EXISTS idx_premium_projects_user_id 
ON premium_projects(user_id);

CREATE INDEX IF NOT EXISTS idx_premium_projects_video_id 
ON premium_projects(video_id);
