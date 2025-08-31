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
  console.log("URL:", req.url);

  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
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
    console.log("Processing POST request...");
    
    const body = await req.text();
    console.log("Raw body length:", body.length);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
      console.log("Parsed body keys:", Object.keys(parsedBody));
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body",
        details: String(parseError)
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { audio, videoUrl, videoId, language, forceReExtract } = parsedBody;
    
    console.log("Request details:", {
      hasAudio: !!audio,
      hasVideoUrl: !!videoUrl,
      videoId: videoId || 'none',
      language: language || 'auto',
      forceReExtract: !!forceReExtract,
      audioLength: audio?.length || 0
    });

    // Check required parameters
    if (!audio && !videoUrl) {
      console.error("Missing both audio and videoUrl");
      return new Response(JSON.stringify({ error: "Provide 'audio' (base64) or 'videoUrl'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check OpenAI API key
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    console.log("OpenAI API key available:", !!OPENAI_API_KEY);
    
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "OPENAI_API_KEY not configured" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle video URL with chunked processing for large files
    if (videoUrl) {
      console.log("Processing video from URL:", videoUrl.substring(0, 100) + "...");
      
      try {
        // Get video info
        const headResponse = await fetch(videoUrl, { method: 'HEAD' });
        if (!headResponse.ok) {
          throw new Error(`Failed to access video: ${headResponse.status}`);
        }
        
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
        console.log("Video downloaded successfully:", videoBuffer.byteLength, "bytes");
        
        // For large files, we'll process in chunks
        const MAX_CHUNK_SIZE = 20000000; // 20MB chunks to be safe
        const needsChunking = videoBuffer.byteLength > MAX_CHUNK_SIZE;
        
        let transcriptionResult;
        
        if (!needsChunking) {
          // Process normally for small files
          console.log("Processing file in single request...");
          transcriptionResult = await transcribeChunk(videoBuffer, OPENAI_API_KEY, language);
        } else {
          // Process in chunks for large files
          console.log(`File is large (${sizeMB}MB), processing in chunks...`);
          transcriptionResult = await transcribeInChunks(videoBuffer, OPENAI_API_KEY, language);
        }
        console.log("Transcription successful!");
        console.log("- Language:", transcriptionResult.language);
        console.log("- Duration:", transcriptionResult.duration);
        console.log("- Segments:", transcriptionResult.segments?.length || 0);
        
        // Save to database if videoId provided
        if (videoId && transcriptionResult.segments) {
          console.log(`Saving transcript to database for video ${videoId}...`);
          
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL');
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
            
            if (supabaseUrl && supabaseServiceKey) {
              const supabase = createClient(supabaseUrl, supabaseServiceKey);
              
              // Clear existing segments
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
              
              // Save to database
              const { error: saveError } = await supabase
                .from('transcript_segments')
                .upsert(segmentsToSave, { 
                  onConflict: 'video_id,language,start_time',
                  ignoreDuplicates: false
                });
                
              if (saveError) {
                console.error("Database save error:", saveError);
              } else {
                console.log(`Successfully saved ${segmentsToSave.length} segments to database`);
              }
            }
          } catch (dbError) {
            console.error("Database operation failed:", dbError);
          }
        }

        return new Response(JSON.stringify(transcriptionResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        
      } catch (videoError) {
        console.error("Video processing error:", videoError);
        return new Response(JSON.stringify({ 
          error: "Failed to process video",
          details: String(videoError)
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle base64 audio (fallback)
    if (audio) {
      console.log("Processing base64 audio...");
      return new Response(JSON.stringify({ 
        error: "Base64 audio processing not implemented in this version" 
      }), {
        status: 501,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "No valid input provided" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("=== FUNCTION ERROR ===");
    console.error("Error:", error);
    console.error("Stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: String(error),
      stack: error.stack || 'No stack available'
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper function to transcribe a single chunk
async function transcribeChunk(buffer: ArrayBuffer, apiKey: string, language?: string): Promise<any> {
  const blob = new Blob([buffer], { type: "video/mp4" });
  
  const formData = new FormData();
  formData.append("file", blob, "video.mp4");
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

  return await response.json();
}

// Helper function to process large files in chunks
async function transcribeInChunks(buffer: ArrayBuffer, apiKey: string, language?: string): Promise<any> {
  const CHUNK_SIZE = 20000000; // 20MB chunks
  const chunks = [];
  
  // Split buffer into chunks
  for (let i = 0; i < buffer.byteLength; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, buffer.byteLength);
    chunks.push(buffer.slice(i, end));
  }
  
  console.log(`Processing ${chunks.length} chunks...`);
  
  // Process chunks sequentially to avoid rate limits
  const results = [];
  let totalDuration = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
    
    try {
      const chunkResult = await transcribeChunk(chunks[i], apiKey, language);
      
      // Adjust timestamps to account for chunk position
      const timeOffset = totalDuration;
      if (chunkResult.segments) {
        chunkResult.segments.forEach((segment: any) => {
          segment.start += timeOffset;
          segment.end += timeOffset;
          
          // Adjust word timestamps too
          if (segment.words) {
            segment.words.forEach((word: any) => {
              word.start += timeOffset;
              word.end += timeOffset;
            });
          }
        });
      }
      
      results.push(chunkResult);
      totalDuration += chunkResult.duration || 0;
      
      // Small delay to be respectful to API
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`Failed to process chunk ${i + 1}:`, error);
      // Continue with other chunks even if one fails
    }
  }
  
  if (results.length === 0) {
    throw new Error("Failed to process any chunks");
  }
  
  // Combine all results
  const combinedResult = {
    text: results.map(r => r.text || '').join(' '),
    language: results.find(r => r.language)?.language || 'en',
    duration: totalDuration,
    segments: [],
    words: []
  };
  
  // Combine segments and words
  results.forEach(result => {
    if (result.segments) {
      combinedResult.segments.push(...result.segments);
    }
    if (result.words) {
      combinedResult.words.push(...result.words);
    }
  });
  
  console.log(`Combined transcription complete: ${combinedResult.segments.length} segments, ${Math.round(totalDuration)}s total`);
  
  return combinedResult;
}