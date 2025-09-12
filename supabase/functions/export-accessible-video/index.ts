import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// @ts-ignore
declare global {
  const EdgeRuntime: {
    waitUntil(promise: Promise<any>): void;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Caption {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  speakerColor?: string;
}

interface AudioDescription {
  startTime: number;
  endTime: number;
  text: string;
  voiceStyle: string;
}

interface ExportRequest {
  videoId: string;
  videoUrl: string;
  captions: Caption[];
  audioDescriptions: AudioDescription[];
  language: string;
  exportOptions: {
    includeSubtitles: boolean;
    includeAudioDescriptions: boolean;
    subtitleStyle: any;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🎬 Accessible Video Export Request');
  
  try {
    const exportData: ExportRequest = await req.json();
    
    console.log('📊 Export data received:', {
      videoId: exportData.videoId,
      captionsCount: exportData.captions?.length || 0,
      audioDescriptionsCount: exportData.audioDescriptions?.length || 0,
      language: exportData.language,
      includeSubtitles: exportData.exportOptions?.includeSubtitles,
      includeAudioDescriptions: exportData.exportOptions?.includeAudioDescriptions
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate unique process ID
    const processId = crypto.randomUUID();
    
    // For now, we'll use a simplified approach that generates subtitle files
    // In a production environment, you'd use FFmpeg to process the actual video
    const result = await processAccessibleVideo(exportData, supabase, processId);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Export failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to export accessible video'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processAccessibleVideo(
  exportData: ExportRequest, 
  supabase: any, 
  processId: string
) {
  console.log('🔄 Processing accessible video with burned-in captions...');
  
  try {
    // Start background video processing
    EdgeRuntime.waitUntil(renderVideoWithCaptions(exportData, supabase, processId));
    
    return {
      success: true,
      processId,
      message: 'Video rendering started. Your accessible video with burned-in captions is being processed.',
      status: 'processing'
    };

  } catch (error) {
    console.error('❌ Processing failed:', error);
    throw new Error(`Video processing failed: ${error.message}`);
  }
}

async function renderVideoWithCaptions(
  exportData: ExportRequest, 
  supabase: any, 
  processId: string
) {
  try {
    console.log('🎬 Starting video rendering with FFmpeg...');
    
    // Generate FFmpeg filter for captions with speaker colors
    const captionFilter = generateCaptionFilter(exportData.captions);
    
    // Create temporary files
    const inputVideoPath = `/tmp/input_${processId}.mp4`;
    const outputVideoPath = `/tmp/output_${processId}.mp4`;
    
    // Download original video
    console.log('⬇️ Downloading original video...');
    const videoResponse = await fetch(exportData.videoUrl);
    if (!videoResponse.ok) {
      throw new Error('Failed to download original video');
    }
    
    const videoData = await videoResponse.arrayBuffer();
    await Deno.writeFile(inputVideoPath, new Uint8Array(videoData));
    
    // Prepare FFmpeg command
    const ffmpegCmd = [
      'ffmpeg',
      '-i', inputVideoPath,
      '-vf', captionFilter,
      '-c:a', 'copy', // Keep original audio
      '-c:v', 'libx264', // Re-encode video with captions
      '-preset', 'fast',
      '-crf', '23',
      '-movflags', '+faststart', // Optimize for streaming
      outputVideoPath
    ];
    
    console.log('🔧 Running FFmpeg command:', ffmpegCmd.join(' '));
    
    // Execute FFmpeg
    const process = new Deno.Command('ffmpeg', {
      args: ffmpegCmd.slice(1),
      stdout: 'pipe',
      stderr: 'pipe'
    });
    
    const { code, stdout, stderr } = await process.output();
    
    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      console.error('❌ FFmpeg failed:', errorText);
      throw new Error(`FFmpeg processing failed: ${errorText}`);
    }
    
    console.log('✅ Video rendering complete');
    
    // Upload processed video to Supabase Storage
    const outputVideo = await Deno.readFile(outputVideoPath);
    const outputFileName = `${exportData.videoId}_accessible.mp4`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('processed-videos')
      .upload(outputFileName, outputVideo, {
        contentType: 'video/mp4',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      throw new Error('Failed to upload processed video');
    }
    
    const { data: videoUrl } = supabase.storage
      .from('processed-videos')
      .getPublicUrl(outputFileName);
    
    console.log('🎉 Accessible video ready:', videoUrl.publicUrl);
    
    // Update process status in database (you'd implement this)
    // For now, we'll just log success
    console.log('✅ Process complete for:', processId);
    
    // Clean up temporary files
    try {
      await Deno.remove(inputVideoPath);
      await Deno.remove(outputVideoPath);
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError.message);
    }
    
  } catch (error) {
    console.error('❌ Video rendering failed:', error);
    // In a real implementation, you'd update the process status to 'failed'
  }
}

function generateCaptionFilter(captions: Caption[]): string {
  if (!captions || captions.length === 0) {
    return 'null'; // No captions to add
  }
  
  // Create drawtext filters for each caption with timing and colors
  const textFilters = captions.map((caption, index) => {
    const startTime = caption.startTime;
    const endTime = caption.endTime;
    const text = caption.text.replace(/'/g, "\\'").replace(/:/g, "\\:"); // Escape special chars
    const color = getSpeakerColorHex(caption.speakerColor || '#FFFFFF');
    
    return `drawtext=text='${text}':fontfile=/System/Library/Fonts/Arial.ttf:fontsize=36:fontcolor=${color}:box=1:boxcolor=black@0.7:boxborderw=8:x=(w-tw)/2:y=h-th-50:enable='between(t,${startTime},${endTime})'`;
  });
  
  // Join all drawtext filters
  return textFilters.join(',');
}

function getSpeakerColorHex(color: string): string {
  // Convert color names or other formats to hex
  const colorMap: { [key: string]: string } = {
    'blue': '#3B82F6',
    'green': '#10B981', 
    'red': '#EF4444',
    'yellow': '#F59E0B',
    'purple': '#8B5CF6',
    'pink': '#EC4899',
    'orange': '#F97316',
    'cyan': '#06B6D4'
  };
  
  return colorMap[color.toLowerCase()] || color || '#FFFFFF';
}

function generateSRTSubtitles(captions: Caption[]): string {
  let srt = '';
  
  captions.forEach((caption, index) => {
    const startTime = formatSRTTime(caption.startTime);
    const endTime = formatSRTTime(caption.endTime);
    
    // Add speaker color information as a comment
    const colorInfo = caption.speakerColor ? ` (Speaker: ${caption.speaker || 'Unknown'}, Color: ${caption.speakerColor})` : '';
    
    srt += `${index + 1}\n`;
    srt += `${startTime} --> ${endTime}\n`;
    srt += `${caption.text}${colorInfo}\n\n`;
  });
  
  return srt;
}

function generateAudioDescriptionScript(descriptions: AudioDescription[]): string {
  let script = '# Audio Description Script\n\n';
  script += 'This script contains audio descriptions that should be mixed into the video during silent moments.\n\n';
  
  descriptions.forEach((desc, index) => {
    const startTime = formatReadableTime(desc.startTime);
    const endTime = formatReadableTime(desc.endTime);
    
    script += `## Description ${index + 1}\n`;
    script += `**Time:** ${startTime} - ${endTime}\n`;
    script += `**Voice Style:** ${desc.voiceStyle}\n`;
    script += `**Text:** ${desc.text}\n\n`;
  });
  
  return script;
}

function generateEditingInstructions(exportData: ExportRequest): string {
  let instructions = '# Accessible Video Editing Instructions\n\n';
  
  instructions += `## Video Information\n`;
  instructions += `- **Video ID:** ${exportData.videoId}\n`;
  instructions += `- **Language:** ${exportData.language}\n`;
  instructions += `- **Features:** ${exportData.captions.length > 0 ? 'Captions' : ''} ${exportData.audioDescriptions.length > 0 ? 'Audio Descriptions' : ''}\n\n`;
  
  if (exportData.captions.length > 0) {
    instructions += `## Adding Captions\n`;
    instructions += `1. Import the SRT subtitle file into your video editor\n`;
    instructions += `2. Apply speaker colors as specified in the subtitle comments\n`;
    instructions += `3. Use the following text styling:\n`;
    instructions += `   - Font: Arial or similar sans-serif\n`;
    instructions += `   - Size: 24px or larger\n`;
    instructions += `   - Background: Semi-transparent black (70% opacity)\n`;
    instructions += `   - Padding: 8px horizontal, 12px vertical\n`;
    instructions += `   - Border radius: 4px\n\n`;
  }
  
  if (exportData.audioDescriptions.length > 0) {
    instructions += `## Adding Audio Descriptions\n`;
    instructions += `1. Generate TTS audio for each description using the specified voice style\n`;
    instructions += `2. Place audio descriptions at the exact timestamps specified\n`;
    instructions += `3. Ensure descriptions don't overlap with dialogue\n`;
    instructions += `4. Mix at appropriate volume level (slightly lower than main audio)\n\n`;
  }
  
  instructions += `## Social Media Optimization\n`;
  instructions += `- Export in MP4 format with H.264 codec\n`;
  instructions += `- Use 1080p resolution (1920x1080) for best compatibility\n`;
  instructions += `- Frame rate: 30fps or match original video\n`;
  instructions += `- Ensure captions are readable on mobile devices\n\n`;
  
  instructions += `## Platform-Specific Notes\n`;
  instructions += `- **YouTube:** Upload with captions embedded or as separate SRT file\n`;
  instructions += `- **Instagram/TikTok:** Keep captions large and high-contrast\n`;
  instructions += `- **Facebook:** Test playback with sound off to ensure caption readability\n\n`;
  
  return instructions;
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatReadableTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}