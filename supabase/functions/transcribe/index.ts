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
    console.log("🔍 Parsing request body...");
    const body = await req.text();
    console.log("📝 Raw body received, length:", body.length);
    
    const { videoUrl, videoId, language, forceReExtract } = JSON.parse(body);
    console.log("✅ Body parsed successfully");
    
    console.log("Processing video:", {
      videoId: videoId || 'none',
      hasVideoUrl: !!videoUrl,
      videoUrlStart: videoUrl ? videoUrl.substring(0, 50) + "..." : "none",
      language: language || 'auto',
      forceReExtract: forceReExtract || false
    });

    if (!videoUrl) {
      console.error("❌ No videoUrl provided");
      return new Response(JSON.stringify({ error: "videoUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🔑 Checking environment variables...");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
    
    console.log("Environment check:", {
      hasOpenAI: !!OPENAI_API_KEY,
      hasAssemblyAI: !!ASSEMBLYAI_API_KEY,
      openAILength: OPENAI_API_KEY ? OPENAI_API_KEY.length : 0,
      assemblyAILength: ASSEMBLYAI_API_KEY ? ASSEMBLYAI_API_KEY.length : 0
    });
    
    if (!OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY not configured");
      return new Response(JSON.stringify({ 
        error: "OPENAI_API_KEY not configured" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ASSEMBLYAI_API_KEY) {
      console.error("❌ ASSEMBLYAI_API_KEY not configured");
      return new Response(JSON.stringify({ 
        error: "ASSEMBLYAI_API_KEY not configured - required for video transcription" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🔍 Checking video file accessibility...");
    // Test video accessibility before proceeding
    const headResponse = await fetch(videoUrl, { method: 'HEAD' });
    if (!headResponse.ok) {
      console.error("❌ Video file not accessible:", headResponse.status, headResponse.statusText);
      return new Response(JSON.stringify({ 
        error: `Video file not accessible: ${headResponse.status} ${headResponse.statusText}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
    const sizeMB = Math.round(contentLength / 1024 / 1024);
    console.log(`✅ Video accessible: ${sizeMB}MB`);

    console.log("🚀 Starting transcription process...");
    const transcriptionResult = await transcribeWithAssemblyAI(videoUrl, language);
    console.log("✅ Transcription completed, segments:", transcriptionResult.segments?.length || 0);

    // Save to database
    if (videoId && transcriptionResult.segments) {
      console.log("💾 Saving to database...");
      await saveTranscriptToDatabase(videoId, transcriptionResult, forceReExtract);
      console.log("✅ Database save completed");
    } else {
      console.log("⚠️ Skipping database save - no videoId or segments");
    }

    console.log("🎉 Transcription process completed successfully");
    return new Response(JSON.stringify(transcriptionResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("💥 Function error:", error);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    
    return new Response(JSON.stringify({ 
      error: "Transcription failed",
      details: error?.message || String(error),
      errorType: error?.name || "Unknown"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Transcribe using AssemblyAI for video files
async function transcribeWithAssemblyAI(videoUrl: string, language?: string): Promise<any> {
  console.log("🎯 Starting AssemblyAI transcription for:", videoUrl.substring(0, 100) + "...");
  
  const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
  if (!ASSEMBLYAI_API_KEY) {
    console.error("❌ ASSEMBLYAI_API_KEY not found in environment");
    throw new Error("ASSEMBLYAI_API_KEY not configured");
  }
  
  try {
    console.log("📤 Step 1: Fetching video file...");
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
        "Authorization": ASSEMBLYAI_API_KEY,
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
        "Authorization": ASSEMBLYAI_API_KEY,
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
          "Authorization": ASSEMBLYAI_API_KEY,
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