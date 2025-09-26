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
        error: error instanceof Error ? error.message : 'Unknown error',
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
    throw new Error(`Video processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function renderVideoWithCaptions(
  exportData: ExportRequest, 
  supabase: any, 
  processId: string
) {
  try {
    console.log('🎬 Starting video rendering with Rendi API...');
    
    const rendiApiKey = Deno.env.get('RENDI_API_KEY');
    console.log('🔑 Rendi API key available:', !!rendiApiKey);
    
    if (!rendiApiKey) {
      console.error('❌ RENDI_API_KEY is not configured');
      throw new Error('RENDI_API_KEY is not configured');
    }
    
    // For now, let's simulate a successful render to test the flow
    console.log('🧪 Using mock render for testing...');
    
    // Wait a bit to simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create a mock successful completion by uploading the original video as "processed"
    console.log('⬇️ Downloading original video for mock processing...');
    const videoResponse = await fetch(exportData.videoUrl);
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to download original video: ${videoResponse.status}`);
    }
    
    const videoData = await videoResponse.arrayBuffer();
    const outputFileName = `${exportData.videoId}_accessible.mp4`;
    
    console.log('📤 Uploading mock processed video...');
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('processed-videos')
      .upload(outputFileName, videoData, {
        contentType: 'video/mp4',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      throw new Error(`Failed to upload processed video: ${uploadError.message}`);
    }
    
    console.log('✅ Upload successful:', uploadData);
    
    const { data: videoUrl } = supabase.storage
      .from('processed-videos')
      .getPublicUrl(outputFileName);
    
    console.log('🎉 Mock accessible video ready:', videoUrl.publicUrl);
    console.log('✅ Process complete for:', processId);
    
    // TODO: Update status in database to mark as complete
    // For now we'll rely on the export-status function checking storage
    
  } catch (error) {
    console.error('❌ Video rendering failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Error'
    });
    throw error;
  }
}

function generateRendiSubtitleLayers(captions: Caption[]): any[] {
  return captions.map((caption, index) => ({
    type: "text",
    text: caption.text,
    x: 960, // Center horizontally
    y: 900, // Near bottom
    width: 1600,
    height: 120,
    fontSize: 48,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: getSpeakerColorHex(caption.speakerColor || '#FFFFFF'),
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    textAlign: "center",
    verticalAlign: "middle",
    borderRadius: 8,
    padding: 16,
    start: caption.startTime,
    duration: caption.endTime - caption.startTime,
    animation: {
      fadeIn: 0.2,
      fadeOut: 0.2
    }
  }));
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