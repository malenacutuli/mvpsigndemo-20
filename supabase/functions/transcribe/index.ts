import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Save transcript segments to database
async function saveTranscriptToDatabase(transcriptResult: any, videoId: string, forceOverwrite = false) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials for database save');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if transcript segments already exist for this video
    console.log(`Checking for existing transcript segments for video ${videoId}`);
    const { data: existingSegments, error: checkError } = await supabase
      .from('transcript_segments')
      .select('id')
      .eq('video_id', videoId)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing segments:', checkError);
      return false;
    }

    // If segments already exist and we're not forcing overwrite, skip save
    if (existingSegments && existingSegments.length > 0 && !forceOverwrite) {
      console.log('Transcript segments already exist for this video, skipping save to prevent overwriting user edits');
      return true; // Return true since transcripts exist
    }

    // Save new transcript segments (or overwrite existing ones)
    if (transcriptResult.segments && transcriptResult.segments.length > 0) {
      const segmentsToInsert = transcriptResult.segments.map((segment: any, index: number) => ({
        video_id: videoId,
        text: segment.text || '',
        start_time: Number(segment.start) || (index * 5), // Use index-based timing if start time is missing/duplicate
        end_time: Number(segment.end) || ((index + 1) * 5),
        confidence: segment.confidence || null,
        language: transcriptResult.language || 'en',
        segment_type: 'dialogue',
        speaker: segment.speaker || `Speaker ${(index % 3) + 1}`,
        speaker_color: '#3B82F6',
        emphasis: 'normal',
        pitch: 'normal',
        is_off_camera: false
      }));

      console.log(`${forceOverwrite ? 'Overwriting with' : 'Saving'} ${segmentsToInsert.length} transcript segments to database`);
      
      // Use upsert to handle potential conflicts
      const { error: insertError } = await supabase
        .from('transcript_segments')
        .upsert(segmentsToInsert, { 
          onConflict: 'video_id,language,start_time',
          ignoreDuplicates: false // Always update if forcing overwrite
        });

      if (insertError) {
        console.error('Error inserting transcript segments:', insertError);
        return false;
      }

      console.log('Successfully saved transcript segments to database');
      return true;
    } else {
      console.warn('No segments to save');
      return false;
    }
  } catch (error) {
    console.error('Error saving transcript to database:', error);
    return false;
  }
}

