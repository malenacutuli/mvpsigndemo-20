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
    const requestBody = await req.text();
    console.log("📋 Raw request body length:", requestBody.length);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(requestBody);
      console.log("✅ Successfully parsed JSON body");
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const { videoUrl, videoId, language } = parsedBody;

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "videoUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API key - try multiple possible names
    const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY") || 
                               Deno.env.get("ASSEMBLY_AI_API_KEY") ||
                               Deno.env.get("assemblyai_api_key");

    if (!ASSEMBLYAI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "AssemblyAI API key not found",
        details: "Please configure ASSEMBLYAI_API_KEY in Supabase secrets"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Starting transcription for video:", videoUrl.substring(0, 50) + "...");

    // Download video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }
    const videoBuffer = await videoResponse.arrayBuffer();
    console.log(`Video downloaded: ${Math.round(videoBuffer.byteLength / 1024 / 1024)}MB`);

    // Upload to AssemblyAI
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { "Authorization": ASSEMBLYAI_API_KEY },
      body: videoBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`AssemblyAI upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const { upload_url } = await uploadResponse.json();
    console.log("Video uploaded to AssemblyAI");

    // Start transcription
    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: language && language !== "auto" ? language : null,
        word_timestamps: true,
        speaker_labels: true,
        punctuate: true,
        format_text: true
      })
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      throw new Error(`Transcription request failed: ${transcriptResponse.status} - ${errorText}`);
    }

    const { id: transcriptId } = await transcriptResponse.json();
    console.log("Transcription job started:", transcriptId);

    // Poll for completion
    let transcript;
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;

      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { "Authorization": ASSEMBLYAI_API_KEY }
      });

      transcript = await pollResponse.json();
      console.log(`Poll ${attempts}: ${transcript.status}`);

      if (transcript.status === "completed") break;
      if (transcript.status === "error") throw new Error(transcript.error);
    }

    if (transcript?.status !== "completed") {
      throw new Error("Transcription timed out");
    }

    // Format results
    const segments = (transcript.utterances || []).map((utterance: any, index: number) => ({
      id: index,
      start: utterance.start / 1000,
      end: utterance.end / 1000,
      text: utterance.text,
      confidence: utterance.confidence
    }));

    const result = {
      text: transcript.text || "",
      language: transcript.language_code || "en",
      duration: transcript.audio_duration || 0,
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