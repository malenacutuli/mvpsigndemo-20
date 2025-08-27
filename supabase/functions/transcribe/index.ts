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
    console.log("Transcribe function called - v3.0");
    const { audio, mimeType, filename, videoUrl, rangeBytes } = await req.json();
    
    console.log("Request payload:", {
      hasAudio: !!audio,
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
      const maxBytes = rangeBytes || 50000000; // 50MB default - increased for better transcription
      
      try {
        // First, try to get the video size
        const headResponse = await fetch(videoUrl, { method: 'HEAD' });
        const contentLength = headResponse.headers.get("content-length");
        const totalBytes = contentLength ? parseInt(contentLength) : maxBytes;
        
        console.log(`Video size: ${totalBytes} bytes, fetching up to ${Math.min(maxBytes, totalBytes)} bytes`);
        
        let response;
        const bytesToFetch = Math.min(maxBytes, totalBytes);
        
        // Try range request first, fallback to regular fetch
        try {
          response = await fetch(videoUrl, {
            headers: { 
              'Range': `bytes=0-${bytesToFetch - 1}` // Range is inclusive, so subtract 1
            }
          });
          
          // If range request doesn't work (status 416 or other), try regular fetch
          if (!response.ok && response.status !== 206) {
            console.log("Range request failed, trying regular fetch");
            response = await fetch(videoUrl);
          }
        } catch (rangeError) {
          console.log("Range request error, falling back to regular fetch:", rangeError);
          response = await fetch(videoUrl);
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
        }
        
        console.log("Successfully fetched video, reading content...");
        const buffer = await response.arrayBuffer();
        
        // Limit the buffer size if it's too large
        const limitedBuffer = buffer.byteLength > maxBytes 
          ? buffer.slice(0, maxBytes) 
          : buffer;
          
        fileBlob = new Blob([limitedBuffer], { type: "video/mp4" });
        fname = "video.mp4";
        mtype = "video/mp4";
        
        console.log(`Created blob with ${fileBlob.size} bytes`);
        
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
    console.log("Transcription successful, words:", transcriptionResult.words?.length || 0);

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