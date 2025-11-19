export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'caption' | 'ad';
  name: string;
  height: number;
  isLocked: boolean;
  isMuted: boolean;
  isVisible: boolean;
  color: string;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  sceneId: string;
  startTime: number;
  endTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  color: string;
  thumbnailUrl?: string;
  waveformData?: number[];
}

export interface TimelineState {
  currentTime: number;
  zoom: number; // pixels per second
  scrollLeft: number;
  selectedClipIds: string[];
  selectedTrackId: string | null;
  playheadPosition: number;
  duration: number;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
}

export interface TimelineLayout {
  fullscreen: LayoutConfig;
  split: LayoutConfig;
  pip: LayoutConfig;
  multicam: LayoutConfig;
  screenCamera: LayoutConfig;
  lShape: LayoutConfig;
  custom: LayoutConfig;
}

export interface LayoutConfig {
  name: string;
  description: string;
  thumbnail: string;
  sources: number;
  arrangement: 'horizontal' | 'vertical' | 'grid' | 'overlay' | 'custom';
  positions?: LayoutPosition[];
}

export interface LayoutPosition {
  id: string;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  zIndex: number;
}

export interface Transition {
  type: 'none' | 'fade' | 'blur' | 'circle-wipe' | 'color-dip' | 'cross-zoom' | 'crossfade' | 'star-wipe' | 'wipe' | 'slide';
  duration: number; // milliseconds
  config?: Record<string, any>;
}

export interface Effect {
  id: string;
  type: 'shadow' | 'color-adjustment' | 'blur' | 'zoom' | 'brightness' | 'contrast' | 'saturation';
  enabled: boolean;
  parameters: Record<string, number | string | boolean>;
}
