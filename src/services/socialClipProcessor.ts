import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { supabase } from '@/integrations/supabase/client';

interface ProcessClipParams {
  clipId: string;
  videoUrl: string;
  startTime: number;
  endTime: number;
  platform: 'tiktok' | 'instagram_reel' | 'youtube_short' | 'linkedin';
  onProgress?: (progress: number, stage: string) => void;
}

interface ProcessClipResult {
  success: boolean;
  clipUrl?: string;
  error?: string;
}

/**
 * Process a social clip in the browser using FFmpeg
 */
export async function processClipInBrowser(
  params: ProcessClipParams
): Promise<ProcessClipResult> {
  const { clipId, videoUrl, startTime, endTime, platform, onProgress } = params;
  
  console.log('🎬 Starting browser clip processing:', {
    clipId,
    startTime,
    endTime,
    duration: endTime - startTime,
    platform
  });

  let ffmpeg: FFmpeg | null = null;

  try {
    // Stage 1: Initialize FFmpeg
    onProgress?.(5, 'Initializing video processor...');
    
    ffmpeg = new FFmpeg();
    
    ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg:', message);
    });

    ffmpeg.on('progress', ({ progress, time }) => {
      const percent = Math.round(progress * 100);
      onProgress?.(30 + percent * 0.4, `Processing video... ${percent}%`);
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    console.log('✅ FFmpeg loaded');

    // Stage 2: Fetch source video
    onProgress?.(15, 'Downloading source video...');
    
    const videoData = await fetchFile(videoUrl);
    await ffmpeg.writeFile('input.mp4', videoData);
    
    console.log('✅ Source video loaded');

    // Stage 3: Determine platform dimensions
    const platformConfigs = {
      tiktok: { 
        width: 1080, 
        height: 1920, 
        aspectRatio: '9:16',
        filter: 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1'
      },
      instagram_reel: { 
        width: 1080, 
        height: 1920, 
        aspectRatio: '9:16',
        filter: 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1'
      },
      youtube_short: { 
        width: 1080, 
        height: 1920, 
        aspectRatio: '9:16',
        filter: 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1'
      },
      linkedin: { 
        width: 1080, 
        height: 1080, 
        aspectRatio: '1:1',
        filter: 'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1'
      }
    };

    const config = platformConfigs[platform];
    const duration = endTime - startTime;

    console.log('🎨 Processing with config:', config);

    // Stage 4: Process video with FFmpeg
    onProgress?.(30, 'Processing video...');

    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-vf', config.filter,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      'output.mp4'
    ]);

    console.log('✅ Video processed');

    // Stage 5: Read output file
    onProgress?.(75, 'Preparing upload...');
    
    const data = await ffmpeg.readFile('output.mp4');
    // Handle Uint8Array from FFmpeg
    const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
    
    console.log('✅ Output ready:', {
      size: blob.size,
      sizeMB: (blob.size / 1024 / 1024).toFixed(2)
    });

    // Stage 6: Upload to Supabase Storage
    onProgress?.(80, 'Uploading clip...');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fileName = `${clipId}.mp4`;
    const storagePath = `clips/${user.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(storagePath, blob, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw uploadError;
    }

    console.log('✅ Uploaded to storage:', storagePath);

    // Stage 7: Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(storagePath);

    const clipUrl = publicUrlData.publicUrl;

    console.log('✅ Public URL:', clipUrl);

    // Stage 8: Update database
    onProgress?.(90, 'Finalizing...');

    const { error: updateError } = await supabase
      .from('social_clips')
      .update({
        status: 'completed',
        clip_url: clipUrl,
        storage_path: storagePath,
        file_size_bytes: blob.size,
        processing_completed_at: new Date().toISOString()
      })
      .eq('id', clipId);

    if (updateError) {
      console.error('❌ DB update error:', updateError);
      throw updateError;
    }

    console.log('✅ Database updated');

    onProgress?.(100, 'Complete!');

    return {
      success: true,
      clipUrl
    };

  } catch (error: any) {
    console.error('❌ Clip processing failed:', error);

    // Mark as failed in database
    try {
      await supabase
        .from('social_clips')
        .update({
          status: 'failed',
          error_message: error.message || 'Browser processing failed',
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', clipId);
    } catch (dbError) {
      console.error('❌ Failed to update error status:', dbError);
    }

    return {
      success: false,
      error: error.message || 'Processing failed'
    };
  } finally {
    // Cleanup
    if (ffmpeg) {
      try {
        await ffmpeg.deleteFile('input.mp4');
        await ffmpeg.deleteFile('output.mp4');
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}
