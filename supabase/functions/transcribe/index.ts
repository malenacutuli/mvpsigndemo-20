import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { SpeakerAssignmentService } from './speaker-assignment-service.ts';
import { checkRateLimit as checkSubscriptionRateLimit, logRateLimitViolation, addRateLimitHeaders } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

// Legacy rate limiting helper (deprecated - use subscription-based rate limiting)
// Kept for backward compatibility but should be phased out
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
    function: 'transcribe',
    ...details
  }));
}

serve(async (req) => {
  console.log("=== TRANSCRIBE FUNCTION CALLED ===");
  const startTime = Date.now();

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
      // Initialize Supabase client and auth state
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      let authenticatedUser: any = null;
      // Check authentication and rate limit early
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (user) {
          authenticatedUser = user;
          // Check subscription-based rate limit (requests per minute)
          const rateLimitCheck = await checkSubscriptionRateLimit(supabase, user.id, 'transcribe');
          
          if (!rateLimitCheck.allowed) {
            logAPICall({
              userId: user.id,
              apiService: 'Transcription',
              status: 'error',
              error: `Rate limit exceeded: ${rateLimitCheck.message}`
            });
  
            // Log the violation for monitoring
            await logRateLimitViolation(
              supabase,
              user.id,
              'transcribe',
              rateLimitCheck.current || 0,
              rateLimitCheck.limit || 0,
              rateLimitCheck.tier || 'unknown'
            );
  
            const responseHeaders = addRateLimitHeaders(
              { ...corsHeaders, 'Content-Type': 'application/json' },
              rateLimitCheck
            );
            
            return new Response(JSON.stringify({ 
              error: 'Rate limit exceeded',
              message: rateLimitCheck.message,
              limit: rateLimitCheck.limit,
              tier: rateLimitCheck.tier,
              retryAfter: rateLimitCheck.retryAfter || 60
            }), {
              status: 429,
              headers: responseHeaders
            });
          }
  
          logAPICall({
            userId: user.id,
            apiService: 'Transcription',
            status: 'start',
            provider: 'rate-check-passed'
          });
          console.log(`✅ Rate limit OK for user ${user.id}:`, {
            tier: rateLimitCheck.tier,
            remaining: rateLimitCheck.remaining,
            limit: rateLimitCheck.limit,
            testUser: rateLimitCheck.testUser
          });
        }
      }

    const body = await req.text();
    
    // Ensure proper UTF-8 handling for international characters
    const decodedBody = new TextDecoder('utf-8', { fatal: false }).decode(
      new TextEncoder().encode(body)
    );
    
    let { videoUrl, videoId, language, forceReExtract, fullTranscript, wordTimestamps, rangeBytes, maxDurationMinutes, useTestingMode = false, skipQualityCheck = false, knownSpeakers } = JSON.parse(decodedBody);
    
    console.log("Request parameters:", {
      videoUrl: videoUrl ? videoUrl.substring(0, 100) + '...' : 'none',
      videoId: videoId || 'none',
      language: language || 'auto',
      forceReExtract: !!forceReExtract,
      fullTranscript: !!fullTranscript,
      wordTimestamps: !!wordTimestamps,
      rangeBytes: rangeBytes || 'default',
      maxDurationMinutes: maxDurationMinutes || 60,
      useTestingMode: !!useTestingMode,
      skipQualityCheck: !!skipQualityCheck
    });
    
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

    // Get video size (but don't download unless necessary)
    const headResponse = await fetch(resolvedVideoUrl, { method: 'HEAD' });
    const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
    const sizeMB = Math.round(contentLength / 1024 / 1024);
    const contentType = headResponse.headers.get('content-type') || '';
    console.log(`Video size: ${sizeMB}MB, content-type: ${contentType}`);

    // PHASE 3: VALIDATE MINUTES BEFORE PROCESSING
    // Estimate video duration (rough estimate: 1 minute per 10MB for compressed video)
    const estimatedDurationSeconds = Math.max(60, sizeMB * 6); // Conservative estimate
    
    if (authenticatedUser && !useTestingMode) {
      console.log(`🔒 Validating processing minutes for user ${authenticatedUser.id}...`);
      
      const { data: validation, error: validationError } = await supabase.rpc('can_process_video', {
        target_user_id: authenticatedUser.id,
        video_duration_seconds: estimatedDurationSeconds
      });

      if (validationError) {
        console.error('Minutes validation error:', validationError);
      } else if (validation && !validation.allowed) {
        console.warn(`❌ Processing not allowed: ${validation.reason}`);
        logAPICall({
          userId: authenticatedUser.id,
          videoId: videoId || 'unknown',
          apiService: 'Transcription',
          status: 'error',
          error: `Minutes limit: ${validation.reason}`,
          provider: 'blocked'
        });
        
        return new Response(JSON.stringify({
          error: 'insufficient_minutes',
          message: validation.message || 'Insufficient processing minutes available',
          details: validation,
          upgradeUrl: '/pricing'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else if (validation && validation.will_approach_limit) {
        console.warn(`⚠️ User approaching minutes limit: ${validation.minutes_remaining_after} minutes remaining after processing`);
      }
      
      console.log(`✅ Minutes validation passed. Available: ${validation?.minutes_available || 'unknown'} minutes`);
    }

    // PHASE 3: Language validation - prevent 'auto' from reaching database
    if (language === 'auto') {
      console.warn('⚠️ Received "auto" language - defaulting to "en"');
      language = 'en';
    }

    // Whitelist of supported languages
    const SUPPORTED_LANGUAGES = [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ca', 'zh', 'ja', 'ko', 
      'ar', 'ru', 'hi', 'nl', 'pl', 'sv', 'no', 'da', 'fi', 'cs',
      'hu', 'ro', 'uk', 'bg', 'hr', 'sk', 'sl', 'et', 'lv', 'lt', 'tr'
    ];

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      console.warn(`⚠️ Unsupported language "${language}" - defaulting to "en"`);
      language = 'en';
    }

    // MEMORY OPTIMIZATION: Only download video if we need it for local processing
    let videoBuffer: ArrayBuffer | null = null;

    let transcriptionResult;
    const startTime = Date.now();

    // TESTING MODE OVERRIDE: Force AssemblyAI for videos >25MB
    if (useTestingMode && sizeMB > 25) {
      console.log(`🧪 TESTING MODE ENABLED: Forcing AssemblyAI for ${sizeMB}MB video`);
      const ASSEMBLYAI_API_KEY_TEST = Deno.env.get("ASSEMBLYAI_API_KEY_TEST");
      
      if (!ASSEMBLYAI_API_KEY_TEST) {
        return new Response(JSON.stringify({ 
          error: "ASSEMBLYAI_API_KEY_TEST not configured",
          message: "Testing mode requires ASSEMBLYAI_API_KEY_TEST to be set"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      try {
        console.log("🧪 Testing with AssemblyAI using test API key...");
        const testResult = await transcribeWithAssemblyAI(
          resolvedVideoUrl, 
          language, 
          maxDurationMinutes,
          true,  // Use test key
          knownSpeakers
        );
        
        if (testResult && !testResult.error) {
          const processingTimeMs = Date.now() - startTime;
          console.log("✅ AssemblyAI TEST successful!");
          console.log("📊 Test metrics:", {
            provider: 'AssemblyAI-TEST',
            segments: testResult.segments?.length || 0,
            words: testResult.words?.length || 0,
            confidence: testResult.confidence || 'N/A',
            language: testResult.language || language,
            processingTimeMs
          });
          
          transcriptionResult = {
            ...testResult,
            provider: 'AssemblyAI-TEST',
            testMode: true,
            processingTimeMs
          };

          // Log test results to database
          if (videoId) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const supabase = createClient(supabaseUrl, supabaseKey);

            const segmentCount = testResult.segments?.length || 0;
            const wordCount = testResult.words?.length || 0;
            const speakerSet = new Set(testResult.segments?.map((s: any) => s.speaker) || []);
            
            const { error: logError } = await supabase
              .from('transcription_test_results')
              .insert({
                video_id: videoId,
                provider: 'AssemblyAI-TEST',
                segment_count: segmentCount,
                word_count: wordCount,
                speaker_count: speakerSet.size,
                avg_confidence: testResult.confidence || null,
                has_word_timings: wordCount > 0,
                api_key_used: 'TEST',
                estimated_cost_usd: (sizeMB * 0.00025),
                processing_time_ms: processingTimeMs,
                video_duration_sec: testResult.duration || null,
                raw_result: testResult,
                video_size_mb: sizeMB,
                language: testResult.language || language || 'en'
              });
            
            if (logError) {
              console.warn('Failed to log test results:', logError);
            } else {
              console.log('✅ Test results logged successfully');
            }
          }

          // Continue to save and return
          if (videoId) {
            await saveTranscriptToDatabase(videoId, transcriptionResult, !!forceReExtract);
          }

          return new Response(JSON.stringify(transcriptionResult), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (testError) {
        console.error("🧪 AssemblyAI TEST failed:", testError);
        return new Response(JSON.stringify({ 
          error: "test_failed",
          message: testError instanceof Error ? testError.message : "Unknown test error",
          provider: "AssemblyAI-TEST"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // MEMORY-EFFICIENT PROCESSING STRATEGY
    // AssemblyAI as PRIMARY provider for all transcription
    console.log("🚀 Using AssemblyAI as PRIMARY transcription provider");
    
    // Strategy 1: For all videos, use AssemblyAI FIRST
    if (sizeMB > 0) {
      console.log(`🚀 Video detected (${sizeMB}MB). Using AssemblyAI as primary provider...`);
      
      // PRIORITY 1: AssemblyAI (Primary transcription provider)
      const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
      if (ASSEMBLYAI_API_KEY) {
        try {
          console.log("🟣 PRIORITY 1: AssemblyAI transcription (PRIMARY)...");
          const assemblyResult = await transcribeWithAssemblyAI(resolvedVideoUrl, language, maxDurationMinutes, false, knownSpeakers);
          if (assemblyResult && !assemblyResult.error) {
            console.log("✅ AssemblyAI transcription successful!");
            transcriptionResult = {
              ...assemblyResult,
              provider: 'AssemblyAI',
              // ✅ Explicitly preserve utterances for speaker diarization
              utterances: assemblyResult.utterances || []
            };
            console.log('✅ AssemblyAI result structure:', {
              hasUtterances: !!transcriptionResult.utterances,
              utteranceCount: transcriptionResult.utterances?.length || 0,
              hasSegments: !!transcriptionResult.segments,
              segmentCount: transcriptionResult.segments?.length || 0
            });
          } else {
            throw new Error("AssemblyAI returned error or no result");
          }
        } catch (assemblyError) {
          console.log("⚠️ AssemblyAI failed, trying fallback providers:", assemblyError instanceof Error ? assemblyError.message : 'Unknown error');
        }
      } else {
        console.error("❌ ASSEMBLYAI_API_KEY not configured - this is required for primary transcription");
      }
      
      // PRIORITY 2: Deepgram fallback
      if (!transcriptionResult || transcriptionResult.error) {
        const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
        if (DEEPGRAM_API_KEY) {
          try {
            console.log("🟢 PRIORITY 2 (Fallback): Trying Deepgram...");
            const deepgramResult = await transcribeWithDeepgram(resolvedVideoUrl, language);
            if (deepgramResult && !deepgramResult.error) {
              console.log("✅ Deepgram successful!");
              transcriptionResult = deepgramResult;
            } else {
              throw new Error("Deepgram fallback");
            }
          } catch (deepgramError) {
            console.log("⚠️ Deepgram failed, trying Twelve Labs:", deepgramError instanceof Error ? deepgramError.message : 'Unknown error');
          }
        }
      }
      
      // PRIORITY 3: Twelve Labs fallback
      if (!transcriptionResult || transcriptionResult.error) {
        try {
          console.log("🟣 PRIORITY 3 (Fallback): Trying Twelve Labs...");
          const twelveLabsResult = await transcribeWithTwelveLabs(resolvedVideoUrl, videoId, language);
          if (twelveLabsResult && !twelveLabsResult.error) {
            console.log("✅ Twelve Labs analysis successful!");
            transcriptionResult = twelveLabsResult;
          } else {
            throw new Error("Twelve Labs fallback");
          }
        } catch (error) {
          console.log("Twelve Labs failed:", error instanceof Error ? error.message : 'Unknown error');
          
          // PRIORITY 4: OpenAI fallback (only for small videos)
          if (sizeMB <= 25) {
            console.log("Downloading video for OpenAI processing...");
            const videoResponse = await fetch(resolvedVideoUrl);
            if (videoResponse.ok) {
              videoBuffer = await videoResponse.arrayBuffer();
              console.log(`Downloaded ${Math.round(videoBuffer.byteLength / 1024 / 1024)}MB video`);
              
              try {
                transcriptionResult = await transcribeBuffer(videoBuffer, OPENAI_API_KEY, language);
                console.log("✅ OpenAI direct processing successful!");
              } catch (openaiError) {
                console.log("All providers failed:", (openaiError as any).message);
                transcriptionResult = { 
                  error: 'all_providers_failed', 
                  message: 'All transcription providers failed. Please check video format and API keys.' 
                };
              }
            } else {
              transcriptionResult = { 
                error: 'all_providers_failed', 
                message: 'All transcription providers failed.' 
              };
            }
          } else {
            transcriptionResult = { 
              error: 'all_providers_failed', 
              message: `All providers failed for ${sizeMB}MB video. Please check video format and API keys.` 
            };
          }
        }
      }
    }

    // POST-PROCESSING VALIDATION AND COVERAGE CHECK
    if (transcriptionResult && transcriptionResult.segments) {
      console.log("🔍 Validating transcription quality and coverage...");
      
      // Calculate coverage
      const lastSegment = transcriptionResult.segments[transcriptionResult.segments.length - 1];
      const lastSegmentEnd = lastSegment?.end || lastSegment?.endTime || 0;
      const duration = transcriptionResult.duration || lastSegmentEnd || 0;
      const coverage = duration > 0 ? lastSegmentEnd / duration : 1;
      
      console.log(`📊 Coverage check: lastSegmentEnd=${lastSegmentEnd}s, duration=${duration}s, coverage=${(coverage * 100).toFixed(1)}%`);
      
      // For videos >60s, require 80% coverage
      if (duration > 60 && coverage < 0.8) {
        console.warn(`⚠️ Low coverage detected (${(coverage * 100).toFixed(1)}%), treating as partial transcription`);
        transcriptionResult.partial = true;
        transcriptionResult.coverage = coverage;
      }
      
      // Non-blocking quality validation
      if (!skipQualityCheck && transcriptionResult && transcriptionResult.segments) {
        const validationResult = validateTranscriptionQuality(transcriptionResult);
        
        if (!validationResult.isValid) {
          // NON-BLOCKING: Add warning but DON'T replace segments
          console.warn("⚠️ Quality warning (non-blocking):", validationResult.reason);
          console.warn("⚠️ Issues found:", validationResult.issues || []);
          
          // Sample text for debugging (first 200 chars)
          const combinedText = transcriptionResult.segments
            .map((s: any) => s.text || '')
            .join(' ')
            .substring(0, 200);
          console.log("📝 Sample text:", combinedText);
          
          // Attach validation metadata but KEEP segments intact
          transcriptionResult.validation = {
            status: 'warn',
            reason: validationResult.reason,
            issues: validationResult.issues || []
          };
        } else {
          console.log("✅ Transcription validation passed");
          transcriptionResult.validation = { status: 'ok' };
        }
      } else if (skipQualityCheck) {
        console.log("⏭️ Skipping validation by request (skipQualityCheck=true)");
        transcriptionResult.validation = { status: 'skipped' };
      }
      
      // CRITICAL: Only fail if absolutely NO segments exist
      if (!transcriptionResult || !transcriptionResult.segments || transcriptionResult.segments.length === 0) {
        console.error("❌ CRITICAL: No segments generated at all");
        return new Response(
          JSON.stringify({
            error: 'no_segments',
            message: 'Transcription failed to generate any segments'
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // TRACK USAGE for successful transcriptions
    if (transcriptionResult && transcriptionResult.segments && videoId) {
      try {
        // Reuse authHeader from line 78
        if (authHeader) {
          const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
          const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          
          if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
            const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            
            // Get user from JWT
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            
            if (user) {
              // Calculate duration in minutes from transcription
              const duration = transcriptionResult.duration || 
                             (transcriptionResult.segments[transcriptionResult.segments.length - 1]?.endTime || 0);
              const durationMinutes = duration / 60;
              
              // Determine which provider was used
              const provider = transcriptionResult.provider || 
                             (transcriptionResult.segments[0]?.source === 'twelve_labs' ? 'twelve_labs' : 
                              (transcriptionResult.segments[0]?.source === 'assemblyai' ? 'assemblyai' : 'openai'));
              
              console.log(`📊 Tracking usage: ${durationMinutes.toFixed(2)} minutes using ${provider} for user ${user.id}`);
              
              // Track usage via database function
              const { data: trackingData, error: trackingError } = await supabaseAdmin.rpc('track_video_processing_usage', {
                target_user_id: user.id,
                video_uuid: videoId,
                minutes_to_add: durationMinutes,
                proc_type: `transcription_${provider}`,
                meta: {
                  provider: provider,
                  language: language || 'auto',
                  videoSize: sizeMB,
                  duration_seconds: duration,
                  timestamp: new Date().toISOString()
                }
              });

              if (trackingError) {
                console.error("❌ Usage tracking error:", trackingError);
              } else {
                console.log("✅ Usage tracked successfully:", trackingData);
                
                // Check if approaching limit
                if (trackingData && !trackingData.test_user && trackingData.approaching_limit) {
                  console.warn("⚠️ User approaching usage limit!");
                }
              }
            }
          }
        }
      } catch (trackingError) {
        console.error("Error during usage tracking:", trackingError);
        // Don't fail the request if tracking fails
      }
    }

    // Save to database and log the attempt
    console.log("Checking database save conditions:", { 
      hasVideoId: !!videoId, 
      hasSegments: !!transcriptionResult.segments,
      segmentCount: transcriptionResult.segments?.length || 0,
      resultKeys: Object.keys(transcriptionResult)
    });
    
    if (videoId && transcriptionResult.segments) {
      console.log("Attempting to save to database...");
      console.log('📊 Pre-save transcription check:', {
        hasUtterances: !!transcriptionResult.utterances,
        utteranceCount: transcriptionResult.utterances?.length || 0,
        firstUtterance: transcriptionResult.utterances?.[0]
      });
      await saveTranscriptToDatabase(videoId, transcriptionResult, forceReExtract);
    } else {
      console.log("Skipping database save - missing videoId or segments");
    }

    console.log("Final transcription result structure:", {
      hasText: !!transcriptionResult.text,
      hasSegments: !!transcriptionResult.segments,
      segmentCount: transcriptionResult.segments?.length || 0,
      hasLanguage: !!transcriptionResult.language,
      hasError: !!transcriptionResult.error,
      resultKeys: Object.keys(transcriptionResult)
    });

    return new Response(JSON.stringify(transcriptionResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Function error:", error);
    
    return new Response(JSON.stringify({ 
      error: "Transcription failed",
      details: String(error)
    }), {
      status: 200,
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
  console.log("Using enhanced processing for full video transcription...");
  
  const totalSize = buffer.byteLength;
  const maxChunkSize = 23 * 1024 * 1024; // 23MB chunks (safe for OpenAI)
  
  console.log(`Processing full video: ${Math.round(totalSize / 1024 / 1024)}MB`);
  
  // If video is smaller than max chunk, process directly
  if (totalSize <= maxChunkSize) {
    console.log("Video fits in single chunk, processing directly...");
    return await transcribeBuffer(buffer, apiKey, language);
  }
  
  // For larger videos, we need a different approach
  // Since OpenAI Whisper has a 25MB limit, we'll process the video in overlapping segments
  const results: any[] = [];
  const chunkCount = Math.ceil(totalSize / maxChunkSize);
  const overlapSize = 2 * 1024 * 1024; // 2MB overlap between chunks for continuity
  
  console.log(`Large video detected. Processing in ${chunkCount} overlapping chunks...`);
  
  for (let i = 0; i < chunkCount; i++) {
    const startByte = Math.max(0, i * maxChunkSize - (i > 0 ? overlapSize : 0));
    const endByte = Math.min(totalSize, (i + 1) * maxChunkSize);
    const chunk = buffer.slice(startByte, endByte);
    
    console.log(`Processing chunk ${i + 1}/${chunkCount}: ${Math.round(chunk.byteLength / 1024 / 1024)}MB`);
    
    try {
      const chunkResult = await transcribeBuffer(chunk, apiKey, language);
      if (chunkResult?.segments) {
        // Adjust timestamps based on chunk position
        const timeOffset = (startByte / totalSize) * 300; // Estimate based on file position
        const adjustedSegments = chunkResult.segments.map((seg: any) => ({
          ...seg,
          start: seg.start + timeOffset,
          end: seg.end + timeOffset
        }));
        results.push(...adjustedSegments);
      }
    } catch (chunkError) {
      console.error(`Chunk ${i + 1} failed:`, chunkError instanceof Error ? chunkError.message : 'Unknown error');
      // Continue with other chunks rather than failing completely
    }
    
    // Add delay between chunks to avoid rate limiting
    if (i < chunkCount - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  if (results.length === 0) {
    throw new Error("All chunks failed to process");
  }
  
  // Combine results and remove overlapping segments
  const combinedSegments = deduplicateSegments(results);
  const fullText = combinedSegments.map((seg: any) => seg.text).join(' ');
  
  console.log(`✅ Full video processing complete: ${combinedSegments.length} total segments from ${chunkCount} chunks`);
  
  return {
    text: fullText,
    segments: combinedSegments,
    language: language || 'en',
    words: combinedSegments.flatMap((seg: any) => seg.words || [])
  };
}

// Remove duplicate segments from overlapping chunks
function deduplicateSegments(segments: any[]): any[] {
  const sorted = segments.sort((a, b) => a.start - b.start);
  const deduplicated: any[] = [];
  
  for (const segment of sorted) {
    const lastSegment = deduplicated[deduplicated.length - 1];
    
    // Skip if this segment overlaps significantly with the previous one
    if (lastSegment && 
        Math.abs(segment.start - lastSegment.start) < 2.0 && 
        segment.text.trim() === lastSegment.text.trim()) {
      continue; // Skip duplicate
    }
    
    deduplicated.push(segment);
  }
  
  return deduplicated;
}

// Fallback: Use AssemblyAI for URL-based long-form transcription
async function transcribeWithAssemblyAI(audioUrl: string, language?: string, maxDurationMinutes?: number, useTestKey = false, knownSpeakers?: string[]): Promise<any> {
  console.log("Using AssemblyAI transcription (URL-based)...", { audioUrl, maxDurationMinutes, useTestKey, knownSpeakers });

  const apiKey = useTestKey 
    ? Deno.env.get("ASSEMBLYAI_API_KEY_TEST")
    : Deno.env.get("ASSEMBLYAI_API_KEY");
  
  if (!apiKey) {
    throw new Error(useTestKey 
      ? "ASSEMBLYAI_API_KEY_TEST not configured" 
      : "ASSEMBLYAI_API_KEY not configured"
    );
  }

  console.log(`🔑 Using ${useTestKey ? 'TEST' : 'PRODUCTION'} AssemblyAI API key`);

  const headers = {
    authorization: apiKey,
    "content-type": "application/json",
  } as Record<string, string>;

  const languageCode = getLanguageCode(language);
  const body: Record<string, any> = {
    audio_url: audioUrl,
    punctuate: true,
    format_text: true,
    speaker_labels: true,
    speakers_expected: knownSpeakers?.length || 2, // Use provided count or default to 2
    speech_model: 'best', // Use the most accurate model for better diarization
    word_boost: [], // No custom vocabulary
    boost_param: 'default', // Default boost parameter
    auto_chapters: false,
    sentiment_analysis: true, // ✅ FREE feature - enable sentiment analysis
    entity_detection: false,
    iab_categories: false,
    content_safety: false,
    auto_highlights: false,
    dual_channel: false, // Set to true if audio has separate left/right channels
  };
  
  // Enable FREE Speaker Identification if names provided
  if (knownSpeakers && knownSpeakers.length > 0) {
    console.log(`🎭 Enabling Speaker Identification with ${knownSpeakers.length} known speakers:`, knownSpeakers);
    body.speech_understanding = {
      request: {
        speaker_identification: {
          speaker_type: "name",
          known_values: knownSpeakers
        }
      }
    };
  }
  if (languageCode) {
    body.language_code = languageCode;
  } else {
    body.language_detection = true;
  }

  console.log('🎙️ Transcribing with AssemblyAI (sentiment enabled)...');
  const createRes = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`AssemblyAI create error: ${createRes.status} - ${err}`);
  }

  const createData = await createRes.json();
  const transcriptId = createData.id;
  console.log("📝 AssemblyAI transcript created", { transcriptId });

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 120; // ~10 minutes at 5s intervals
  let status = createData.status as string;
  let resultData: any = createData;

  while (attempts < maxAttempts) {
    const statusRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { authorization: apiKey },
    });

    if (!statusRes.ok) {
      const err = await statusRes.text();
      throw new Error(`AssemblyAI status error: ${statusRes.status} - ${err}`);
    }

    resultData = await statusRes.json();
    status = resultData.status;
    console.log("📊 AssemblyAI status:", status);

    if (status === "completed") break;
    if (status === "error") throw new Error(`AssemblyAI failed: ${resultData.error}`);

    await new Promise((r) => setTimeout(r, 5000));
    attempts++;
  }

  if (status !== "completed") {
    throw new Error("AssemblyAI transcription timeout");
  }

  // Get sentiment results
  const sentimentResults = resultData.sentiment_analysis_results || [];
  console.log(`✅ Received ${sentimentResults.length} sentiment analyses`);

  // Build segments from utterances when available
  const segments: any[] = [];
  const maxDurationSeconds = (maxDurationMinutes || 60) * 60; // Default to 60 minutes
  
  console.log(`📊 AssemblyAI Response Structure:`, {
    hasUtterances: !!resultData.utterances,
    utteranceCount: resultData.utterances?.length || 0,
    hasWords: !!resultData.words,
    wordCount: resultData.words?.length || 0,
    firstUtteranceSpeaker: resultData.utterances?.[0]?.speaker || 'none',
    status: resultData.status,
    hasSentimentAnalysis: !!resultData.sentiment_analysis_results,
    sentimentResultsCount: resultData.sentiment_analysis_results?.length || 0
  });
  
  // Process sentiment analysis results
  const sentimentMap = new Map<number, any>(); // Map utterance index to sentiment
  if (resultData.sentiment_analysis_results && Array.isArray(resultData.sentiment_analysis_results)) {
    console.log(`🎭 Processing ${resultData.sentiment_analysis_results.length} sentiment analysis results...`);
    resultData.sentiment_analysis_results.forEach((sentiment: any, idx: number) => {
      sentimentMap.set(idx, sentiment);
      if (idx < 5) {
        console.log(`   😊 Sentiment ${idx}: ${sentiment.sentiment} (confidence: ${sentiment.confidence})`);
      }
    });
  }
  
  // 7-Level Intensity Mapping Function
  function mapSentimentToIntensity(
    sentiment: string,
    confidence: number,
    duration_ms: number
  ): string {
    // Very low confidence → normal
    if (confidence < 0.6) return 'normal';
    
    // Extreme confidence + strong emotion → screaming
    if (confidence > 0.95 && (sentiment === 'POSITIVE' || sentiment === 'NEGATIVE')) {
      return 'screaming';
    }
    
    // Very high confidence + strong emotion → yelling
    if (confidence > 0.85 && (sentiment === 'POSITIVE' || sentiment === 'NEGATIVE')) {
      return 'yelling';
    }
    
    // High confidence + emotion → loud
    if (confidence > 0.75 && (sentiment === 'POSITIVE' || sentiment === 'NEGATIVE')) {
      return 'loud';
    }
    
    // Duration-based: very long utterances are emphatic
    if (duration_ms > 800) return 'loud';
    
    // Medium confidence → quiet for neutral, normal for others
    if (confidence > 0.65 && sentiment === 'NEUTRAL') {
      return 'quiet';
    }
    
    // Very soft speech indicators
    if (duration_ms < 300 && confidence < 0.7) {
      return 'whisper';
    }
    
    return 'normal';
  }
  
  if (Array.isArray(resultData.utterances) && resultData.utterances.length > 0) {
    console.log(`🎯 Processing ${resultData.utterances.length} utterances with speaker labels...`);
    for (let i = 0; i < resultData.utterances.length; i++) {
      const u = resultData.utterances[i];
      const start_ms = u.start || 0;  // ✅ MILLISECONDS - NO CONVERSION
      const end_ms = u.end || 0;      // ✅ MILLISECONDS - NO CONVERSION
      const duration_ms = end_ms - start_ms;
      
      const startTimeSeconds = start_ms / 1000;
      const endTimeSeconds = end_ms / 1000;
      
      // Skip segments that start after the max duration
      if (startTimeSeconds > maxDurationSeconds) {
        console.log(`⏭️ Skipping segment starting at ${startTimeSeconds}s (exceeds ${maxDurationSeconds}s limit)`);
        continue;
      }
      
      console.log(`   📍 Utterance: speaker="${u.speaker || 'NONE'}" text="${u.text.substring(0, 30)}..."`);
      
      // Map sentiment to intensity using 7-level spectrum
      const sentimentData = sentimentMap.get(i);
      let emphasis = 'normal';
      let overall_intensity = 'normal';
      let emotionMetadata: any = null;
      let sentiment: string | null = null;
      let sentimentConfidence: number | null = null;
      
      if (sentimentData) {
        sentiment = sentimentData.sentiment;
        const confidence = sentimentData.confidence || 0;
        sentimentConfidence = confidence;
        
        // ✅ 7-Level Intensity Mapping
        overall_intensity = mapSentimentToIntensity(sentiment, confidence, duration_ms);
        emphasis = overall_intensity; // Keep for backward compatibility
        
        // Store complete sentiment data for database
        emotionMetadata = {
          provider: 'assemblyai',
          sentiment: sentiment,
          confidence: confidence,
          speaker: sentimentData.speaker || u.speaker,
          text: sentimentData.text || u.text,
          detected_at: new Date().toISOString(),
          intensity: overall_intensity
        };
        
        if (i < 5) {
          console.log(`   😊 Sentiment: ${sentiment} (conf: ${confidence.toFixed(2)}) → intensity: ${overall_intensity}`);
        }
      }
      
      segments.push({
        text: u.text,
        start_ms: start_ms,  // ✅ MILLISECONDS
        end_ms: end_ms,      // ✅ MILLISECONDS
        start: startTimeSeconds,  // Keep for compatibility
        end: Math.min(endTimeSeconds, maxDurationSeconds),
        speaker_asr_label: u.speaker || 'Speaker',  // ✅ Preserve ASR label
        speaker: u.speaker || undefined,
        words_source: 'asr',  // ✅ Mark as ASR source
        timing_confidence: u.confidence || 0.95,
        confidence: u.confidence || 0.95,
        
        // ✅ NEW: 7-level intensity spectrum
        overall_intensity: overall_intensity,
        overall_pitch: 'normal',  // TODO: Add pitch detection
        
        emphasis: emphasis,  // Keep for backward compatibility
        
        // ✅ Emotion metadata
        emotion_metadata: emotionMetadata,
        sentiment: sentiment,
        sentiment_confidence: sentimentConfidence,
        
        // ✅ Words with millisecond precision
        words: (u.words || []).map((w: any) => ({
          text: w.text ?? w.word,
          start_ms: w.start || 0,  // ✅ MILLISECONDS
          end_ms: w.end || 0,      // ✅ MILLISECONDS
          start: (w.start || 0) / 1000,  // Keep for compatibility
          end: Math.min((w.end || 0) / 1000, maxDurationSeconds),
          word: w.text ?? w.word,
          duration_ms: (w.end || 0) - (w.start || 0),  // ✅ Duration
          confidence: w.confidence,
          speaker: w.speaker || u.speaker,
          sentiment: sentiment,
          sentimentConfidence: sentimentConfidence
        })).filter((w: any) => (w.start_ms / 1000) <= maxDurationSeconds)
      });
    }
    console.log(`✅ Built ${segments.length} segments from utterances with 7-level intensity mapping`);
  } else if (Array.isArray(resultData.words) && resultData.words.length > 0) {
    // Group words into ~5s sentences
    let current: any = { text: "", start: null as number | null, end: null as number | null, words: [] as any[] };
    for (const w of resultData.words) {
      const ws = (w.start || 0) / 1000;
      const we = (w.end || 0) / 1000;
      
      // Skip words that start after the max duration
      if (ws > maxDurationSeconds) break;
      
      if (current.start === null) current.start = ws;
      current.end = Math.min(we, maxDurationSeconds);
      current.text += (w.text ?? w.word ?? "") + " ";
      current.words.push({ start: ws, end: Math.min(we, maxDurationSeconds), word: w.text ?? w.word, confidence: w.confidence });
      if ((current.end - current.start) >= 5 || /[.?!]$/.test(current.text.trim())) {
        segments.push({ text: current.text.trim(), start: current.start, end: current.end, words: current.words });
        current = { text: "", start: null, end: null, words: [] };
      }
    }
    if (current.start !== null) {
      segments.push({ text: current.text.trim(), start: current.start, end: current.end, words: current.words });
    }
  } else {
    const audioDuration = resultData.audio_duration || resultData.duration || 0;
    segments.push({ 
      text: resultData.text || "", 
      start: 0, 
      end: Math.min(audioDuration, maxDurationSeconds)
    });
  }
  
  console.log(`📊 Processed ${segments.length} segments within ${maxDurationSeconds}s (${maxDurationMinutes || 60} minutes) limit`);

  const fullText = (resultData.text as string) || segments.map((s) => s.text).join(" ");
  
  // Validation is now non-blocking and handled later in the flow
  console.log(`✅ AssemblyAI transcription complete: ${segments.length} segments, ${fullText.length} chars`);
  
  return {
    text: fullText,
    segments,
    utterances: resultData.utterances || [], // CRITICAL: Include utterances for SpeakerAssignmentService
    language: languageCode || resultData.language_code || "en",
    words: segments.flatMap((s: any) => s.words || []),
  };
}

// Use Twelve Labs for comprehensive video analysis
async function transcribeWithTwelveLabs(videoUrl: string, videoId?: string, language?: string): Promise<any> {
  console.log("Using Twelve Labs for comprehensive video analysis...");
  
  const twelveLabsKey = Deno.env.get("TWELVE_LABS_API_KEY");
  if (!twelveLabsKey) {
    throw new Error("Twelve Labs API key not configured");
  }

  try {
    // Call the existing twelve-labs-analysis function
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials missing for function invocation');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.functions.invoke('twelve-labs-analysis', {
      body: {
        videoUrl,
        videoId: videoId || 'transcribe-request',
        language: language || 'en'
      }
    });

    if (error) {
      throw new Error(`Twelve Labs request failed: ${error.message || JSON.stringify(error)}`);
    }

    const result = data as any;
    
    if ((result as any).error) {
      throw new Error((result as any).error);
    }

    // Convert Twelve Labs format to our expected format
    const segments = result.segments || [];
    const audioDescriptions = result.audioDescriptions || [];
    
    console.log(`Twelve Labs analysis complete: ${segments.length} transcript segments, ${audioDescriptions.length} audio descriptions`);
    
    return {
      text: segments.map((s: any) => s.text).join(' '),
      segments: segments.map((s: any) => ({
        text: s.text,
        start: s.start,
        end: s.end,
        words: s.words || []
      })),
      language: result.language || language || 'en',
      speakers: result.speakers || [],
      audioDescriptions: audioDescriptions
    };
    
  } catch (error) {
    console.error("Twelve Labs analysis failed:", error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Map AssemblyAI speaker labels to CI color palette
function assignSpeakerColor(speakerLabel: string | undefined, allSegments: any[]): string {
  const CI_SPEAKER_COLORS = [
    '#E5E517', '#17E5E5', '#E51717', '#E58017', '#17E517', '#E517E5',
    '#E85C2E', '#47C2EB', '#EBC247', '#5E82ED', '#C2EB47', '#8C6BED'
  ];
  
  if (!speakerLabel) return CI_SPEAKER_COLORS[0]; // Default to yellow
  
  // Get all unique speakers from segments
  const uniqueSpeakers = Array.from(new Set(
    allSegments.map(s => s.speaker).filter(Boolean)
  )).sort(); // Sort for consistency: ["A", "B", "C"]
  
  const speakerIndex = uniqueSpeakers.indexOf(speakerLabel);
  return CI_SPEAKER_COLORS[speakerIndex % CI_SPEAKER_COLORS.length];
}

// Auto-create characters for detected speakers
async function autoCreateCharacters(videoId: string, segments: any[], supabaseClient: any): Promise<Map<string, string>> {
  const CI_SPEAKER_COLORS = [
    '#E5E517', '#17E5E5', '#E51717', '#E58017', '#17E517', '#E517E5',
    '#E85C2E', '#47C2EB', '#EBC247', '#5E82ED', '#C2EB47', '#8C6BED'
  ];
  
  // Get unique speakers from segments
  const uniqueSpeakers = Array.from(new Set(
    segments.map(s => s.speaker).filter(Boolean)
  )).sort();
  
  console.log(`🎭 Auto-creating ${uniqueSpeakers.length} characters for speakers:`, uniqueSpeakers);
  
  const speakerToCharIdMap = new Map<string, string>();
  
  for (let i = 0; i < uniqueSpeakers.length; i++) {
    const speaker = uniqueSpeakers[i];
    const characterName = `Speaker ${speaker}`; // "Speaker A", "Speaker B", etc.
    const color = CI_SPEAKER_COLORS[i % CI_SPEAKER_COLORS.length];
    
    // Check if character already exists
    const { data: existingChar } = await supabaseClient
      .from('characters')
      .select('id')
      .eq('video_id', videoId)
      .eq('name', characterName)
      .single();
    
    if (existingChar) {
      speakerToCharIdMap.set(speaker, existingChar.id);
      console.log(`✅ Using existing character: "${characterName}" → ID: ${existingChar.id}`);
      continue;
    }
    
    // Create new character
    const { data: character, error } = await supabaseClient
      .from('characters')
      .insert({
        video_id: videoId,
        name: characterName,
        type: i === 0 ? 'main' : (i === 1 ? 'supporting' : 'minor'),
        color: color,
        is_off_camera: false,
        emphasis: 'normal',
        pitch: 'normal'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error(`❌ Failed to create character for ${speaker}:`, error);
      continue;
    }
    
    speakerToCharIdMap.set(speaker, character.id);
    console.log(`✅ Created character: "${characterName}" (${color}) → ID: ${character.id}`);
  }
  
  return speakerToCharIdMap;
}

// Save transcript to database with enhanced speaker assignment
async function saveTranscriptToDatabase(videoId: string, transcriptionResult: any, forceReExtract: boolean) {
  console.log(`💾 Saving ${transcriptionResult.segments.length} segments to database with speaker assignment service...`);
  console.log(`📊 Transcription format check:`, {
    hasUtterances: !!transcriptionResult.utterances,
    utteranceCount: transcriptionResult.utterances?.length || 0,
    hasSegments: !!transcriptionResult.segments,
    segmentCount: transcriptionResult.segments?.length || 0,
    firstSegmentSpeaker: transcriptionResult.segments?.[0]?.speaker || 'none',
    firstUtteranceSpeaker: transcriptionResult.utterances?.[0]?.speaker || 'none'
  });
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log("Supabase credentials not available, skipping database save");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // ALWAYS clear existing base segments (transcript_id IS NULL) for this video/language
    // This prevents the uq_transcript_pos constraint violation
    console.log('🗑️ Clearing existing base segments for video:', videoId, 'language:', transcriptionResult.language || 'en');
    const { error: deleteError } = await supabase
      .from('transcript_segments_clean')
      .delete()
      .eq('video_id', videoId)
      .eq('language', transcriptionResult.language || 'en')
      .is('transcript_id', null);
    
    if (deleteError) {
      console.error('⚠️ Failed to clear existing segments:', deleteError);
    } else {
      console.log('✅ Cleared existing base segments');
    }
    
    // Check if we have AssemblyAI utterances format (with speaker labels)
    console.log('🔍 Utterance format check:', {
      hasUtterances: !!transcriptionResult.utterances,
      isArray: Array.isArray(transcriptionResult.utterances),
      length: transcriptionResult.utterances?.length || 0,
      firstUtterance: transcriptionResult.utterances?.[0]
    });
    
    const hasUtteranceFormat = transcriptionResult.utterances && 
                               Array.isArray(transcriptionResult.utterances) && 
                               transcriptionResult.utterances.length > 0;
    
    console.log(`✅ hasUtteranceFormat = ${hasUtteranceFormat}`);
    
    if (hasUtteranceFormat) {
      console.log('🎭 Using SpeakerAssignmentService for proper character linking...');
      console.log(`📊 Processing ${transcriptionResult.utterances.length} utterances...`);
      
      // Use the new service for proper speaker assignment
      const service = new SpeakerAssignmentService(supabase, videoId);
      const processedSegments = await service.processTranscriptionWithManualCharacters(
        transcriptionResult.utterances,
        transcriptionResult.language || 'en'
      );
      
      // Save processed segments
      await service.saveSegmentsToDatabase(processedSegments);
      
      console.log(`✅ Saved ${processedSegments.length} segments with proper character assignment`);
    } else {
      // Fallback to old method for non-utterance formats
      console.log('⚠️ Using legacy save method (no utterance format detected)');
      console.log('⚠️ This means speaker labels may not be properly assigned!');
      
      // ALWAYS clear existing base segments to avoid constraint violations
      console.log('🗑️ Legacy method: Clearing existing base segments...');
      const { error: legacyDeleteError } = await supabase
        .from('transcript_segments_clean')
        .delete()
        .eq('video_id', videoId)
        .eq('language', transcriptionResult.language || 'en')
        .is('transcript_id', null);
      
      if (legacyDeleteError) {
        console.error('⚠️ Failed to clear existing segments (legacy):', legacyDeleteError);
      }
      
      // Auto-create characters for detected speakers (old method)
      const speakerToCharIdMap = await autoCreateCharacters(videoId, transcriptionResult.segments, supabase);
      
      // Prepare segments for database with proper text sanitization AND word timings
      const segmentsToSave = transcriptionResult.segments.map((segment: any, index: number) => {
        // Sanitize text to handle special characters and remove invalid ones
        let sanitizedText = segment.text || '';
        try {
          // Ensure proper UTF-8 encoding and remove null bytes or other invalid characters
          sanitizedText = sanitizedText
            .replace(/\0/g, '') // Remove null bytes
            .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters except common ones like newlines
            .trim();
          
          // Test if the text can be properly JSON stringified (final validation)
          JSON.stringify(sanitizedText);
        } catch (error) {
          console.warn(`Text sanitization failed for segment ${index}:`, error);
          sanitizedText = `[Text contains invalid characters - segment ${index + 1}]`;
        }
        
        // Transform provider word timings to our format: { text, startTime, endTime, confidence? }
        let words = null;
        if (segment.words && Array.isArray(segment.words) && segment.words.length > 0) {
          words = segment.words.map((w: any) => ({
            text: w.word || w.text || '',
            startTime: Number(w.start || w.startTime) || 0,
            endTime: Number(w.end || w.endTime) || 0,
            confidence: w.confidence || null
          }));
          
          if (index < 3) {
            console.log(`💾 Saving ${words.length} provider word timings for segment ${index}`);
          }
        }
        
        // ✅ CRITICAL FIX: Preserve speaker labels from AssemblyAI segments
        // Use speaker label from segment (A, B, C, etc.) to look up character
        const speakerLabel = segment.speaker || 'Unassigned';
        const characterId = speakerToCharIdMap.get(speakerLabel) || null;
        
        // Build proper speaker name for display
        const displaySpeaker = speakerLabel !== 'Unassigned' ? `Speaker ${speakerLabel}` : 'Unassigned';
        
        if (index < 5) {
          console.log(`   📍 Segment ${index}: speaker="${speakerLabel}" → display="${displaySpeaker}" charId=${characterId?.substring(0, 8)}...`);
        }
        
        return {
          video_id: videoId,
          idx: index,
          text: sanitizedText,
          start_time: Number(segment.start) || (index * 3),
          end_time: Number(segment.end) || ((index + 1) * 3),
          confidence: segment.confidence || null,
          language: transcriptionResult.language || 'en',
          segment_type: 'dialogue',
          speaker: displaySpeaker, // ✅ Use proper speaker name
          speaker_color: assignSpeakerColor(speakerLabel, transcriptionResult.segments),
          speaker_asr_label: speakerLabel, // ✅ Preserve raw ASR label (A, B, C, D)
          speaker_asr_norm: speakerLabel.toUpperCase(), // ✅ Normalized uppercase
          speaker_normalized: displaySpeaker.toLowerCase(), // ✅ Normalized display name
          emphasis: segment.emphasis || 'normal', // ✅ Use sentiment-based emphasis
          pitch: 'normal',
          is_off_camera: false,
          words: words, // Save provider word timings as JSON
          character_id: characterId, // ✅ Link to auto-created character
          emotion_metadata: segment.emotion_metadata || null, // ✅ Store sentiment data
          sentiment: segment.sentiment || null, // ✅ Top-level sentiment
          sentiment_confidence: segment.sentiment_confidence || null // ✅ Top-level confidence
        };
      });
      
      // Save in batches - clear existing segments first to avoid unique-idx conflicts
      const targetLang = transcriptionResult.language || 'en';
      const { error: delErr } = await supabase
        .from('transcript_segments_clean')
        .delete()
        .eq('video_id', videoId)
        .eq('language', targetLang);
      if (delErr) {
        console.warn('⚠️ Failed to clear existing segments before upsert:', delErr);
      }

      const BATCH_SIZE = 50;
      for (let i = 0; i < segmentsToSave.length; i += BATCH_SIZE) {
        const batch = segmentsToSave.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('transcript_segments_clean')
          .upsert(batch, { onConflict: 'video_id,language,idx' });
        if (error) {
          console.error(`Database batch ${Math.floor(i/BATCH_SIZE) + 1} error:`, error);
        } else {
          console.log(`Saved batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} segments`);
        }
      }
      
      console.log(`✅ Database save complete: ${segmentsToSave.length} segments (legacy method)`);
    }
    
  } catch (error) {
    console.error("Database save failed:", error);
  }
}

// Transcribe with Deepgram (cost-effective primary provider)
async function transcribeWithDeepgram(videoUrl: string, language?: string): Promise<any> {
  const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
  if (!DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY not configured");
  }

  const deepgramParams = new URLSearchParams({
    model: 'nova-2',
    smart_format: 'true',
    punctuate: 'true',
    paragraphs: 'true',
    utterances: 'true',
    diarize: 'true',
    diarize_version: '2023-09-19',
    language: language && language !== 'auto' ? language : 'en',
  });

  console.log("🔵 Calling Deepgram API...");
  
  const response = await fetch(
    `https://api.deepgram.com/v1/listen?${deepgramParams.toString()}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: videoUrl }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deepgram API error: ${errorText}`);
  }

  const result = await response.json();
  
  // Transform to standard format with proper speaker numbering
  const utterances = result.results?.utterances || [];

  // Log what Deepgram returned
  console.log('🔍 Deepgram utterances received:', utterances.length);
  console.log('🔍 Sample utterance:', utterances[0] ? JSON.stringify(utterances[0]).substring(0, 200) : 'none');

  // Check if we have speaker labels
  const hasSpeakerLabels = utterances.length > 0 && utterances[0].speaker !== undefined;
  console.log('🔍 Has speaker labels:', hasSpeakerLabels);

  if (!hasSpeakerLabels) {
    console.warn('⚠️ Deepgram returned utterances but no speaker labels - diarization may not be enabled');
  }

  // Build speaker mapping: Deepgram speaker ID → Sequential number
  const deepgramSpeakerIds = Array.from(new Set(utterances.map((u: any) => u.speaker ?? 0)));
  const speakerMapping = new Map<number, number>();
  deepgramSpeakerIds.sort((a, b) => a - b).forEach((id, index) => {
    speakerMapping.set(id, index + 1); // Convert 0,1,2 → 1,2,3
  });

  console.log('🎯 Speaker mapping:', Object.fromEntries(speakerMapping));
  console.log('✅ Detected', speakerMapping.size, 'unique speakers');

  const segments = utterances.map((u: any, idx: number) => {
    const deepgramSpeakerId = u.speaker ?? 0;
    const speakerNumber = speakerMapping.get(deepgramSpeakerId) || 1;
    
    return {
      idx,
      start: u.start,
      end: u.end,
      text: u.transcript,
      confidence: u.confidence || 0.95,
      speaker: `Speaker ${speakerNumber}`,
      words: u.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence
      }))
    };
  });

  return {
    text: segments.map((s: any) => s.text).join(' '),
    segments,
    language: result.results?.channels?.[0]?.detected_language || language || 'en',
    duration: result.metadata?.duration || 0,
    provider: 'deepgram'
  };
}

// Validate transcription quality - MINIMAL checks, trust provider confidence
function validateTranscriptionQuality(result: any): { isValid: boolean; reason?: string; issues?: string[] } {
  if (!result.segments || result.segments.length === 0) {
    return { isValid: false, reason: 'No segments found in transcription' };
  }
  
  // ONLY check for explicit API error responses - not content patterns
  // AssemblyAI/Deepgram return structured data, so trust their output
  
  const allText = result.segments.map((s: any) => s.text || '').join(' ');
  
  // Only fail if we detect EXPLICIT API error messages (must contain multiple keywords)
  const isAPIError = (
    // Spanish API errors (multiple conditions required)
    (allText.toLowerCase().includes('lo siento') && allText.toLowerCase().includes('no puedo') && allText.toLowerCase().includes('ayudar')) ||
    // English API errors (multiple conditions required)  
    (allText.toLowerCase().includes("i'm sorry") && allText.toLowerCase().includes("cannot") && allText.toLowerCase().includes("assist")) ||
    (allText.toLowerCase().includes("unable to process") && allText.toLowerCase().includes("request"))
  );
  
  if (isAPIError) {
    console.log("🚨 CRITICAL: API error message detected in transcription");
    return { 
      isValid: false, 
      reason: 'API refusal message detected',
      issues: ['Transcription provider returned an error message instead of transcription']
    };
  }
  
  // Check for encoding errors (20+ same character in a row)
  if (/(.)\1{20,}/.test(allText)) {
    console.log("🚨 CRITICAL: Encoding error detected (extreme repetition)");
    return { 
      isValid: false, 
      reason: 'Encoding error detected',
      issues: ['Extreme character repetition suggests encoding failure']
    };
  }
  
  console.log("✅ Transcription validation passed - provider data accepted");
  return { isValid: true };
}