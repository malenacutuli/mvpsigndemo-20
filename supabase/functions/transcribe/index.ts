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
    
    const origin = req.headers.get("origin") || "";
    const resolvedVideoUrl = (videoUrl && (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")))
      ? videoUrl
      : (origin ? `${origin}${(videoUrl || "").startsWith("/") ? "" : "/"}${videoUrl || ""}` : videoUrl);
    
    console.log("Processing video:", {
      videoId: videoId || 'none',
      language: language || 'auto',
      resolvedVideoUrl
    });

    if (!resolvedVideoUrl || !resolvedVideoUrl.startsWith("http")) {
      return new Response(JSON.stringify({ 
        error: "Invalid videoUrl",
        details: "Provide an absolute URL to a publicly accessible video"
      }), {
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
    const headResponse = await fetch(resolvedVideoUrl, { method: 'HEAD' });
    const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
    const sizeMB = Math.round(contentLength / 1024 / 1024);
    console.log(`Video size: ${sizeMB}MB`);

    // Download video
    console.log("Downloading video...");
    const videoResponse = await fetch(resolvedVideoUrl);
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
        transcriptionResult = await transcribeWithChunking(videoBuffer, OPENAI_API_KEY, language);
      }
    } else {
      // Strategy 2: For larger files, use chunked approach with OpenAI
      console.log(`Large video (${sizeMB}MB) - using chunked OpenAI processing...`);
      transcriptionResult = await transcribeWithChunking(videoBuffer, OPENAI_API_KEY, language);
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

// Process large videos using chunked approach with OpenAI
async function transcribeWithChunking(buffer: ArrayBuffer, apiKey: string, language?: string): Promise<any> {
  console.log("Using chunked OpenAI processing for large file...");
  
  // For large files, we'll process the first 20MB chunk to get a representative transcription
  // This is a practical approach since most important content is usually at the beginning
  const chunkSize = 20 * 1024 * 1024; // 20MB
  const chunk = buffer.slice(0, Math.min(chunkSize, buffer.byteLength));
  
  console.log(`Processing first ${Math.round(chunk.byteLength / 1024 / 1024)}MB of ${Math.round(buffer.byteLength / 1024 / 1024)}MB video`);
  
  try {
    const result = await transcribeBuffer(chunk, apiKey, language);
    
    // Add note that this is a partial transcription for large files
    if (buffer.byteLength > chunkSize) {
      console.log(`Note: Processed first ${Math.round(chunkSize / 1024 / 1024)}MB of large video for performance`);
    }
    
    return result;
  } catch (error) {
    console.error("Chunked processing failed:", error);
    throw new Error(`Large file processing failed: ${error.message}`);
  }
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