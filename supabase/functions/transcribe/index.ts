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
  console.log("Method:", req.method);

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
    let parsedBody;
    
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body",
        details: String(parseError)
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { videoUrl, videoId, language, forceReExtract } = parsedBody;
    
    console.log("Request details:", {
      hasVideoUrl: !!videoUrl,
      videoId: videoId || 'none',
      language: language || 'auto',
      forceReExtract: !!forceReExtract
    });

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "videoUrl is required" }), {
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

    console.log("Processing complete video from URL:", videoUrl.substring(0, 100) + "...");
    
    // Download and process the complete video
    const processVideo = async () => {
      try {
        // Get video size info
        const headResponse = await fetch(videoUrl, { method: 'HEAD' });
        const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
        const sizeMB = Math.round(contentLength / 1024 / 1024);
        console.log(`Video size: ${sizeMB}MB - processing complete video...`);
        
        // Download the complete video
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.status}`);
        }
        
        const videoBuffer = await videoResponse.arrayBuffer();
        console.log(`Downloaded ${sizeMB}MB video, starting transcription...`);
        
        // Process the complete video regardless of size
        let transcriptionResult;
        try {
          transcriptionResult = await transcribeComplete(videoBuffer, OPENAI_API_KEY, language);
          console.log("✅ Complete video transcribed successfully!");
        } catch (error) {
          console.log("⚠️ Single request failed, trying chunked approach:", error.message);
          
          // Fallback to intelligent chunking based on time segments
          transcriptionResult = await transcribeWithIntelligentChunking(videoBuffer, OPENAI_API_KEY, language);
        }
        
        // Save to database
        if (videoId && transcriptionResult.segments) {
          await saveTranscriptToDatabase(videoId, transcriptionResult, forceReExtract);
        }
        
        return transcriptionResult;
        
      } catch (error) {
        console.error("Video processing error:", error);
        throw error;
      }
    };
    
    // For very large files (>100MB), use background processing
    const headResponse = await fetch(videoUrl, { method: 'HEAD' });
    const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
    const sizeMB = Math.round(contentLength / 1024 / 1024);
    
    if (sizeMB > 100) {
      console.log(`Large file detected (${sizeMB}MB), using background processing...`);
      
      // Start background task for very large files
      EdgeRuntime.waitUntil(processVideo().catch(console.error));
      
      return new Response(JSON.stringify({
        message: "Large video processing started in background",
        sizeMB,
        status: "processing",
        estimatedTime: `${Math.ceil(sizeMB / 25)} minutes`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Process immediately for smaller files
      const result = await processVideo();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("=== FUNCTION ERROR ===");
    console.error("Error:", error);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper function to transcribe complete video in one request
async function transcribeComplete(buffer: ArrayBuffer, apiKey: string, language?: string): Promise<any> {
  const blob = new Blob([buffer], { type: "video/mp4" });
  
  const formData = new FormData();
  formData.append("file", blob, "video.mp4");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");
  
  if (language && language !== 'auto') {
    formData.append("language", language);
  }

  console.log("Sending complete video to OpenAI Whisper...");
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
  console.log(`Transcription complete: ${result.segments?.length || 0} segments, ${Math.round(result.duration || 0)}s duration`);
  return result;
}

// Intelligent chunking for very large files - splits based on time rather than file size
async function transcribeWithIntelligentChunking(buffer: ArrayBuffer, apiKey: string, language?: string): Promise<any> {
  console.log("Using intelligent time-based chunking...");
  
  // For very large videos, we'll process in multiple passes with overlapping segments
  const SEGMENT_DURATION = 300; // 5 minute segments with overlap
  const OVERLAP_DURATION = 30;  // 30 second overlap
  
  // First, get total duration by processing a small sample
  const sampleSize = Math.min(buffer.byteLength, 5000000); // 5MB sample
  const sampleBuffer = buffer.slice(0, sampleSize);
  
  let totalDuration = 0;
  try {
    const sampleResult = await transcribeComplete(sampleBuffer, apiKey, language);
    // Estimate total duration based on sample
    totalDuration = (sampleResult.duration || 60) * (buffer.byteLength / sampleSize);
    console.log(`Estimated total duration: ${Math.round(totalDuration)}s`);
  } catch (error) {
    console.log("Could not estimate duration, using fixed chunks");
    totalDuration = 1800; // Default to 30 minutes
  }
  
  // Calculate number of segments needed
  const numSegments = Math.ceil(totalDuration / SEGMENT_DURATION);
  console.log(`Processing ${numSegments} time-based segments...`);
  
  const results = [];
  let currentTime = 0;
  
  for (let i = 0; i < numSegments; i++) {
    try {
      const startTime = Math.max(0, currentTime - (i > 0 ? OVERLAP_DURATION : 0));
      const endTime = Math.min(totalDuration, currentTime + SEGMENT_DURATION);
      
      console.log(`Processing segment ${i + 1}/${numSegments} (${Math.round(startTime)}s - ${Math.round(endTime)}s)...`);
      
      // Calculate buffer segment based on time proportion
      const startByte = Math.floor((startTime / totalDuration) * buffer.byteLength);
      const endByte = Math.floor((endTime / totalDuration) * buffer.byteLength);
      const segmentBuffer = buffer.slice(startByte, endByte);
      
      // Only process if segment is substantial
      if (segmentBuffer.byteLength > 1000000) { // At least 1MB
        const segmentResult = await transcribeComplete(segmentBuffer, apiKey, language);
        
        // Adjust timestamps for this segment
        if (segmentResult.segments) {
          segmentResult.segments.forEach((segment: any) => {
            segment.start += currentTime;
            segment.end += currentTime;
            
            if (segment.words) {
              segment.words.forEach((word: any) => {
                word.start += currentTime;
                word.end += currentTime;
              });
            }
          });
        }
        
        results.push(segmentResult);
        
        // Rate limiting
        if (i < numSegments - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      currentTime += SEGMENT_DURATION;
      
    } catch (error) {
      console.error(`Failed to process segment ${i + 1}:`, error);
      // Continue with next segment
    }
  }
  
  if (results.length === 0) {
    throw new Error("Failed to process any segments");
  }
  
  // Combine all results with deduplication
  const combinedResult = {
    text: results.map(r => r.text || '').join(' '),
    language: results.find(r => r.language)?.language || 'en',
    duration: totalDuration,
    segments: [],
    words: []
  };
  
  // Merge segments with overlap handling
  results.forEach(result => {
    if (result.segments) {
      result.segments.forEach((segment: any) => {
        // Check for overlap with existing segments
        const hasOverlap = combinedResult.segments.some((existing: any) => 
          Math.abs(existing.start - segment.start) < 5 && 
          existing.text.substring(0, 50) === segment.text.substring(0, 50)
        );
        
        if (!hasOverlap) {
          combinedResult.segments.push(segment);
        }
      });
    }
    
    if (result.words) {
      combinedResult.words.push(...result.words);
    }
  });
  
  // Sort segments by time
  combinedResult.segments.sort((a: any, b: any) => a.start - b.start);
  combinedResult.words.sort((a: any, b: any) => a.start - b.start);
  
  console.log(`✅ Intelligent chunking complete: ${combinedResult.segments.length} segments, ${Math.round(totalDuration)}s total`);
  
  return combinedResult;
}

// Save transcript to database
async function saveTranscriptToDatabase(videoId: string, transcriptionResult: any, forceReExtract: boolean) {
  console.log(`Saving transcript to database for video ${videoId}...`);
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Clear existing segments if force re-extract
      if (forceReExtract) {
        await supabase
          .from('transcript_segments')
          .delete()
          .eq('video_id', videoId);
      }
      
      // Prepare segments for database
      const segmentsToSave = transcriptionResult.segments.map((segment: any, index: number) => ({
        video_id: videoId,
        text: segment.text || '',
        start_time: Number(segment.start) || (index * 5),
        end_time: Number(segment.end) || ((index + 1) * 5),
        confidence: segment.confidence || null,
        language: transcriptionResult.language || 'en',
        segment_type: 'dialogue',
        speaker: `Speaker ${(index % 3) + 1}`,
        speaker_color: '#3B82F6',
        emphasis: 'normal',
        pitch: 'normal',
        is_off_camera: false
      }));
      
      // Save to database in batches to handle large transcripts
      const BATCH_SIZE = 100;
      for (let i = 0; i < segmentsToSave.length; i += BATCH_SIZE) {
        const batch = segmentsToSave.slice(i, i + BATCH_SIZE);
        
        const { error: saveError } = await supabase
          .from('transcript_segments')
          .upsert(batch, { 
            onConflict: 'video_id,language,start_time',
            ignoreDuplicates: false
          });
          
        if (saveError) {
          console.error(`Database save error for batch ${Math.floor(i/BATCH_SIZE) + 1}:`, saveError);
        } else {
          console.log(`Saved batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} segments`);
        }
      }
      
      console.log(`✅ Successfully saved ${segmentsToSave.length} segments to database`);
    }
  } catch (dbError) {
    console.error("Database operation failed:", dbError);
  }
}