import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting helper
async function checkRateLimit(
  supabase: any,
  userId: string,
  functionName: string,
  maxCallsPerHour: number = 20
): Promise<{ allowed: boolean; remaining: number }> {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  
  const { count } = await supabase
    .from('usage_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('processing_type', functionName)
    .gte('created_at', oneHourAgo);

  const callCount = count || 0;
  const remaining = Math.max(0, maxCallsPerHour - callCount);
  
  return {
    allowed: callCount < maxCallsPerHour,
    remaining
  };
}

// Structured logging
function logAPICall(details: {
  userId?: string;
  videoId?: string;
  apiService: string;
  status: 'start' | 'success' | 'error';
  duration?: number;
  error?: string;
  provider?: string;
}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    function: 'speaker-diarization-unified',
    ...details
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Check authentication and rate limit
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (user) {
        // Check rate limit
        const rateLimit = await checkRateLimit(supabase, user.id, 'speaker-diarization-unified', 20);
        if (!rateLimit.allowed) {
          logAPICall({
            userId: user.id,
            apiService: 'Unified-Diarization',
            status: 'error',
            error: 'Rate limit exceeded'
          });
          
          return new Response(JSON.stringify({ 
            error: 'Rate limit exceeded',
            message: `Maximum 20 speaker diarization requests per hour. ${rateLimit.remaining} remaining.`,
            retryAfter: 3600
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' }
          });
        }
      }
    }

    const { videoUrl, videoId, force_reanalysis, targetLanguage = 'en', useTestingMode = false } = await req.json();
    
    console.log("=== UNIFIED SPEAKER DIARIZATION ===");
    if (useTestingMode) {
      console.log("🧪 TESTING MODE: Will use AssemblyAI-TEST for speaker diarization");
    }
    console.log("Priority: Twelve Labs (FIRST) → Deepgram → OpenAI → AssemblyAI");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    logAPICall({
      videoId,
      apiService: 'Unified-Diarization',
      status: 'start'
    });
    
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
      console.log("🚀 Using AssemblyAI as PRIMARY provider for speaker diarization");
      
      // ============================================================================
      // PRIORITY 1: ASSEMBLYAI (Primary diarization provider)
      // ============================================================================
      const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
      if (ASSEMBLYAI_API_KEY) {
        try {
          console.log("🟣 PRIORITY 1: AssemblyAI speaker diarization (PRIMARY)...");
          const { data, error } = await supabase.functions.invoke('speaker-diarization', {
            body: { videoUrl, videoId, force_reanalysis }
          });
          
          if (!error && data?.success) {
            console.log("✅ AssemblyAI diarization succeeded!");
            result = data;
            provider = 'assemblyai';
          } else {
            throw new Error(error?.message || data?.error || "AssemblyAI failed");
          }
        } catch (assemblyError) {
          console.warn("⚠️ AssemblyAI failed, trying fallback providers:", assemblyError.message);
        }
      } else {
        console.error("❌ ASSEMBLYAI_API_KEY not configured - this is required for primary diarization");
      }
      
      // ============================================================================
      // PRIORITY 2: DEEPGRAM (Fallback)
      // ============================================================================
      if (!result) {
        const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
        if (DEEPGRAM_API_KEY) {
          try {
            console.log("🔵 PRIORITY 2 (Fallback): Trying Deepgram speaker diarization...");
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
      // PRIORITY 3: TWELVE LABS (Fallback)
      // ============================================================================
      if (!result) {
        const TWELVE_LABS_API_KEY = Deno.env.get("TWELVE_LABS_API_KEY");
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
        
        if (TWELVE_LABS_API_KEY) {
          try {
            console.log("🟣 PRIORITY 3 (Fallback): Trying Twelve Labs speaker analysis...");
            
            const { data, error } = await supabase.functions.invoke('twelve-labs-analysis', {
              body: { 
                videoUrl, 
                videoId,
                language: 'auto'
              }
            });
            
            if (!error && data?.segments) {
              console.log(`✅ Twelve Labs succeeded! Detected language: ${data.language || 'unknown'}`);
              
              let segments = data.segments;
              const sourceLanguage = data.language || 'unknown';
              
              // Translate if needed
              if (sourceLanguage !== targetLanguage && targetLanguage !== 'auto' && OPENAI_API_KEY) {
                console.log(`🔄 Translating from ${sourceLanguage} to ${targetLanguage}...`);
                
                try {
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
      }
      
      // ============================================================================
      // PRIORITY 4: OPENAI WHISPER (Last fallback)
      // ============================================================================
      if (!result) {
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
        if (OPENAI_API_KEY) {
          try {
            console.log("🟢 PRIORITY 4 (Fallback): Trying OpenAI Whisper with speaker detection...");
            
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
    
    logAPICall({
      videoId,
      apiService: 'Unified-Diarization',
      status: 'success',
      duration: Date.now() - startTime,
      provider
    });
    
    return new Response(
      JSON.stringify({ 
        ...result, 
        provider_used: provider 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Function error:", error);
    
    logAPICall({
      apiService: 'Unified-Diarization',
      status: 'error',
      duration: Date.now() - startTime,
      error: error.message
    });
    
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
