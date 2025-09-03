import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  console.log("=== TRANSCRIBE FUNCTION STARTED ===");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight");
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("Invalid method:", req.method);
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("🔍 Step 1: Checking environment variables...");
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log("Environment check:", {
      hasOpenAI: !!OPENAI_API_KEY,
      hasAssemblyAI: !!ASSEMBLYAI_API_KEY,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseKey: !!SUPABASE_SERVICE_ROLE_KEY,
    });

    if (!ASSEMBLYAI_API_KEY) {
      console.error("❌ ASSEMBLYAI_API_KEY missing");
      return new Response(JSON.stringify({ 
        error: "ASSEMBLYAI_API_KEY not configured",
        details: "Please add your AssemblyAI API key to the secrets"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🔍 Step 2: Parsing request body...");
    const body = await req.text();
    console.log("Body length:", body.length);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
      console.log("✅ Body parsed successfully");
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body",
        details: parseError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { videoUrl, videoId, language } = parsedBody;
    
    console.log("Request parameters:", {
      hasVideoUrl: !!videoUrl,
      videoId: videoId || 'none',
      language: language || 'auto'
    });

    if (!videoUrl) {
      console.error("❌ No videoUrl provided");
      return new Response(JSON.stringify({ 
        error: "videoUrl is required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🔍 Step 3: Testing AssemblyAI connection...");
    
    // Simple test - just try to hit AssemblyAI API to verify credentials work
    try {
      const testResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "GET", 
        headers: {
          "Authorization": ASSEMBLYAI_API_KEY,
        }
      });
      
      console.log("AssemblyAI API test response:", testResponse.status);
      
      if (testResponse.status === 401) {
        return new Response(JSON.stringify({ 
          error: "Invalid AssemblyAI API key",
          details: "The AssemblyAI API key is not valid or has expired"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (testError) {
      console.error("❌ AssemblyAI connection test failed:", testError);
      return new Response(JSON.stringify({ 
        error: "Failed to connect to AssemblyAI",
        details: testError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ AssemblyAI connection test passed");

    console.log("🔍 Step 4: Testing video accessibility...");
    
    try {
      const headResponse = await fetch(videoUrl, { method: 'HEAD' });
      console.log("Video HEAD response:", headResponse.status);
      
      if (!headResponse.ok) {
        return new Response(JSON.stringify({ 
          error: "Video file not accessible",
          details: `HTTP ${headResponse.status}: ${headResponse.statusText}`
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
      const sizeMB = Math.round(contentLength / 1024 / 1024);
      console.log(`✅ Video accessible: ${sizeMB}MB`);

    } catch (videoError) {
      console.error("❌ Video accessibility test failed:", videoError);
      return new Response(JSON.stringify({ 
        error: "Failed to access video file",
        details: videoError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🎉 All tests passed - starting real transcription");
    
    // Now do the actual transcription
    const transcriptionResult = await transcribeWithAssemblyAI(videoUrl, language, ASSEMBLYAI_API_KEY);
    console.log("✅ Transcription completed, segments:", transcriptionResult.segments?.length || 0);

    // Save to database if we have a videoId
    if (videoId && transcriptionResult.segments && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      console.log("💾 Saving to database...");
      await saveTranscriptToDatabase(videoId, transcriptionResult, false, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      console.log("✅ Database save completed");
    } else {
      console.log("⚠️ Skipping database save:", {
        hasVideoId: !!videoId,
        hasSegments: !!(transcriptionResult.segments?.length),
        hasSupabaseCredentials: !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
      });
    }

    return new Response(JSON.stringify(transcriptionResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("💥 Unexpected error:", error);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error?.message || String(error),
      errorType: error?.name || "Unknown"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Transcribe using AssemblyAI for video files
async function transcribeWithAssemblyAI(videoUrl: string, language?: string, apiKey?: string): Promise<any> {
  console.log("🎯 Starting AssemblyAI transcription for:", videoUrl.substring(0, 100) + "...");
  
  try {
    console.log("📤 Step 1: Downloading video file...");
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
    }
    
    const videoBuffer = await videoResponse.arrayBuffer();
    const videoSize = videoBuffer.byteLength;
    console.log(`📁 Video downloaded: ${Math.round(videoSize / 1024 / 1024)}MB`);
    
    console.log("📤 Step 2: Uploading to AssemblyAI...");
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        "Authorization": apiKey!,
        "Content-Type": "application/octet-stream"
      },
      body: new Uint8Array(videoBuffer)
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("❌ AssemblyAI upload failed:", uploadResponse.status, errorText);
      throw new Error(`AssemblyAI upload error: ${uploadResponse.status} - ${errorText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log("✅ Video uploaded successfully, URL:", uploadResult.upload_url);
    
    console.log("🎬 Step 3: Starting transcription job...");
    const transcriptConfig = {
      audio_url: uploadResult.upload_url,
      language_code: language && language !== 'auto' ? language : null,
      word_timestamps: true,
      speaker_labels: true,
      punctuate: true,
      format_text: true
    };
    
    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": apiKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transcriptConfig)
    });
    
    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error("❌ AssemblyAI transcript request failed:", transcriptResponse.status, errorText);
      throw new Error(`AssemblyAI transcript request error: ${transcriptResponse.status} - ${errorText}`);
    }
    
    const transcriptJob = await transcriptResponse.json();
    const transcriptId = transcriptJob.id;
    console.log(`🔄 Transcription job started: ${transcriptId}`);
    
    console.log("⏳ Step 4: Waiting for completion...");
    let transcript;
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max (10 seconds * 60)
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
      
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          "Authorization": apiKey!,
        }
      });
      
      if (!pollResponse.ok) {
        console.error("❌ AssemblyAI poll error:", pollResponse.status);
        throw new Error(`AssemblyAI poll error: ${pollResponse.status}`);
      }
      
      transcript = await pollResponse.json();
      console.log(`🔄 Attempt ${attempts}/${maxAttempts} - Status: ${transcript.status}`);
      
      if (transcript.status === "completed") {
        console.log("✅ Transcription completed!");
        break;
      } else if (transcript.status === "error") {
        console.error("❌ AssemblyAI transcription error:", transcript.error);
        throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
      }
    }
    
    if (!transcript || transcript.status !== "completed") {
      throw new Error(`Transcription timed out after ${attempts} attempts (${attempts * 10} seconds)`);
    }
    
    console.log("🔄 Step 5: Converting results...");
    const segments = transcript.utterances?.map((utterance: any, index: number) => ({
      id: index,
      start: utterance.start / 1000, // Convert ms to seconds
      end: utterance.end / 1000,
      text: utterance.text,
      confidence: utterance.confidence,
      words: utterance.words?.map((word: any) => ({
        word: word.text,
        start: word.start / 1000,
        end: word.end / 1000,
        confidence: word.confidence
      })) || []
    })) || [];
    
    const result = {
      text: transcript.text || "",
      language: transcript.language_code || language || "en",
      duration: transcript.audio_duration || 0,
      segments
    };
    
    console.log(`✅ AssemblyAI transcription complete: ${segments.length} segments`);
    return result;
    
  } catch (error) {
    console.error("💥 AssemblyAI transcription failed:", error);
    throw error; // Re-throw the original error for better debugging
  }
}

// Save transcript to database
async function saveTranscriptToDatabase(videoId: string, transcriptionResult: any, forceReExtract: boolean, supabaseUrl: string, supabaseServiceKey: string) {
  console.log(`💾 Saving ${transcriptionResult.segments?.length || 0} segments to database...`);
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Clear existing segments if force re-extract
    if (forceReExtract) {
      await supabase
        .from('transcript_segments')
        .delete()
        .eq('video_id', videoId);
      console.log("🗑️ Cleared existing segments");
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
        console.error(`❌ Database batch ${Math.floor(i/BATCH_SIZE) + 1} error:`, error);
      } else {
        console.log(`✅ Saved batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} segments`);
      }
    }
    
    console.log(`✅ Database save complete: ${segmentsToSave.length} segments`);
    
  } catch (error) {
    console.error("💥 Database save failed:", error);
  }
}