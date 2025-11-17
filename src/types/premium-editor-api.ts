/**
 * Premium Video Editor API Type Definitions
 * 
 * Comprehensive TypeScript types for the Axessible Premium Video Editor.
 * Provides 100% type coverage for database operations, API calls, and UI state.
 * 
 * @module premium-editor-api
 * @version 1.0.0
 */

// ============================================================================
// DATABASE TABLE TYPES
// ============================================================================

/**
 * Premium Project - Main container for video editing projects
 * Table: premium_projects
 */
export interface PremiumProject {
  id: string;
  user_id: string;
  video_id: string | null;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  canvas_width: number; // Default: 1920
  canvas_height: number; // Default: 1080
  canvas_fps: number; // Default: 30
  total_duration: number | null;
  default_transition: TransitionType; // Default: 'fade'
  default_transition_duration_ms: number; // Default: 500
  audio_settings: {
    normalize: boolean;
    studioSound: boolean;
    masterVolume: number; // 0.0-1.0
  };
  status: 'draft' | 'published' | 'archived'; // Default: 'draft'
  is_active: boolean; // Default: true
  created_at: string;
  updated_at: string;
  last_opened_at: string;
}

/**
 * Project Scene - Individual scenes/slides within a project
 * Table: project_scenes
 */
export interface ProjectScene {
  id: string;
  project_id: string;
  video_id: string | null;
  scene_order: number;
  name: string | null;
  duration_seconds: number | null;
  timeline_start: number | null;
  timeline_end: number | null;
  background_type: BackgroundType; // Default: 'solid'
  background_config: BackgroundConfig;
  layout_type: LayoutType; // Default: 'fullscreen'
  layout_config: Record<string, any> | null;
  media_type: 'video' | 'audio' | 'image' | 'none'; // Default: 'video'
  media_url: string | null;
  media_start_time: number | null; // Default: 0
  media_end_time: number | null;
  transition_type: TransitionType; // Default: 'none'
  transition_duration_ms: number; // Default: 500
  transition_config: Record<string, any> | null;
  caption_template_id: string | null;
  scene_config: Record<string, any>;
  visual_description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Scene Layer - Elements within a scene (text, video, images, etc.)
 * Table: scene_layers
 */
export interface SceneLayer {
  id: string;
  scene_id: string;
  layer_order: number;
  layer_type: LayerType;
  name: string;
  is_visible: boolean; // Default: true
  is_locked: boolean; // Default: false
  content: Record<string, any>;
  position: Position;
  transform: Transform;
  animation: Animation | null;
  effects: Effect[];
  blend_mode: BlendMode; // Default: 'normal'
  opacity: number; // 0.0-1.0, Default: 1.0
  start_time: number | null;
  end_time: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Media Library Item - Assets available for use in projects
 * Table: media_library
 */
export interface MediaLibraryItem {
  id: string;
  user_id: string | null;
  project_id: string | null;
  name: string;
  file_url: string;
  thumbnail_url: string | null;
  proxy_url: string | null;
  media_type: 'video' | 'audio' | 'image' | 'document';
  category: string; // Default: 'user-uploaded'
  file_size_bytes: number | null;
  duration_seconds: number | null;
  resolution: { width: number; height: number } | null;
  waveform_data: number[] | null;
  transcription: string | null;
  tags: string[] | null;
  is_stock: boolean; // Default: false
  usage_count: number; // Default: 0
  created_at: string;
  updated_at: string;
}

/**
 * Caption Style - Template for caption styling
 * Table: caption_styles
 */
export interface CaptionStyle {
  id: string;
  name: string;
  description: string | null;
  style_config: CaptionStyleConfig;
  category: string; // Default: 'professional'
  tier: 'free' | 'standard' | 'premium'; // Default: 'free'
  is_system: boolean; // Default: false
  created_by: string | null;
  usage_count: number; // Default: 0
  created_at: string;
  updated_at: string;
}

/**
 * Project Version - Version history snapshot
 * Table: project_versions
 */
export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  version_note: string | null;
  snapshot_data: Record<string, any>;
  is_autosave: boolean; // Default: false
  created_by: string | null;
  created_at: string;
}

/**
 * AI Suggestion - AI-generated editing suggestions
 * Table: ai_suggestions
 */
export interface AISuggestion {
  id: string;
  video_id: string | null;
  project_id: string | null;
  suggestion_type: string;
  suggested_action: string;
  start_time: number;
  end_time: number;
  confidence: number | null;
  reason: string | null;
  action_parameters: Record<string, any> | null;
  status: 'pending' | 'accepted' | 'rejected'; // Default: 'pending'
  model_name: string | null;
  created_at: string;
}

/**
 * Project Collaborator - Team member with project permissions
 * Table: project_collaborators
 */
export interface ProjectCollaborator {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'commenter' | 'viewer';
  invited_at: string;
}

/**
 * Project Comment - Collaboration comment on project or scene
 * Table: project_comments
 */
export interface ProjectComment {
  id: string;
  project_id: string;
  scene_id: string | null;
  user_id: string;
  comment_text: string;
  timestamp_seconds: number | null;
  is_resolved: boolean; // Default: false
  created_at: string;
}

/**
 * Export Job - Video export queue and status tracking
 * Table: export_jobs
 */
export interface ExportJob {
  id: string;
  user_id: string;
  video_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed'; // Default: 'queued'
  progress: number; // 0-100, Default: 0
  export_options: ExportOptions;
  output_url: string | null;
  output_key: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Published Video - Published video metadata
 * Table: published_videos
 */
export interface PublishedVideo {
  id: string;
  project_id: string;
  user_id: string;
  slug: string;
  title: string | null;
  video_url: string;
  is_public: boolean; // Default: true
  view_count: number; // Default: 0
  created_at: string;
}

// ============================================================================
// ENUMS & LITERAL TYPES
// ============================================================================

/**
 * Layer types available in the editor
 */
export type LayerType = 
  | 'video' 
  | 'audio' 
  | 'text' 
  | 'subtitle' 
  | 'caption'
  | 'image' 
  | 'shape' 
  | 'waveform' 
  | 'progress-bar'
  | 'timer' 
  | 'marker' 
  | 'avatar';

/**
 * Layout types for scene composition
 */
export type LayoutType = 
  | 'fullscreen' 
  | 'pip' 
  | 'split-vertical' 
  | 'split-horizontal' 
  | 'side-by-side' 
  | 'custom';

/**
 * Transition effects between scenes
 */
export type TransitionType = 
  | 'none' 
  | 'fade' 
  | 'crossfade' 
  | 'wipe-left' 
  | 'wipe-right' 
  | 'wipe-up' 
  | 'wipe-down' 
  | 'blur' 
  | 'zoom-in'
  | 'zoom-out'
  | 'slide-left'
  | 'slide-right';

/**
 * Background types for scenes
 */
export type BackgroundType = 
  | 'solid' 
  | 'gradient' 
  | 'image' 
  | 'video' 
  | 'blur';

/**
 * Blend modes for layer compositing
 */
export type BlendMode = 
  | 'normal' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'darken' 
  | 'lighten' 
  | 'color-dodge' 
  | 'color-burn';

/**
 * Visual effect types
 */
export type EffectType = 
  | 'blur' 
  | 'brightness' 
  | 'contrast' 
  | 'saturation' 
  | 'hue-rotate' 
  | 'grayscale' 
  | 'sepia' 
  | 'drop-shadow' 
  | 'glow';

/**
 * Animation presets
 */
export type AnimationType = 
  | 'fade-in' 
  | 'fade-out' 
  | 'slide-in' 
  | 'slide-out' 
  | 'zoom-in' 
  | 'zoom-out' 
  | 'bounce' 
  | 'pulse';

/**
 * Position unit types
 */
export type UnitType = 'px' | '%' | 'vw' | 'vh';

// ============================================================================
// HELPER TYPES & CONFIGURATIONS
// ============================================================================

/**
 * Position and size of an element
 */
export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: UnitType;
}

/**
 * Transform properties for layers
 */
export interface Transform {
  rotation: number; // degrees, 0-360
  scaleX: number; // 0.0-2.0
  scaleY: number; // 0.0-2.0
  skewX: number; // degrees
  skewY: number; // degrees
  opacity: number; // 0.0-1.0
}

/**
 * Animation configuration
 */
export interface Animation {
  type: AnimationType;
  duration: number; // milliseconds
  delay: number; // milliseconds
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier';
  loop: boolean;
  iterationCount?: number | 'infinite';
}

/**
 * Visual effect configuration
 */
export interface Effect {
  type: EffectType;
  intensity: number; // 0.0-1.0
  parameters: Record<string, any>;
}

/**
 * Background configuration (supports multiple types)
 */
export interface BackgroundConfig {
  color?: string; // hex color for solid backgrounds
  gradient?: {
    type: 'linear' | 'radial';
    angle?: number; // degrees (for linear gradients)
    colors: Array<{ color: string; stop: number }>; // stop is 0-100%
  };
  image?: {
    url: string;
    fit: 'cover' | 'contain' | 'fill' | 'none';
    position: string; // CSS position value (e.g., 'center', '50% 50%')
  };
  video?: {
    url: string;
    fit: 'cover' | 'contain' | 'fill';
    loop: boolean;
    muted: boolean;
  };
  blur?: {
    intensity: number; // 0-100
    sourceLayer?: string; // layer ID to blur as background
  };
}

/**
 * Caption style configuration
 */
export interface CaptionStyleConfig {
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  color: string;
  backgroundColor: string;
  padding: { top: number; right: number; bottom: number; left: number };
  borderRadius: number;
  textAlign: 'left' | 'center' | 'right';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing: number;
  lineHeight: number;
  shadow: {
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
  } | null;
  stroke: {
    color: string;
    width: number;
  } | null;
  animation: Animation | null;
  position: 'top' | 'center' | 'bottom' | 'custom';
  customPosition?: Position;
}

/**
 * Export options configuration
 */
export interface ExportOptions {
  format: 'mp4' | 'mov' | 'webm' | 'gif' | 'audio' | 'srt' | 'vtt';
  resolution: '480p' | '720p' | '1080p' | '1440p' | '4k' | 'custom';
  customResolution?: { width: number; height: number };
  fps: 24 | 30 | 60;
  bitrate: number; // kbps
  codec: 'h264' | 'h265' | 'vp9' | 'av1';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  includeAudioDescriptions: boolean;
  includeSignLanguage: boolean;
  includeCaptions: boolean;
  captionLanguages: string[]; // ISO language codes
  burnCaptions: boolean;
  transparentBackground: boolean;
  outputName: string;
}

// ============================================================================
// API OPERATION TYPES - SCENE OPERATIONS
// ============================================================================

/**
 * Parameters for creating a new scene
 */
export interface CreateSceneParams {
  project_id: string;
  scene_order: number;
  name?: string;
  duration_seconds?: number;
  background_type?: BackgroundType;
  background_config?: BackgroundConfig;
  layout_type?: LayoutType;
  media_url?: string;
  media_type?: 'video' | 'audio' | 'image' | 'none';
}

/**
 * Parameters for updating an existing scene
 */
export interface UpdateSceneParams {
  scene_id: string;
  name?: string;
  duration_seconds?: number;
  background_type?: BackgroundType;
  background_config?: Partial<BackgroundConfig>;
  layout_type?: LayoutType;
  layout_config?: Record<string, any>;
  transition_type?: TransitionType;
  transition_duration_ms?: number;
  caption_template_id?: string | null;
  scene_config?: Record<string, any>;
}

/**
 * Parameters for splitting a scene at a specific time
 */
export interface SplitSceneParams {
  scene_id: string;
  split_time: number; // seconds from scene start
}

/**
 * Parameters for merging multiple scenes
 */
export interface MergeScenesParams {
  scene_ids: string[]; // array of scene IDs to merge (in order)
  transition_type?: TransitionType;
  transition_duration_ms?: number;
}

/**
 * Parameters for reordering scenes
 */
export interface ReorderScenesParams {
  project_id: string;
  scene_ids: string[]; // new order of scene IDs
}

/**
 * Parameters for deleting a scene
 */
export interface DeleteSceneParams {
  scene_id: string;
  preserve_layers?: boolean; // if true, move layers to adjacent scene
}

// ============================================================================
// API OPERATION TYPES - LAYER OPERATIONS
// ============================================================================

/**
 * Parameters for adding a new layer to a scene
 */
export interface AddLayerParams {
  scene_id: string;
  layer_type: LayerType;
  name: string;
  layer_order?: number;
  content: Record<string, any>;
  position?: Partial<Position>;
  transform?: Partial<Transform>;
  animation?: Animation;
  effects?: Effect[];
  start_time?: number;
  end_time?: number;
}

/**
 * Parameters for updating an existing layer
 */
export interface UpdateLayerParams {
  layer_id: string;
  name?: string;
  layer_order?: number;
  is_visible?: boolean;
  is_locked?: boolean;
  content?: Partial<Record<string, any>>;
  position?: Partial<Position>;
  transform?: Partial<Transform>;
  animation?: Animation | null;
  effects?: Effect[];
  blend_mode?: BlendMode;
  opacity?: number;
  start_time?: number;
  end_time?: number;
}

/**
 * Parameters for deleting a layer
 */
export interface DeleteLayerParams {
  layer_id: string;
}

/**
 * Parameters for duplicating a layer
 */
export interface DuplicateLayerParams {
  layer_id: string;
  offset_x?: number;
  offset_y?: number;
}

/**
 * Parameters for reordering layers within a scene
 */
export interface ReorderLayersParams {
  scene_id: string;
  layer_ids: string[]; // new order of layer IDs (bottom to top)
}

// ============================================================================
// API OPERATION TYPES - PROJECT OPERATIONS
// ============================================================================

/**
 * Parameters for creating a new project
 */
export interface CreateProjectParams {
  name: string;
  description?: string;
  video_id?: string;
  canvas_width?: number;
  canvas_height?: number;
  canvas_fps?: number;
}

/**
 * Parameters for updating an existing project
 */
export interface UpdateProjectParams {
  project_id: string;
  name?: string;
  description?: string;
  thumbnail_url?: string;
  canvas_width?: number;
  canvas_height?: number;
  canvas_fps?: number;
  default_transition?: TransitionType;
  default_transition_duration_ms?: number;
  audio_settings?: Partial<PremiumProject['audio_settings']>;
  status?: PremiumProject['status'];
}

/**
 * Parameters for deleting a project
 */
export interface DeleteProjectParams {
  project_id: string;
  delete_associated_media?: boolean;
}

// ============================================================================
// API OPERATION TYPES - MEDIA OPERATIONS
// ============================================================================

/**
 * Parameters for adding media to library
 */
export interface AddMediaParams {
  name: string;
  file_url: string;
  media_type: MediaLibraryItem['media_type'];
  project_id?: string;
  category?: string;
  tags?: string[];
  is_stock?: boolean;
  thumbnail_url?: string;
  proxy_url?: string;
  duration_seconds?: number;
  resolution?: { width: number; height: number };
}

/**
 * Parameters for updating media metadata
 */
export interface UpdateMediaParams {
  media_id: string;
  name?: string;
  category?: string;
  tags?: string[];
}

// ============================================================================
// API OPERATION TYPES - EXPORT OPERATIONS
// ============================================================================

/**
 * Parameters for creating an export job
 */
export interface CreateExportParams {
  project_id: string;
  export_options: ExportOptions;
}

/**
 * Parameters for getting export status
 */
export interface GetExportStatusParams {
  export_id: string;
}

// ============================================================================
// API OPERATION TYPES - AI OPERATIONS
// ============================================================================

/**
 * Parameters for generating AI suggestions
 */
export interface GenerateAISuggestionsParams {
  project_id: string;
  video_id?: string;
  suggestion_types: Array<
    | 'remove-filler-words'
    | 'detect-highlights'
    | 'auto-chapters'
    | 'suggest-transitions'
    | 'optimize-pacing'
    | 'remove-silences'
    | 'add-captions'
    | 'suggest-cuts'
  >;
}

/**
 * Parameters for accepting an AI suggestion
 */
export interface AcceptAISuggestionParams {
  suggestion_id: string;
  apply_to_project: boolean;
}

// ============================================================================
// API OPERATION TYPES - COLLABORATION OPERATIONS
// ============================================================================

/**
 * Parameters for inviting a collaborator
 */
export interface InviteCollaboratorParams {
  project_id: string;
  user_email: string;
  role: ProjectCollaborator['role'];
}

/**
 * Parameters for updating collaborator role
 */
export interface UpdateCollaboratorRoleParams {
  collaborator_id: string;
  role: ProjectCollaborator['role'];
}

/**
 * Parameters for adding a comment
 */
export interface AddCommentParams {
  project_id: string;
  scene_id?: string;
  comment_text: string;
  timestamp_seconds?: number;
}

/**
 * Parameters for resolving a comment
 */
export interface ResolveCommentParams {
  comment_id: string;
  is_resolved: boolean;
}

// ============================================================================
// API OPERATION TYPES - VERSION CONTROL OPERATIONS
// ============================================================================

/**
 * Parameters for creating a version snapshot
 */
export interface CreateVersionParams {
  project_id: string;
  version_note?: string;
  is_autosave?: boolean;
}

/**
 * Parameters for restoring a version
 */
export interface RestoreVersionParams {
  version_id: string;
}

// ============================================================================
// RESPONSE WRAPPER TYPES
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: APIError | null;
  metadata?: ResponseMetadata;
}

