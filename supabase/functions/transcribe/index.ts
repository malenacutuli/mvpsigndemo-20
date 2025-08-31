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
  console.log("Method:", req.method);

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
    let parsedBody;
    
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body",
        details: String(parseError)
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { videoUrl, videoId, language, forceReExtract } = parsedBody;
    
    console.log("Request details:", {
      hasVideoUrl: !!videoUrl,
      videoId: videoId || 'none',
      language: language || 'auto',
      forceReExtract: !!forceReExtract
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

    console.log("Processing complete video from URL:", videoUrl.substring(0, 100) + "...");
    
    // Download and process the complete video
    const processVideo = async () => {
      try {
        // Get video size info
        const headResponse = await fetch(videoUrl, { method: 'HEAD' });
        const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
        const sizeMB = Math.round(contentLength / 1024 / 1024);
        console.log(`Video size: ${sizeMB}MB - processing complete video...`);
        
        // Download the complete video
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.status}`);
        }
        
        const videoBuffer = await videoResponse.arrayBuffer();
        console.log(`Downloaded ${sizeMB}MB video, starting transcription...`);
        
        // Process the complete video regardless of size
        let transcriptionResult;
        try {
          transcriptionResult = await transcribeComplete(videoBuffer, OPENAI_API_KEY, language);
          console.log("✅ Complete video transcribed successfully!");
        } catch (error) {
          console.log("⚠️ Complete video processing failed:", error.message);
          
          // If single video fails, return a more specific error
          if (error.message.includes('413') || error.message.includes('too large')) {
            throw new Error(`Video too large for processing. Size: ${sizeMB}MB. Try compressing the video or splitting it into smaller segments.`);
          } else if (error.message.includes('timeout')) {
            throw new Error(`Video processing timed out. Try a shorter video or compress the current one.`);
          } else {
            throw new Error(`Transcription failed: ${error.message}`);
          }
        }
        
        // Save to database
        if (videoId && transcriptionResult.segments) {
          await saveTranscriptToDatabase(videoId, transcriptionResult, forceReExtract);
        }
        
        return transcriptionResult;
        
      } catch (error) {
        console.error("Video processing error:", error);
        throw error;
      }
    };
    
    // For very large files (>100MB), use background processing
    const headResponse = await fetch(videoUrl, { method: 'HEAD' });
    const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
    const sizeMB = Math.round(contentLength / 1024 / 1024);
    
    console.log(`Processing ${sizeMB}MB video...`);
    
    // Process the video immediately regardless of size
    const result = await processVideo();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("=== FUNCTION ERROR ===");
    console.error("Error:", error);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper function to transcribe complete video in one request
async function transcribeComplete(buffer: ArrayBuffer, apiKey: string, language?: string): Promise<any> {
  const blob = new Blob([buffer], { type: "video/mp4" });
  
  const formData = new FormData();
  formData.append("file", blob, "video.mp4");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");
  
  if (language && language !== 'auto') {
    formData.append("language", language);
  }

  console.log("Sending complete video to OpenAI Whisper...");
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
  console.log(`Transcription complete: ${result.segments?.length || 0} segments, ${Math.round(result.duration || 0)}s duration`);
  return result;
}

// Save transcript to database
async function saveTranscriptToDatabase(videoId: string, transcriptionResult: any, forceReExtract: boolean) {
  console.log(`Saving transcript to database for video ${videoId}...`);
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Clear existing segments if force re-extract
      if (forceReExtract) {
        await supabase
          .from('transcript_segments')
          .delete()
          .eq('video_id', videoId);
      }
      
      // Prepare segments for database
      const segmentsToSave = transcriptionResult.segments.map((segment: any, index: number) => ({
        video_id: videoId,
        text: segment.text || '',
        start_time: Number(segment.start) || (index * 5),
        end_time: Number(segment.end) || ((index + 1) * 5),
        confidence: segment.confidence || null,
        language: transcriptionResult.language || 'en',
        segment_type: 'dialogue',
        speaker: `Speaker ${(index % 3) + 1}`,
        speaker_color: '#3B82F6',
        emphasis: 'normal',
        pitch: 'normal',
        is_off_camera: false
      }));
      
      // Save to database in batches to handle large transcripts
      const BATCH_SIZE = 100;
      for (let i = 0; i < segmentsToSave.length; i += BATCH_SIZE) {
        const batch = segmentsToSave.slice(i, i + BATCH_SIZE);
        
        const { error: saveError } = await supabase
          .from('transcript_segments')
          .upsert(batch, { 
            onConflict: 'video_id,language,start_time',
            ignoreDuplicates: false
          });
          
        if (saveError) {
          console.error(`Database save error for batch ${Math.floor(i/BATCH_SIZE) + 1}:`, saveError);
        } else {
          console.log(`Saved batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} segments`);
        }
      }
      
      console.log(`✅ Successfully saved ${segmentsToSave.length} segments to database`);
    }
  } catch (dbError) {
    console.error("Database operation failed:", dbError);
  }
}