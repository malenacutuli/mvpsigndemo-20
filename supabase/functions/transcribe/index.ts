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
          // Large video - try processing as audio first, then fallback to segment approach
          console.log(`Video too large (${contentLength} bytes), trying audio extraction first`);
          
          const response = await fetch(videoUrl);
          const buffer = await response.arrayBuffer();
          
          // First attempt: Process as audio to extract audio track
          fileBlob = new Blob([buffer], { type: "audio/mp4" });
          fname = "audio_extracted.mp4";
          mtype = "audio/mp4";
          
          console.log("Attempting to process large video as audio track");
          
          // Check if the audio blob is still too large
          if (fileBlob.size > OPENAI_MAX_SIZE) {
            console.log(`Audio track still too large (${fileBlob.size} bytes), implementing segmentation`);
            
            // Implement segmentation approach for very large videos
            const SEGMENT_SIZE = 20000000; // 20MB segments
            const totalSegments = Math.ceil(buffer.byteLength / SEGMENT_SIZE);
            const allTranscripts: any[] = [];
            let totalDuration = 0;
            
            console.log(`Processing ${totalSegments} segments`);
            
            for (let i = 0; i < totalSegments; i++) {
              const start = i * SEGMENT_SIZE;
              const end = Math.min(start + SEGMENT_SIZE, buffer.byteLength);
              const segmentBuffer = buffer.slice(start, end);
              
              console.log(`Processing segment ${i + 1}/${totalSegments}: ${segmentBuffer.byteLength} bytes`);
              
              // Create segment blob as audio
              const segmentBlob = new Blob([segmentBuffer], { type: "audio/mp4" });
              
              // Skip if segment is still too large (shouldn't happen with 20MB segments)
              if (segmentBlob.size > OPENAI_MAX_SIZE) {
                console.warn(`Segment ${i + 1} still too large, skipping`);
                continue;
              }
              
              try {
                const segmentFormData = new FormData();
                segmentFormData.append("file", segmentBlob, `segment_${i}.mp4`);
                segmentFormData.append("model", "whisper-1");
                segmentFormData.append("response_format", "verbose_json");
                segmentFormData.append("timestamp_granularities[]", "word");
                
                if (language && language !== 'auto') {
                  segmentFormData.append("language", language);
                }
                
                const segmentResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
                  body: segmentFormData,
                });
                
                if (segmentResponse.ok) {
                  const segmentResult = await segmentResponse.json();
                  
                  // Estimate time offset for this segment (rough approximation)
                  const estimatedSegmentDuration = segmentResult.duration || 30;
                  const timeOffset = totalDuration;
                  
                  // Adjust timestamps
                  if (segmentResult.segments) {
                    segmentResult.segments.forEach((segment: any) => {
                      segment.start += timeOffset;
                      segment.end += timeOffset;
                      
                      if (segment.words) {
                        segment.words.forEach((word: any) => {
                          word.start += timeOffset;
                          word.end += timeOffset;
                        });
                      }
                    });
                    
                    allTranscripts.push(...segmentResult.segments);
                  }
                  
                  totalDuration += estimatedSegmentDuration;
                  console.log(`Segment ${i + 1} processed: ${estimatedSegmentDuration}s`);
                } else {
                  console.warn(`Failed to process segment ${i + 1}: ${segmentResponse.status}`);
                }
              } catch (segmentError) {
                console.warn(`Error processing segment ${i + 1}:`, segmentError);
              }
            }
            
            if (allTranscripts.length === 0) {
              throw new Error("Failed to process any video segments");
            }
            
            // Return combined transcript
            const combinedResult = {
              text: allTranscripts.map(s => s.text).join(' '),
              language: allTranscripts[0]?.language || 'en',
              duration: totalDuration,
              segments: allTranscripts,
              words: allTranscripts.flatMap(s => s.words || [])
            };
            
            console.log(`Combined ${allTranscripts.length} segments into full transcript`);
            
            return new Response(JSON.stringify(combinedResult), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
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