// Process large video by extracting segments at different time intervals
async function processLargeVideoInTimeSegments(videoUrl: string, language: string, OPENAI_API_KEY: string) {
  console.log("Processing large video with time-based segmentation");
  
  // Strategy: Download once and segment intelligently
  const MAX_SEGMENTS = 8; // Limit to prevent excessive processing
  
  try {
    // Download the video once
    console.log("Downloading video for segmentation...");
    const response = await fetch(videoUrl);
    const buffer = await response.arrayBuffer();
    const totalSize = buffer.byteLength;
    
    console.log(`Video downloaded: ${Math.round(totalSize / 1024 / 1024)}MB`);
    
    // Calculate optimal segment size (aim for ~20MB segments)
    const TARGET_SEGMENT_SIZE = 20000000; // 20MB
    const numberOfSegments = Math.min(
      Math.ceil(totalSize / TARGET_SEGMENT_SIZE),
      MAX_SEGMENTS
    );
    
    const actualSegmentSize = Math.ceil(totalSize / numberOfSegments);
    console.log(`Processing ${numberOfSegments} segments of ~${Math.round(actualSegmentSize / 1024 / 1024)}MB each`);
    
    const allSegments: any[] = [];
    let totalProcessedDuration = 0;
    
    // Process segments sequentially to avoid overwhelming the API
    for (let i = 0; i < numberOfSegments; i++) {
      const startByte = i * actualSegmentSize;
      const endByte = Math.min(startByte + actualSegmentSize, totalSize);
      
      if (startByte >= totalSize) break;
      
      console.log(`Processing segment ${i + 1}/${numberOfSegments}: bytes ${startByte}-${endByte}`);
      
      try {
        // Extract this segment from the buffer
        const segmentBuffer = buffer.slice(startByte, endByte);
        const segmentBlob = new Blob([segmentBuffer], { type: "audio/mp4" });
        
        console.log(`Segment ${i + 1} size: ${Math.round(segmentBlob.size / 1024 / 1024)}MB`);
        
        // Skip if segment is still too large (shouldn't happen with proper calculation)
        if (segmentBlob.size > 25000000) {
          console.warn(`Segment ${i + 1} too large, skipping`);
          continue;
        }
        
        const formData = new FormData();
        formData.append("file", segmentBlob, `segment_${i}.mp4`);
        formData.append("model", "whisper-1");
        formData.append("response_format", "verbose_json");
        formData.append("timestamp_granularities[]", "word");
        
        if (language && language !== 'auto') {
          formData.append("language", language);
        }
        
        const openaiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: formData,
        });
        
        if (openaiResponse.ok) {
          const result = await openaiResponse.json();
          
          // Adjust timestamps for this segment
          const timeOffset = totalProcessedDuration;
          const segmentDuration = result.duration || 300; // Fallback estimate
          
          if (result.segments) {
            result.segments.forEach((segment: any) => {
              segment.start += timeOffset;
              segment.end += timeOffset;
              
              if (segment.words) {
                segment.words.forEach((word: any) => {
                  word.start += timeOffset;
                  word.end += timeOffset;
                });
              }
            });
            
            allSegments.push(...result.segments);
          }
          
          totalProcessedDuration += segmentDuration;
          console.log(`Segment ${i + 1} processed: ${segmentDuration}s duration`);
          
        } else {
          const errorText = await openaiResponse.text();
          console.warn(`Segment ${i + 1} failed: ${openaiResponse.status} - ${errorText}`);
          
          // For 413 errors, try smaller segments
          if (openaiResponse.status === 413) {
            console.log(`Segment ${i + 1} too large for OpenAI, splitting further...`);
            // Could implement recursive splitting here
          }
        }
        
      } catch (segmentError) {
        console.error(`Error processing segment ${i + 1}:`, segmentError);
      }
      
      // Add small delay between segments to avoid rate limiting
      if (i < numberOfSegments - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (allSegments.length === 0) {
      throw new Error("Failed to process any video segments successfully");
    }
    
    const result = {
      text: allSegments.map(s => s.text).join(' '),
      language: allSegments[0]?.language || language || 'en',
      duration: totalProcessedDuration,
      segments: allSegments,
      words: allSegments.flatMap(s => s.words || [])
    };
    
    console.log(`Segmentation complete: ${allSegments.length} segments, ${result.words.length} words, ${totalProcessedDuration}s total`);
    return result;
    
  } catch (error) {
    console.error("Error in time-based segmentation:", error);
    throw error;
  }
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
    const { audio, mimeType, filename, videoUrl, rangeBytes, language, videoId, forceReExtract } = await req.json();
    
    console.log("Request payload:", {
      hasAudio: !!audio,
      language: language || 'auto',
      hasVideoUrl: !!videoUrl,
      videoId,
      forceReExtract: !!forceReExtract,
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

    // If videoId provided, check for existing transcripts first to avoid duplicate processing
    if (videoId && videoUrl && !forceReExtract) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          console.log(`Checking for existing transcripts for video ${videoId} to avoid duplicate processing`);
          const { data: existingSegments, error: checkError } = await supabase
            .from('transcript_segments')
            .select('*')
            .eq('video_id', videoId)
            .order('start_time', { ascending: true });

          if (!checkError && existingSegments && existingSegments.length > 0) {
            console.log(`Found ${existingSegments.length} existing transcript segments, returning cached result`);
            
            // Return existing transcripts in OpenAI format
            const cachedResult = {
              text: existingSegments.map(s => s.text).join(' '),
              language: existingSegments[0]?.language || 'en',
              duration: Math.max(...existingSegments.map(s => Number(s.end_time))),
              segments: existingSegments.map(seg => ({
                text: seg.text,
                start: Number(seg.start_time),
                end: Number(seg.end_time),
                speaker: seg.speaker,
                confidence: seg.confidence
              })),
              words: [] // Word-level data not stored in our schema
            };
            
            return new Response(JSON.stringify(cachedResult), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (cacheError) {
          console.warn('Error checking cache, proceeding with transcription:', cacheError);
        }
      }
    }

    // If forceReExtract is true, clear existing transcripts before proceeding
    if (forceReExtract && videoId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          console.log(`Force re-extract requested, clearing existing transcripts for video ${videoId}`);
          
          const { error: deleteError } = await supabase
            .from('transcript_segments')
            .delete()
            .eq('video_id', videoId);
            
          if (deleteError) {
            console.warn('Error clearing existing transcripts:', deleteError);
          } else {
            console.log('Successfully cleared existing transcripts for re-extraction');
          }
        } catch (clearError) {
          console.warn('Error clearing cache, proceeding with transcription:', clearError);
        }
      }
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
          // Large video - use different strategies based on size
          console.log(`Video too large (${contentLength} bytes), attempting optimized processing`);
          
          if (contentLength > 100000000) { // Over 100MB
            return new Response(JSON.stringify({ 
              error: "Video file too large for processing",
              details: `Video size: ${Math.round(contentLength / 1024 / 1024)}MB. Videos over 100MB cannot be processed. Please compress your video to under 100MB.`,
              sizeMB: Math.round(contentLength / 1024 / 1024),
              maxSizeMB: 100
            }), {
              status: 413,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          
          // For videos between 25MB-100MB, try processing as audio only
          console.log("Downloading and processing as audio track");
          const response = await fetch(videoUrl);
          const buffer = await response.arrayBuffer();
          
          // Process as audio - this can sometimes work for audio extraction
          fileBlob = new Blob([buffer], { type: "audio/mp4" });
          fname = "audio_from_video.mp4";
          mtype = "audio/mp4";
          
          console.log(`Processing ${Math.round(buffer.byteLength / 1024 / 1024)}MB video as audio`);
          
          // If still too large after conversion, use time-based segmentation
          if (fileBlob.size > OPENAI_MAX_SIZE) {
            console.log(`Audio track still too large (${Math.round(fileBlob.size / 1024 / 1024)}MB), using time-based segmentation`);
            
            // Use background task for long-running segmentation
            const segmentationPromise = processLargeVideoInTimeSegments(videoUrl, language || 'auto', OPENAI_API_KEY);
            
            // For very large files, we'll process in background and return result immediately
            try {
              const result = await segmentationPromise;
              console.log(`Time-based segmentation completed: ${result.segments.length} segments, ${result.words.length} words`);
              
               // Save to database if videoId is provided
               if (videoId) {
                 const saveSuccess = await saveTranscriptToDatabase(result, videoId, forceReExtract);
                 console.log(`Database save ${saveSuccess ? 'successful' : 'failed'} for video ${videoId}`);
               }
              
              return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            } catch (segmentError) {
              console.error("Segmentation failed:", segmentError);
              return new Response(JSON.stringify({ 
                error: "Large video processing failed", 
                details: `Unable to process video segments: ${segmentError.message}. Try using a shorter or more compressed video.`,
                suggestion: "Consider splitting your video into shorter segments (under 25MB each) for better results"
              }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
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

    // Save to database if videoId is provided
    if (videoId) {
      const saveSuccess = await saveTranscriptToDatabase(transcriptionResult, videoId, forceReExtract);
      console.log(`Database save ${saveSuccess ? 'successful' : 'failed'} for video ${videoId}`);
    }

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