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
        // Get the video size
        const headResponse = await fetch(videoUrl, { method: 'HEAD' });
        const contentLength = headResponse.headers.get("content-length");
        const totalBytes = contentLength ? parseInt(contentLength) : 0;
        
        console.log(`Video size: ${totalBytes} bytes, OpenAI limit: ${OPENAI_MAX_SIZE} bytes`);
        
        // If video is small enough, process it normally
        if (totalBytes <= OPENAI_MAX_SIZE) {
          console.log("Processing full video - within size limit");
          const response = await fetch(videoUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
          }
          
          const buffer = await response.arrayBuffer();
          fileBlob = new Blob([buffer], { type: "video/mp4" });
          fname = "video.mp4";
          mtype = "video/mp4";
          
        } else {
          // Video is too large - use chunking strategy
          console.log("Video too large, implementing chunking strategy");
          
          const CHUNK_SIZE = OPENAI_MAX_SIZE * 0.8; // Use 80% of limit for safety
          const numChunks = Math.ceil(totalBytes / CHUNK_SIZE);
          console.log(`Will process ${numChunks} chunks of ~${CHUNK_SIZE} bytes each`);
          
          const allSegments = [];
          const allWords = [];
          let totalDuration = 0;
          let currentTimeOffset = 0;
          
          for (let i = 0; i < numChunks; i++) {
            const startByte = i * CHUNK_SIZE;
            const endByte = Math.min(startByte + CHUNK_SIZE - 1, totalBytes - 1);
            
            console.log(`Processing chunk ${i + 1}/${numChunks}: bytes ${startByte}-${endByte}`);
            
            try {
              const chunkResponse = await fetch(videoUrl, {
                headers: { 'Range': `bytes=${startByte}-${endByte}` }
              });
              
              if (!chunkResponse.ok) {
                console.warn(`Chunk ${i + 1} failed to fetch: ${chunkResponse.status}`);
                continue;
              }
              
              const chunkBuffer = await chunkResponse.arrayBuffer();
              const chunkBlob = new Blob([chunkBuffer], { type: "video/mp4" });
              
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
                headers: {
                  Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
                body: chunkFormData,
              });
              
              if (chunkOpenaiResponse.ok) {
                const chunkResult = await chunkOpenaiResponse.json();
                console.log(`Chunk ${i + 1} SUCCESS: ${chunkResult.words?.length || 0} words, ${chunkResult.duration}s`);
                
                // Adjust timestamps for this chunk
                if (chunkResult.words) {
                  const adjustedWords = chunkResult.words.map(word => ({
                    ...word,
                    start: word.start + currentTimeOffset,
                    end: word.end + currentTimeOffset
                  }));
                  allWords.push(...adjustedWords);
                }
                
                // Add to total duration and update offset
                if (chunkResult.duration) {
                  totalDuration += chunkResult.duration;
                  currentTimeOffset = totalDuration;
                }
                
                // Store the text segment
                if (chunkResult.text) {
                  allSegments.push(chunkResult.text);
                }
                
              } else {
                const chunkError = await chunkOpenaiResponse.text();
                console.warn(`Chunk ${i + 1} transcription failed: ${chunkOpenaiResponse.status} - ${chunkError}`);
              }
              
            } catch (chunkError) {
              console.warn(`Chunk ${i + 1} processing error:`, chunkError);
            }
          }
          
          // Combine all results
          const combinedResult = {
            task: "transcribe",
            language: allWords.length > 0 ? "english" : "unknown", // Default to english, could be improved
            duration: totalDuration,
            text: allSegments.join(" "),
            words: allWords,
            usage: {
              type: "duration",
              seconds: Math.ceil(totalDuration)
            }
          };
          
          console.log(`Chunked transcription complete: ${allWords.length} total words, ${totalDuration}s total duration`);
          
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