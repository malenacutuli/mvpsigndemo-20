import { supabase } from '@/integrations/supabase/client';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { toast } from 'sonner';

let ffmpeg: FFmpeg | null = null;
let ffmpegLoaded = false;

export type ProgressCallback = (progress: number) => void;

// Initialize FFmpeg once
async function initFFmpeg(onProgress?: ProgressCallback) {
  if (ffmpegLoaded && ffmpeg) return ffmpeg;
  
  try {
    if (!ffmpeg) {
      ffmpeg = new FFmpeg();
      
      ffmpeg.on('progress', ({ progress }) => {
        const percent = Math.round(progress * 100);
        console.log(`FFmpeg Progress: ${percent}%`);
        onProgress?.(percent);
      });
      
      ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });
    }

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    ffmpegLoaded = true;
    console.log('✅ FFmpeg loaded successfully');
    return ffmpeg;
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    ffmpegLoaded = false;
    ffmpeg = null;
    throw new Error('Failed to initialize video processor');
  }
}

function getPlatformDimensions(platform: string) {
  const dimensions: Record<string, { width: number; height: number }> = {
    tiktok: { width: 1080, height: 1920 },
    instagram_reel: { width: 1080, height: 1920 },
    youtube_short: { width: 1080, height: 1920 },
    linkedin: { width: 1080, height: 1080 },
    twitter: { width: 1280, height: 720 },
  };
  return dimensions[platform] || dimensions.tiktok;
}

