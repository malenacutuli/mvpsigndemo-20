import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  console.log("=== DEEPGRAM TRANSCRIPTION FUNCTION CALLED ===");

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
    // Initialize Supabase client for validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
    
    // Check authentication for minutes validation
    let authenticatedUser = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader && supabase) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        authenticatedUser = user;
      }
    }

    const { videoUrl, videoId, language, enableDiarization = true } = await req.json();
    
    console.log("Request parameters:", {
      videoUrl: videoUrl ? videoUrl.substring(0, 100) + '...' : 'none',
      videoId: videoId || 'none',
      language: language || 'auto',
      enableDiarization
    });

    if (!videoUrl || !videoUrl.startsWith("http")) {
      return new Response(JSON.stringify({ 
        error: "Invalid videoUrl",
        details: "Provide an absolute URL to a publicly accessible video"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
    if (!DEEPGRAM_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "DEEPGRAM_API_KEY not configured" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PHASE 3: VALIDATE MINUTES BEFORE PROCESSING
    // Get video HEAD request to estimate duration
    const headResponse = await fetch(videoUrl, { method: 'HEAD' });
    const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
    const sizeMB = Math.round(contentLength / 1024 / 1024);
    const estimatedDurationSeconds = Math.max(60, sizeMB * 6); // Conservative estimate
    
    if (authenticatedUser && supabase) {
      console.log(`🔒 Validating processing minutes for user ${authenticatedUser.id}...`);
      
      const { data: validation } = await supabase.rpc('can_process_video', {
        target_user_id: authenticatedUser.id,
        video_duration_seconds: estimatedDurationSeconds
      });

      if (validation && !validation.allowed) {
        console.warn(`❌ Processing not allowed: ${validation.reason}`);
        return new Response(JSON.stringify({
          error: 'insufficient_minutes',
          message: validation.message || 'Insufficient processing minutes available',
          details: validation,
          upgradeUrl: '/pricing'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`✅ Minutes validation passed`);
    }

    // Build Deepgram API URL with options
    const deepgramParams = new URLSearchParams({
      model: 'nova-2',  // Best accuracy
      smart_format: 'true',
      punctuate: 'true',
      paragraphs: 'true',
      utterances: 'true',
      diarize: enableDiarization ? 'true' : 'false',
      language: language && language !== 'auto' ? language : 'en',
    });

    console.log("🚀 Calling Deepgram API with Nova-2 model...");
    
    const deepgramResponse = await fetch(
      `https://api.deepgram.com/v1/listen?${deepgramParams.toString()}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl
        }),
      }
    );

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error("Deepgram API error:", errorText);
      return new Response(JSON.stringify({ 
        error: "Deepgram transcription failed",
        details: errorText,
        status: deepgramResponse.status
      }), {
        status: deepgramResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deepgramResult = await deepgramResponse.json();
    console.log("✅ Deepgram transcription completed");

    // Extract audio duration from Deepgram response
    const audioDuration = deepgramResult.metadata?.duration || 0;
    
    // Transform Deepgram response to our standard format
    const segments: any[] = [];
    const utterances = deepgramResult.results?.utterances || [];

    utterances.forEach((utterance: any, idx: number) => {
      const segment = {
        idx,
        startTime: utterance.start,
        endTime: utterance.end,
        text: utterance.transcript,
        speaker: enableDiarization ? `Speaker ${utterance.speaker || 0}` : 'Speaker',
        speakerColor: getSpeakerColor(utterance.speaker || 0),
        confidence: utterance.confidence || 0.95,
        words: utterance.words?.map((word: any) => ({
          word: word.word,
          start: word.start,
          end: word.end,
          confidence: word.confidence
        }))
      };
      segments.push(segment);
    });

    // Full transcript text
    const fullText = segments.map(s => s.text).join(' ');

    // Track usage if we have user info
    if (videoId) {
      try {
        const authHeader = req.headers.get("authorization");
        if (authHeader) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            // Get user from JWT
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabase.auth.getUser(token);
            
            if (user) {
              const durationMinutes = audioDuration / 60;
              
              console.log(`📊 Tracking usage: ${durationMinutes.toFixed(2)} minutes for user ${user.id}`);
              
              // Track usage via database function
              const { data, error } = await supabase.rpc('track_video_processing_usage', {
                target_user_id: user.id,
                video_uuid: videoId,
                minutes_to_add: durationMinutes,
                proc_type: 'transcription_deepgram',
                meta: {
                  provider: 'deepgram',
                  model: 'nova-2',
                  language: language || 'auto',
                  diarization: enableDiarization,
                  duration_seconds: audioDuration,
                  timestamp: new Date().toISOString()
                }
              });

              if (error) {
                console.error("Usage tracking error:", error);
              } else {
                console.log("✅ Usage tracked:", data);
              }
            }
          }
        }
      } catch (trackingError) {
        console.error("Error tracking usage:", trackingError);
        // Don't fail the request if tracking fails
      }
    }

    const result = {
      text: fullText,
      segments,
      language: deepgramResult.results?.channels?.[0]?.detected_language || language || 'en',
      duration: audioDuration,
      provider: 'deepgram',
      model: 'nova-2',
      confidence: deepgramResult.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0.95
    };

    console.log("Final result:", {
      segmentCount: segments.length,
      duration: audioDuration,
      language: result.language
    });

    return new Response(JSON.stringify(result), {
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

// Get consistent color for speaker
function getSpeakerColor(speakerNum: number): string {
  const colors = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // amber
    '#8B5CF6', // purple
    '#EC4899', // pink
  ];
  return colors[speakerNum % colors.length];
}
