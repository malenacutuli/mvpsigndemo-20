import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

// Efficient base64 processing in chunks
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;

  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    for (let i = 0; i < binaryChunk.length; i++) bytes[i] = binaryChunk.charCodeAt(i);
    chunks.push(bytes);
    position += chunkSize;
  }
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

serve(async (req) => {
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
    console.log("Transcribe function called - v5.0 (Enhanced for all users)");
    const { audio, mimeType, filename, videoUrl, rangeBytes, language } = await req.json();
    
    console.log("Request payload:", {
      hasAudio: !!audio,
      language: language || 'auto',
      hasVideoUrl: !!videoUrl,
      mimeType,
      filename,
      audioLength: audio?.length || 0,
      rangeBytes
    });

    if (!audio && !videoUrl) {
      return new Response(JSON.stringify({ error: "Provide 'audio' (base64) or 'videoUrl'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check OpenAI API key with debugging
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    console.log("Transcribe Function - Environment check:");
    console.log("- OPENAI_API_KEY present:", !!OPENAI_API_KEY);
    
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not found in environment");
      return new Response(JSON.stringify({ 
        error: "OPENAI_API_KEY not configured",
        debug: "Environment variable not accessible to edge function"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fileBlob: Blob;
    let fname = filename || "audio.webm";
    let mtype = mimeType || "audio/webm";

    if (videoUrl) {
      console.log("Processing video URL:", videoUrl);
      const OPENAI_MAX_SIZE = 25000000; // 25MB OpenAI Whisper limit
      const CHUNK_SIZE = 20000000; // 20MB chunks to stay safely under limit
      
      try {
        // Get video size first
        const headResponse = await fetch(videoUrl, { method: 'HEAD' });
        if (!headResponse.ok) {
          throw new Error(`Failed to get video info: ${headResponse.status}`);
        }
        
        const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
        console.log(`Video size: ${contentLength} bytes`);
        
        if (contentLength <= OPENAI_MAX_SIZE) {
          // Small video - process directly
          console.log("Video within size limit, processing directly");
          const response = await fetch(videoUrl);
          const buffer = await response.arrayBuffer();
          fileBlob = new Blob([buffer], { type: "video/mp4" });
          fname = "video.mp4";
          mtype = "video/mp4";
        } else {
          // Large video - process in chunks and combine transcripts
          console.log(`Video too large (${contentLength} bytes), processing in chunks`);
          
          const numChunks = Math.ceil(contentLength / CHUNK_SIZE);
          const allSegments: any[] = [];
          let totalDuration = 0;
          
          for (let i = 0; i < numChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE - 1, contentLength - 1);
            
            console.log(`Processing chunk ${i + 1}/${numChunks}: bytes ${start}-${end}`);
            
            // Fetch chunk with range header
            const chunkResponse = await fetch(videoUrl, {
              headers: { 'Range': `bytes=${start}-${end}` }
            });
            
            if (!chunkResponse.ok) {
              console.warn(`Failed to fetch chunk ${i + 1}, skipping`);
              continue;
            }
            
            const chunkBuffer = await chunkResponse.arrayBuffer();
            const chunkBlob = new Blob([chunkBuffer], { type: "video/mp4" });
            
            // Process chunk with OpenAI
            const chunkFormData = new FormData();
            chunkFormData.append("file", chunkBlob, `chunk_${i}.mp4`);
            chunkFormData.append("model", "whisper-1");
            chunkFormData.append("response_format", "verbose_json");
            chunkFormData.append("timestamp_granularities[]", "word");
            
            if (language && language !== 'auto') {
              chunkFormData.append("language", language);
            }
            
            const chunkOpenaiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
              method: "POST",
              headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
              body: chunkFormData,
            });
            
            if (chunkOpenaiResponse.ok) {
              const chunkResult = await chunkOpenaiResponse.json();
              
              // Adjust timestamps for this chunk
              const chunkDuration = chunkResult.duration || 30; // Estimate if not provided
              const timeOffset = totalDuration;
              
              if (chunkResult.segments) {
                chunkResult.segments.forEach((segment: any) => {
                  segment.start += timeOffset;
                  segment.end += timeOffset;
                  
                  if (segment.words) {
                    segment.words.forEach((word: any) => {
                      word.start += timeOffset;
                      word.end += timeOffset;
                    });
                  }
                });
                
                allSegments.push(...chunkResult.segments);
              }
              
              totalDuration += chunkDuration;
              console.log(`Chunk ${i + 1} processed successfully, duration: ${chunkDuration}s`);
            } else {
              console.warn(`Failed to transcribe chunk ${i + 1}`);
            }
          }
          
          // Return combined result
          const combinedResult = {
            text: allSegments.map(s => s.text).join(' '),
            language: allSegments[0]?.language || 'en',
            duration: totalDuration,
            segments: allSegments,
            words: allSegments.flatMap(s => s.words || [])
          };
          
          console.log(`Combined transcript: ${allSegments.length} segments, ${combinedResult.words.length} words`);
          
          return new Response(JSON.stringify(combinedResult), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
      } catch (fetchError) {
        console.error("Error in video processing:", fetchError);
        throw new Error(`Failed to process video: ${fetchError.message}`);
      }
    } else {
      console.log("Processing base64 audio");
      const binaryAudio = processBase64Chunks(audio);
      fileBlob = new Blob([binaryAudio], { type: mtype });
    }

    console.log(`Sending ${fileBlob.size} bytes to OpenAI Whisper API`);
    
    const formData = new FormData();
    formData.append("file", fileBlob, fname);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "word");
    
    // Add language parameter - 'auto' means automatic detection
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

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", openaiResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const transcriptionResult = await openaiResponse.json();
    console.log("Transcription successful, detected language:", transcriptionResult.language, "words:", transcriptionResult.words?.length || 0);

    return new Response(JSON.stringify(transcriptionResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Transcribe function error:", err);
    return new Response(JSON.stringify({ 
      error: "Transcription failed", 
      details: String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});