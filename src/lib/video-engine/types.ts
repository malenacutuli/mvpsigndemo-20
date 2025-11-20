export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  time: number;
  width: number;
  height: number;
}

export interface LayerConfig {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
}

export interface VideoSource {
  url: string;
  element?: HTMLVideoElement;
  startTime?: number;
  duration?: number;
}

export interface CaptionData {
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  color?: string;
  style?: any;
}

export interface SignLanguageClip {
  url: string;
  startTime: number;
  endTime: number;
  position?: { x: number; y: number; width: number; height: number };
}

export interface AudioDescriptionMarker {
  time: number;
  description: string;
  duration: number;
}

export interface OverlayElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  startTime: number;
  endTime: number;
  position: { x: number; y: number; width: number; height: number };
  content: any;
}
