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
    
    // Ensure proper UTF-8 handling for international characters
    const decodedBody = new TextDecoder('utf-8', { fatal: false }).decode(
      new TextEncoder().encode(body)
    );
    
    const { videoUrl, videoId, language, forceReExtract, fullTranscript, wordTimestamps, rangeBytes, maxDurationMinutes } = JSON.parse(decodedBody);
    
    console.log("Request parameters:", {
      videoUrl: videoUrl ? videoUrl.substring(0, 100) + '...' : 'none',
      videoId: videoId || 'none',
      language: language || 'auto',
      forceReExtract: !!forceReExtract,
      fullTranscript: !!fullTranscript,
      wordTimestamps: !!wordTimestamps,
      rangeBytes: rangeBytes || 'default',
      maxDurationMinutes: maxDurationMinutes || 60
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

    // MEMORY OPTIMIZATION: Only download video if we need it for local processing
    let videoBuffer: ArrayBuffer | null = null;

    let transcriptionResult;

    // MEMORY-EFFICIENT PROCESSING STRATEGY
    // NEW PRIORITY ORDER: Deepgram (primary, cost-effective) → OpenAI Whisper (small videos) → Twelve Labs → AssemblyAI (last resort)
    
    // Strategy 1: For large videos (>100MB), use URL-based processing only
    if (sizeMB > 100) {
      console.log(`🚀 Large video detected (${sizeMB}MB). Using URL-based processing (Deepgram → Twelve Labs → AssemblyAI).`);
      
      // Try Deepgram first for cost-effectiveness (99% cheaper than AssemblyAI)
      const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
      if (DEEPGRAM_API_KEY) {
        try {
          console.log("Trying Deepgram for large video transcription...");
          const deepgramResult = await transcribeWithDeepgram(resolvedVideoUrl, language);
          if (deepgramResult && !deepgramResult.error) {
            console.log("✅ Deepgram analysis successful for large video!");
            transcriptionResult = deepgramResult;
          } else {
            throw new Error("Deepgram returned error or no result");
          }
        } catch (deepgramError) {
          console.log("Deepgram failed for large video, trying Twelve Labs:", deepgramError instanceof Error ? deepgramError.message : 'Unknown error');
        }
      }
      
      // Fallback to Twelve Labs if Deepgram failed or unavailable
      if (!transcriptionResult || transcriptionResult.error) {
        try {
          console.log("Trying Twelve Labs for large video transcription...");
          const twelveLabsResult = await transcribeWithTwelveLabs(resolvedVideoUrl, videoId, language);
          if (twelveLabsResult && !twelveLabsResult.error) {
            console.log("✅ Twelve Labs analysis successful for large video!");
            transcriptionResult = twelveLabsResult;
          } else {
            throw new Error("Twelve Labs returned error or no result");
          }
        } catch (twelveLabsError) {
          console.log("Twelve Labs failed for large video, falling back to AssemblyAI:", twelveLabsError instanceof Error ? twelveLabsError.message : 'Unknown error');
          
          // Last resort: AssemblyAI (expensive, only use if others fail)
          const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
          if (ASSEMBLYAI_API_KEY) {
            console.log("Using AssemblyAI as last resort fallback for large video transcription...");
            try {
              transcriptionResult = await transcribeWithAssemblyAI(resolvedVideoUrl, language, maxDurationMinutes);
              console.log("✅ AssemblyAI transcription successful!");
            } catch (assemblyError) {
              console.log("AssemblyAI failed:", (assemblyError as any).message);
              transcriptionResult = { 
                error: 'large_video_failed', 
                message: `Large video (${sizeMB}MB) processing failed. All providers (Deepgram, Twelve Labs, AssemblyAI) experienced issues. Please try again later or check video format.` 
              };
            }
          } else {
            transcriptionResult = { 
              error: 'no_large_video_support', 
              message: 'Large videos require AssemblyAI when Twelve Labs and Deepgram fail. Please add ASSEMBLYAI_API_KEY to process videos over 100MB.' 
            };
          }
        }
      }
    } else {
      // Strategy 2: For medium videos (25-100MB), try Deepgram first for cost efficiency
      if (sizeMB > 25) {
        console.log(`📹 Medium video detected (${sizeMB}MB). Trying Deepgram first for cost efficiency...`);
        
        // Try Deepgram first for 97% cost savings
        const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
        if (DEEPGRAM_API_KEY) {
          try {
            console.log("Attempting Deepgram for medium video transcription...");
            const deepgramResult = await transcribeWithDeepgram(resolvedVideoUrl, language);
            if (deepgramResult && !deepgramResult.error) {
              console.log("✅ Deepgram successful for medium video!");
              transcriptionResult = deepgramResult;
            } else {
              throw new Error("Deepgram returned error, falling back");
            }
          } catch (deepgramError) {
            console.log("⚠️ Deepgram failed for medium video, trying Twelve Labs:", deepgramError instanceof Error ? deepgramError.message : 'Unknown error');
          }
        }
        
        // Fallback to Twelve Labs if Deepgram unavailable or failed
        if (!transcriptionResult || transcriptionResult.error) {
          try {
            const twelveLabsResult = await transcribeWithTwelveLabs(resolvedVideoUrl, videoId, language);
            if (twelveLabsResult && !twelveLabsResult.error) {
              console.log("✅ Twelve Labs analysis successful!");
              transcriptionResult = twelveLabsResult;
            } else {
              throw new Error("Twelve Labs fallback");
            }
          } catch (error) {
            console.log("Twelve Labs failed, falling back to AssemblyAI:", error instanceof Error ? error.message : 'Unknown error');
            const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
            if (ASSEMBLYAI_API_KEY) {
              try {
                transcriptionResult = await transcribeWithAssemblyAI(resolvedVideoUrl, language);
                console.log("✅ AssemblyAI transcription successful!");
              } catch (assemblyError) {
                console.log("AssemblyAI failed:", (assemblyError as any).message);
                transcriptionResult = { 
                  error: 'medium_video_failed', 
                  message: 'All providers failed. Please check video format and try again.' 
                };
              }
            } else {
              transcriptionResult = { 
                error: 'no_medium_video_support', 
                message: 'Medium videos require AssemblyAI when Deepgram and Twelve Labs fail. Please add ASSEMBLYAI_API_KEY.' 
              };
            }
          }
        }
      } else {
        // Strategy 3: For small videos (≤25MB), download and try all providers
        console.log(`💾 Small video detected (${sizeMB}MB). Downloading for full processing...`);
        
        // Now we download the video since it's small enough
        console.log("Downloading video...");
        const videoResponse = await fetch(resolvedVideoUrl);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.status}`);
        }
        videoBuffer = await videoResponse.arrayBuffer();
        console.log(`Downloaded ${Math.round(videoBuffer.byteLength / 1024 / 1024)}MB video`);
        
        // Try Twelve Labs first
        try {
          const twelveLabsResult = await transcribeWithTwelveLabs(resolvedVideoUrl, videoId, language);
          if (twelveLabsResult && !twelveLabsResult.error) {
            console.log("✅ Twelve Labs analysis successful!");
            transcriptionResult = twelveLabsResult;
          } else {
            throw new Error("Twelve Labs fallback");
          }
        } catch (error) {
          console.log("Twelve Labs failed, trying AssemblyAI:", error instanceof Error ? error.message : 'Unknown error');
          
          // Try AssemblyAI
          const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
          if (ASSEMBLYAI_API_KEY) {
            try {
              transcriptionResult = await transcribeWithAssemblyAI(resolvedVideoUrl, language);
              console.log("✅ AssemblyAI transcription successful!");
            } catch (assemblyError) {
              console.log("AssemblyAI failed, trying OpenAI:", (assemblyError as any).message);
              
              // Final fallback to OpenAI
              if (videoBuffer) {
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
                  message: 'All transcription providers failed and video buffer not available.' 
                };
              }
            }
          } else {
            // No AssemblyAI, try OpenAI directly
            if (videoBuffer) {
              try {
                transcriptionResult = await transcribeBuffer(videoBuffer, OPENAI_API_KEY, language);
                console.log("✅ OpenAI direct processing successful!");
              } catch (openaiError) {
                console.log("OpenAI failed:", (openaiError as any).message);
                transcriptionResult = { 
                  error: 'openai_only_failed', 
                  message: 'OpenAI failed and no AssemblyAI key configured. Please add ASSEMBLYAI_API_KEY for better reliability.' 
                };
              }
            } else {
              transcriptionResult = { 
                error: 'no_video_buffer', 
                message: 'Video buffer not available and no AssemblyAI key configured.' 
              };
            }
          }
        }
      }
    }

    // POST-PROCESSING VALIDATION
    if (transcriptionResult && transcriptionResult.segments) {
      console.log("🔍 Validating transcription quality...");
      
      // Check for gibberish patterns and suspicious content
      const validationResult = validateTranscriptionQuality(transcriptionResult);
      if (!validationResult.isValid) {
        console.log("❌ Transcription validation failed:", validationResult.reason);
        transcriptionResult = {
          error: 'invalid_transcription',
          message: `Transcription quality check failed: ${validationResult.reason}. This may indicate issues with audio quality, video format, or API processing. Please try with a different video or check audio clarity.`,
          details: validationResult.issues
        };
      } else {
        console.log("✅ Transcription validation passed");
      }
    }

    // TRACK USAGE for successful transcriptions
    if (transcriptionResult && transcriptionResult.segments && videoId) {
      try {
        const authHeader = req.headers.get("authorization");
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
async function transcribeWithAssemblyAI(audioUrl: string, language?: string, maxDurationMinutes?: number): Promise<any> {
  console.log("Using AssemblyAI transcription (URL-based)...", { audioUrl, maxDurationMinutes });

  const apiKey = Deno.env.get("ASSEMBLYAI_API_KEY");
  if (!apiKey) {
    throw new Error("ASSEMBLYAI_API_KEY not configured");
  }

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
    // enable_word_timestamps: true // (AssemblyAI words are included by default when available)
  };
  if (languageCode) {
    body.language_code = languageCode;
  } else {
    body.language_detection = true;
  }

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

  // Build segments from utterances when available
  const segments: any[] = [];
  const maxDurationSeconds = (maxDurationMinutes || 60) * 60; // Default to 60 minutes
  
  if (Array.isArray(resultData.utterances) && resultData.utterances.length > 0) {
    for (const u of resultData.utterances) {
      const startTime = (u.start || 0) / 1000;
      const endTime = (u.end || 0) / 1000;
      
      // Skip segments that start after the max duration
      if (startTime > maxDurationSeconds) {
        console.log(`⏭️ Skipping segment starting at ${startTime}s (exceeds ${maxDurationSeconds}s limit)`);
        continue;
      }
      
      segments.push({
        text: u.text,
        start: startTime,
        end: Math.min(endTime, maxDurationSeconds), // Cap end time to max duration
        words: (u.words || []).map((w: any) => ({
          start: (w.start || 0) / 1000,
          end: Math.min((w.end || 0) / 1000, maxDurationSeconds),
          word: w.text ?? w.word,
          confidence: w.confidence,
        })).filter((w: any) => w.start <= maxDurationSeconds), // Filter words within limit
        speaker: u.speaker || undefined,
      });
    }
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
  
  // Validate transcription quality and detect refusal/error responses
  const suspiciousPatterns = [
    /lo siento.*no puedo.*ayudar/i,
    /i.*sorry.*can.*t.*help/i,
    /cannot.*transcribe/i,
    /unable.*to.*process/i,
    /error.*processing/i,
    /^(i'm sorry|lo siento)/i
  ];
  
  const isSuspiciousResponse = suspiciousPatterns.some(pattern => pattern.test(fullText));
  
  if (isSuspiciousResponse || fullText.length < 10) {
    console.warn("⚠️ Detected suspicious or low-quality transcription response:", fullText);
    throw new Error(`Transcription quality issue: The audio may be unclear, contain unsupported content, or have technical issues. Response: "${fullText.substring(0, 100)}..."`);
  }
  
  console.log("✅ AssemblyAI transcription validated successfully!");
  
  return {
    text: fullText,
    segments,
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
    
    // Prepare segments for database with proper text sanitization
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
      
      return {
        video_id: videoId,
        text: sanitizedText,
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
      };
    });
    
    // Save in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < segmentsToSave.length; i += BATCH_SIZE) {
      const batch = segmentsToSave.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('transcript_segments')
        .insert(batch);
        
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
  
  // Transform to standard format
  const utterances = result.results?.utterances || [];
  const segments = utterances.map((u: any, idx: number) => ({
    idx,
    start: u.start,
    end: u.end,
    text: u.transcript,
    confidence: u.confidence || 0.95,
    speaker: `Speaker ${u.speaker || 0}`,
    words: u.words?.map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence
    }))
  }));

  return {
    text: segments.map((s: any) => s.text).join(' '),
    segments,
    language: result.results?.channels?.[0]?.detected_language || language || 'en',
    duration: result.metadata?.duration || 0,
    provider: 'deepgram'
  };
}

// Validate transcription quality to detect gibberish and low-quality outputs
function validateTranscriptionQuality(result: any): { isValid: boolean; reason?: string; issues?: string[] } {
  const issues: string[] = [];
  
  if (!result.segments || result.segments.length === 0) {
    return { isValid: false, reason: 'No segments found in transcription' };
  }
  
  // Check for gibberish patterns
  for (const segment of result.segments) {
    const text = segment.text || '';
    
    // Check for repetitive characters (like "Qaaaaaaa...")
    const repetitivePattern = /(.)\1{10,}/; // Same character repeated 11+ times
    if (repetitivePattern.test(text)) {
      issues.push(`Repetitive character pattern detected: "${text.substring(0, 50)}..."`);
    }
    
    // Check for extremely low character diversity
    const uniqueChars = new Set(text.replace(/\s+/g, '').toLowerCase()).size;
    const totalChars = text.replace(/\s+/g, '').length;
    if (totalChars > 20 && uniqueChars < 3) {
      issues.push(`Very low character diversity: ${uniqueChars} unique chars in ${totalChars} characters`);
    }
    
    // Check for nonsensical word patterns
    const words = text.split(/\s+/).filter((w: string) => w.length > 0);
    if (words.length > 5) {
      const shortWords = words.filter((w: string) => w.length < 3).length;
      const longRepetitiveWords = words.filter((w: string) => w.length > 8 && /(.{2,})\1{2,}/.test(w)).length;
      
      if (shortWords / words.length > 0.8) {
        issues.push(`Too many very short words (${shortWords}/${words.length})`);
      }
      if (longRepetitiveWords > 0) {
        issues.push(`Repetitive word patterns detected`);
      }
    }
    
    // Check for Spanish refusal patterns (from previous fix)
    const spanishRefusalPatterns = [
      /lo siento.*no puedo.*ayudar/i,
      /sorry.*cannot.*help/i,
      /i cannot.*assist/i,
      /no puedo.*proporcionar/i
    ];
    
    if (spanishRefusalPatterns.some(pattern => pattern.test(text))) {
      issues.push(`API refusal message detected instead of transcription: "${text}"`);
    }
  }
  
  // If we found significant issues, mark as invalid
  if (issues.length > 0) {
    console.log("🚨 Transcription quality issues detected:", issues);
    return { 
      isValid: false, 
      reason: `${issues.length} quality issue${issues.length > 1 ? 's' : ''} detected`, 
      issues 
    };
  }
  
  return { isValid: true };
}