/**
 * API error structure
 */
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  request_id: string;
  timestamp: string;
  processing_time_ms: number;
  credits_used?: number;
}

// Specific response types
export type CreateSceneResponse = APIResponse<ProjectScene>;
export type UpdateSceneResponse = APIResponse<ProjectScene>;
export type DeleteSceneResponse = APIResponse<{ deleted: boolean }>;
export type ListScenesResponse = APIResponse<ProjectScene[]>;

export type AddLayerResponse = APIResponse<SceneLayer>;
export type UpdateLayerResponse = APIResponse<SceneLayer>;
export type DeleteLayerResponse = APIResponse<{ deleted: boolean }>;
export type ListLayersResponse = APIResponse<SceneLayer[]>;

export type CreateProjectResponse = APIResponse<PremiumProject>;
export type UpdateProjectResponse = APIResponse<PremiumProject>;
export type GetProjectResponse = APIResponse<PremiumProject>;
export type ListProjectsResponse = APIResponse<PremiumProject[]>;

export type CreateExportResponse = APIResponse<ExportJob>;
export type GetExportStatusResponse = APIResponse<ExportJob>;

export type GenerateAISuggestionsResponse = APIResponse<AISuggestion[]>;
export type AcceptAISuggestionResponse = APIResponse<{ applied: boolean }>;

