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

    // Get video size first to determine processing strategy
    const headResponse = await fetch(resolvedVideoUrl, { method: 'HEAD' });
    const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
    const sizeMB = Math.round(contentLength / 1024 / 1024);
    const contentType = headResponse.headers.get('content-type') || '';
    console.log(`Video size: ${sizeMB}MB, content-type: ${contentType}`);

    let transcriptionResult;

    // For large videos (>100MB), skip downloading and use direct URL processing to avoid memory issues
    if (contentLength > 100 * 1024 * 1024) {
      console.log(`Large video detected (${sizeMB}MB), using direct URL processing to avoid memory issues...`);
      
      // Skip Twelve Labs for large videos and go directly to AssemblyAI
      const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
      if (ASSEMBLYAI_API_KEY) {
        console.log(`Using AssemblyAI direct URL processing for ${sizeMB}MB video...`);
        try {
          transcriptionResult = await transcribeWithAssemblyAI(resolvedVideoUrl, language);
          console.log("✅ AssemblyAI direct URL processing successful!");
        } catch (assemblyError) {
          console.log("AssemblyAI failed:", (assemblyError as any).message);
          transcriptionResult = { error: 'large_video_failed', message: `Large video processing failed: ${(assemblyError as any).message}` };
        }
      } else {
        transcriptionResult = { error: 'no_assemblyai_key', message: 'AssemblyAI API key required for large videos to avoid memory issues.' };
      }
    } else {
      // For smaller videos, download and try comprehensive analysis
      console.log("Downloading video...");
      const videoResponse = await fetch(resolvedVideoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.status}`);
      }
      
      const videoBuffer = await videoResponse.arrayBuffer();
      console.log(`Downloaded ${Math.round(videoBuffer.byteLength / 1024 / 1024)}MB video`);

      // Strategy 1: Try Twelve Labs for comprehensive analysis (best quality)
      console.log("Attempting Twelve Labs analysis first...");
      try {
        const twelveLabsResult = await transcribeWithTwelveLabs(resolvedVideoUrl, videoId, language);
        if (twelveLabsResult && !twelveLabsResult.error) {
          console.log("✅ Twelve Labs analysis successful!");
          transcriptionResult = twelveLabsResult;
        } else {
          console.log("Twelve Labs failed, falling back to AssemblyAI:", twelveLabsResult?.error);
          throw new Error("Twelve Labs fallback");
        }
      } catch (error) {
        console.log("Twelve Labs failed, falling back to AssemblyAI:", error.message);
        
        // Fallback to AssemblyAI for all file sizes
        const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
        if (ASSEMBLYAI_API_KEY) {
          console.log(`Using AssemblyAI for transcription (${sizeMB}MB video)...`);
          try {
            transcriptionResult = await transcribeWithAssemblyAI(resolvedVideoUrl, language);
            console.log("✅ AssemblyAI transcription successful!");
          } catch (assemblyError) {
            console.log("AssemblyAI failed:", (assemblyError as any).message);
            // Final fallback to OpenAI for small files only
            if (sizeMB <= 23) {
              console.log("Trying OpenAI as final fallback...");
              try {
                transcriptionResult = await transcribeBuffer(videoBuffer, OPENAI_API_KEY, language);
                console.log("✅ OpenAI direct processing successful!");
              } catch (openaiError) {
                console.log("OpenAI also failed:", (openaiError as any).message);
                transcriptionResult = { error: 'all_providers_failed', message: 'All transcription providers failed. Please check video format and API keys.' };
              }
            } else {
              transcriptionResult = { error: 'assembly_failed', message: 'AssemblyAI failed for large video. Please verify API key and video accessibility.' };
            }
          }
        } else {
          console.log("No AssemblyAI key configured, trying OpenAI for small files...");
          if (sizeMB <= 23) {
            try {
              transcriptionResult = await transcribeBuffer(videoBuffer, OPENAI_API_KEY, language);
              console.log("✅ OpenAI direct processing successful!");
            } catch (openaiError) {
              console.log("OpenAI failed:", (openaiError as any).message);
              transcriptionResult = { error: 'openai_failed', message: 'OpenAI failed and no AssemblyAI key configured. Please add ASSEMBLYAI_API_KEY for large files.' };
            }
          } else {
            transcriptionResult = { error: 'no_provider', message: 'No suitable provider for large video. Please configure ASSEMBLYAI_API_KEY.' };
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
    word_boost: [],
    auto_highlights: false
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

  console.log(`✅ AssemblyAI transcription completed. Utterances: ${resultData.utterances?.length || 0}, Words: ${resultData.words?.length || 0}`);

  // Helper: Parse SRT into timestamped segments
  const parseSRT = (srt: string) => {
    const lines = srt.split(/\r?\n/);
    const segs: any[] = [];
    let i = 0;
    const toSeconds = (h: string, m: string, s: string, ms: string) => (
      Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000
    );
    while (i < lines.length) {
      // index line
      while (i < lines.length && !lines[i].trim()) i++;
      if (i >= lines.length) break;
      i++; // skip index
      if (i >= lines.length) break;
      const timeLine = lines[i++].trim();
      const match = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      if (!match) continue;
      const start = toSeconds(match[1], match[2], match[3], match[4]);
      const end = toSeconds(match[5], match[6], match[7], match[8]);
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i++]);
      }
      while (i < lines.length && lines[i].trim() === '') i++;
      const text = textLines.join(' ').trim();
      if (text) segs.push({ text, start, end, words: [] });
    }
    return segs;
  };

  // Build segments from utterances when available
  let segments: any[] = [];
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

  // Fallback: if we still have 0/1 coarse segment or missing timings, try SRT export
  if ((segments.length <= 1 || segments.some(s => !s.start && !s.end)) && transcriptId) {
    try {
      console.log("Attempting SRT fallback for detailed timestamps...");
      const srtRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}/srt?chars_per_caption=48`, {
        headers: { authorization: apiKey },
      });
      if (srtRes.ok) {
        const srtText = await srtRes.text();
        const srtSegments = parseSRT(srtText);
        if (Array.isArray(srtSegments) && srtSegments.length > 0) {
          segments = srtSegments;
          console.log(`✅ SRT fallback produced ${segments.length} segments`);
        } else {
          console.log("SRT parsed but yielded no segments");
        }
      } else {
        console.warn("SRT request failed:", srtRes.status, await srtRes.text());
      }
    } catch (e: any) {
      console.warn("SRT fallback error:", e?.message || String(e));
    }
  }

  const fullText = (resultData.text as string) || segments.map((s) => s.text).join(" ");
  return {
    text: fullText,
    segments,
    language: languageCode || resultData.language_code || "en",
    words: segments.flatMap((s: any) => s.words || []),
  };

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

