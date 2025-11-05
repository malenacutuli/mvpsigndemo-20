// Sequential browser-based video export with memory management
import { getFFmpeg } from './ffmpegLoader';
import { canvasCaptionRenderer } from './canvasCaptionRenderer';
import { exportManager } from './videoExportManager';
import { ExportOptions, ExportAssets } from '@/types/export';
import { makeProgressAggregator, ProgressCallback } from './progressAggregator';
import { fetchHeadSize, getVideoDuration, warnIfLarge, VideoMeta } from './sizeAndDuration';

export interface BrowserExportMeta {
  bytes?: number | null;
  duration?: number | null;
  warning?: string | null;
}

// Global timeout for entire export process
const EXPORT_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 hours max to avoid interrupting long renders
const STEP_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes per step (for non-caption steps)

// Calculate dynamic timeout for caption rendering based on video duration
function getCaptionTimeout(durationSeconds: number, fileSizeBytes?: number): number {
  // If duration is unknown but file is large, estimate based on file size
  let estimatedDuration = durationSeconds;
  if (!estimatedDuration && fileSizeBytes) {
    // Rough estimate: 1MB per 10 seconds for compressed video
    estimatedDuration = (fileSizeBytes / 1024 / 1024) * 10;
    console.log('[Caption Timeout] Estimated duration from file size:', estimatedDuration, 'seconds');
  }
  
  // Caption rendering plays video in real-time + 100% buffer for large files
  const baseTime = (estimatedDuration || 300) * 2 * 1000; // Double the time for safety
  const minTimeout = 5 * 60 * 1000; // At least 5 minutes for any video
  const timeout = Math.max(minTimeout, baseTime);
  
  console.log('[Caption Timeout] Calculated timeout:', Math.round(timeout / 1000), 'seconds for duration:', estimatedDuration);
  return timeout;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, stepName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`${stepName} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

export async function runBrowserExport(
  videoUrl: string, 
  assets: ExportAssets, 
  options: ExportOptions, 
  onProgress?: ProgressCallback
): Promise<{ blob: Blob; meta: BrowserExportMeta }> {
  console.log('🎬 Starting browser-based export processing...');
  console.log('📊 Export options:', options);
  console.log('📦 Assets summary:', {
    videoUrl: videoUrl ? 'provided' : 'missing',
    transcriptSegments: assets.transcriptSegments?.length || 0,
    audioDescriptions: assets.audioDescriptions?.length || 0,
    signLanguageClips: assets.signLanguageClips?.length || 0
  });
  
  // Create progress aggregator with timeout awareness
  const progressAggregator = onProgress ? makeProgressAggregator(onProgress) : () => {};
  
  // Global timeout wrapper
  const exportWithTimeout = async (): Promise<{ blob: Blob; meta: BrowserExportMeta }> => {
    // 0) Pre-flight: Get video metadata and warnings
    progressAggregator({ stage: 'captions', progress: 0, msg: 'Analyzing video metadata...' });
    
    const videoMeta: VideoMeta = {
      bytes: await withTimeout(fetchHeadSize(videoUrl), 30000, 'Video metadata fetch'),
      durationSec: await withTimeout(getVideoDuration(videoUrl, 120000), 120000, 'Video duration fetch'), // 2 minute timeout for large files
      aslClips: assets.signLanguageClips?.length || 0,
      adTracks: assets.audioDescriptions?.length || 0
    };
    
    console.log('[Export] Video metadata:', {
      size: videoMeta.bytes ? `${Math.round(videoMeta.bytes / 1024 / 1024)}MB` : 'unknown',
      duration: videoMeta.durationSec ? `${Math.round(videoMeta.durationSec)}s` : 'unknown',
      aslClips: videoMeta.aslClips,
      adTracks: videoMeta.adTracks
    });
    
    const warning = warnIfLarge(videoMeta);
    if (warning) {
      console.warn(warning);
    }
    
    let currentUrl = videoUrl;
    let previousUrl = videoUrl;
  
    try {
    // 1) CAPTIONS (Canvas rendering with CWI)
    if (options.captions && assets.transcriptSegments?.length) {
      progressAggregator({ stage: 'captions', progress: 0, msg: 'Rendering captions with word-by-word sync...' });
      
      // PHASE 1: Pass complete CWI data to canvas renderer
      const captionsForCanvas = assets.transcriptSegments.map(segment => ({
        startTime: segment.start_time,
        endTime: segment.end_time,
        text: segment.text,
        speaker: segment.speaker,
        speakerColor: segment.speaker_color || '#ffffff',
        words: segment.words || [], // CRITICAL: Include word timing
        vocal_intensity: (segment as any).vocal_intensity as 'whisper' | 'normal' | 'yell' | 'shout' | undefined,
        intensity_confidence: (segment as any).intensity_confidence as number | undefined,
        emphasis: segment.emphasis as 'loud' | 'quiet' | 'normal' | 'yelling' | undefined,
        pitch: (segment as any).pitch as number | 'high' | 'low' | 'normal' | undefined,
        volume: (segment as any).volume as number | undefined
      }));
      
      // Use dynamic timeout based on video duration and file size
      const captionTimeout = getCaptionTimeout(videoMeta.durationSec || 0, videoMeta.bytes || undefined);
      console.log(`[Export] Caption rendering timeout set to ${Math.round(captionTimeout / 1000)}s for ${Math.round(videoMeta.durationSec || 0)}s video`);
      
      currentUrl = await withTimeout(
        canvasCaptionRenderer.renderCaptionsOnCanvas(
          currentUrl,
          captionsForCanvas,
          { fontSize: 24, bg: true },
          (percent) => {
            // PHASE 4: Show detailed caption rendering progress
            progressAggregator({ 
              stage: 'captions', 
              progress: percent, 
              msg: `Rendering word-by-word captions: ${percent.toFixed(0)}%` 
            });
          }
        ),
        captionTimeout,
        'Caption rendering'
      );
      
      // Cleanup previous URL if it's a blob
      if (previousUrl !== videoUrl && previousUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrl);
      }
      previousUrl = currentUrl;
      
      // Force garbage collection for Canvas
      gcCanvas();
      console.log('✅ Canvas captions completed');
      progressAggregator({ stage: 'captions', progress: 100, msg: 'Captions rendered' });
    }
    
    // 2) SIGN LANGUAGE (FFmpeg overlay)
    if (options.signLanguage && assets.signLanguageClips?.length) {
      progressAggregator({ stage: 'asl', progress: 0, msg: 'Processing sign language overlays...' });
      
      // Calculate dynamic timeout based on number of clips (30 seconds per clip minimum)
      const aslTimeout = Math.max(STEP_TIMEOUT_MS, assets.signLanguageClips.length * 30000);
      console.log(`[Export] Sign language processing timeout set to ${Math.round(aslTimeout / 1000)}s for ${assets.signLanguageClips.length} clips`);
      
      const ffmpeg = await getFFmpeg();
      
      // Convert assets for FFmpeg processing
      const signLanguageForFFmpeg = assets.signLanguageClips.map(clip => ({
        id: clip.id,
        transcript_segment_id: clip.transcript_segment_id,
        start_time_ms: clip.start_time_ms,
        end_time_ms: clip.end_time_ms,
        clip_url: clip.clip_url
      }));
      
      const transcriptForFFmpeg = assets.transcriptSegments.map(segment => ({
        id: segment.id,
        start_time: segment.start_time,
        end_time: segment.end_time,
        text: segment.text,
        start_time_ms: segment.start_time * 1000,
        end_time_ms: segment.end_time * 1000
      }));
      
      const aslBlob = await withTimeout(
        exportManager.exportVideo({
          videoFile: currentUrl,
          transcriptSegments: transcriptForFFmpeg,
          signLanguageClips: signLanguageForFFmpeg,
          audioDescriptions: [],
          features: { captions: false, signLanguage: true, audioDescription: false },
          onProgress: (progress) => {
            progressAggregator({ stage: 'asl', progress: progress.progress, msg: `Sign language: ${progress.step}` });
          }
        }),
        aslTimeout,
        'Sign language overlay processing'
      );
      
      // Update to new blob URL
      if (previousUrl !== videoUrl && previousUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrl);
      }
      currentUrl = URL.createObjectURL(aslBlob);
      previousUrl = currentUrl;
      
      // Cleanup FFmpeg memory
      gcFFmpeg(ffmpeg);
      console.log('✅ Sign language overlay completed');
    }
    
    // 3) AUDIO DESCRIPTIONS (FFmpeg mixing)
    if (options.audioDescription && assets.audioDescriptions?.length) {
      progressAggregator({ stage: 'ad', progress: 0, msg: 'Mixing audio descriptions...' });
      
      const ffmpeg = await getFFmpeg();
      
      const audioDescForFFmpeg = (assets.audioDescriptions || [])
        .filter(ad => !!ad.audioUrl)
        .map(ad => ({
          start_time_ms: ad.startTime * 1000,
          end_time_ms: ad.endTime * 1000,
          duration: ad.endTime - ad.startTime,
          audio_url: ad.audioUrl!
        }));
      
      if (audioDescForFFmpeg.length === 0) {
        console.warn('Skipping AD mix: no audio files present');
        progressAggregator({ stage: 'ad', progress: 100, msg: 'No audio files for audio descriptions; skipped' });
      } else {
        const adBlob = await exportManager.exportVideo({
          videoFile: currentUrl,
          transcriptSegments: [],
          signLanguageClips: [],
          audioDescriptions: audioDescForFFmpeg,
          features: { captions: false, signLanguage: false, audioDescription: true },
          onProgress: (progress) => {
            progressAggregator({ stage: 'ad', progress: progress.progress, msg: `Audio: ${progress.step}` });
          }
        });
        
        // Update to final blob URL
        if (previousUrl !== videoUrl && previousUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previousUrl);
        }
        currentUrl = URL.createObjectURL(adBlob);
        console.log('✅ Audio descriptions completed');
      }
      
      // Cleanup FFmpeg memory
      gcFFmpeg(ffmpeg);
    }
    
    // 4) Finalize
    progressAggregator({ stage: 'finalizing', progress: 100, msg: 'Export completed!' });
    
    // Convert URL to Blob for consistent return type
    let finalBlob: Blob;
    if (currentUrl.startsWith('blob:')) {
      const response = await fetch(currentUrl);
      finalBlob = await response.blob();
    } else {
      // Fallback: fetch the original video
      const response = await fetch(currentUrl);
      finalBlob = await response.blob();
    }
    
    console.log('🎉 Browser export completed successfully');
    
    return {
      blob: finalBlob,
      meta: {
        bytes: videoMeta.bytes,
        duration: videoMeta.durationSec,
        warning
      }
    };
    
  } catch (error) {
    console.error('❌ Browser export failed:', error);
    
    // Cleanup any blob URLs on error
    if (currentUrl !== videoUrl && currentUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentUrl);
    }
    
    throw error;
    }
  };

  // Apply global timeout to entire export process
  return withTimeout(exportWithTimeout(), EXPORT_TIMEOUT_MS, 'Entire export process');
}

/**
 * Force Canvas GPU memory cleanup
 */
function gcCanvas() {
  try {
    // Create and immediately destroy a canvas to trigger cleanup
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 0;
    tempCanvas.height = 0;
    const ctx = tempCanvas.getContext('2d');
    ctx?.clearRect(0, 0, 1, 1);
  } catch (error) {
    console.warn('Canvas cleanup failed:', error);
  }
}

/**
 * Force FFmpeg WASM memory cleanup
 */
function gcFFmpeg(ffmpeg: any) {
  try {
    // Terminate FFmpeg instance to free WASM memory
    ffmpeg?.terminate?.();
  } catch (error) {
    console.warn('FFmpeg cleanup failed:', error);
  }
}