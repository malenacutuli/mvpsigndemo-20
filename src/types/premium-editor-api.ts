/**
 * Premium Video Editor API Type Definitions
 * Comprehensive TypeScript types for Descript-style video editing
 */

// ============================================================================
// DATABASE TABLE TYPES (Matching Supabase Schema)
// ============================================================================

/**
 * Premium project - main container for video editing projects
 */
export interface PremiumProject {
  id: string;
  user_id: string | null;
  video_id: string | null;
  name: string;
  description: string | null;
  canvas_width: number;
  canvas_height: number;
  canvas_fps: number;
  total_duration: number | null;
  default_transition_duration_ms: number;
  default_transition: string;
  audio_settings: AudioSettings;
  status: ProjectStatus;
  is_active: boolean;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
}

/**
 * Project scene - represents a segment in the timeline
 * Note: Maps to project_scenes table in Supabase
 */
export interface ProjectScene {
  id: string;
  project_id: string;
  video_id: string | null;
  scene_order: number;
  name: string | null;
  layout_type: string;
  layout_config: any | null;
  background_type: string;
  background_config: any;
  transition_type: string;
  transition_duration_ms: number;
  transition_config: any | null;
  media_type: string;
  media_url: string | null;
  media_start_time: number;
  media_end_time: number | null;
  timeline_start: number | null;
  timeline_end: number | null;
  duration_seconds: number | null;
  caption_template_id: string | null;
  visual_description: string | null;
  scene_config: any;
  created_at: string;
  updated_at: string;
}

/**
 * Scene layer - individual element within a scene (video, audio, text, etc.)
 * Note: Maps to scene_layers table in Supabase
 */
