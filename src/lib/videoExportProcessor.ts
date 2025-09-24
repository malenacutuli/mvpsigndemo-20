import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
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
      this.updateProgress('preparing', 0, 'Initializing processing. This could take up to 10 minutes.');

      if (!this.ffmpeg.loaded) {
        console.log('📦 Loading FFmpeg core...');
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

        await this.ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
        });

        this.ffmpeg.on('log', ({ message }) => console.log('FFmpeg Log:', message));
        this.ffmpeg.on('progress', ({ progress }) => {
          const pct = Math.round(progress * 100);
          this.updateProgress('processing', 50 + pct * 0.4, `Processing video... ${pct}%`);
        });

        console.log('✅ FFmpeg loaded successfully');
      }

      this.updateProgress('preparing', 10, 'Loading video file...');
      console.log('⬇️ Fetching video from:', videoUrl);

      // --- Input video
      const videoData = await fetchFile(videoUrl);
      await this.ffmpeg.writeFile('input.mp4', videoData);
      console.log('✅ Video loaded, size:', (videoData.length / 1024 / 1024).toFixed(2), 'MB');

      let inputs = ['-i', 'input.mp4'];
      let filterLines: string[] = [];
      let videoOut = '[0:v]';
      let audioOut = '[0:a]';
      let inputIndex = 1;

      this.updateProgress('preparing', 20, 'Processing accessibility features...');

      // --- Sign Language Overlays
      if (options.signLanguage && assets.signLanguageClips.length > 0) {
        console.log('🤟 Processing', assets.signLanguageClips.length, 'ASL clips');
        
        for (let i = 0; i < assets.signLanguageClips.length; i++) {
          const asl = assets.signLanguageClips[i];
          try {
            console.log(`Loading ASL clip ${i + 1}:`, asl.clip_url);
            const aslData = await fetchFile(asl.clip_url);
            const aslFile = `asl_${i}.mp4`;
            await this.ffmpeg.writeFile(aslFile, aslData);
            inputs.push('-i', aslFile);

            const start = asl.start_time_ms / 1000;
            const end = asl.end_time_ms / 1000;
            const outLabel = `[v_asl_${i}]`;

            filterLines.push(
              `${videoOut}[${inputIndex}:v]overlay=W-w-20:H-h-20:enable='between(t,${start},${end})'${outLabel}`
            );
            videoOut = outLabel;
            inputIndex++;
          } catch (error) {
            console.warn(`Failed to load ASL clip ${i}:`, error);
          }
        }
      }

      // --- Captions
      if (options.captions && assets.transcriptSegments.length > 0) {
        console.log('📝 Adding captions, segments:', assets.transcriptSegments.length);
        const srt = this.generateSRTFromSegments(assets.transcriptSegments);
        await this.ffmpeg.writeFile('subtitles.srt', new TextEncoder().encode(srt));
        const outLabel = '[v_sub]';
        filterLines.push(`${videoOut}subtitles=subtitles.srt:force_style="FontSize=24,PrimaryColor=&Hffffff,BackColour=&H80000000,Bold=1"${outLabel}`);
        videoOut = outLabel;
      } else {
        // Video passthrough
        const outLabel = '[v_passthrough]';
        filterLines.push(`${videoOut}null${outLabel}`);
        videoOut = outLabel;
      }

      // --- Audio Descriptions
      if (options.audioDescription && assets.audioDescriptions.length > 0) {
        console.log('🎧 Processing', assets.audioDescriptions.length, 'audio descriptions');
        
        const adInputs: string[] = [];
        for (let i = 0; i < assets.audioDescriptions.length; i++) {
          const ad = assets.audioDescriptions[i];
          if (!ad.audio_url) {
            console.warn(`AD ${i} has no audio_url, skipping`);
            continue;
          }
          
          try {
            console.log(`Loading AD audio ${i + 1}:`, ad.audio_url);
            const adData = await fetchFile(ad.audio_url);
            const adFile = `ad_${i}.mp3`;
            await this.ffmpeg.writeFile(adFile, adData);
            inputs.push('-i', adFile);
            adInputs.push(`[${inputIndex}:a]`);
            inputIndex++;
          } catch (error) {
            console.warn(`Failed to load AD audio ${i}:`, error);
          }
        }

        if (adInputs.length > 0) {
          // Duck main audio and mix with AD
          filterLines.push(`[0:a]volume=0.7[a_main]`);
          const outLabel = '[a_mix]';
          filterLines.push(`[a_main]${adInputs.join('')}amix=inputs=${adInputs.length + 1}:duration=longest:normalize=0${outLabel}`);
          audioOut = outLabel;
        } else {
          // Audio passthrough
          const outLabel = '[a_passthrough]';
          filterLines.push(`${audioOut}anull${outLabel}`);
          audioOut = outLabel;
        }
      } else {
        // Audio passthrough
        const outLabel = '[a_passthrough]';
        filterLines.push(`${audioOut}anull${outLabel}`);
        audioOut = outLabel;
      }

      this.updateProgress('processing', 50, 'Building FFmpeg command...');

      // --- Build FFmpeg arguments
      let ffmpegArgs = [...inputs];
      
      if (filterLines.length > 0) {
        ffmpegArgs.push('-filter_complex', filterLines.join(';'));
        ffmpegArgs.push('-map', videoOut, '-map', audioOut);
      } else {
        // No filters needed, direct mapping
        ffmpegArgs.push('-map', '0:v', '-map', '0:a');
      }

      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y', 'output.mp4'
      );

      console.log('🔧 FFmpeg command:', ffmpegArgs.join(' '));
      console.log('🔧 Filter lines:', filterLines);
      this.updateProgress('processing', 60, 'Processing video with FFmpeg...');

      // Execute with extended timeout (10 minutes)
      const execPromise = this.ffmpeg.exec(ffmpegArgs);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('FFmpeg processing timeout after 10 minutes')), 600000)
      );

      await Promise.race([execPromise, timeoutPromise]);
      console.log('✅ FFmpeg processing completed');

      this.updateProgress('processing', 90, 'Reading output file...');

      const outputData = await this.ffmpeg.readFile('output.mp4');
      console.log('📤 Output file size:', (outputData.length / 1024 / 1024).toFixed(2), 'MB');

      this.updateProgress('processing', 100, 'Export complete!');

      const blob = new Blob([outputData as Uint8Array], { type: 'video/mp4' });
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