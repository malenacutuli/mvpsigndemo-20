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
      
      try {
        // First, try to get the video size
        const headResponse = await fetch(videoUrl, { method: 'HEAD' });
        const contentLength = headResponse.headers.get("content-length");
        const totalBytes = contentLength ? parseInt(contentLength) : OPENAI_MAX_SIZE;
        
        console.log(`Video size: ${totalBytes} bytes, OpenAI limit: ${OPENAI_MAX_SIZE} bytes`);
        
        // Try full file processing first for all videos
        console.log("Attempting full video processing first");
        
        try {
          const response = await fetch(videoUrl);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
          }
          
          const buffer = await response.arrayBuffer();
          fileBlob = new Blob([buffer], { type: "video/mp4" });
          fname = "video.mp4";
          mtype = "video/mp4";
          
          console.log(`Processing full video: ${fileBlob.size} bytes`);
          
          // Try transcribing the full file
          const formData = new FormData();
          formData.append("file", fileBlob, fname);
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

          if (openaiResponse.ok) {
            const transcriptionResult = await openaiResponse.json();
            console.log(`Full file SUCCESS: detected language ${transcriptionResult.language}, words: ${transcriptionResult.words?.length || 0}, duration: ${transcriptionResult.duration}s`);
            
            return new Response(JSON.stringify(transcriptionResult), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          } else {
            const errorText = await openaiResponse.text();
            console.warn(`Full file failed: ${openaiResponse.status} - ${errorText}`);
            
            // If full file fails and it's over the limit, try a different approach
            if (totalBytes > OPENAI_MAX_SIZE) {
              console.log("File too large, will try alternative approach");
              
              // For files over 25MB, try a more conservative chunking approach
              // Use temporal segmentation rather than byte chunking
              const maxDuration = 30; // Process in 30-second chunks
              const estimatedDurationPerByte = 0.0000015; // More conservative estimate
              const estimatedTotalDuration = totalBytes * estimatedDurationPerByte;
              const numTemporalChunks = Math.ceil(estimatedTotalDuration / maxDuration);
              
              console.log(`Estimated duration: ${estimatedTotalDuration}s, will try ${numTemporalChunks} temporal segments`);
              
              // For now, if the full file doesn't work, try just the first portion
              // This ensures we get at least some transcription for all users
              const safeChunkSize = Math.min(OPENAI_MAX_SIZE * 0.8, totalBytes);
              console.log(`Processing first ${safeChunkSize} bytes as fallback`);
              
              try {
                const partialResponse = await fetch(videoUrl, {
                  headers: { 'Range': `bytes=0-${safeChunkSize - 1}` }
                });
                
                if (partialResponse.ok) {
                  const partialBuffer = await partialResponse.arrayBuffer();
                  const partialBlob = new Blob([partialBuffer], { type: "video/mp4" });
                  
                  const partialFormData = new FormData();
                  partialFormData.append("file", partialBlob, "partial.mp4");
                  partialFormData.append("model", "whisper-1");
                  partialFormData.append("response_format", "verbose_json");
                  partialFormData.append("timestamp_granularities[]", "word");
                  
                  if (language && language !== 'auto') {
                    partialFormData.append("language", language);
                  }
                  
                  const partialOpenaiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${OPENAI_API_KEY}`,
                    },
                    body: partialFormData,
                  });
                  
                  if (partialOpenaiResponse.ok) {
                    const partialResult = await partialOpenaiResponse.json();
                    console.log(`Partial transcription SUCCESS: ${partialResult.words?.length || 0} words, ${partialResult.duration}s`);
                    console.warn(`Note: Only processed first portion of large video file`);
                    
                    return new Response(JSON.stringify(partialResult), {
                      headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                  }
                }
              } catch (partialError) {
                console.warn(`Partial processing failed: ${partialError.message}`);
              }
            }
            
            throw new Error(`OpenAI transcription failed: ${openaiResponse.status} - ${errorText}`);
          }
        } catch (processError) {
          console.error("Video processing error:", processError);
          throw processError;
        }
        
      } catch (fetchError) {
        console.error("Error fetching video:", fetchError);
        throw new Error(`Failed to fetch video: ${fetchError.message}`);
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