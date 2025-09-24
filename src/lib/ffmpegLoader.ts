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

      // Use the SAME version as in package.json (0.12.15)
      const version = '0.12.15';
      const baseURL = `https://unpkg.com/@ffmpeg/core@${version}/dist/umd`;

      const [coreURL, wasmURL, workerURL] = await Promise.all([
        toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
      ]);

      await this.ffmpeg.load({ coreURL, wasmURL, workerURL });

      console.log('✅ FFmpeg loaded successfully');
      this.isLoaded = true;

      // Quick self-test
      await this.ffmpeg.exec(['-version']);
      console.log('✅ FFmpeg test passed');

      return this.ffmpeg;
    } catch (error) {
      console.error('FFmpeg load error:', error);
      this.loadPromise = null;
      this.isLoaded = false;
      throw new Error(`FFmpeg initialization failed: ${error.message}`);
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