export type AddMediaResponse = APIResponse<MediaLibraryItem>;
export type ListMediaResponse = APIResponse<MediaLibraryItem[]>;

export type InviteCollaboratorResponse = APIResponse<ProjectCollaborator>;
export type ListCollaboratorsResponse = APIResponse<ProjectCollaborator[]>;

export type AddCommentResponse = APIResponse<ProjectComment>;
export type ListCommentsResponse = APIResponse<ProjectComment[]>;

export type CreateVersionResponse = APIResponse<ProjectVersion>;
export type ListVersionsResponse = APIResponse<ProjectVersion[]>;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Partial update type (omits auto-generated fields)
 */
export type PartialUpdate<T> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Database insert types (omit auto-generated fields)
 */
export type InsertPremiumProject = Omit<PremiumProject, 'id' | 'created_at' | 'updated_at' | 'last_opened_at'>;
export type InsertProjectScene = Omit<ProjectScene, 'id' | 'created_at' | 'updated_at'>;
export type InsertSceneLayer = Omit<SceneLayer, 'id' | 'created_at' | 'updated_at'>;

/**
 * Timeline range for editor UI
 */
export interface TimelineRange {
  start: number; // seconds
  end: number; // seconds
  duration: number; // seconds
}

/**
 * Timeline marker for chapters, comments, bookmarks
 */