// Save transcript to database with improved error handling
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
    
    // Clear existing segments first (delete before insert to avoid constraint issues)
    const { error: deleteError } = await supabase
      .from('transcript_segments')
      .delete()
      .eq('video_id', videoId)
      .eq('language', transcriptionResult.language || 'en');
      
    if (deleteError) {
      console.warn("Delete existing segments warning:", deleteError);
    }
    
    // Prepare segments with proper indexing
    const segmentsToSave = transcriptionResult.segments.map((segment: any, index: number) => ({
      video_id: videoId,
      idx: index,
      text: segment.text || '',
      start_time: Number(segment.start) || (index * 3),
      end_time: Number(segment.end) || ((index + 1) * 3),
      confidence: segment.confidence || 0.95,
      language: transcriptionResult.language || 'en',
      segment_type: 'dialogue',
      speaker: segment.speaker || `Speaker ${(index % 3) + 1}`,
      speaker_color: segment.speakerColor || '#3B82F6',
      emphasis: 'normal',
      pitch: 'normal',
      is_off_camera: false,
      words: segment.words || null
    }));
    
    // Save in smaller batches to avoid memory issues
    const BATCH_SIZE = 25;
    let successCount = 0;
    
    for (let i = 0; i < segmentsToSave.length; i += BATCH_SIZE) {
      const batch = segmentsToSave.slice(i, i + BATCH_SIZE);
      
      try {
        const { error } = await supabase
          .from('transcript_segments')
          .insert(batch);
          
        if (error) {
          console.error(`Database batch ${Math.floor(i/BATCH_SIZE) + 1} error:`, error);
        } else {
          console.log(`✅ Batch ${Math.floor(i/BATCH_SIZE) + 1} saved successfully`);
          successCount += batch.length;
        }
      } catch (batchError) {
        console.error(`Batch ${Math.floor(i/BATCH_SIZE) + 1} processing error:`, batchError);
      }
    }
    
    console.log(`✅ Database save complete: ${successCount} segments`);
    
  } catch (error) {
    console.error("Database save failed:", error);
  }
}