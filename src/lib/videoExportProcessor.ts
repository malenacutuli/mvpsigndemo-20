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
    console.log('🎬 Starting video export processing...', { videoUrl, options, assetsCount: {
      transcriptSegments: assets.transcriptSegments.length,
      audioDescriptions: assets.audioDescriptions.length,
      signLanguageClips: assets.signLanguageClips.length
    }});
    
    try {
      this.updateProgress('preparing', 0, 'Initializing processing. This could take up to 5 minutes.');
      
      if (!this.ffmpeg.loaded) {
        console.log('📦 Loading FFmpeg core...');
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        
        this.ffmpeg.on('log', ({ message }) => {
          console.log('FFmpeg Log:', message);
        });

        this.ffmpeg.on('progress', ({ progress }) => {
          const percentage = Math.round(progress * 100);
          console.log('FFmpeg Progress:', percentage + '%');
          this.updateProgress('processing', 50 + (percentage * 0.4), `Processing video... ${percentage}%`);
        });

        await this.ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
        });
        console.log('✅ FFmpeg loaded successfully');
      }

      this.updateProgress('preparing', 10, 'Downloading video file...');
      console.log('⬇️ Fetching video from:', videoUrl);
      
      // Fetch and write main video
      const videoData = await fetchFile(videoUrl);
      await this.ffmpeg.writeFile('input.mp4', videoData);
      console.log('✅ Video downloaded, size:', (videoData.length / 1024 / 1024).toFixed(2), 'MB');

      // Build FFmpeg command dynamically based on options
      let inputs = ['-i', 'input.mp4'];
      let inputIndex = 1;
      let filterComplex = '';
      let videoFilterChain = '[0:v]';
      let audioFilterChain = '[0:a]';

      this.updateProgress('preparing', 20, 'Processing accessibility features...');

      // Handle Sign Language overlays first (they need to be applied to video before subtitles)
      if (options.signLanguage && assets.signLanguageClips.length > 0) {
        console.log('🤟 Processing', assets.signLanguageClips.length, 'ASL clips');
        
        for (let i = 0; i < assets.signLanguageClips.length; i++) {
          const asl = assets.signLanguageClips[i];
          try {
            console.log(`Loading ASL clip ${i + 1}:`, asl.clip_url);
            const aslData = await fetchFile(asl.clip_url);
            const aslFileName = `asl_${i}.mp4`;
            await this.ffmpeg.writeFile(aslFileName, aslData);
            inputs.push('-i', aslFileName);
            
            const startTime = asl.start_time_ms / 1000;
            const endTime = asl.end_time_ms / 1000;
            
            if (i === 0) {
              videoFilterChain = `[0:v][${inputIndex}:v]overlay=W-w-20:H-h-20:enable='between(t,${startTime},${endTime})'[v${i + 1}]`;
            } else {
              const prevRef = `v${i}`;
              videoFilterChain += `;[${prevRef}][${inputIndex}:v]overlay=W-w-20:H-h-20:enable='between(t,${startTime},${endTime})'[v${i + 1}]`;
            }
            inputIndex++;
          } catch (error) {
            console.warn(`Failed to load ASL clip ${i}:`, error);
          }
        }
        
        // Update video reference for next step
        const lastVideoRef = `v${assets.signLanguageClips.length}`;
        videoFilterChain = `${videoFilterChain}`;
        
        // Now add subtitles to the ASL-overlayed video
        if (options.captions && assets.transcriptSegments.length > 0) {
          console.log('📝 Adding captions to ASL video, segments:', assets.transcriptSegments.length);
          const srtContent = this.generateSRTFromSegments(assets.transcriptSegments);
          await this.ffmpeg.writeFile('subtitles.srt', new TextEncoder().encode(srtContent));
          videoFilterChain += `;[${lastVideoRef}]subtitles=subtitles.srt:force_style=FontSize=24,PrimaryColor=\&Hffffff,BackColour=\&H80000000,Bold=1[vout]`;
        } else {
          videoFilterChain += `;[${lastVideoRef}]null[vout]`;
        }
      } else if (options.captions && assets.transcriptSegments.length > 0) {
        // Only subtitles, no ASL
        console.log('📝 Adding captions only, segments:', assets.transcriptSegments.length);
        const srtContent = this.generateSRTFromSegments(assets.transcriptSegments);
        await this.ffmpeg.writeFile('subtitles.srt', new TextEncoder().encode(srtContent));
        videoFilterChain = '[0:v]subtitles=subtitles.srt:force_style=FontSize=24,PrimaryColor=\&Hffffff,BackColour=\&H80000000,Bold=1[vout]';
      } else {
        // No video processing needed
        videoFilterChain = '[0:v]null[vout]';
      }

      // Handle Audio Descriptions
      if (options.audioDescription && assets.audioDescriptions.length > 0) {
        console.log('🎧 Processing', assets.audioDescriptions.length, 'audio descriptions');
        
        let adInputsLoaded = 0;
        for (let i = 0; i < assets.audioDescriptions.length; i++) {
          const ad = assets.audioDescriptions[i];
          if (ad.audio_url) {
            try {
              console.log(`Loading AD audio ${i + 1}:`, ad.audio_url);
              const adData = await fetchFile(ad.audio_url);
              const adFileName = `ad_${i}.mp3`;
              await this.ffmpeg.writeFile(adFileName, adData);
              inputs.push('-i', adFileName);
              adInputsLoaded++;
              inputIndex++;
            } catch (error) {
              console.warn(`Failed to load AD audio ${i}:`, error);
            }
          }
        }

        if (adInputsLoaded > 0) {
          // Duck main audio and mix with AD
          audioFilterChain = '[0:a]volume=0.7[main_audio]';
          let mixInputs = '[main_audio]';
          for (let i = 1; i <= adInputsLoaded; i++) {
            mixInputs += `[${inputIndex - adInputsLoaded + i - 1}:a]`;
          }
          audioFilterChain += `;${mixInputs}amix=inputs=${adInputsLoaded + 1}:duration=longest:normalize=0[aout]`;
        } else {
          audioFilterChain = '[0:a]anull[aout]';
        }
      } else {
        audioFilterChain = '[0:a]anull[aout]';
      }

      // Combine filters if needed
      if (videoFilterChain.includes('[vout]') || audioFilterChain.includes('[aout]')) {
        filterComplex = `${videoFilterChain};${audioFilterChain}`;
      }

      this.updateProgress('processing', 50, 'Building FFmpeg command...');

      // Build final FFmpeg command
      let ffmpegArgs = inputs;

      if (filterComplex) {
        ffmpegArgs.push('-filter_complex', filterComplex);
        ffmpegArgs.push('-map', '[vout]', '-map', '[aout]');
      } else {
        ffmpegArgs.push('-map', '0:v', '-map', '0:a');
      }

      // Output encoding settings
      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        'output.mp4'
      );

      console.log('🔧 FFmpeg command:', ffmpegArgs.join(' '));
      this.updateProgress('processing', 60, 'Processing video with FFmpeg...');
      
      // Execute with timeout
      const execPromise = this.ffmpeg.exec(ffmpegArgs);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('FFmpeg processing timeout after 5 minutes')), 300000)
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
      
      // Don't wrap the error, preserve original stack trace
      if (error.name === 'AbortError') {
        throw new Error('Video download timed out. Please try again with a smaller video file.');
      } else if (error.message?.includes('timeout')) {
        throw new Error('Video processing timed out. Large videos may take longer to process.');
      } else if (error.message?.includes('fetch')) {
        throw new Error('Failed to download the video file. Please check your internet connection.');
      } else if (error.message?.includes('FFmpeg')) {
        throw new Error('Video processing engine failed. Please refresh and try again.');
      } else {
        // Preserve original error for better debugging
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