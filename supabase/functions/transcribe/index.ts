import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  console.log("=== TRANSCRIBE FUNCTION CALLED ===");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.text();
    const { videoUrl, videoId, language, forceReExtract } = JSON.parse(body);
    
    console.log("Processing video:", {
      videoId: videoId || 'none',
      language: language || 'auto'
    });

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "videoUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "OPENAI_API_KEY not configured" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get video size for logging
    const headResponse = await fetch(videoUrl, { method: 'HEAD' });
    const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
    const sizeMB = Math.round(contentLength / 1024 / 1024);
    console.log(`Video size: ${sizeMB}MB`);

    let transcriptionResult;

    // For large files, extract audio first using FFmpeg, then transcribe
    if (contentLength > 25000000) { // > 25MB
      console.log(`Large video (${sizeMB}MB) - extracting audio with FFmpeg...`);
      transcriptionResult = await transcribeWithAudioExtraction(videoUrl, OPENAI_API_KEY, language);
    } else {
      // Small files can be processed directly
      console.log(`Processing ${sizeMB}MB video directly...`);
      const videoResponse = await fetch(videoUrl);
      const videoBuffer = await videoResponse.arrayBuffer();
      transcriptionResult = await transcribeBuffer(videoBuffer, OPENAI_API_KEY, language);
    }

    // Save to database
    if (videoId && transcriptionResult.segments) {
      await saveTranscriptToDatabase(videoId, transcriptionResult, forceReExtract);
    }

    return new Response(JSON.stringify(transcriptionResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Function error:", error);
    
    return new Response(JSON.stringify({ 
      error: "Transcription failed",
      details: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Extract audio using FFmpeg and transcribe
async function transcribeWithAudioExtraction(videoUrl: string, apiKey: string, language?: string): Promise<any> {
  console.log("Starting audio extraction with FFmpeg...");
  
  try {
    // Create temporary file paths
    const tempDir = await Deno.makeTempDir();
    const inputVideo = `${tempDir}/input_video`;
    const outputAudio = `${tempDir}/output_audio.mp3`;
    
    // Download video to temporary file
    console.log("Downloading video file...");
    const videoResponse = await fetch(videoUrl);
    const videoBytes = new Uint8Array(await videoResponse.arrayBuffer());
    await Deno.writeFile(inputVideo, videoBytes);
    
    console.log("Extracting audio with FFmpeg...");
    
    // Use FFmpeg to extract audio and compress it
    const ffmpegProcess = new Deno.Command("ffmpeg", {
      args: [
        "-i", inputVideo,           // Input video file
        "-vn",                     // No video
        "-acodec", "mp3",          // Audio codec
        "-ar", "16000",            // Sample rate (Whisper optimal)
        "-ac", "1",                // Mono channel
        "-ab", "64k",              // Audio bitrate (compressed)
        "-y",                      // Overwrite output
        outputAudio                // Output audio file
      ],
      stdout: "piped",
      stderr: "piped"
    });
    
    const { code, stdout, stderr } = await ffmpegProcess.output();
    
    if (code !== 0) {
      const errorOutput = new TextDecoder().decode(stderr);
      console.error("FFmpeg error:", errorOutput);
      throw new Error(`FFmpeg failed: ${errorOutput}`);
    }
    
    // Read the compressed audio file
    const audioBytes = await Deno.readFile(outputAudio);
    const audioSizeMB = Math.round(audioBytes.length / 1024 / 1024);
    console.log(`Extracted audio: ${audioSizeMB}MB`);
    
    // Clean up input video file
    await Deno.remove(inputVideo);
    
    // Transcribe the extracted audio
    const result = await transcribeBuffer(audioBytes.buffer, apiKey, language);
    
    // Clean up audio file
    await Deno.remove(outputAudio);
    await Deno.remove(tempDir);
    
    console.log("✅ Audio extraction and transcription complete!");
    return result;
    
  } catch (error) {
    console.error("Audio extraction failed:", error);
    throw new Error(`Failed to extract audio: ${error.message}`);
  }
}

// Transcribe a buffer directly
async function transcribeBuffer(buffer: ArrayBuffer, apiKey: string, language?: string): Promise<any> {
  const blob = new Blob([buffer], { type: "audio/mp3" });
  
  const formData = new FormData();
  formData.append("file", blob, "audio.mp3");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");
  
  if (language && language !== 'auto') {
    formData.append("language", language);
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`Transcription complete: ${result.segments?.length || 0} segments`);
  return result;
}

// Save transcript to database
async function saveTranscriptToDatabase(videoId: string, transcriptionResult: any, forceReExtract: boolean) {
  console.log(`Saving ${transcriptionResult.segments?.length || 0} segments to database...`);
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log("Supabase credentials not available, skipping database save");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Clear existing segments if force re-extract
    if (forceReExtract) {
      await supabase
        .from('transcript_segments')
        .delete()
        .eq('video_id', videoId);
      console.log("Cleared existing segments");
    }
    
    // Prepare segments for database
    const segmentsToSave = (transcriptionResult.segments || []).map((segment: any, index: number) => ({
      video_id: videoId,
      text: segment.text || '',
      start_time: Number(segment.start) || (index * 3),
      end_time: Number(segment.end) || ((index + 1) * 3),
      confidence: segment.confidence || null,
      language: transcriptionResult.language || 'en',
      segment_type: 'dialogue',
      speaker: `Speaker ${(index % 3) + 1}`,
      speaker_color: '#3B82F6',
      emphasis: 'normal',
      pitch: 'normal',
      is_off_camera: false
    }));
    
    // Save in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < segmentsToSave.length; i += BATCH_SIZE) {
      const batch = segmentsToSave.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('transcript_segments')
        .upsert(batch, { 
          onConflict: 'video_id,language,start_time',
          ignoreDuplicates: false
        });
        
      if (error) {
        console.error(`Database batch ${Math.floor(i/BATCH_SIZE) + 1} error:`, error);
      } else {
        console.log(`Saved batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} segments`);
      }
    }
    
    console.log(`✅ Database save complete: ${segmentsToSave.length} segments`);
    
  } catch (error) {
    console.error("Database save failed:", error);
  }
}