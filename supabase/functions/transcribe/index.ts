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
    console.log("Transcribe function called - v4.0");
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
        
        // If video is small enough, process it all at once
        if (totalBytes <= OPENAI_MAX_SIZE) {
          console.log("Video fits within limit, processing entire file");
          const response = await fetch(videoUrl);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
          }
          
          const buffer = await response.arrayBuffer();
          fileBlob = new Blob([buffer], { type: "video/mp4" });
          fname = "video.mp4";
          mtype = "video/mp4";
          
          console.log(`Created blob with ${fileBlob.size} bytes for OpenAI`);
        } else {
          // For larger videos, implement chunking strategy
          console.log("Video is too large, implementing chunking strategy");
          
          const chunkSize = Math.floor(OPENAI_MAX_SIZE * 0.8); // Use 80% of limit for safety
          const numChunks = Math.ceil(totalBytes / chunkSize);
          console.log(`Will process ${numChunks} chunks of ~${chunkSize} bytes each`);
          
          let allTranscriptions = [];
          let totalDurationOffset = 0;
          
          for (let i = 0; i < Math.min(numChunks, 3); i++) { // Limit to 3 chunks to avoid timeout
            const startByte = i * chunkSize;
            const endByte = Math.min(startByte + chunkSize - 1, totalBytes - 1);
            
            console.log(`Processing chunk ${i + 1}/${Math.min(numChunks, 3)}: bytes ${startByte}-${endByte}`);
            
            const chunkResponse = await fetch(videoUrl, {
              headers: { 
                'Range': `bytes=${startByte}-${endByte}`
              }
            });
            
            if (!chunkResponse.ok) {
              console.warn(`Failed to fetch chunk ${i + 1}, skipping`);
              continue;
            }
            
            const chunkBuffer = await chunkResponse.arrayBuffer();
            const chunkBlob = new Blob([chunkBuffer], { type: "video/mp4" });
            
            // Process this chunk with OpenAI
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
              
              // Adjust timestamps based on chunk position
              if (chunkResult.words) {
                chunkResult.words = chunkResult.words.map((word: any) => ({
                  ...word,
                  start: word.start + totalDurationOffset,
                  end: word.end + totalDurationOffset
                }));
              }
              
              allTranscriptions.push(chunkResult);
              console.log(`Chunk ${i + 1} processed: ${chunkResult.words?.length || 0} words`);
              
              // Estimate duration offset for next chunk (rough approximation)
              if (chunkResult.words && chunkResult.words.length > 0) {
                const lastWord = chunkResult.words[chunkResult.words.length - 1];
                totalDurationOffset = lastWord.end;
              } else {
                // Fallback: estimate based on chunk size and video bitrate
                totalDurationOffset += 30; // Rough estimate of 30 seconds per chunk
              }
            } else {
              console.warn(`Failed to transcribe chunk ${i + 1}`);
            }
          }
          
          if (allTranscriptions.length === 0) {
            throw new Error("No chunks could be successfully transcribed");
          }
          
          // Combine all transcriptions
          const combinedResult = {
            text: allTranscriptions.map(t => t.text).join(' '),
            language: allTranscriptions[0].language,
            duration: totalDurationOffset,
            words: allTranscriptions.flatMap(t => t.words || [])
          };
          
          console.log(`Combined transcription: ${combinedResult.words.length} total words from ${allTranscriptions.length} chunks`);
          
          return new Response(JSON.stringify(combinedResult), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
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