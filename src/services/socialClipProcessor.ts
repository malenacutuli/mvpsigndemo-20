import { supabase } from '@/integrations/supabase/client';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { toast } from 'sonner';

let ffmpeg: FFmpeg | null = null;
let ffmpegLoaded = false;

// Initialize FFmpeg once
async function initFFmpeg() {
  if (ffmpegLoaded && ffmpeg) return ffmpeg;
  
  try {
    if (!ffmpeg) {
      ffmpeg = new FFmpeg();
      
      ffmpeg.on('progress', ({ progress, time }) => {
        console.log(`FFmpeg Progress: ${(progress * 100).toFixed(1)}%`);
      });
    }

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    ffmpegLoaded = true;
    console.log('✅ FFmpeg loaded successfully');
    return ffmpeg;
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    throw new Error('Failed to initialize video processor');
  }
}

export async function processMultiSegmentClip(
  clipId: string,
  videoId: string,
  segments: Array<{ startTime: number; endTime: number; text: string; segmentId?: string }>,
  captionTemplateId: string | null
) {
  try {
    console.log('🎬 Starting clip processing:', clipId);
    
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

    // Get video URL from storage
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(video.storage_path);

    if (!publicUrl) {
      throw new Error('Failed to get video URL');
    }

    // Fetch video blob
    const response = await fetch(publicUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch video');
    }
    const videoBlob = await response.blob();
    const videoData = new Uint8Array(await videoBlob.arrayBuffer());

    // Initialize FFmpeg
    const ffmpegInstance = await initFFmpeg();
    if (!ffmpegInstance) throw new Error('FFmpeg not initialized');

    // Write input video
    await ffmpegInstance.writeFile('input.mp4', videoData);

    // Create filter for concatenating segments
    const filterParts: string[] = [];
    let outputPts = 0;

    segments.forEach((seg, idx) => {
      const duration = seg.endTime - seg.startTime;
      filterParts.push(
        `[0:v]trim=start=${seg.startTime}:end=${seg.endTime},setpts=PTS-STARTPTS+${outputPts}/TB[v${idx}];`,
        `[0:a]atrim=start=${seg.startTime}:end=${seg.endTime},asetpts=PTS-STARTPTS+${outputPts}/TB[a${idx}];`
      );
      outputPts += duration;
    });

    // Concatenate all segments
    const concatVideo = segments.map((_, idx) => `[v${idx}]`).join('');
    const concatAudio = segments.map((_, idx) => `[a${idx}]`).join('');
    filterParts.push(
      `${concatVideo}concat=n=${segments.length}:v=1:a=0[outv];`,
      `${concatAudio}concat=n=${segments.length}:v=0:a=1[outa]`
    );

    const filterComplex = filterParts.join('');

    console.log('🎨 Executing FFmpeg with filter:', filterComplex);

    // Execute FFmpeg command
    await ffmpegInstance.exec([
      '-i', 'input.mp4',
      '-filter_complex', filterComplex,
      '-map', '[outv]',
      '-map', '[outa]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      '-c:a', 'aac',
      '-b:a', '128k',
      'output.mp4'
    ]);

    console.log('✅ Video processed');

    // Read output file
    const outputData = await ffmpegInstance.readFile('output.mp4');
    // Handle Uint8Array from FFmpeg
    const outputBlob = new Blob([new Uint8Array(outputData as Uint8Array)], { type: 'video/mp4' });

    console.log('📦 Output size:', (outputBlob.size / 1024 / 1024).toFixed(2), 'MB');

    // Upload to storage
    const fileName = `social-clips/${clipId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, outputBlob, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('✅ Uploaded to storage:', fileName);

    // Get public URL
    const { data: { publicUrl: clipUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    // Update database with completed clip
    const { error: updateError } = await supabase
      .from('social_clips')
      .update({ 
        status: 'completed',
        clip_url: clipUrl,
        processing_time: Date.now()
      })
      .eq('id', clipId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log('✅ Clip processing completed:', clipId);
    toast.success('Clip generated successfully!');

    // Cleanup FFmpeg files
    try {
      await ffmpegInstance.deleteFile('input.mp4');
      await ffmpegInstance.deleteFile('output.mp4');
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }

    return clipUrl;

  } catch (error: any) {
    console.error('❌ Clip processing failed:', error);
    
    // Update status to failed
    await supabase
      .from('social_clips')
      .update({ 
        status: 'failed',
        error_message: error.message 
      })
      .eq('id', clipId);

    toast.error('Failed to generate clip: ' + error.message);
    throw error;
  }
}
