import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

class FFmpegLoader {
  private ffmpeg: FFmpeg | null = null;
  private loadPromise: Promise<FFmpeg> | null = null;
  private isLoaded = false;

  async getFFmpeg(): Promise<FFmpeg> {
    // Return existing instance if already loaded
    if (this.isLoaded && this.ffmpeg) {
      return this.ffmpeg;
    }

    // Return existing load promise if loading is in progress
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Start loading
    this.loadPromise = this._loadFFmpeg();
    return this.loadPromise;
  }

  private async _loadFFmpeg(): Promise<FFmpeg> {
    try {
      console.log('Initializing FFmpeg...');

      this.ffmpeg = new FFmpeg();

      this.ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]:', message));
      this.ffmpeg.on('progress', ({ progress }) => {
        const progressPercent = Math.round(progress * 100);
        console.log(`Progress: ${progressPercent}%`);
        
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('ffmpeg-progress', {
          detail: { progress: progressPercent }
        }));
      });

      // Core version must match the WASM glue on CDN/local
      const version = '0.12.6';

      // Prefer same-origin local assets to avoid CORS/CDN issues
      const sources = [
        `${window.location.origin}/ffmpeg/${version}`,
        `https://unpkg.com/@ffmpeg/core@${version}/dist/umd`,
        `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${version}/dist/umd`,
      ];

      let lastError: unknown = null;

      for (const baseURL of sources) {
        try {
          console.log(`[FFmpeg] Attempting load from: ${baseURL}`);

          const [coreURL, wasmURL, workerURL] = await Promise.all([
            toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
          ]);

          // Load with timeout to avoid hanging
          const loadTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('[FFmpeg] Load timeout after 45s')), 45000)
          );

          await Promise.race([
            this.ffmpeg.load({ coreURL, wasmURL, workerURL }),
            loadTimeout,
          ]);

          console.log(`[FFmpeg] ✅ Loaded from: ${baseURL}`);
          this.isLoaded = true;

          // Self-test: print version
          await this.ffmpeg.exec(['-version']);
          console.log('[FFmpeg] ✅ Self-test passed');

          // Signal readiness
          window.dispatchEvent(new CustomEvent('ffmpeg-ready'));
          return this.ffmpeg;
        } catch (e) {
          console.warn(`[FFmpeg] Source failed (${baseURL}):`, e);
          lastError = e;
          // try next source
        }
      }

      throw lastError || new Error('[FFmpeg] All sources failed');
    } catch (error: any) {
      console.error('FFmpeg load error:', error);
      this.loadPromise = null;
      this.isLoaded = false;
      // Bubble an event for UI/debuggers
      window.dispatchEvent(new CustomEvent('ffmpeg-error', { detail: { error: String(error?.message || error) } }));
      throw new Error(`FFmpeg initialization failed: ${error?.message || error}`);
    }
  }

  // Clean up resources
  terminate(): void {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.ffmpeg = null;
      this.isLoaded = false;
      this.loadPromise = null;
    }
  }

  // Check if FFmpeg is ready
  isReady(): boolean {
    return this.isLoaded && this.ffmpeg !== null;
  }
}

// Export singleton instance
export const ffmpegLoader = new FFmpegLoader();

// Helper function for easy access
export async function getFFmpeg(): Promise<FFmpeg> {
  return ffmpegLoader.getFFmpeg();
}
