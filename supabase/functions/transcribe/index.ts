import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  console.log("=== FUNCTION START ===");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Method:", req.method);
    
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Reading body...");
    const body = await req.text();
    console.log("Body length:", body.length);

    console.log("Parsing JSON...");
    const data = JSON.parse(body);
    console.log("Parsed data keys:", Object.keys(data));

    const { videoUrl, videoId, language } = data;
    
    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "videoUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check AssemblyAI API key
    const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
    if (!ASSEMBLYAI_API_KEY) {
      return new Response(JSON.stringify({ error: "AssemblyAI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Starting transcription with AssemblyAI...");
    
    // Step 1: Download video
    console.log("Downloading video...");
    const videoResponse = await fetch(videoUrl);
    const videoBuffer = await videoResponse.arrayBuffer();
    console.log(`Video downloaded: ${Math.round(videoBuffer.byteLength / 1024 / 1024)}MB`);
    
    // Step 2: Upload to AssemblyAI
    console.log("Uploading to AssemblyAI...");
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
      },
      body: new Uint8Array(videoBuffer)
    });
    
    const uploadResult = await uploadResponse.json();
    console.log("Video uploaded, starting transcription...");
    
    // Step 3: Start transcription
    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: uploadResult.upload_url,
        language_code: language && language !== 'auto' ? language : null,
        word_timestamps: true,
        speaker_labels: true
      })
    });
    
    const transcriptJob = await transcriptResponse.json();
    const transcriptId = transcriptJob.id;
    console.log(`Transcription job started: ${transcriptId}`);
    
    // Step 4: Poll for completion (simplified - just a few attempts for testing)
    let transcript;
    for (let i = 0; i < 6; i++) { // 1 minute max
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { "Authorization": ASSEMBLYAI_API_KEY }
      });
      
      transcript = await pollResponse.json();
      console.log(`Poll ${i + 1}: Status = ${transcript.status}`);
      
      if (transcript.status === "completed") break;
      if (transcript.status === "error") throw new Error(transcript.error);
    }
    
    if (transcript?.status !== "completed") {
      throw new Error("Transcription timed out");
    }
    
    // Step 5: Format results
    const segments = transcript.utterances?.map((utterance: any, index: number) => ({
      id: index,
      start: utterance.start / 1000,
      end: utterance.end / 1000,
      text: utterance.text,
      confidence: utterance.confidence
    })) || [];
    
    // Ensure we use a proper language code, not "auto"
    const detectedLanguage = transcript.language_code || "en";
    const finalLanguage = language === "auto" ? detectedLanguage : (language || detectedLanguage);
    
    const result = {
      text: transcript.text || "",
      language: finalLanguage,
      duration: transcript.audio_duration || 0,
      segments
    };
    
    console.log(`Transcription completed: ${segments.length} segments, language: ${finalLanguage}`);
    
    // Step 6: Save to database if videoId provided
    if (videoId && segments.length > 0) {
      await saveToDatabase(videoId, result);
    }

    // Just return a simple success response for now
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: "Function failed",
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Save transcript to database
async function saveToDatabase(videoId: string, result: any) {
  console.log("Saving to database...");
  
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.log("No Supabase credentials, skipping database save");
      return;
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Clear existing segments for this video
    await supabase
      .from('transcript_segments')
      .delete()
      .eq('video_id', videoId)
      .eq('language', result.language);
    
    // Prepare segments for database
    const segmentsToSave = result.segments.map((segment: any, index: number) => ({
      video_id: videoId,
      text: segment.text || '',
      start_time: Number(segment.start) || 0,
      end_time: Number(segment.end) || 0,
      confidence: segment.confidence || null,
      language: result.language || 'en',
      segment_type: 'dialogue',
      speaker: `Speaker ${(index % 3) + 1}`,
      speaker_color: '#3B82F6',
      emphasis: 'normal',
      pitch: 'normal',
      is_off_camera: false
    }));
    
    // Insert new segments
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