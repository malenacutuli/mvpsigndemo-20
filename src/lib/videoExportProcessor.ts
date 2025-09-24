import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { ExportOptions, ExportAssets, ProgressCallback, RenderProgress } from '@/types/export';

interface AudioCue {
  audio_url: string;
  start_time: number;
  end_time: number;
  description: string;
}

interface SignLanguageClip {
  clip_url: string;
  start_time_ms: number;
  end_time_ms: number;
}

export class VideoExportProcessor {
  private ffmpeg: FFmpeg;
  private progressCallback?: ProgressCallback;

  constructor(progressCallback?: ProgressCallback) {
    this.ffmpeg = new FFmpeg();
    this.progressCallback = progressCallback;
  }

  private updateProgress(stage: RenderProgress['stage'], progress: number, message: string) {
    this.progressCallback?.({ stage, progress, message });
  }

  async renderAccessibleVideo(
    videoUrl: string,
    assets: ExportAssets,
    options: ExportOptions
  ): Promise<Blob> {
    console.log('🎬 Starting video export processing...', { videoUrl, options });
    
    try {
      this.updateProgress('preparing', 0, 'Initializing FFmpeg...');
      
      if (!this.ffmpeg.loaded) {
        console.log('📦 Loading FFmpeg core...');
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        
        this.ffmpeg.on('log', ({ message }) => {
          console.log('FFmpeg Log:', message);
        });

        this.ffmpeg.on('progress', ({ progress }) => {
          const percentage = Math.round(progress * 100);
          console.log('FFmpeg Progress:', percentage + '%');
          this.updateProgress('processing', 50 + (percentage * 0.4), `Processing video... ${percentage}%`);
        });

        // Load FFmpeg with proper error handling
        await this.ffmpeg.load({
          coreURL: `${baseURL}/ffmpeg-core.js`,
          wasmURL: `${baseURL}/ffmpeg-core.wasm`
        });
        console.log('✅ FFmpeg loaded successfully');
      }

      this.updateProgress('preparing', 10, 'Downloading video file...');
      console.log('⬇️ Fetching video from:', videoUrl);
      
      // Fetch video with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(videoUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
      }
      
      const videoArrayBuffer = await response.arrayBuffer();
      console.log('✅ Video downloaded, size:', (videoArrayBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB');
      
      // Write input video to FFmpeg filesystem
      await this.ffmpeg.writeFile('input.mp4', new Uint8Array(videoArrayBuffer));
      console.log('📁 Video written to FFmpeg filesystem');

      this.updateProgress('preparing', 30, 'Preparing export options...');

      // Start with simple approach - just burn subtitles if requested
      let ffmpegArgs = ['-i', 'input.mp4'];

      // Handle captions - use simple subtitle burning
      if (options.captions && assets.transcriptSegments.length > 0) {
        console.log('📝 Adding captions, segments:', assets.transcriptSegments.length);
        const srtContent = this.generateSRTFromSegments(assets.transcriptSegments);
        await this.ffmpeg.writeFile('subtitles.srt', new TextEncoder().encode(srtContent));
        
        // Use simple subtitle filter
        ffmpegArgs.push(
          '-vf', 'subtitles=subtitles.srt:force_style=\'FontSize=24,PrimaryColor=&Hffffff,BackColour=&H80000000,Bold=1\''
        );
      }

      // Output configuration - optimized for web
      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart', // Optimize for web streaming
        '-y', // Overwrite output file
        'output.mp4'
      );

      console.log('🔧 FFmpeg command:', ffmpegArgs.join(' '));
      this.updateProgress('processing', 50, 'Processing video...');
      
      // Execute FFmpeg with timeout
      const execPromise = this.ffmpeg.exec(ffmpegArgs);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Video processing timeout after 5 minutes')), 300000)
      );
      
      await Promise.race([execPromise, timeoutPromise]);
      console.log('✅ FFmpeg processing completed');

      this.updateProgress('processing', 90, 'Reading output file...');
      
      // Read the output file
      const outputData = await this.ffmpeg.readFile('output.mp4');
      console.log('📤 Output file size:', (outputData.length / 1024 / 1024).toFixed(2), 'MB');
      
      this.updateProgress('processing', 100, 'Export complete!');

      const blob = new Blob([outputData as Uint8Array], { type: 'video/mp4' });
      console.log('🎉 Video export processing completed successfully');
      
      return blob;

    } catch (error) {
      console.error('❌ Export processing failed:', error);
      
      // Provide more specific error messages
      if (error.name === 'AbortError') {
        throw new Error('Video download timed out. Please try again with a smaller video file.');
      } else if (error.message.includes('timeout')) {
        throw new Error('Video processing timed out. Large videos may take longer to process.');
      } else if (error.message.includes('fetch')) {
        throw new Error('Failed to download the video file. Please check your internet connection.');
      } else if (error.message.includes('FFmpeg')) {
        throw new Error('Video processing engine failed to initialize. Please refresh and try again.');
      } else {
        throw new Error(`Export failed: ${error.message || 'Unknown error'}`);
      }
    }
  }

  private generateSRTFromSegments(segments: ExportAssets['transcriptSegments']): string {
    let srtContent = '';
    
    segments.forEach((segment, index) => {
      const startTime = this.formatSRTTime(segment.start_time);
      const endTime = this.formatSRTTime(segment.end_time);
      
      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${segment.text}\n\n`;
    });

    return srtContent;
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  cleanup() {
    // Clean up FFmpeg files if needed
    try {
      if (this.ffmpeg.loaded) {
        // FFmpeg cleanup is handled automatically
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }
}