import { Layer } from './Layer';
import { Composition } from './Composition';
import type { VideoSource, CaptionData, SignLanguageClip } from './types';

export class VideoEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private composition: Composition;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  
  // Multi-layer support
  public layers = {
    video: new Layer('video', 'Main Video'),
    captions: new Layer('captions', 'Captions with Intention'),
    audioDesc: new Layer('audio-desc', 'Audio Descriptions'),
    signLanguage: new Layer('sign-lang', 'Sign Language'),
    overlays: new Layer('overlays', 'Overlays & Graphics')
  };
  
  private videoElement: HTMLVideoElement | null = null;
  private signLanguageElement: HTMLVideoElement | null = null;
  
  constructor(canvas: HTMLCanvasElement, config?: { width?: number; height?: number }) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: false
    });
    
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    
    this.ctx = ctx;
    
    // Set resolution
    this.canvas.width = config?.width || 1920;
    this.canvas.height = config?.height || 1080;
    
    this.composition = new Composition({
      width: this.canvas.width,
      height: this.canvas.height
    });
    
    // Set layer z-indices
    this.layers.video.setZIndex(0);
    this.layers.audioDesc.setZIndex(1);
    this.layers.signLanguage.setZIndex(2);
    this.layers.captions.setZIndex(3);
    this.layers.overlays.setZIndex(4);
  }
  
  // Load video source
  async loadVideo(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = url;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      
      video.addEventListener('loadedmetadata', () => {
        this.videoElement = video;
        
        const source: VideoSource = {
          url,
          element: video,
          duration: video.duration
        };
        
        this.composition.setVideoSource(source);
        
        // Add video renderer to video layer
        this.layers.video.addRenderable('main-video', {
          render: (renderCtx: any) => {
            if (this.videoElement && this.videoElement.readyState >= 2) {
              renderCtx.ctx.drawImage(
                this.videoElement,
                0, 0,
                renderCtx.width,
                renderCtx.height
              );
            }
          }
        });
        
        resolve();
      });
      
      video.addEventListener('error', (e) => {
        reject(new Error(`Failed to load video: ${e}`));
      });
    });
  }
  
  // Load captions
  loadCaptions(captions: CaptionData[]) {
    this.composition.setCaptions(captions);
    
    // Add caption renderer
    this.layers.captions.addRenderable('captions', {
      render: (renderCtx: any) => {
        const activeCaptions = this.composition.getActiveCaptions(this.currentTime);
        
        if (activeCaptions.length === 0) return;
        
        const ctx = renderCtx.ctx;
        const caption = activeCaptions[0]; // Show first active caption
        
        // Render caption with CWI styling
        ctx.save();
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Background
        const textMetrics = ctx.measureText(caption.text);
        const padding = 20;
        const bgX = (renderCtx.width - textMetrics.width) / 2 - padding;
        const bgY = renderCtx.height - 120;
        const bgWidth = textMetrics.width + padding * 2;
        const bgHeight = 70;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        
        // Text with speaker color
        ctx.fillStyle = caption.color || '#ffffff';
        ctx.fillText(caption.text, renderCtx.width / 2, renderCtx.height - 50);
        
        ctx.restore();
      }
    });
  }
  
  // Load sign language clips
  loadSignLanguageClips(clips: SignLanguageClip[]) {
    this.composition.setSignLanguageClips(clips);
    
    this.layers.signLanguage.addRenderable('sign-language', {
      render: (renderCtx: any) => {
        const activeClip = this.composition.getActiveSignLanguageClip(this.currentTime);
        
        if (!activeClip) {
          if (this.signLanguageElement) {
            this.signLanguageElement.pause();
          }
          return;
        }
        
        // Create or update sign language video element
        if (!this.signLanguageElement || this.signLanguageElement.src !== activeClip.url) {
          if (this.signLanguageElement) {
            this.signLanguageElement.pause();
          }
          
          const video = document.createElement('video');
          video.src = activeClip.url;
          video.crossOrigin = 'anonymous';
          video.muted = true;
          video.currentTime = this.currentTime - activeClip.startTime;
          
          if (this.isPlaying) {
            video.play();
          }
          
          this.signLanguageElement = video;
        }
        
        // Sync playback
        if (this.signLanguageElement && this.signLanguageElement.readyState >= 2) {
          const relativeTime = this.currentTime - activeClip.startTime;
          if (Math.abs(this.signLanguageElement.currentTime - relativeTime) > 0.1) {
            this.signLanguageElement.currentTime = relativeTime;
          }
          
          // Draw PiP
          const pos = activeClip.position || { x: 20, y: 20, width: 300, height: 300 };
          renderCtx.ctx.drawImage(
            this.signLanguageElement,
            pos.x, pos.y, pos.width, pos.height
          );
        }
      }
    });
  }
  
  // Main render loop
  private renderFrame(timestamp: number = 0) {
    if (!this.isPlaying) return;
    
    // Update time
    if (this.lastFrameTime > 0) {
      const delta = (timestamp - this.lastFrameTime) / 1000;
      this.currentTime += delta;
      
      // Update video element time
      if (this.videoElement) {
        if (Math.abs(this.videoElement.currentTime - this.currentTime) > 0.1) {
          this.videoElement.currentTime = this.currentTime;
        }
      }
    }
    this.lastFrameTime = timestamp;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render layers in order (sorted by z-index)
    const sortedLayers = Object.values(this.layers).sort((a, b) => 
      a.config.zIndex - b.config.zIndex
    );
    
    for (const layer of sortedLayers) {
      layer.render(this.ctx, this.currentTime);
    }
    
    // Continue loop
    this.animationFrameId = requestAnimationFrame((t) => this.renderFrame(t));
  }
  
  // Playback controls
  play() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    
    if (this.videoElement) {
      this.videoElement.play();
    }
    
    if (this.signLanguageElement) {
      this.signLanguageElement.play();
    }
    
    this.lastFrameTime = 0;
    this.animationFrameId = requestAnimationFrame((t) => this.renderFrame(t));
  }
  
  pause() {
    this.isPlaying = false;
    
    if (this.videoElement) {
      this.videoElement.pause();
    }
    
    if (this.signLanguageElement) {
      this.signLanguageElement.pause();
    }
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  seek(time: number) {
    this.currentTime = time;
    
    if (this.videoElement) {
      this.videoElement.currentTime = time;
    }
    
    // Re-render current frame
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const sortedLayers = Object.values(this.layers).sort((a, b) => 
      a.config.zIndex - b.config.zIndex
    );
    
    for (const layer of sortedLayers) {
      layer.render(this.ctx, this.currentTime);
    }
  }
  
  getCurrentTime(): number {
    return this.currentTime;
  }
  
  getDuration(): number {
    return this.composition.getDuration();
  }
  
  getComposition(): Composition {
    return this.composition;
  }
  
  destroy() {
    this.pause();
    
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement = null;
    }
    
    if (this.signLanguageElement) {
      this.signLanguageElement.pause();
      this.signLanguageElement.src = '';
      this.signLanguageElement = null;
    }
    
    Object.values(this.layers).forEach(layer => layer.clearRenderables());
  }
}
