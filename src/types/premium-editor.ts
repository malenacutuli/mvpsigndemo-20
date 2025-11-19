export interface PremiumProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  source_video_id: string | null;
  source_video_url: string | null;
  source_video_duration: number | null;
  current_version_id: string | null;
  status: 'draft' | 'processing' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  thumbnail_url: string | null;
  tags: string[] | null;
  project_settings: Record<string, any>;
}

export interface PremiumVersion {
  id: string;
  project_id: string;
  version_number: number;
  version_name: string | null;
  description: string | null;
  parent_version_id: string | null;
  status: 'active' | 'archived' | 'exported';
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  frame_rate: number | null;
  working_video_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  last_modified_at: string;
  auto_save_enabled: boolean;
  last_auto_saved_at: string | null;
  change_summary: string | null;
  metadata: Record<string, any>;
}

export interface PremiumScene {
  id: string;
  version_id: string;
  scene_order: number;
  timeline_start: number;
  timeline_end: number;
  duration_seconds: number;
  source_media_type: 'video' | 'image' | 'audio' | 'generated';
  source_media_url: string | null;
  media_start_time: number | null;
  media_end_time: number | null;
  name: string | null;
  description: string | null;
  layout_type: 'fullscreen' | 'split' | 'pip' | 'multicam' | 'custom';
  layout_config: Record<string, any>;
  background_type: 'solid' | 'gradient' | 'image' | 'video' | 'blur';
  background_config: Record<string, any>;
  effects: any[];
  overlay_elements: any[];
  transition_type: string;
  transition_duration_ms: number;
  transition_config: Record<string, any>;
  caption_template_id: string | null;
  caption_override: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface SceneElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'video';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  content: any;
  style: Record<string, any>;
}

export interface CaptionStyle {
  font: {
    family: string;
    size: number;
    weight: number;
    lineHeight: number;
  };
  colors: {
    useCharacterColors: boolean;
    fallbackColor: string;
  };
  position: {
    vertical: 'top' | 'center' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
    marginBottom: number;
  };
  background: {
    enabled: boolean;
    color: string;
    opacity: number;
    padding: number;
  };
  animation: {
    type: 'none' | 'fade' | 'slide';
    duration: number;
  };
  emphasis: Record<string, any>;
  pitch: Record<string, any>;
}

export interface TimelineMarkers {
  inPoint: number | null;
  outPoint: number | null;
}
