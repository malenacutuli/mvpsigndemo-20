import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoUrl, videoId, force_reanalysis } = await req.json();
    
    console.log("=== UNIFIED SPEAKER DIARIZATION ===");
    console.log("Priority: Deepgram → Twelve Labs → OpenAI → AssemblyAI (last resort)");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let result = null;
    let provider = 'none';
    
    // ============================================================================
    // PRIORITY 1: DEEPGRAM (Fastest, Cheapest - $0.043/hour)
    // ============================================================================
    const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
    if (DEEPGRAM_API_KEY) {
      try {
        console.log("🔵 PRIORITY 1: Trying Deepgram speaker diarization...");
        const { data, error } = await supabase.functions.invoke('speaker-diarization-deepgram', {
          body: { videoUrl, videoId, force_reanalysis }
        });
        
        if (!error && data?.success) {
          console.log("✅ Deepgram succeeded!");
          result = data;
          provider = 'deepgram';
        } else {
          throw new Error(error?.message || data?.error || "Deepgram failed");
        }
      } catch (deepgramError) {
        console.warn("⚠️ Deepgram failed:", deepgramError.message);
      }
    } else {
      console.log("⏭️ Deepgram API key not configured, skipping");
    }
    
    // ============================================================================
    // PRIORITY 2: TWELVE LABS (Good quality, moderate cost)
    // ============================================================================
    if (!result) {
      const TWELVE_LABS_API_KEY = Deno.env.get("TWELVE_LABS_API_KEY");
      if (TWELVE_LABS_API_KEY) {
        try {
          console.log("🟣 PRIORITY 2: Trying Twelve Labs speaker analysis...");
          
          // Twelve Labs doesn't have a dedicated diarization function yet,
          // but we can extract speaker info from video analysis
          const { data, error } = await supabase.functions.invoke('twelve-labs-analysis', {
            body: { videoUrl, videoId }
          });
          
          if (!error && data?.speakers) {
            console.log("✅ Twelve Labs succeeded!");
            result = {
              success: true,
              speakers: data.speakers,
              segments: data.segments,
              provider: 'twelve_labs'
            };
            provider = 'twelve_labs';
          } else {
            throw new Error(error?.message || "Twelve Labs failed");
          }
        } catch (twelveLabsError) {
          console.warn("⚠️ Twelve Labs failed:", twelveLabsError.message);
        }
      } else {
        console.log("⏭️ Twelve Labs API key not configured, skipping");
      }
    }
    
    // ============================================================================
    // PRIORITY 3: OPENAI WHISPER (Good quality, moderate cost)
    // ============================================================================
    if (!result) {
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (OPENAI_API_KEY) {
        try {
          console.log("🟢 PRIORITY 3: Trying OpenAI Whisper with speaker detection...");
          
          // OpenAI Whisper doesn't have native speaker diarization,
          // but we can use timestamps to cluster speakers heuristically
          const { data, error } = await supabase.functions.invoke('transcribe', {
            body: { 
              videoUrl, 
              videoId, 
              language: 'auto',
              wordTimestamps: true 
            }
          });
          
          if (!error && data?.segments) {
            console.log("✅ OpenAI succeeded! Using heuristic speaker clustering...");
            
            // Simple heuristic: cluster by pause duration
            const clusteredSegments = clusterSpeakersByPauses(data.segments);
            
            result = {
              success: true,
              speakers: extractUniqueSpeakers(clusteredSegments),
              segments: clusteredSegments,
              provider: 'openai_heuristic'
            };
            provider = 'openai';
          } else {
            throw new Error(error?.message || "OpenAI failed");
          }
        } catch (openaiError) {
          console.warn("⚠️ OpenAI failed:", openaiError.message);
        }
      } else {
        console.log("⏭️ OpenAI API key not configured, skipping");
      }
    }
    
    // ============================================================================
    // PRIORITY 4: ASSEMBLYAI (LAST RESORT - Most expensive, $1.50/hour)
    // ============================================================================
    if (!result) {
      const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
      if (ASSEMBLYAI_API_KEY) {
        try {
          console.log("🔴 LAST RESORT: Trying AssemblyAI (expensive!)...");
          const { data, error } = await supabase.functions.invoke('speaker-diarization', {
            body: { videoUrl, videoId, force_reanalysis }
          });
          
          if (!error && data?.success) {
            console.log("✅ AssemblyAI succeeded (but expensive!)");
            result = data;
            provider = 'assemblyai';
          } else {
            throw new Error(error?.message || data?.error || "AssemblyAI failed");
          }
        } catch (assemblyError) {
          console.error("❌ AssemblyAI (last resort) failed:", assemblyError.message);
        }
      } else {
        console.log("⏭️ AssemblyAI API key not configured");
      }
    }
    
    // ============================================================================
    // FINAL RESULT
    // ============================================================================
    if (!result) {
      console.error("❌ ALL PROVIDERS FAILED");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "All speaker diarization providers failed",
          providers_tried: ['deepgram', 'twelve_labs', 'openai', 'assemblyai']
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log(`✅ Success using ${provider.toUpperCase()}`);
    
    return new Response(
      JSON.stringify({ 
        ...result, 
        provider_used: provider 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

// Helper: Cluster speakers by pause duration (simple heuristic)
function clusterSpeakersByPauses(segments: any[]): any[] {
  const PAUSE_THRESHOLD = 1.5; // 1.5 second pause = likely speaker change
  let currentSpeaker = 1;
  
  return segments.map((seg, i) => {
    if (i > 0) {
      const prevSeg = segments[i - 1];
      const pause = seg.startTime - prevSeg.endTime;
      if (pause > PAUSE_THRESHOLD) {
        currentSpeaker++;
      }
    }
    return {
      ...seg,
      speaker: `Speaker ${((currentSpeaker - 1) % 4) + 1}` // Cycle through 4 speakers
    };
  });
}

// Helper: Extract unique speakers
function extractUniqueSpeakers(segments: any[]): any[] {
  const speakerSet = new Set<string>();
  segments.forEach(seg => {
    if (seg.speaker) speakerSet.add(seg.speaker);
  });
  return Array.from(speakerSet).map(name => ({ name }));
}