export interface SceneLayer {
  id: string;
  scene_id: string;
  layer_type: string;
  layer_order: number;
  name: string;
  source_url: string | null;
  content: any | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
  z_index: number;
  duration_seconds: number;
  animation_type: string;
  animation_duration_ms: number;
  animation_config: any | null;
  locked: boolean;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Media library item - reusable media assets
 */
export interface MediaLibraryItem {
  id: string;
  user_id: string | null;
  project_id: string | null;
  name: string;
  media_type: MediaType;
  category: MediaCategory;
  file_url: string;
  thumbnail_url: string | null;
  proxy_url: string | null;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  resolution: Resolution | null;
  waveform_data: WaveformData | null;
  transcription: string | null;
  tags: string[] | null;
  usage_count: number;
  is_stock: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Caption style preset
 */
export interface CaptionStyle {
  id: string;
  name: string;
  description: string | null;
  style_config: CaptionStyleConfig;
  tier: SubscriptionTier;
  category: string;
  usage_count: number;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Project version for undo/redo functionality
 */
export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  version_note: string | null;
  snapshot_data: ProjectSnapshot;
  is_autosave: boolean;
  created_by: string | null;
  created_at: string;
}

/**
 * AI-generated suggestion for video editing
 */
export interface AISuggestion {
  id: string;
  video_id: string | null;
  project_id: string | null;
  suggestion_type: SuggestionType;
  suggested_action: string;
  start_time: number;
  end_time: number;
  confidence: number | null;
  reason: string | null;
  status: SuggestionStatus;
  action_parameters: Record<string, any> | null;
  model_name: string | null;
  created_at: string;
}

/**
 * Project collaborator
 */
export interface ProjectCollaborator {
  id: string;
  project_id: string;
  user_id: string;
  role: CollaboratorRole;
  invited_at: string;
}

/**
 * Project comment for collaboration
 */
export interface ProjectComment {
  id: string;
  project_id: string;
  scene_id: string | null;
  user_id: string;
  comment_text: string;
  timestamp_seconds: number | null;
  is_resolved: boolean;
  created_at: string;
}

/**
 * Export job for video rendering
 */
export interface ExportJob {
  id: string;
  user_id: string;
  video_id: string;
  status: ExportStatus;
  progress: number;
  export_options: ExportOptions;
  output_url: string | null;
  output_key: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Published video
 */
export interface PublishedVideo {
  id: string;
  project_id: string;
  user_id: string;
  slug: string;
  title: string | null;
  video_url: string;
  is_public: boolean;
  view_count: number;
  created_at: string;
}

// ============================================================================
// ENUMS & UNION TYPES
// ============================================================================

export type LayerType = 
  | 'video' 
  | 'audio' 
  | 'text' 
  | 'subtitle' 
  | 'image' 
  | 'shape' 
  | 'waveform' 
  | 'timer' 
  | 'marker' 
  | 'avatar';

export type LayoutType = 
  | 'fullscreen' 
  | 'pip' 
  | 'split-vertical' 
  | 'split-horizontal' 
  | 'side-by-side' 
  | 'custom';

export type TransitionType = 
  | 'none' 
  | 'fade' 
  | 'crossfade' 
  | 'wipe-left' 
  | 'wipe-right' 
  | 'wipe-up' 
  | 'wipe-down' 
  | 'blur' 
  | 'zoom' 
  | 'slide';

export type BackgroundType = 
  | 'solid' 
  | 'gradient' 
  | 'image' 
  | 'video' 
  | 'blur';

export type MediaType = 
  | 'video' 
  | 'audio' 
  | 'image';

export type MediaCategory = 
  | 'user-uploaded' 
  | 'stock' 
  | 'generated';

export type ProjectStatus = 
  | 'draft' 
  | 'active' 
  | 'archived' 
  | 'rendering';

export type ExportStatus = 
  | 'queued' 
  | 'processing' 
  | 'completed' 
  | 'failed';

export type SuggestionType = 
  | 'remove-silence' 
  | 'split-scene' 
  | 'add-caption' 
  | 'enhance-audio' 
  | 'color-grade';

export type SuggestionStatus = 
  | 'pending' 
  | 'accepted' 
  | 'rejected' 
  | 'applied';

export type CollaboratorRole = 
  | 'owner' 
  | 'editor' 
  | 'viewer';

export type SubscriptionTier = 
  | 'free' 
  | 'standard' 
  | 'advanced' 
  | 'enterprise';

export type BlendMode = 
  | 'normal' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'darken' 
  | 'lighten';

export type PositionUnit = 
  | 'px' 
  | '%' 
  | 'vw' 
  | 'vh';

export type AnimationType = 
  | 'fade-in' 
  | 'fade-out' 
  | 'slide-in' 
  | 'slide-out' 
  | 'zoom-in' 
  | 'zoom-out' 
  | 'bounce';

// ============================================================================
// HELPER TYPES & CONFIG OBJECTS
// ============================================================================

/**
 * Position configuration for layers
 */
export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: PositionUnit;
}

/**
 * Transform properties for layers
 */
export interface Transform {
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  skewX?: number;
  skewY?: number;
}

/**
 * Animation configuration
 */
export interface Animation {
  type: AnimationType;
  duration: number;
  delay: number;
  easing?: string;
  iterations?: number;
}

/**
 * Effect configuration
 */
export interface Effect {
  type: string;
  intensity: number;
  parameters?: Record<string, any>;
}

/**
 * Layout configuration for scenes
 */
export interface LayoutConfig {
  regions?: LayoutRegion[];
  padding?: number;
  gap?: number;
}

export interface LayoutRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

/**
 * Background configuration
 */
export interface BackgroundConfig {
  color?: string;
  gradient?: GradientConfig;
  imageUrl?: string;
  videoUrl?: string;
  blurAmount?: number;
}

export interface GradientConfig {
  type: 'linear' | 'radial';
  colors: string[];
  angle?: number;
}

/**
 * Transition configuration
 */
export interface TransitionConfig {
  easing?: string;
  direction?: 'left' | 'right' | 'up' | 'down';
  customParameters?: Record<string, any>;
}

/**
 * Audio settings for projects
 */
export interface AudioSettings {
  masterVolume: number;
  normalize: boolean;
  studioSound: boolean;
  backgroundMusicVolume?: number;
}

/**
 * Resolution information
 */
export interface Resolution {
  width: number;
  height: number;
}

/**
 * Waveform visualization data
 */
export interface WaveformData {
  peaks: number[];
  sampleRate: number;
  duration: number;
}

/**
 * Caption style configuration
 */
export interface CaptionStyleConfig {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  backgroundColor?: string;
  textAlign: 'left' | 'center' | 'right';
  position: Position;
  animation?: Animation;
  shadow?: ShadowConfig;
  outline?: OutlineConfig;
}

export interface ShadowConfig {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface OutlineConfig {
  color: string;
  width: number;
}

/**
 * Export options for video rendering
 */
export interface ExportOptions {
  format: 'mp4' | 'webm' | 'mov';
  resolution: Resolution;
  fps: number;
  bitrate: number;
  codec: string;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  includeSubtitles?: boolean;
  includeAudioDescriptions?: boolean;
  watermark?: WatermarkConfig;
}

export interface WatermarkConfig {
  imageUrl: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
  scale: number;
}

/**
 * Project snapshot for version control
 */
export interface ProjectSnapshot {
  scenes: ProjectScene[];
  layers: Record<string, SceneLayer[]>;
  projectSettings: Partial<PremiumProject>;
  timestamp: string;
}

// ============================================================================
// API OPERATION TYPES (Descript-style)
// ============================================================================

/**
 * Parameters for creating a new scene
 */
export interface CreateSceneParams {
  name?: string;
  duration?: number;
  layoutType?: LayoutType;
  backgroundType?: BackgroundType;
  backgroundColor?: string;
  transitionType?: TransitionType;
  insertAfterSceneId?: string;
  videoId?: string;
  mediaUrl?: string;
  mediaStartTime?: number;
  mediaEndTime?: number;
}

/**
 * Parameters for updating an existing scene
 */
export interface UpdateSceneParams {
  name?: string;
  duration?: number;
  layoutType?: LayoutType;
  layoutConfig?: LayoutConfig;
  backgroundType?: BackgroundType;
  backgroundConfig?: BackgroundConfig;
  transitionType?: TransitionType;
  transitionDuration?: number;
  transitionConfig?: TransitionConfig;
  visualDescription?: string;
  sceneConfig?: Record<string, any>;
}

/**
 * Parameters for splitting a scene at a specific time
 */
export interface SplitSceneParams {
  sceneId: string;
  splitTime: number;
}

/**
 * Parameters for reordering scenes
 */
export interface ReorderScenesParams {
  projectId: string;
  sceneOrders: Array<{
    id: string;
    order: number;
  }>;
}

/**
 * Parameters for adding a layer to a scene
 */
export interface AddLayerParams {
  sceneId: string;
  layerType: LayerType;
  name?: string;
  mediaUrl?: string;
  startTime?: number;
  endTime?: number;
  position?: Partial<Position>;
  transform?: Partial<Transform>;
  effects?: Effect[];
  animation?: Animation;
  layerConfig?: Record<string, any>;
}

/**
 * Parameters for updating a layer
 */
export interface UpdateLayerParams {
  name?: string;
  mediaUrl?: string;
  startTime?: number;
  endTime?: number;
  position?: Partial<Position>;
  transform?: Partial<Transform>;
  effects?: Effect[];
  animation?: Animation;
  isLocked?: boolean;
  isVisible?: boolean;
  opacity?: number;
  blendMode?: BlendMode;
  layerConfig?: Record<string, any>;
}

/**
 * Parameters for creating a new project
 */
export interface CreateProjectParams {
  name: string;
  description?: string;
  videoId?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  canvasFps?: number;
}

/**
 * Parameters for AI suggestion generation
 */
export interface GenerateAISuggestionsParams {
  projectId: string;
  videoId?: string;
  suggestionTypes?: SuggestionType[];
  analysisDepth?: 'quick' | 'detailed';
}

// ============================================================================
// API RESPONSE WRAPPER
// ============================================================================

/**
 * Standard API response wrapper with success/error handling
 */
export interface APIResponse<T = void> {
  success: boolean;
  data?: T;
  error?: APIError;
  message?: string;
}

/**
 * API error details
 */
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Timeline range representation
 */
export interface TimelineRange {
  start: number;
  end: number;
  duration: number;
}

/**
 * Timeline track (for multi-track editing)
 */
export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'subtitle';
  items: TimelineItem[];
  isLocked: boolean;
  isMuted: boolean;
  height: number;
}

export interface TimelineItem {
  id: string;
  sceneId?: string;
  layerId?: string;
  start: number;
  end: number;
  thumbnail?: string;
}

/**
 * Editor state for UI management
 */
export interface EditorState {
  currentTime: number;
  isPlaying: boolean;
  selectedSceneId: string | null;
  selectedLayerIds: string[];
  zoom: number;
  viewportStart: number;
  viewportEnd: number;
}

/**
 * Partial update helper
 */
export type PartialUpdate<T> = Partial<T> & { id: string };

/**
 * Type guard for checking if response is successful
 */
export function isSuccessResponse<T>(response: APIResponse<T>): response is APIResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Type guard for checking if response has error
 */
export function isErrorResponse<T>(response: APIResponse<T>): response is APIResponse<T> & { success: false; error: APIError } {
  return response.success === false && response.error !== undefined;
}