export interface TimelineMarker {
  id: string;
  time: number; // seconds
  label: string;
  color: string;
  type: 'chapter' | 'comment' | 'bookmark' | 'edit-point';
}

/**
 * Timeline track (video, audio, subtitle, marker tracks)
 */
export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'subtitle' | 'marker';
  clips: TimelineClip[];
  is_locked: boolean;
  is_muted: boolean;
  is_visible: boolean;
}

/**
 * Timeline clip representing a piece of media on the timeline
 */
export interface TimelineClip {
  id: string;
  track_id: string;
  scene_id?: string;
  layer_id?: string;
  start: number; // seconds on timeline
  end: number; // seconds on timeline
  source_start: number; // seconds in source media
  source_end: number; // seconds in source media
  media_url?: string;
  thumbnail_url?: string;
  name: string;
}

/**
 * Global editor state
 */
export interface EditorState {
  project: PremiumProject | null;
  scenes: ProjectScene[];
  layers: Record<string, SceneLayer[]>; // keyed by scene_id
  selected_scene_id: string | null;
  selected_layer_ids: string[];
  current_time: number; // seconds
  zoom: number; // 0.1 - 10.0
  is_playing: boolean;
  playback_rate: number; // 0.25 - 2.0
  timeline_tracks: TimelineTrack[];
  markers: TimelineMarker[];
}

