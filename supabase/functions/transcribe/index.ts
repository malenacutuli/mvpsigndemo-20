import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  console.log("🚀 Transcribe function called - method:", req.method);
  
  if (req.method === "OPTIONS") {
    console.log("✅ Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("❌ Invalid method:", req.method);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("📥 Processing POST request");
    const { videoUrl, videoId, language } = await req.json();

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "videoUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OpenAI API key
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "OpenAI API key not found",
        details: "Please configure OPENAI_API_KEY in Supabase secrets"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Starting OpenAI Whisper transcription for video:", videoUrl.substring(0, 50) + "...");

    // Download video with size check
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }
    
    const videoArrayBuffer = await videoResponse.arrayBuffer();
    const videoSizeMB = Math.round(videoArrayBuffer.byteLength / 1024 / 1024);
    console.log(`Video downloaded: ${videoSizeMB}MB`);

    // OpenAI Whisper has a 25MB file size limit
    if (videoArrayBuffer.byteLength > 25 * 1024 * 1024) {
      throw new Error(`Video file too large (${videoSizeMB}MB). OpenAI Whisper has a 25MB limit.`);
    }

    // Create form data for OpenAI Whisper API
    const formData = new FormData();
    const videoBlob = new Blob([videoArrayBuffer], { type: "video/mp4" });
    formData.append("file", videoBlob, "video.mp4");
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    
    if (language && language !== "auto") {
      formData.append("language", language);
    }

    console.log("Sending to OpenAI Whisper API...");

    // Call OpenAI Whisper API with better error handling
    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData
    });

    console.log("OpenAI Whisper response status:", whisperResponse.status);

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error("OpenAI Whisper error response:", errorText);
      throw new Error(`OpenAI Whisper API failed: ${whisperResponse.status} - ${errorText}`);
    }

    const whisperResult = await whisperResponse.json();
    console.log("OpenAI Whisper transcription completed successfully");
    console.log("Whisper result keys:", Object.keys(whisperResult));

    // Format results for compatibility
    const segments = (whisperResult.segments || []).map((segment: any, index: number) => ({
      id: index,
      start: segment.start,
      end: segment.end,
      text: segment.text,
      confidence: 0.9 // Whisper doesn't provide confidence scores
    }));

    const result = {
      text: whisperResult.text || "",
      language: whisperResult.language || "en",
      duration: whisperResult.duration || 0,
      segments
    };

    // Save to database if videoId provided
    if (videoId && segments.length > 0) {
      await saveToDatabase(videoId, result);
    }

    console.log(`Transcription completed: ${segments.length} segments`);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(JSON.stringify({
      error: "Transcription failed",
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function saveToDatabase(videoId: string, result: any) {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.log("No Supabase credentials for database save");
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Clear existing segments
    await supabase
      .from('transcript_segments')
      .delete()
      .eq('video_id', videoId)
      .eq('language', result.language);
    
    // Prepare segments
    const segmentsToSave = result.segments.map((segment: any, index: number) => ({
      video_id: videoId,
      text: segment.text,
      start_time: segment.start,
      end_time: segment.end,
      confidence: segment.confidence,
      language: result.language,
      segment_type: 'dialogue',
      speaker: `Speaker ${(index % 3) + 1}`,
      speaker_color: '#3B82F6',
      emphasis: 'normal',
      pitch: 'normal',
      is_off_camera: false
    }));
    
    // Insert segments
    const { error } = await supabase
      .from('transcript_segments')
      .insert(segmentsToSave);
    
    if (error) {
      console.error("Database save error:", error);
    } else {
      console.log(`Saved ${segmentsToSave.length} segments to database`);
    }
    
  } catch (error) {
    console.error("Database save failed:", error);
  }
}