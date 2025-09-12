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
    const contentType = headResponse.headers.get('content-type') || '';
    console.log(`Video size: ${sizeMB}MB, content-type: ${contentType}`);

    // Download video
    console.log("Downloading video...");
    const videoResponse = await fetch(resolvedVideoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }
    
    const videoBuffer = await videoResponse.arrayBuffer();
    console.log(`Downloaded ${Math.round(videoBuffer.byteLength / 1024 / 1024)}MB video`);

    let transcriptionResult;

    // Strategy 1: Try Twelve Labs for comprehensive analysis (best quality)
    console.log("Attempting Twelve Labs analysis first...");
    try {
      const twelveLabsResult = await transcribeWithTwelveLabs(resolvedVideoUrl, videoId, language);
      if (twelveLabsResult && !twelveLabsResult.error) {
        console.log("✅ Twelve Labs analysis successful!");
        transcriptionResult = twelveLabsResult;
      } else {
        console.log("Twelve Labs failed, falling back to OpenAI:", twelveLabsResult?.error);
        throw new Error("Twelve Labs fallback");
      }
    } catch (error) {
      console.log("Twelve Labs failed, falling back:", error.message);
      
      const hasAssembly = !!Deno.env.get("ASSEMBLYAI_API_KEY");
      if (sizeMB <= 23) {
        console.log("Video under 23MB - processing with OpenAI directly...");
        try {
          transcriptionResult = await transcribeBuffer(videoBuffer, OPENAI_API_KEY, language);
          console.log("✅ OpenAI direct processing successful!");
        } catch (openaiError) {
          console.log("OpenAI direct failed:", (openaiError as any).message);
          if (hasAssembly) {
            try {
              console.log("Using AssemblyAI fallback...");
              transcriptionResult = await transcribeWithAssemblyAI(resolvedVideoUrl, language);
            } catch (aaie) {
              if (contentType.startsWith('audio/')) {
                console.log("AssemblyAI fallback failed, trying chunked OpenAI:", (aaie as any).message);
                transcriptionResult = await transcribeWithChunking(videoBuffer, OPENAI_API_KEY, language);
              } else {
                console.log("AssemblyAI fallback failed and content is video; skipping chunked processing.");
                transcriptionResult = { error: 'assembly_required', message: 'Video transcription failed. For video content, please configure ASSEMBLYAI_API_KEY or use a smaller audio-only file under 23MB.' };
              }
            }
          } else {
            if (contentType.startsWith('audio/')) {
              console.log("AssemblyAI key not set; trying chunked OpenAI for audio...");
              transcriptionResult = await transcribeWithChunking(videoBuffer, OPENAI_API_KEY, language);
            } else {
              console.log("AssemblyAI key not set and content is video; skipping chunked processing.");
              transcriptionResult = { error: 'assembly_required', message: 'Large or unsupported video for Whisper. Please add ASSEMBLYAI_API_KEY in Supabase or upload an audio-only file under 23MB.' };
            }
          }
        }
      } else {
        if (hasAssembly) {
          console.log(`Large video (${sizeMB}MB) - using AssemblyAI processing...`);
          try {
            transcriptionResult = await transcribeWithAssemblyAI(resolvedVideoUrl, language);
          } catch (aaie) {
            if (contentType.startsWith('audio/')) {
              console.log("AssemblyAI failed, falling back to chunked OpenAI:", (aaie as any).message);
              transcriptionResult = await transcribeWithChunking(videoBuffer, OPENAI_API_KEY, language);
            } else {
              console.log(`AssemblyAI failed and content is video; skipping chunked processing to avoid decoding errors.`);
              transcriptionResult = { error: 'assembly_required', message: 'Large video files require ASSEMBLYAI_API_KEY configured in Supabase or reducing file size under 23MB.' };
            }
          }
        } else {
          if (contentType.startsWith('audio/')) {
            console.log(`Large audio file (${sizeMB}MB) - AssemblyAI key missing; using chunked OpenAI processing...`);
            transcriptionResult = await transcribeWithChunking(videoBuffer, OPENAI_API_KEY, language);
          } else {
            console.log(`Large video file (${sizeMB}MB) without AssemblyAI key - aborting chunked processing to avoid decode errors.`);
            transcriptionResult = { error: 'assembly_required', message: 'Please add ASSEMBLYAI_API_KEY in Supabase Edge Function secrets to process large video files, or upload an audio-only file under 23MB.' };
          }
        }
      }
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
      console.error(`Chunk ${i + 1} failed:`, chunkError.message);
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
async function transcribeWithAssemblyAI(audioUrl: string, language?: string): Promise<any> {
  console.log("Using AssemblyAI transcription (URL-based)...", { audioUrl });

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
  if (Array.isArray(resultData.utterances) && resultData.utterances.length > 0) {
    for (const u of resultData.utterances) {
      segments.push({
        text: u.text,
        start: (u.start || 0) / 1000,
        end: (u.end || 0) / 1000,
        words: (u.words || []).map((w: any) => ({
          start: (w.start || 0) / 1000,
          end: (w.end || 0) / 1000,
          word: w.text ?? w.word,
          confidence: w.confidence,
        })),
        speaker: u.speaker || undefined,
      });
    }
  } else if (Array.isArray(resultData.words) && resultData.words.length > 0) {
    // Group words into ~5s sentences
    let current: any = { text: "", start: null as number | null, end: null as number | null, words: [] as any[] };
    for (const w of resultData.words) {
      const ws = (w.start || 0) / 1000;
      const we = (w.end || 0) / 1000;
      if (current.start === null) current.start = ws;
      current.end = we;
      current.text += (w.text ?? w.word ?? "") + " ";
      current.words.push({ start: ws, end: we, word: w.text ?? w.word, confidence: w.confidence });
      if ((current.end - current.start) >= 5 || /[.?!]$/.test(current.text.trim())) {
        segments.push({ text: current.text.trim(), start: current.start, end: current.end, words: current.words });
        current = { text: "", start: null, end: null, words: [] };
      }
    }
    if (current.start !== null) {
      segments.push({ text: current.text.trim(), start: current.start, end: current.end, words: current.words });
    }
  } else {
    segments.push({ text: resultData.text || "", start: 0, end: (resultData.audio_duration || resultData.duration || 0) });
  }

  const fullText = (resultData.text as string) || segments.map((s) => s.text).join(" ");
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
    return { error: error.message };
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