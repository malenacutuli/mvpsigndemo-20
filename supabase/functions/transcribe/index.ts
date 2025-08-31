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
          // For larger videos, try processing the entire file anyway
          // OpenAI sometimes accepts files slightly larger than the documented limit
          console.log("Video exceeds limit, attempting full file processing anyway");
          
          try {
            const response = await fetch(videoUrl);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
            }
            
            const buffer = await response.arrayBuffer();
            fileBlob = new Blob([buffer], { type: "video/mp4" });
            fname = "video.mp4";
            mtype = "video/mp4";
            
            console.log(`Created blob with ${fileBlob.size} bytes for OpenAI (exceeds limit)`);
            
            // Try with the full file first
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
              console.log("Full file transcription successful, detected language:", transcriptionResult.language, "words:", transcriptionResult.words?.length || 0);
              
              return new Response(JSON.stringify(transcriptionResult), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            } else {
              // If full file fails, fall back to improved chunking strategy for complete transcription
              console.log("Full file failed, implementing unlimited chunking strategy for full video");
              
              const chunkSize = Math.floor(OPENAI_MAX_SIZE * 0.8); // Use 80% of limit for safety
              const numChunks = Math.ceil(totalBytes / chunkSize);
              console.log(`Will process ALL ${numChunks} chunks of ~${chunkSize} bytes each to transcribe complete video`);
              
              let allTranscriptions = [];
              let combinedText = "";
              let allWords = [];
              let totalProcessedDuration = 0;
              
              // Process ALL chunks, not just first 5
              for (let i = 0; i < numChunks; i++) {
                const startByte = i * chunkSize;
                const endByte = Math.min(startByte + chunkSize - 1, totalBytes - 1);
                
                console.log(`Processing chunk ${i + 1}/${numChunks}: bytes ${startByte}-${endByte}`);
                
                try {
                  const chunkResponse = await fetch(videoUrl, {
                    headers: { 
                      'Range': `bytes=${startByte}-${endByte}`
                    }
                  });
                  
                  if (!chunkResponse.ok) {
                    console.warn(`Failed to fetch chunk ${i + 1}: ${chunkResponse.status}, trying next chunk`);
                    continue;
                  }
                  
                  const chunkBuffer = await chunkResponse.arrayBuffer();
                  
                  // Skip chunks that are too small (likely incomplete)
                  if (chunkBuffer.byteLength < 50000) { // 50KB minimum
                    console.warn(`Chunk ${i + 1} too small (${chunkBuffer.byteLength} bytes), skipping`);
                    continue;
                  }
                  
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
                    
                    if (chunkResult.text && chunkResult.text.trim()) {
                      // Calculate time offset based on chunk duration
                      const chunkDuration = chunkResult.duration || 0;
                      const timeOffset = totalProcessedDuration;
                      
                      // Adjust timestamps if words exist
                      if (chunkResult.words && Array.isArray(chunkResult.words)) {
                        const adjustedWords = chunkResult.words.map((word: any) => ({
                          ...word,
                          start: word.start + timeOffset,
                          end: word.end + timeOffset
                        }));
                        allWords.push(...adjustedWords);
                      }
                      
                      combinedText += (combinedText ? " " : "") + chunkResult.text.trim();
                      allTranscriptions.push(chunkResult);
                      totalProcessedDuration += chunkDuration;
                      
                      console.log(`Chunk ${i + 1}/${numChunks} processed successfully: "${chunkResult.text.substring(0, 50)}..." (duration: ${chunkDuration}s)`);
                    } else {
                      console.warn(`Chunk ${i + 1} returned empty text`);
                    }
                  } else {
                    const errorText = await chunkOpenaiResponse.text();
                    console.warn(`Failed to transcribe chunk ${i + 1}: ${chunkOpenaiResponse.status} - ${errorText}`);
                    
                    // Don't give up on failed chunks, continue with next
                    continue;
                  }
                } catch (chunkError) {
                  console.warn(`Error processing chunk ${i + 1}: ${chunkError.message}`);
                  continue;
                }
                
                // Add small delay between chunks to avoid rate limiting
                if (i < numChunks - 1) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }
              
              if (allTranscriptions.length === 0) {
                throw new Error("No chunks could be successfully transcribed. Video may be corrupted or in an unsupported format.");
              }
              
              // Combine all transcriptions
              const combinedResult = {
                text: combinedText,
                language: allTranscriptions[0].language || 'en',
                duration: totalProcessedDuration || (allWords.length > 0 ? Math.max(...allWords.map(w => w.end)) : 0),
                words: allWords
              };
              
              console.log(`COMPLETE VIDEO TRANSCRIPTION: ${combinedResult.words.length} total words from ${allTranscriptions.length}/${numChunks} chunks`);
              console.log(`Total text length: ${combinedResult.text.length} characters, total duration: ${combinedResult.duration}s`);
              
              return new Response(JSON.stringify(combinedResult), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            
          } catch (processError) {
            console.error("Error in large video processing:", processError);
            throw new Error(`Failed to process large video: ${processError.message}`);
          }
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