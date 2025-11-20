import { Layer } from './Layer';
import type { VideoSource, CaptionData, SignLanguageClip, AudioDescriptionMarker, OverlayElement } from './types';

export class Composition {
  private duration: number = 0;
  private fps: number = 30;
  private width: number = 1920;
  private height: number = 1080;
  
  public videoSources: VideoSource[] = [];
  public captions: CaptionData[] = [];
  public signLanguageClips: SignLanguageClip[] = [];
  public audioDescriptions: AudioDescriptionMarker[] = [];
  public overlays: OverlayElement[] = [];

  constructor(config?: { width?: number; height?: number; fps?: number; duration?: number }) {
    if (config) {
      this.width = config.width || 1920;
      this.height = config.height || 1080;
      this.fps = config.fps || 30;
      this.duration = config.duration || 0;
    }
  }

  setVideoSource(source: VideoSource) {
    this.videoSources = [source];
    if (source.duration) {
      this.duration = source.duration;
    }
  }

  addCaption(caption: CaptionData) {
    this.captions.push(caption);
    this.updateDuration(caption.endTime);
  }

  setCaptions(captions: CaptionData[]) {
    this.captions = captions;
  }

  addSignLanguageClip(clip: SignLanguageClip) {
    this.signLanguageClips.push(clip);
    this.updateDuration(clip.endTime);
  }

  setSignLanguageClips(clips: SignLanguageClip[]) {
    this.signLanguageClips = clips;
  }

  addAudioDescription(marker: AudioDescriptionMarker) {
    this.audioDescriptions.push(marker);
    this.updateDuration(marker.time + marker.duration);
  }

  addOverlay(overlay: OverlayElement) {
    this.overlays.push(overlay);
    this.updateDuration(overlay.endTime);
  }

  removeOverlay(id: string) {
    this.overlays = this.overlays.filter(o => o.id !== id);
  }

  private updateDuration(time: number) {
    if (time > this.duration) {
      this.duration = time;
    }
  }

  getDuration(): number {
    return this.duration;
  }

  getActiveCaptions(time: number): CaptionData[] {
    return this.captions.filter(c => time >= c.startTime && time <= c.endTime);
  }

  getActiveSignLanguageClip(time: number): SignLanguageClip | null {
    const clip = this.signLanguageClips.find(c => time >= c.startTime && time <= c.endTime);
    return clip || null;
  }

  getActiveOverlays(time: number): OverlayElement[] {
    return this.overlays.filter(o => time >= o.startTime && time <= o.endTime);
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getFPS(): number {
    return this.fps;
  }
}
