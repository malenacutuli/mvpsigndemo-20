import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  console.log("=== TRANSCRIBE FUNCTION STARTED ===");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("📝 Parsing request...");
    const body = await req.text();
    const data = JSON.parse(body);
    const { videoUrl, videoId } = data;

    console.log("🔑 Checking API key...");
    const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
    
    if (!ASSEMBLYAI_API_KEY) {
      console.error("❌ No AssemblyAI API key found");
      return new Response(JSON.stringify({ 
        error: "AssemblyAI API key not configured" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ API key found, length:", ASSEMBLYAI_API_KEY.length);

    console.log("🧪 Testing AssemblyAI API connection...");
    
    // Just make a simple API call to test the connection
    const testResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "GET",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
      }
    });

    console.log("📡 AssemblyAI API test response status:", testResponse.status);

    if (testResponse.status === 401) {
      return new Response(JSON.stringify({ 
        error: "Invalid AssemblyAI API key",
        details: "The API key was rejected by AssemblyAI"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (testResponse.status === 403) {
      return new Response(JSON.stringify({ 
        error: "AssemblyAI API access forbidden",
        details: "The API key doesn't have the required permissions"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ AssemblyAI API connection successful");

    if (!videoUrl) {
      return new Response(JSON.stringify({ 
        error: "videoUrl is required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🎬 Starting real transcription for video:", videoUrl.substring(0, 100) + "...");

    // Step 1: Download video
    console.log("📥 Step 1: Downloading video...");
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const videoSizeMB = Math.round(videoBuffer.byteLength / 1024 / 1024);
    console.log(`✅ Video downloaded: ${videoSizeMB}MB`);

    // Step 2: Upload to AssemblyAI
    console.log("📤 Step 2: Uploading to AssemblyAI...");
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
      },
      body: new Uint8Array(videoBuffer)
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`AssemblyAI upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log("✅ Video uploaded to AssemblyAI, URL:", uploadResult.upload_url);

    // Step 3: Start transcription
    console.log("🎯 Step 3: Starting transcription job...");
    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: uploadResult.upload_url,
        word_timestamps: true,
        speaker_labels: true,
        punctuate: true,
        format_text: true
      })
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      throw new Error(`AssemblyAI transcription request failed: ${transcriptResponse.status} - ${errorText}`);
    }

    const transcriptJob = await transcriptResponse.json();
    const transcriptId = transcriptJob.id;
    console.log("✅ Transcription job started:", transcriptId);

    // Step 4: Poll for completion (simplified polling)
    console.log("⏳ Step 4: Waiting for completion...");
    let transcript;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max (10 seconds * 30)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;

      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          "Authorization": ASSEMBLYAI_API_KEY,
        }
      });

      if (!pollResponse.ok) {
        throw new Error(`AssemblyAI polling failed: ${pollResponse.status}`);
      }

      transcript = await pollResponse.json();
      console.log(`🔄 Poll ${attempts}/${maxAttempts}: Status = ${transcript.status}`);

      if (transcript.status === "completed") {
        console.log("✅ Transcription completed!");
        break;
      } else if (transcript.status === "error") {
        throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
      }
    }

    if (!transcript || transcript.status !== "completed") {
      throw new Error(`Transcription timed out after ${attempts} attempts`);
    }

    // Step 5: Format results
    console.log("📝 Step 5: Formatting results...");
    const segments = transcript.utterances?.map((utterance: any, index: number) => ({
      id: index,
      start: utterance.start / 1000, // Convert ms to seconds
      end: utterance.end / 1000,
      text: utterance.text,
      confidence: utterance.confidence
    })) || [];

    const result = {
      text: transcript.text || "",
      language: transcript.language_code || "en",
      duration: transcript.audio_duration || 0,
      segments
    };

    console.log("🎉 Transcription successful:", segments.length, "segments");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("💥 Function error:", error);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    
    return new Response(JSON.stringify({ 
      error: "Function failed",
      details: error?.message || String(error),
      errorType: error?.name || "Unknown"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});