export async function processSocialClip(
  videoUrl: string,
  startTime: number,
  endTime: number,
  platform: string,
  options: {
    includeCaptions?: boolean;
    captionTemplateId?: string | null;
    cropToVertical?: boolean;
  },
  onProgress?: ProgressCallback
): Promise<Blob> {
  console.log('🎬 Processing social clip:', { platform, startTime, endTime, options });
  
  const ffmpegInstance = await initFFmpeg(onProgress);
  if (!ffmpegInstance) throw new Error('FFmpeg not initialized');
  
  try {
    // 1. Fetch and load video
    onProgress?.(10);
    console.log('📥 Fetching video from:', videoUrl);
    
    const videoData = await fetchFile(videoUrl);
    await ffmpegInstance.writeFile('input.mp4', videoData);
    
    onProgress?.(20);
    
    // 2. Get platform dimensions
    const dimensions = getPlatformDimensions(platform);
    
    // 3. Build FFmpeg command
    const ffmpegArgs: string[] = [
      '-i', 'input.mp4',
      '-ss', startTime.toString(),
      '-to', endTime.toString(),
    ];
    
    // 4. Add video filters
    const filters: string[] = [];
    
    // Crop/scale based on options
    if (options.cropToVertical && platform !== 'linkedin' && platform !== 'twitter') {
      // For vertical platforms, crop to center vertical
      filters.push(
        `crop=ih*9/16:ih,scale=${dimensions.width}:${dimensions.height}`
      );
    } else {
      // Scale and pad to fit dimensions
      filters.push(
        `scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease,` +
        `pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2:black`
      );
    }
    
    if (filters.length > 0) {
      ffmpegArgs.push('-vf', filters.join(','));
    }
    
    // 5. Output encoding settings optimized for social media
    ffmpegArgs.push(
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-profile:v', 'high',
      '-level', '4.2',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-movflags', '+faststart',
      '-y',
      'output.mp4'
    );
    
    onProgress?.(30);
    
    // 6. Execute FFmpeg
    console.log('🎨 Executing FFmpeg with args:', ffmpegArgs.join(' '));
    await ffmpegInstance.exec(ffmpegArgs);
    
    onProgress?.(80);
    
    // 7. Read output
    console.log('📤 Reading output file');
    const outputData = await ffmpegInstance.readFile('output.mp4');
    
    onProgress?.(90);
    
    // 8. Clean up
    console.log('🧹 Cleaning up temporary files');
    try {
      await ffmpegInstance.deleteFile('input.mp4');
      await ffmpegInstance.deleteFile('output.mp4');
    } catch (cleanupError) {
      console.warn('Cleanup warning:', cleanupError);
    }
    
    onProgress?.(100);
    
    // 9. Create and return Blob (handle FileData type properly)
    const blob = new Blob([outputData as BlobPart], { type: 'video/mp4' });
    console.log('✅ Social clip processed successfully, size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
    
    return blob;
  } catch (error) {
    console.error('❌ Social clip processing failed:', error);
    
    // Clean up on error
    try {
      await ffmpegInstance.deleteFile('input.mp4').catch(() => {});
      await ffmpegInstance.deleteFile('output.mp4').catch(() => {});
    } catch {}
    
    throw error;
  }
}

export async function processMultiSegmentClip(
  clipId: string,
  videoId: string,
  segments: Array<{ startTime: number; endTime: number; text: string; segmentId?: string }>,
  captionTemplateId: string | null,
  platform?: string,
  onProgress?: ProgressCallback
) {
  try {
    console.log('🎬 Starting multi-segment clip processing:', clipId);
    onProgress?.(5);
    
    // Update status to processing
    await supabase
      .from('social_clips')
      .update({ status: 'processing' })
      .eq('id', clipId);

    // Get video
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('storage_path')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      throw new Error('Video not found');
    }

    onProgress?.(10);

    // Get video URL from storage
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(video.storage_path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get video URL');
    }

    const videoUrl = urlData.publicUrl;

    onProgress?.(15);

    // Fetch video
    const videoData = await fetchFile(videoUrl);
    
    // Initialize FFmpeg
    const ffmpegInstance = await initFFmpeg((progress) => {
      // Map FFmpeg progress to 15-80% range
      const mappedProgress = 15 + Math.round(progress * 0.65);
      onProgress?.(mappedProgress);
    });
    
    if (!ffmpegInstance) throw new Error('FFmpeg not initialized');

    // Write input video
    await ffmpegInstance.writeFile('input.mp4', videoData);

    // Build filter for concatenating segments
    const filterParts: string[] = [];
    let totalDuration = 0;

    segments.forEach((seg, idx) => {
      const duration = seg.endTime - seg.startTime;
      totalDuration += duration;
      
      filterParts.push(
        `[0:v]trim=start=${seg.startTime}:end=${seg.endTime},setpts=PTS-STARTPTS[v${idx}];`,
        `[0:a]atrim=start=${seg.startTime}:end=${seg.endTime},asetpts=PTS-STARTPTS[a${idx}];`
      );
    });

    // Concatenate all segments
    const videoStreams = segments.map((_, idx) => `[v${idx}]`).join('');
    const audioStreams = segments.map((_, idx) => `[a${idx}]`).join('');
    filterParts.push(
      `${videoStreams}concat=n=${segments.length}:v=1:a=0[outv];`,
      `${audioStreams}concat=n=${segments.length}:v=0:a=1[outa]`
    );

    const filterComplex = filterParts.join('');

    console.log('🎨 Executing FFmpeg with segments:', segments.length);

    // Apply platform-specific dimensions if specified
    const outputArgs: string[] = [
      '-i', 'input.mp4',
      '-filter_complex', filterComplex,
      '-map', '[outv]',
      '-map', '[outa]',
    ];

    // Add platform-specific scaling
    if (platform) {
      const dimensions = getPlatformDimensions(platform);
      outputArgs.push(
        '-vf', `scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease,pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2:black`
      );
    }

    // Encoding settings
    outputArgs.push(
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      'output.mp4'
    );

    // Execute FFmpeg
    await ffmpegInstance.exec(outputArgs);

    console.log('✅ Video segments concatenated');

    onProgress?.(80);

    // Read output
    const outputData = await ffmpegInstance.readFile('output.mp4');
    const blob = new Blob([outputData as BlobPart], { type: 'video/mp4' });

    onProgress?.(85);

    // Upload to storage
    const fileName = `${clipId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('social-clips')
      .upload(fileName, blob, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload clip: ${uploadError.message}`);
    }

    onProgress?.(95);

    // Get public URL for the clip
    const { data: clipUrlData } = supabase.storage
      .from('social-clips')
      .getPublicUrl(fileName);

    const clipPublicUrl = clipUrlData.publicUrl;

    // Update clip record
    await supabase
      .from('social_clips')
      .update({
        status: 'completed',
        clip_url: clipPublicUrl,
        duration_seconds: totalDuration,
        processed_at: new Date().toISOString(),
      })
      .eq('id', clipId);

    onProgress?.(100);

    // Clean up
    try {
      await ffmpegInstance.deleteFile('input.mp4');
      await ffmpegInstance.deleteFile('output.mp4');
    } catch (cleanupError) {
      console.warn('Cleanup warning:', cleanupError);
    }

    console.log('✅ Multi-segment clip completed:', clipId);
    
    return {
      success: true,
      url: clipPublicUrl,
      duration: totalDuration,
    };

  } catch (error) {
    console.error('❌ Multi-segment clip processing failed:', error);
    
    // Update status to failed
    await supabase
      .from('social_clips')
      .update({ 
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Processing failed'
      })
      .eq('id', clipId);
    
    throw error;
  }
}
