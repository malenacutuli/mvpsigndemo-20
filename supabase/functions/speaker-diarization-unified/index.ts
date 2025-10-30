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
    const { videoUrl, videoId, force_reanalysis, targetLanguage = 'en', useTestingMode = false } = await req.json();
    
    console.log("=== UNIFIED SPEAKER DIARIZATION ===");
    if (useTestingMode) {
      console.log("🧪 TESTING MODE: Will use AssemblyAI-TEST for speaker diarization");
    }
    console.log("Priority: Twelve Labs (FIRST) → Deepgram → OpenAI → AssemblyAI");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let result = null;
    let provider = 'none';

    // TESTING MODE OVERRIDE
    if (useTestingMode) {
      console.log("🧪 TESTING MODE: Forcing AssemblyAI-TEST for speaker diarization");
      
      const ASSEMBLYAI_API_KEY_TEST = Deno.env.get("ASSEMBLYAI_API_KEY_TEST");
      if (!ASSEMBLYAI_API_KEY_TEST) {
        return new Response(JSON.stringify({ 
          error: "ASSEMBLYAI_API_KEY_TEST not configured" 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      try {
        const { data: testData, error: testError } = await supabase.functions.invoke('transcribe', {
          body: { 
            videoUrl, 
            videoId,
            language: targetLanguage,
            useTestingMode: true
          }
        });
        
        if (!testError && testData?.segments) {
          result = testData;
          provider = 'AssemblyAI-TEST';
          console.log(`✅ AssemblyAI TEST diarization complete: ${testData.segments.length} segments`);
        } else {
          throw new Error(testError?.message || 'Test failed');
        }
      } catch (error) {
        console.error("🧪 Testing mode failed:", error);
        return new Response(JSON.stringify({ 
          error: "test_failed",
          message: error instanceof Error ? error.message : "Unknown error"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    
    // Continue with normal provider logic only if NOT in testing mode
    if (!useTestingMode) {
      // ============================================================================
      // PRIORITY 1: TWELVE LABS (Best quality for speaker ID + visual context)
      // ============================================================================
      const TWELVE_LABS_API_KEY = Deno.env.get("TWELVE_LABS_API_KEY");
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      
      if (TWELVE_LABS_API_KEY) {
      try {
        console.log("🟣 PRIORITY 1: Trying Twelve Labs speaker analysis (original language)...");
        
        const { data, error } = await supabase.functions.invoke('twelve-labs-analysis', {
          body: { 
            videoUrl, 
            videoId,
            language: 'auto' // Extract in original language
          }
        });
        
        if (!error && data?.segments) {
          console.log(`✅ Twelve Labs succeeded! Detected language: ${data.language || 'unknown'}`);
          
          let segments = data.segments;
          const sourceLanguage = data.language || 'unknown';
          
          // Translate if needed and OpenAI is available
          if (sourceLanguage !== targetLanguage && targetLanguage !== 'auto' && OPENAI_API_KEY) {
            console.log(`🔄 Translating from ${sourceLanguage} to ${targetLanguage}...`);
            
            try {
              // Translate segments in batches to preserve context
              const translatedSegments = [];
              const batchSize = 10;
              
              for (let i = 0; i < segments.length; i += batchSize) {
                const batch = segments.slice(i, i + batchSize);
                const textsToTranslate = batch.map((seg: any) => seg.text).join('\n---\n');
                
                const translateResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                      {
                        role: 'system',
                        content: `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Preserve the meaning and tone. Return ONLY the translated text, separated by ---`
                      },
                      {
                        role: 'user',
                        content: textsToTranslate
                      }
                    ],
                    temperature: 0.3
                  })
                });
                
                const translateData = await translateResponse.json();
                const translatedTexts = translateData.choices[0].message.content.split('---').map((t: string) => t.trim());
                
                batch.forEach((seg: any, idx: number) => {
                  translatedSegments.push({
                    ...seg,
                    text: translatedTexts[idx] || seg.text,
                    originalText: seg.text,
                    originalLanguage: sourceLanguage
                  });
                });
              }
              
              segments = translatedSegments;
              console.log(`✅ Translation complete: ${segments.length} segments translated`);
            } catch (translateError) {
              console.warn(`⚠️ Translation failed, using original language: ${translateError.message}`);
            }
          }
          
          // Extract unique speakers from segments
          const speakerMap = new Map();
          segments.forEach((seg: any) => {
            if (seg.speaker && !speakerMap.has(seg.speaker)) {
              speakerMap.set(seg.speaker, {
                name: seg.speaker,
                color: seg.speakerColor || '#3B82F6'
              });
            }
          });
          
          result = {
            success: true,
            speakers: Array.from(speakerMap.values()),
            segments: segments.map((seg: any) => ({
              text: seg.text,
              startTime: seg.startTime,
              endTime: seg.endTime,
              start: seg.startTime,
              end: seg.endTime,
              speaker: seg.speaker || 'Speaker',
              speakerColor: seg.speakerColor || '#3B82F6',
              words: seg.words,
              originalText: seg.originalText,
              originalLanguage: seg.originalLanguage
            })),
            provider: 'twelve_labs',
            sourceLanguage: sourceLanguage,
            targetLanguage: targetLanguage
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
    
    // ============================================================================
    // PRIORITY 2: DEEPGRAM (Fastest, Cheapest - $0.043/hour)
    // ============================================================================
    if (!result) {
      const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
      if (DEEPGRAM_API_KEY) {
        try {
          console.log("🔵 PRIORITY 2: Trying Deepgram speaker diarization...");
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
    } // End of !useTestingMode block
    
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
