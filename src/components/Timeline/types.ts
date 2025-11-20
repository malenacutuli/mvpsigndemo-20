export interface TimelineClip {
  id: string;
  trackId: string;
  startTime: number;
  endTime: number;
  offset?: number;
  trimStart?: number;
  trimEnd?: number;
  label?: string;
  color?: string;
  source?: any;
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'captions' | 'audio-desc' | 'sign-lang' | 'overlay';
  clips: TimelineClip[];
  locked?: boolean;
  muted?: boolean;
  solo?: boolean;
  visible?: boolean;
  height?: number;
  color?: string;
}

export interface TimelineState {
  currentTime: number;
  duration: number;
  zoom: number;
  scrollLeft: number;
  selectedClipIds: string[];
  playheadPosition: number;
}
