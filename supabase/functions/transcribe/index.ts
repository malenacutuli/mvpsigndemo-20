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

    // Get video size
    const headResponse = await fetch(videoUrl, { method: 'HEAD' });
    const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
    const sizeMB = Math.round(contentLength / 1024 / 1024);
    console.log(`Video size: ${sizeMB}MB`);

    // Download video
    console.log("Downloading video...");
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }
    
    const videoBuffer = await videoResponse.arrayBuffer();
    console.log(`Downloaded ${Math.round(videoBuffer.byteLength / 1024 / 1024)}MB video`);

    let transcriptionResult;

    // Strategy 1: Try processing the whole video first (works for most cases under 25MB)
    if (videoBuffer.byteLength <= 23000000) { // 23MB to be safe
      console.log("Video under 23MB - processing directly...");
      try {
        transcriptionResult = await transcribeBuffer(videoBuffer, OPENAI_API_KEY, language);
        console.log("✅ Direct processing successful!");
      } catch (error) {
        console.log("Direct processing failed, trying chunked approach:", error.message);
        transcriptionResult = await transcribeWithAssemblyAI(videoBuffer, OPENAI_API_KEY, language);
      }
    } else {
      // Strategy 2: For larger files, use AssemblyAI
      console.log(`Large video (${sizeMB}MB) - using AssemblyAI...`);
      transcriptionResult = await transcribeWithAssemblyAI(videoBuffer, OPENAI_API_KEY, language);
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

// Convert language names to ISO-639-1 codes
function getLanguageCode(language?: string): string | undefined {
  if (!language || language === 'auto') return undefined;
  
  const languageMap: { [key: string]: string } = {
    'english': 'en',
    'spanish': 'es', 
    'french': 'fr',
    'german': 'de',
    'italian': 'it',
    'portuguese': 'pt',
    'russian': 'ru',
    'japanese': 'ja',
    'chinese': 'zh',
    'korean': 'ko',
    'arabic': 'ar',
    'hindi': 'hi',
    'dutch': 'nl',
    'swedish': 'sv',
    'norwegian': 'no',
    'danish': 'da',
    'finnish': 'fi'
  };
  
  return languageMap[language.toLowerCase()] || language;
}

// Transcribe a buffer directly
async function transcribeBuffer(buffer: ArrayBuffer, apiKey: string, language?: string): Promise<any> {
  const blob = new Blob([buffer], { type: "video/mp4" });
  
  const formData = new FormData();
  formData.append("file", blob, "video.mp4");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");
  
  const languageCode = getLanguageCode(language);
  if (languageCode) {
    formData.append("language", languageCode);
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

// Process large videos using AssemblyAI (proper approach for large files)
async function transcribeWithAssemblyAI(buffer: ArrayBuffer, apiKey: string, language?: string): Promise<any> {
  console.log("Using AssemblyAI for large file transcription...");
  
  const assemblyAIKey = Deno.env.get("ASSEMBLYAI_API_KEY");
  if (!assemblyAIKey) {
    throw new Error("AssemblyAI API key not configured for large file processing");
  }

  // Upload to AssemblyAI
  const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      Authorization: assemblyAIKey,
      "Content-Type": "application/octet-stream",
    },
    body: buffer,
  });

  if (!uploadResponse.ok) {
    throw new Error(`AssemblyAI upload failed: ${uploadResponse.statusText}`);
  }

  const { upload_url } = await uploadResponse.json();
  console.log("File uploaded to AssemblyAI");

  // Request transcription
  const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      Authorization: assemblyAIKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_url: upload_url,
      language_code: getAssemblyAILanguageCode(language),
      speaker_labels: true,
      word_timestamps: true,
    }),
  });

  if (!transcriptResponse.ok) {
    throw new Error(`AssemblyAI transcription request failed: ${transcriptResponse.statusText}`);
  }

  const { id } = await transcriptResponse.json();
  console.log("AssemblyAI transcription started, ID:", id);

  // Poll for completion
  let status = "processing";
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max

  while (status === "processing" || status === "queued") {
    if (attempts >= maxAttempts) {
      throw new Error("AssemblyAI transcription timed out");
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

    const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { Authorization: assemblyAIKey },
    });

    const result = await pollResponse.json();
    status = result.status;
    attempts++;

    console.log(`AssemblyAI status: ${status} (attempt ${attempts}/${maxAttempts})`);

    if (status === "completed") {
      console.log(`AssemblyAI transcription complete: ${result.words?.length || 0} words`);
      
      // Convert AssemblyAI format to OpenAI-like format
      return convertAssemblyAIToOpenAI(result);
    } else if (status === "error") {
      throw new Error(`AssemblyAI transcription failed: ${result.error}`);
    }
  }

  throw new Error("AssemblyAI transcription failed with unknown status");
}

function getAssemblyAILanguageCode(language?: string): string | undefined {
  if (!language || language === 'auto') return undefined;
  
  const languageMap: Record<string, string> = {
    'english': 'en',
    'spanish': 'es',
    'french': 'fr',
    'german': 'de',
    'italian': 'it',
    'portuguese': 'pt',
    'russian': 'ru',
    'japanese': 'ja',
    'korean': 'ko',
    'chinese': 'zh',
    'arabic': 'ar',
    'dutch': 'nl',
  };
  
  return languageMap[language.toLowerCase()];
}

function convertAssemblyAIToOpenAI(assemblyResult: any): any {
  const segments = [];
  
  if (assemblyResult.words && assemblyResult.words.length > 0) {
    // Group words into sentence-like segments
    let currentSegment: any = null;
    
    for (const word of assemblyResult.words) {
      if (!currentSegment || 
          (word.start - currentSegment.end > 2.0) || // 2 second gap
          (currentSegment.text.length > 200)) { // Max segment length
        
        if (currentSegment) {
          segments.push(currentSegment);
        }
        
        currentSegment = {
          start: word.start / 1000, // Convert ms to seconds
          end: word.end / 1000,
          text: word.text,
          words: [{
            word: word.text,
            start: word.start / 1000,
            end: word.end / 1000
          }]
        };
      } else {
        currentSegment.text += " " + word.text;
        currentSegment.end = word.end / 1000;
        currentSegment.words.push({
          word: word.text,
          start: word.start / 1000,
          end: word.end / 1000
        });
      }
    }
    
    if (currentSegment) {
      segments.push(currentSegment);
    }
  }

  return {
    text: assemblyResult.text || "",
    segments: segments,
    language: assemblyResult.language_code || 'en'
  };
}

// Save transcript to database
async function saveTranscriptToDatabase(videoId: string, transcriptionResult: any, forceReExtract: boolean) {
  console.log(`Saving ${transcriptionResult.segments.length} segments to database...`);
  
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
    const segmentsToSave = transcriptionResult.segments.map((segment: any, index: number) => ({
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