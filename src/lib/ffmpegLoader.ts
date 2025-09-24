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
      
      // Set up logging
      this.ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]:', message);
      });

      // Progress tracking
      this.ffmpeg.on('progress', ({ progress, time }) => {
        const progressPercent = Math.round(progress * 100);
        console.log(`Processing: ${progressPercent}% (time: ${time})`);
        
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('ffmpeg-progress', {
          detail: { progress: progressPercent, time }
        }));
      });

      // Try multiple CDN sources for better reliability
      const sources = [
        'https://unpkg.com/@ffmpeg/core@0.12.15/dist/umd',
        'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.15/dist/umd',
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      ];

      let loadError;
      
      for (const baseURL of sources) {
        try {
          console.log(`Trying to load FFmpeg from: ${baseURL}`);
          
          // Load core files with detailed error handling
          const [coreURL, wasmURL, workerURL] = await Promise.all([
            toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript').catch(e => {
              console.error(`Failed to load core.js from ${baseURL}:`, e);
              throw e;
            }),
            toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm').catch(e => {
              console.error(`Failed to load core.wasm from ${baseURL}:`, e);
              throw e;
            }),
            toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript').catch(e => {
              console.error(`Failed to load core.worker.js from ${baseURL}:`, e);
              throw e;
            })
          ]);

          console.log('All FFmpeg files loaded, initializing...');

          // Load FFmpeg with timeout
          const loadTimeout = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('FFmpeg load timeout after 45 seconds')), 45000)
          );

          await Promise.race([
            this.ffmpeg.load({
              coreURL,
              wasmURL,
              workerURL,
            }),
            loadTimeout
          ]);

          console.log('FFmpeg loaded successfully from:', baseURL);
          this.isLoaded = true;
          
          // Test with minimal operation
          await this.testFFmpeg();
          
          return this.ffmpeg;

        } catch (error) {
          console.error(`Failed to load from ${baseURL}:`, error);
          loadError = error;
          continue;
        }
      }
      
      // If we get here, all sources failed
      throw loadError || new Error('All FFmpeg sources failed to load');
    } catch (error) {
      console.error('FFmpeg load error:', error);
      this.loadPromise = null;
      this.isLoaded = false;
      throw new Error(`FFmpeg initialization failed: ${error.message}`);
    }
  }

  private async testFFmpeg(): Promise<void> {
    try {
      // Quick test to ensure FFmpeg is working
      if (this.ffmpeg) {
        await this.ffmpeg.exec(['-version']);
        console.log('FFmpeg test passed');
      }
    } catch (error) {
      console.error('FFmpeg test failed:', error);
      throw error;
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