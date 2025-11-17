import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { supabase } from '@/integrations/supabase/client';
import { SegmentSelection } from '@/hooks/useMultiSegmentStitching';

// CRITICAL: Copy working patterns from exportOrchestrator.ts
let ffmpegInstance: FFmpeg | null = null;

async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;

  const ffmpeg = new FFmpeg();

  // Load FFmpeg with correct paths (working configuration)
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

export async function processMultiSegmentClip(
  clipId: string,
  videoId: string,
  segments: SegmentSelection[],
  captionTemplateId?: string
) {
  try {
    // Update status to processing
    await supabase
      .from('social_clips')
      .update({ 
        status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', clipId);

    // Get video storage path
    const { data: video } = await supabase
      .from('videos')
      .select('storage_path')
      .eq('id', videoId)
      .single();

    if (!video?.storage_path) throw new Error('Video not found or has no storage path');

    // Download video file
    const { data: videoFile } = await supabase.storage
      .from('videos')
      .download(video.storage_path);

    if (!videoFile) throw new Error('Failed to download video');

    // Load FFmpeg
    const ffmpeg = await loadFFmpeg();

    // Write input video to FFmpeg
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

    // Extract each segment
    const segmentFiles: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const duration = segment.endTime - segment.startTime;
      const outputFile = `segment_${i}.mp4`;

      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', segment.startTime.toString(),
        '-t', duration.toString(),
        '-c', 'copy', // Fast, no re-encoding
        outputFile
      ]);

      segmentFiles.push(outputFile);
    }

    // Create concat file
    const concatList = segmentFiles.map(f => `file '${f}'`).join('\n');
    await ffmpeg.writeFile('concat.txt', concatList);

    // Concatenate all segments
    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      '-c', 'copy',
      'output.mp4'
    ]);

    // Read output file
    const data = await ffmpeg.readFile('output.mp4');
    const uint8Array = data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(data);
    const blob = new Blob([uint8Array], { type: 'video/mp4' });

    // Upload to Supabase Storage
    const storagePath = `social-clips/${clipId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(storagePath, blob, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(storagePath);

    // Update database to 'completed' status
    await supabase
      .from('social_clips')
      .update({
        status: 'completed',
        clip_url: publicUrl,
        storage_path: storagePath,
        file_size_bytes: blob.size,
        processing_completed_at: new Date().toISOString()
      })
      .eq('id', clipId);

    // Clean up FFmpeg memory
    for (const file of segmentFiles) {
      await ffmpeg.deleteFile(file);
    }
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('concat.txt');
    await ffmpeg.deleteFile('output.mp4');

    return { success: true, clipUrl: publicUrl };
  } catch (error) {
    console.error('Multi-segment processing error:', error);

    // Update database to 'failed' status
    await supabase
      .from('social_clips')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        processing_completed_at: new Date().toISOString()
      })
      .eq('id', clipId);

    throw error;
  }
}
