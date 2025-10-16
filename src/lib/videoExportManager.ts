import { getFFmpeg } from './ffmpegLoader';
import { fetchFile } from '@ffmpeg/util';
import { FFmpeg } from '@ffmpeg/ffmpeg';

// Helper function to fetch files with retry logic
async function fetchFileWithRetry(url: string, maxRetries = 3): Promise<Uint8Array> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📥 Downloading file (attempt ${attempt}/${maxRetries}): ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log(`✅ Downloaded ${uint8Array.length} bytes`);
      return uint8Array;
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`❌ Download attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(
    `Failed to download file after ${maxRetries} attempts: ${lastError?.message}`
  );
}

interface ExportFeatures {
  captions: boolean;
  signLanguage: boolean;
  audioDescription: boolean;
}

interface TranscriptSegment {
  id: string;
  start_time: number;
  end_time: number;
  text: string;
  start_time_ms?: number;
  end_time_ms?: number;
}

interface SignLanguageClip {
  id: string;
  transcript_segment_id?: string;
  url?: string;
  clip_url?: string;
  start_time_ms: number;
  end_time_ms: number;
}

interface AudioDescription {
  start_time_ms: number;
  end_time_ms?: number;
  duration?: number;
  url?: string;
  audio_url?: string;
}

interface ExportProgress {
  step: string;
  progress: number;
}

export class VideoExportManager {
  private ffmpeg: FFmpeg | null = null;

  async initialize(): Promise<void> {
    this.ffmpeg = await getFFmpeg();
  }

  /**
   * Main export function with progressive feature application
   */
  async exportVideo({
    videoFile,
    transcriptSegments = [],
    signLanguageClips = [],
    audioDescriptions = [],
    features = {
      captions: false,
      signLanguage: false,
      audioDescription: false
    },
    onProgress = (_progress: ExportProgress) => {}
  }: {
    videoFile: string | File;
    transcriptSegments?: TranscriptSegment[];
    signLanguageClips?: SignLanguageClip[];
    audioDescriptions?: AudioDescription[];
    features?: ExportFeatures;
    onProgress?: (progress: ExportProgress) => void;
  }): Promise<Blob> {
    try {
      await this.initialize();
      
      // Clean up any previous files
      await this.cleanup();
      
      // Load the input video
      console.log('Loading input video...');
      const videoData = await fetchFile(videoFile);
      await this.ffmpeg!.writeFile('input.mp4', videoData);
      
      let currentOutput = 'input.mp4';
      let stepCount = 0;
      const totalSteps = Object.values(features).filter(v => v).length;
      
      // Step 1: Add Captions
      if (features.captions && transcriptSegments.length > 0) {
        console.log('Processing captions...');
        onProgress({ step: 'captions', progress: (stepCount / totalSteps) * 100 });
        
        currentOutput = await this.addCaptions(currentOutput, transcriptSegments);
        stepCount++;
      }
      
      // Step 2: Add Sign Language Overlay
      if (features.signLanguage && signLanguageClips.length > 0) {
        console.log('Processing sign language overlay...');
        onProgress({ step: 'signLanguage: preparing', progress: Math.max(1, Math.round((stepCount / totalSteps) * 100)) });
        
        currentOutput = await this.addSignLanguageOverlay(
          currentOutput, 
          signLanguageClips,
          transcriptSegments,
          onProgress
        );
        stepCount++;
      }
      
      // Step 3: Add Audio Descriptions
      if (features.audioDescription && audioDescriptions.length > 0) {
        console.log('Processing audio descriptions...');
        onProgress({ step: 'audioDescription', progress: (stepCount / totalSteps) * 100 });
        
        currentOutput = await this.addAudioDescriptions(
          currentOutput,
          audioDescriptions
        );
        stepCount++;
      }
      
      // Read final output
      const data = await this.ffmpeg!.readFile(currentOutput);
      const dataArray = data instanceof Uint8Array 
        ? new Uint8Array(data) 
        : new TextEncoder().encode(String(data));
      const blob = new Blob([dataArray], { type: 'video/mp4' });
      
      onProgress({ step: 'complete', progress: 100 });
      
      return blob;
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`Video export failed: ${error.message}`);
    }
  }

  /**
   * Add burned-in captions to video
   */
  private async addCaptions(inputFile: string, transcriptSegments: TranscriptSegment[]): Promise<string> {
    try {
      // Generate SRT content
      const srtContent = this.generateSRT(transcriptSegments);
      await this.ffmpeg!.writeFile('subtitles.srt', new TextEncoder().encode(srtContent));
      
      const outputFile = `captioned_${Date.now()}.mp4`;
      
      // Burn in subtitles with style
      await this.ffmpeg!.exec([
        '-i', inputFile,
        '-vf', `subtitles=subtitles.srt:force_style='FontSize=24,FontName=Arial,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2,Shadow=1,MarginV=30'`,
        '-c:a', 'copy',
        '-preset', 'fast',
        outputFile
      ]);
      
      return outputFile;
    } catch (error) {
      console.error('Caption processing failed:', error);
      throw error;
    }
  }

  /**
   * Add sign language overlay with duration handling
   */
  private async addSignLanguageOverlay(
    inputFile: string, 
    signLanguageClips: SignLanguageClip[], 
    transcriptSegments: TranscriptSegment[],
    onProgress?: (progress: ExportProgress) => void
  ): Promise<string> {
    try {
      const outputFile = `asl_${Date.now()}.mp4`;
      
      // Load all sign language clips with retry logic
      console.log(`📥 Downloading ${signLanguageClips.length} sign language clips...`);
      for (let i = 0; i < signLanguageClips.length; i++) {
        const clip = signLanguageClips[i];
        const clipUrl = clip.url || clip.clip_url;
        if (clipUrl) {
          try {
            onProgress?.({ step: `signLanguage: downloading clip ${i + 1}/${signLanguageClips.length}` , progress: Math.min(70, 10 + Math.round(((i + 1) / Math.max(1, signLanguageClips.length)) * 50)) });
            console.log(`📥 Downloading sign language clip ${i + 1} of ${signLanguageClips.length}...`);
            const clipData = await fetchFileWithRetry(clipUrl, 3);
            await this.ffmpeg!.writeFile(`asl_${i}.mp4`, clipData);
            console.log(`✅ Sign language clip ${i + 1} downloaded successfully`);
          } catch (error: any) {
            throw new Error(
              `Failed to download sign language clip ${i + 1}: ${error.message}. ` +
              `Please check the clip is accessible and try again.`
            );
          }
        }
      }
      onProgress?.({ step: 'signLanguage: preparing overlays', progress: 75 });
      console.log(`✅ All sign language clips downloaded successfully`);
      
      // Build complex filter for overlays
      const filterComplex = await this.buildASLFilterGraph(
        signLanguageClips,
        transcriptSegments
      );
      
      // Apply ASL overlays
      const inputs = ['-i', inputFile];
      signLanguageClips.forEach((_, i) => {
        inputs.push('-i', `asl_${i}.mp4`);
      });
      
      onProgress?.({ step: 'signLanguage: rendering overlays', progress: 90 });
      await this.ffmpeg!.exec([
        ...inputs,
        '-filter_complex', filterComplex,
        '-map', '[out]',
        '-map', '0:a?',
        '-c:v', 'mpeg4',
        '-c:a', 'copy',
        outputFile
      ]);
      
      return outputFile;
    } catch (error) {
      console.error('Sign language overlay failed:', error);
      throw error;
    }
  }

  /**
   * Build ASL filter graph with proper timing
   */
  private async buildASLFilterGraph(
    signLanguageClips: SignLanguageClip[], 
    transcriptSegments: TranscriptSegment[]
  ): Promise<string> {
    let filterSteps = [];
    let lastOutput = '0:v';
    let validClipsCount = 0;
    
    console.log('🎬 Building ASL filter graph...');
    console.log(`📊 Total clips: ${signLanguageClips.length}, Total segments: ${transcriptSegments.length}`);
    
    for (let i = 0; i < signLanguageClips.length; i++) {
      const clip = signLanguageClips[i];
      
      // Validate transcript_segment_id exists
      if (!clip.transcript_segment_id) {
        console.warn(`⚠️ ASL clip ${i + 1} is missing transcript_segment_id, skipping`);
        continue;
      }
      
      const segment = transcriptSegments.find(s => s.id === clip.transcript_segment_id);
      
      if (!segment) {
        console.warn(`⚠️ ASL clip ${i + 1} (ID: ${clip.id}) cannot find matching transcript segment (${clip.transcript_segment_id}), skipping`);
        continue;
      }
      
      console.log(`✅ ASL clip ${i + 1} matched to segment: "${segment.text.substring(0, 30)}..."`);
      validClipsCount++;
      
      const startTime = (segment.start_time_ms || segment.start_time * 1000) / 1000;
      const endTime = (segment.end_time_ms || segment.end_time * 1000) / 1000;
      const duration = endTime - startTime;
      
      // Scale and position ASL clip (bottom-right corner)
      const aslInput = `${i + 1}:v`;
      const scaledASL = `asl${i}`;
      const overlayOutput = i === signLanguageClips.length - 1 ? 'out' : `v${i}`;
      
      // Handle duration mismatch - loop or freeze last frame if clip is shorter
      filterSteps.push(
        `[${aslInput}]scale=320:240,setpts=PTS-STARTPTS,trim=duration=${duration}[${scaledASL}];`,
        
        `[${lastOutput}][${scaledASL}]overlay=` +
        `x=W-w-20:y=H-h-20:` +
        `enable='between(t,${startTime},${endTime})'` +
        `[${overlayOutput}]`
      );
      
      lastOutput = overlayOutput;
    }
    
    if (validClipsCount === 0) {
      throw new Error(
        'No valid ASL clips found. All clips are missing transcript segment associations. ' +
        'Please ensure sign language clips are properly linked to transcript segments.'
      );
    }
    
    console.log(`✅ ASL filter graph built with ${validClipsCount} valid clips`);
    return filterSteps.join('');
  }

  /**
   * Add audio descriptions with ducking
   */
  private async addAudioDescriptions(inputFile: string, audioDescriptions: AudioDescription[]): Promise<string> {
    try {
      const outputFile = `described_${Date.now()}.mp4`;
      
      // Load audio description files with retry logic
      for (let i = 0; i < audioDescriptions.length; i++) {
        const desc = audioDescriptions[i];
        const audioUrl = desc.url || desc.audio_url;
        if (audioUrl) {
          try {
            const audioData = await fetchFileWithRetry(audioUrl, 3);
            await this.ffmpeg!.writeFile(`desc_${i}.mp3`, audioData);
          } catch (error: any) {
            throw new Error(
              `Failed to download audio description ${i + 1}: ${error.message}. ` +
              `Please regenerate the audio file.`
            );
          }
        }
      }
      
      // Build audio filter for mixing with ducking
      const audioFilter = this.buildAudioDuckingFilter(audioDescriptions);
      
      const inputs = ['-i', inputFile];
      audioDescriptions.forEach((_, i) => {
        inputs.push('-i', `desc_${i}.mp3`);
      });
      
      await this.ffmpeg!.exec([
        ...inputs,
        '-filter_complex', audioFilter,
        '-map', '0:v',
        '-map', '[mixed]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        outputFile
      ]);
      
      return outputFile;
    } catch (error) {
      console.error('Audio description failed:', error);
      throw error;
    }
  }

  /**
   * Build audio ducking filter for descriptions
   */
  private buildAudioDuckingFilter(audioDescriptions: AudioDescription[]): string {
    let filter = '[0:a]';
    
    for (let i = 0; i < audioDescriptions.length; i++) {
      const desc = audioDescriptions[i];
      const startTime = desc.start_time_ms / 1000;
      const duration = desc.duration || ((desc.end_time_ms || desc.start_time_ms) - desc.start_time_ms) / 1000;
      
      // Duck main audio during description
      filter += `volume=0.3:enable='between(t,${startTime},${startTime + duration})'[main${i}];`;
      filter += `[${i + 1}:a]adelay=${startTime * 1000}|${startTime * 1000}[desc${i}];`;
      
      if (i === 0) {
        filter += `[main${i}][desc${i}]amix=inputs=2:duration=first`;
      } else {
        filter += `[mixed${i - 1}][desc${i}]amix=inputs=2:duration=first`;
      }
      
      filter += i === audioDescriptions.length - 1 ? '[mixed]' : `[mixed${i}];`;
    }
    
    return filter;
  }

  /**
   * Generate SRT content from transcript segments
   */
  private generateSRT(transcriptSegments: TranscriptSegment[]): string {
    return transcriptSegments.map((segment, index) => {
      const startTimeMs = segment.start_time_ms || segment.start_time * 1000;
      const endTimeMs = segment.end_time_ms || segment.end_time * 1000;
      const startTime = this.msToSRTTime(startTimeMs);
      const endTime = this.msToSRTTime(endTimeMs);
      
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
    }).join('\n');
  }

  /**
   * Convert milliseconds to SRT time format
   */
  private msToSRTTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
  }

  /**
   * Clean up temporary files
   */
  private async cleanup(): Promise<void> {
    try {
      if (!this.ffmpeg) return;
      
      const files = await this.ffmpeg.listDir('/');
      for (const file of files) {
        if (file.name !== '.' && file.name !== '..') {
          await this.ffmpeg.deleteFile(file.name).catch(() => {});
        }
      }
    } catch (error) {
      console.log('Cleanup skipped:', error.message);
    }
  }
}

export const exportManager = new VideoExportManager();