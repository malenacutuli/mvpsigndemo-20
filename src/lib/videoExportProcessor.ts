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
    try {
      this.updateProgress('preparing', 0, 'Initializing FFmpeg...');
      
      if (!this.ffmpeg.loaded) {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        this.ffmpeg.on('log', ({ message }) => {
          console.log(message);
        });
        await this.ffmpeg.load({ coreURL: `${baseURL}/ffmpeg-core.js` });
      }

      this.updateProgress('preparing', 10, 'Loading video file...');
      
      // Load the main video
      const videoData = await fetchFile(videoUrl);
      await this.ffmpeg.writeFile('input.mp4', videoData);

      let filterComplex = '';
      let inputs = ['-i', 'input.mp4'];
      let inputIndex = 1;

      // Process captions if enabled
      if (options.captions && assets.transcriptSegments.length > 0) {
        this.updateProgress('preparing', 20, 'Processing captions...');
        const srtContent = this.generateSRTFromSegments(assets.transcriptSegments);
        await this.ffmpeg.writeFile('captions.srt', new TextEncoder().encode(srtContent));
      }

      // Process audio descriptions if enabled
      let audioFilterChain = '[0:a]';
      if (options.audioDescription && assets.audioDescriptions.length > 0) {
        this.updateProgress('preparing', 30, 'Processing audio descriptions...');
        
        // Load audio description files
        for (let i = 0; i < assets.audioDescriptions.length; i++) {
          const ad = assets.audioDescriptions[i];
          if (ad.audio_url) {
            try {
              const adData = await fetchFile(ad.audio_url);
              const adFileName = `ad_${i}.mp3`;
              await this.ffmpeg.writeFile(adFileName, adData);
              inputs.push('-i', adFileName);
              inputIndex++;
            } catch (error) {
              console.warn(`Failed to load audio description ${i}:`, error);
            }
          }
        }

        // Create audio mix filter (duck main audio slightly when AD plays)
        if (inputIndex > 1) {
          audioFilterChain = '[0:a]volume=0.7[main_audio];';
          let mixInputs = '[main_audio]';
          for (let i = 1; i < inputIndex; i++) {
            mixInputs += `[${i}:a]`;
          }
          audioFilterChain += `${mixInputs}amix=inputs=${inputIndex}:duration=longest:normalize=0[aout]`;
        } else {
          audioFilterChain = '[0:a]anull[aout]';
        }
      } else {
        audioFilterChain = '[0:a]anull[aout]';
      }

      // Process sign language clips if enabled
      let videoFilterChain = '[0:v]';
      if (options.signLanguage && assets.signLanguageClips.length > 0) {
        this.updateProgress('preparing', 40, 'Processing sign language clips...');
        
        // Load sign language video files
        for (let i = 0; i < assets.signLanguageClips.length; i++) {
          const asl = assets.signLanguageClips[i];
          try {
            const aslData = await fetchFile(asl.clip_url);
            const aslFileName = `asl_${i}.mp4`;
            await this.ffmpeg.writeFile(aslFileName, aslData);
            inputs.push('-i', aslFileName);
            
            // Create overlay filter for this ASL clip
            const startTime = asl.start_time_ms / 1000;
            const endTime = asl.end_time_ms / 1000;
            
            if (i === 0) {
              videoFilterChain = `[0:v][${inputIndex}:v]overlay=W-w-20:H-h-20:enable='between(t,${startTime},${endTime})'[v${i + 1}]`;
            } else {
              videoFilterChain += `;[v${i}][${inputIndex}:v]overlay=W-w-20:H-h-20:enable='between(t,${startTime},${endTime})'[v${i + 1}]`;
            }
            inputIndex++;
          } catch (error) {
            console.warn(`Failed to load ASL clip ${i}:`, error);
          }
        }
        
        // Final video output
        const lastVideoRef = assets.signLanguageClips.length > 0 ? `v${assets.signLanguageClips.length}` : '0:v';
        if (options.captions) {
          videoFilterChain += `;[${lastVideoRef}]subtitles=captions.srt[vout]`;
        } else {
          videoFilterChain += `;[${lastVideoRef}]null[vout]`;
        }
      } else {
        // No sign language, just handle captions
        if (options.captions) {
          videoFilterChain = '[0:v]subtitles=captions.srt[vout]';
        } else {
          videoFilterChain = '[0:v]null[vout]';
        }
      }

      // Combine video and audio filter chains
      filterComplex = `${videoFilterChain};${audioFilterChain}`;

      this.updateProgress('processing', 50, 'Rendering final video...');

      // Build FFmpeg command
      const args = [
        ...inputs,
        '-filter_complex', filterComplex,
        '-map', '[vout]',
        '-map', '[aout]',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y', // Overwrite output file
        'output.mp4'
      ];

      console.log('FFmpeg command:', args.join(' '));
      
      await this.ffmpeg.exec(args);

      this.updateProgress('processing', 90, 'Finalizing output...');

      // Read the output file
      const outputData = await this.ffmpeg.readFile('output.mp4');
      
      this.updateProgress('processing', 100, 'Export complete!');

      return new Blob([outputData as Uint8Array], { type: 'video/mp4' });

    } catch (error) {
      console.error('Export processing error:', error);
      throw new Error(`Export failed: ${error.message}`);
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