/**
 * Editor settings and preferences
 */
export interface EditorSettings {
  snap_to_grid: boolean;
  show_safe_zones: boolean;
  show_rulers: boolean;
  auto_save_interval: number; // seconds
  keyboard_shortcuts: Record<string, string>;
  theme: 'light' | 'dark' | 'system';
}

// ============================================================================
// TYPE GUARDS & VALIDATORS
// ============================================================================

/**
 * Type guard for LayerType
 */
export function isLayerType(value: string): value is LayerType {
  return ['video', 'audio', 'text', 'subtitle', 'caption', 'image', 'shape', 'waveform', 'progress-bar', 'timer', 'marker', 'avatar'].includes(value);
}

/**
 * Type guard for TransitionType
 */
export function isTransitionType(value: string): value is TransitionType {
  return ['none', 'fade', 'crossfade', 'wipe-left', 'wipe-right', 'wipe-up', 'wipe-down', 'blur', 'zoom-in', 'zoom-out', 'slide-left', 'slide-right'].includes(value);
}

/**
 * Type guard for BackgroundType
 */
export function isBackgroundType(value: string): value is BackgroundType {
  return ['solid', 'gradient', 'image', 'video', 'blur'].includes(value);
}

/**
 * Type guard for LayoutType
 */
export function isLayoutType(value: string): value is LayoutType {
  return ['fullscreen', 'pip', 'split-vertical', 'split-horizontal', 'side-by-side', 'custom'].includes(value);
}

/**
 * Type guard for BlendMode
 */
export function isBlendMode(value: string): value is BlendMode {
  return ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn'].includes(value);
}
