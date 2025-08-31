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

    // Handle video URL
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
        
        // Check if video is too large
        if (contentLength > 25000000) { // 25MB limit
          console.log("Video too large for OpenAI, returning error");
          return new Response(JSON.stringify({ 
            error: "Video file too large",
            details: `Video size: ${sizeMB}MB. Maximum supported: 25MB. Please compress your video.`,
            sizeMB,
            maxSizeMB: 25
          }), {
            status: 413,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Download video
        console.log("Downloading video...");
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.status}`);
        }
        
        const videoBuffer = await videoResponse.arrayBuffer();
        console.log("Video downloaded successfully:", videoBuffer.byteLength, "bytes");
        
        // Create blob for OpenAI
        const videoBlob = new Blob([videoBuffer], { type: "video/mp4" });
        
        // Send to OpenAI
        console.log("Sending to OpenAI Whisper...");
        const formData = new FormData();
        formData.append("file", videoBlob, "video.mp4");
        formData.append("model", "whisper-1");
        formData.append("response_format", "verbose_json");
        formData.append("timestamp_granularities[]", "word");
        
        if (language && language !== 'auto') {
          formData.append("language", language);
        }

        const openaiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: formData,
        });

        console.log("OpenAI response status:", openaiResponse.status);

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error("OpenAI error:", errorText);
          return new Response(JSON.stringify({ 
            error: `OpenAI API error: ${openaiResponse.status}`,
            details: errorText
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const transcriptionResult = await openaiResponse.json();
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