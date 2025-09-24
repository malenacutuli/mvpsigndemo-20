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
  
  // Create progress aggregator
  const progressAggregator = onProgress ? makeProgressAggregator(onProgress) : () => {};
  
  // 0) Pre-flight: Get video metadata and warnings
  progressAggregator({ stage: 'captions', progress: 0, msg: 'Analyzing video metadata...' });
  
  const videoMeta: VideoMeta = {
    bytes: await fetchHeadSize(videoUrl),
    durationSec: await getVideoDuration(videoUrl),
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
    // 1) CAPTIONS (Canvas rendering)
    if (options.captions && assets.transcriptSegments?.length) {
      progressAggregator({ stage: 'captions', progress: 0, msg: 'Rendering captions via Canvas...' });
      
      const captionsForCanvas = assets.transcriptSegments.map(segment => ({
        startTime: segment.start_time,
        endTime: segment.end_time,
        text: segment.text,
        speakerColor: segment.speaker_color || '#ffffff'
      }));
      
      currentUrl = await canvasCaptionRenderer.renderCaptionsOnCanvas(
        currentUrl,
        captionsForCanvas,
        { fontSize: 24, bg: true }
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
      progressAggregator({ stage: 'asl', progress: 0, msg: 'Processing ASL overlays...' });
      
      const ffmpeg = await getFFmpeg();
      
      // Convert assets for FFmpeg processing
      const signLanguageForFFmpeg = assets.signLanguageClips.map(clip => ({
        id: clip.id,
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
      
      const aslBlob = await exportManager.exportVideo({
        videoFile: currentUrl,
        transcriptSegments: transcriptForFFmpeg,
        signLanguageClips: signLanguageForFFmpeg,
        audioDescriptions: [],
        features: { captions: false, signLanguage: true, audioDescription: false },
        onProgress: (progress) => {
          progressAggregator({ stage: 'asl', progress: progress.progress, msg: `ASL: ${progress.step}` });
        }
      });
      
      // Update to new blob URL
      if (previousUrl !== videoUrl && previousUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrl);
      }
      currentUrl = URL.createObjectURL(aslBlob);
      previousUrl = currentUrl;
      
      // Cleanup FFmpeg memory
      gcFFmpeg(ffmpeg);
      console.log('✅ ASL overlay completed');
    }
    
    // 3) AUDIO DESCRIPTIONS (FFmpeg mixing)
    if (options.audioDescription && assets.audioDescriptions?.length) {
      progressAggregator({ stage: 'ad', progress: 0, msg: 'Mixing audio descriptions...' });
      
      const ffmpeg = await getFFmpeg();
      
      const audioDescForFFmpeg = assets.audioDescriptions.map(ad => ({
        start_time_ms: ad.start_time * 1000,
        end_time_ms: ad.end_time * 1000,
        duration: ad.end_time - ad.start_time,
        audio_url: ad.audio_url
      }));
      
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
      
      // Cleanup FFmpeg memory
      gcFFmpeg(ffmpeg);
      console.log('✅ Audio descriptions completed');
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