import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  console.log('🔄 Processing accessible video...');
  
  try {
    // Generate subtitle file (SRT format) with speaker colors as comments
    let subtitleContent = '';
    let audioDescriptionScript = '';
    
    // Process captions into SRT format
    if (exportData.captions && exportData.captions.length > 0) {
      subtitleContent = generateSRTSubtitles(exportData.captions);
      console.log('📝 Generated SRT subtitles:', subtitleContent.substring(0, 200) + '...');
    }
    
    // Process audio descriptions into a script
    if (exportData.audioDescriptions && exportData.audioDescriptions.length > 0) {
      audioDescriptionScript = generateAudioDescriptionScript(exportData.audioDescriptions);
      console.log('🎙️ Generated audio description script:', audioDescriptionScript.substring(0, 200) + '...');
    }

    // For this demo, we'll create downloadable files
    // In production, you would use FFmpeg to actually embed these into the video
    
    // Store the generated files in Supabase Storage
    const files = [];
    
    if (subtitleContent) {
      const subtitleFileName = `${exportData.videoId}_subtitles.srt`;
      const { data: subtitleUpload, error: subtitleError } = await supabase.storage
        .from('processed-videos')
        .upload(subtitleFileName, subtitleContent, {
          contentType: 'text/plain',
          upsert: true
        });
      
      if (!subtitleError) {
        const { data: subtitleUrl } = supabase.storage
          .from('processed-videos')
          .getPublicUrl(subtitleFileName);
        
        files.push({
          type: 'subtitles',
          name: 'Speaker-Colored Subtitles (SRT)',
          url: subtitleUrl.publicUrl
        });
      }
    }
    
    if (audioDescriptionScript) {
      const scriptFileName = `${exportData.videoId}_audio_descriptions.txt`;
      const { data: scriptUpload, error: scriptError } = await supabase.storage
        .from('processed-videos')
        .upload(scriptFileName, audioDescriptionScript, {
          contentType: 'text/plain', 
          upsert: true
        });
      
      if (!scriptError) {
        const { data: scriptUrl } = supabase.storage
          .from('processed-videos')
          .getPublicUrl(scriptFileName);
        
        files.push({
          type: 'audio-description',
          name: 'Audio Description Script',
          url: scriptUrl.publicUrl
        });
      }
    }

    // Generate instructions for manual video editing
    const instructionsContent = generateEditingInstructions(exportData);
    const instructionsFileName = `${exportData.videoId}_instructions.md`;
    
    const { data: instructionsUpload, error: instructionsError } = await supabase.storage
      .from('processed-videos')
      .upload(instructionsFileName, instructionsContent, {
        contentType: 'text/markdown',
        upsert: true
      });

    if (!instructionsError) {
      const { data: instructionsUrl } = supabase.storage
        .from('processed-videos')
        .getPublicUrl(instructionsFileName);
      
      files.push({
        type: 'instructions',
        name: 'Video Editing Instructions',
        url: instructionsUrl.publicUrl
      });
    }

    console.log('✅ Accessible video processing complete');
    
    return {
      success: true,
      processId,
      files,
      message: 'Accessibility files generated successfully. Use these files with video editing software to create your accessible video.',
      totalFeatures: files.length
    };

  } catch (error) {
    console.error('❌ Processing failed:', error);
    throw new Error(`Video processing failed: ${error.message}`);
  }
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