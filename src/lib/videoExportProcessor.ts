import { ExportOptions, ExportAssets, ProgressCallback, RenderProgress } from '@/types/export';
import { exportManager } from './videoExportManager';
import { canvasCaptionRenderer } from './canvasCaptionRenderer';

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
  private progressCallback?: ProgressCallback;

  constructor(progressCallback?: ProgressCallback) {
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
    console.log('🎬 Starting video export processing...', {
      videoUrl,
      options,
      assetsCount: {
        transcriptSegments: assets.transcriptSegments.length,
        audioDescriptions: assets.audioDescriptions.length,
        signLanguageClips: assets.signLanguageClips.length
      }
    });

    try {
      this.updateProgress('preparing', 0, 'Initializing processing. This could take up to 5 minutes.');

      // Route captions through Canvas (avoid WASM subtitles filter crash)
      let processedVideoUrl = videoUrl;
      
      if (options.captions && assets.transcriptSegments.length > 0) {
        console.log('↪ Rendering captions via Canvas...');
        this.updateProgress('processing', 10, 'Rendering captions via Canvas...');
        
        const captionsForCanvas = assets.transcriptSegments.map(segment => ({
          startTime: segment.start_time,
          endTime: segment.end_time,
          text: segment.text,
          speakerColor: segment.speaker_color || '#ffffff'
        }));

        processedVideoUrl = await canvasCaptionRenderer.renderCaptionsOnCanvas(
          videoUrl,
          captionsForCanvas,
          { fontSize: 24, bg: true }
        );
        console.log('✅ Canvas captions rendered successfully');
      }

      // Convert assets to the format expected by VideoExportManager
      const transcriptForManager = assets.transcriptSegments.map(segment => ({
        id: segment.id,
        start_time: segment.start_time,
        end_time: segment.end_time,
        text: segment.text,
        start_time_ms: segment.start_time * 1000,
        end_time_ms: segment.end_time * 1000
      }));

      const signLanguageForManager = assets.signLanguageClips.map(clip => ({
        id: clip.id,
        start_time_ms: clip.start_time_ms,
        end_time_ms: clip.end_time_ms,
        clip_url: clip.clip_url
      }));

      const audioDescForManager = assets.audioDescriptions.map(ad => ({
        start_time_ms: ad.startTime * 1000,
        end_time_ms: ad.endTime * 1000,
        duration: ad.endTime - ad.startTime,
        audio_url: ad.audioUrl
      }));

      // Use FFmpeg for remaining features (ASL PiP, AD mixing) with captions disabled
      const ffmpegOptions = {
        captions: false, // Already processed via Canvas
        signLanguage: options.signLanguage,
        audioDescription: options.audioDescription
      };

      const blob = await exportManager.exportVideo({
        videoFile: processedVideoUrl,
        transcriptSegments: transcriptForManager,
        signLanguageClips: signLanguageForManager,
        audioDescriptions: audioDescForManager,
        features: ffmpegOptions,
        onProgress: (progress) => {
          this.updateProgress('processing', Math.max(30, progress.progress), `Processing ${progress.step}...`);
        }
      });

      this.updateProgress('processing', 100, 'Export complete!');
      console.log('🎉 Video export processing completed successfully');

      return blob;

    } catch (error) {
      console.error('❌ Export processing failed:', error);

      // Preserve original error for better debugging
      if (error.name === 'AbortError') {
        throw new Error('Video download timed out. Please try again with a smaller video file.');
      } else if (error.message?.includes('timeout')) {
        throw new Error('Video processing timed out. Large videos with complex accessibility features may take longer to process.');
      } else if (error.message?.includes('fetch')) {
        throw new Error('Failed to download video or accessibility assets. Please check your internet connection.');
      } else if (error.message?.includes('FFmpeg')) {
        throw new Error('Video processing engine failed. Please refresh and try again.');
      } else {
        // Preserve original error for debugging
        throw error;
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
    // Cleanup is now handled by the VideoExportManager
    console.log('🧹 VideoExportProcessor cleanup completed');
  }
}