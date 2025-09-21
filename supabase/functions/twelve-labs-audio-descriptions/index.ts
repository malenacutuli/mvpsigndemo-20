import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============== INTERFACES ==============

interface AudioDescriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  duration: number;
  type: 'silence_gap';
}

interface SilenceGap {
  startTime: number;
  endTime: number;
  duration: number;
}

// ============== MAIN HANDLER ==============

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, videoId: inputVideoId, language, transcriptSegments, indexId: providedIndexId, taskId: providedTaskId } = await req.json();

    // Only require videoUrl on kickoff requests (no continuation identifiers)
    if (!providedIndexId && !providedTaskId && !videoUrl) {
      throw new Error('Video URL is required');
    }

    // transcriptSegments are optional on kickoff; required only when generation starts
    // (They will be provided later once the indexing task is ready)

    const twelveLabsApiKey = Deno.env.get('TWELVE_LABS_API_KEY');
    if (!twelveLabsApiKey) {
      throw new Error('Twelve Labs API key not configured');
    }

    console.log('🎬 Starting Twelve Labs Audio Description Generation...');
    const shortUrl = typeof videoUrl === 'string' ? videoUrl.substring(0, 50) + '...' : 'n/a';
    console.log('📊 Request Parameters:', {
      videoId: inputVideoId,
      videoUrl: shortUrl,
      segments: (Array.isArray(transcriptSegments) ? transcriptSegments.length : 0),
      language: language || 'en'
    });

    // API Configuration following documentation
    const API_BASE_URL = 'https://api.twelvelabs.io/v1.3';
    const headers = {
      'x-api-key': twelveLabsApiKey,
      'Content-Type': 'application/json',
    };

    // If continuation identifiers are provided, check status and finish if ready
    if (providedIndexId && providedTaskId) {
      console.log('🔁 Continuing existing Twelve Labs task:', { providedIndexId, providedTaskId });

      const statusRes = await fetch(`${API_BASE_URL}/tasks/${providedTaskId}`, {
        headers: { 'x-api-key': twelveLabsApiKey },
      });

      if (!statusRes.ok) {
        const txt = await statusRes.text();
        console.warn('⚠️ Status check failed:', txt);
        return new Response(JSON.stringify({
          success: true,
          status: 'processing',
          indexId: providedIndexId,
          taskId: providedTaskId
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const statusData = await statusRes.json();
      console.log(`📊 Task status: ${statusData.status}`);

      if (statusData.status !== 'ready') {
        return new Response(JSON.stringify({
          success: true,
          status: statusData.status || 'processing',
          indexId: providedIndexId,
          taskId: providedTaskId
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const readyVideoId = statusData.video_id || statusData.videoId;
      if (!readyVideoId) {
        return new Response(JSON.stringify({
          success: true,
          status: 'processing',
          indexId: providedIndexId,
          taskId: providedTaskId
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // If the task is ready but we don't have transcript segments yet,
      // ask the client to send them in a follow-up request
      if (!transcriptSegments || transcriptSegments.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          status: 'ready',
          needsSegments: true,
          indexId: providedIndexId,
          taskId: providedTaskId,
          videoId: readyVideoId
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Generate descriptions now that the task is ready
      const silenceGaps = detectSilenceGaps(transcriptSegments);
      const audioDescriptions = await generateAudioDescriptions(
        API_BASE_URL,
        headers,
        readyVideoId,
        silenceGaps,
        language || 'en'
      );

      // Cleanup index after completion
      await cleanupIndex(API_BASE_URL, headers, providedIndexId);
      console.log('🧹 Cleaned up temporary index');

      return new Response(JSON.stringify({
        success: true,
        status: 'ready',
        audioDescriptions,
        silenceGapsAnalyzed: silenceGaps.length,
        descriptionsGenerated: audioDescriptions.length,
        language: language || 'en'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Kickoff path: create index and start task without waiting
    const indexName = `audio_desc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const indexId = await createIndex(API_BASE_URL, headers, indexName);
    console.log('✅ Created index:', indexId);

    // Create indexing task using multipart/form-data
    const formData = new FormData();
    formData.append('index_id', indexId);
    formData.append('video_url', videoUrl);
    formData.append('enable_video_stream', 'false');

    console.log('📤 Creating indexing task (kickoff)...', { indexId });

    const uploadHeaders = { 'x-api-key': twelveLabsApiKey };
    const taskResponse = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
    });

    console.log(`📥 Task creation response status: ${taskResponse.status}`);

    if (!taskResponse.ok) {
      const errorText = await taskResponse.text();
      console.error('❌ Task creation failed:', errorText);
      throw new Error(`Failed to create indexing task (${taskResponse.status}): ${errorText}`);
    }

    const taskResult = await taskResponse.json();

    return new Response(JSON.stringify({
      success: true,
      status: 'processing',
      indexId,
      taskId: taskResult._id
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌ Twelve Labs audio description error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Audio description generation failed',
      errorType: 'twelve_labs_audio_desc_error',
      success: false
    }), {
      status: 200, // Return 200 so client can handle gracefully
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============== TWELVE LABS API FUNCTIONS ==============

/**
 * Step 1: Create Index (following official REST documentation)
 */
async function createIndex(baseUrl: string, headers: any, indexName: string): Promise<string> {
  console.log('🔧 Creating Twelve Labs index...');
  
  const data = {
    index_name: indexName,
    models: [
      {
        model_name: "pegasus1.2",
        model_options: ["visual", "audio"]
      }
    ]
  };

  console.log('📤 Sending index creation request:', {
    url: `${baseUrl}/indexes`,
    indexName: indexName,
    modelName: "pegasus1.2"
  });

  const response = await fetch(`${baseUrl}/indexes`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  console.log(`📥 Index creation response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Index creation failed:', errorText);
    throw new Error(`Failed to create index (${response.status}): ${errorText}`);
  }

  const indexData = await response.json();
  console.log('✅ Index created successfully:', { id: indexData._id });
  return indexData._id;
}

/**
 * Step 2: Upload Video and Monitor Processing (following official documentation)
 */
async function uploadAndProcessVideo(
  baseUrl: string, 
  headers: any,
  indexId: string, 
  videoUrl: string
): Promise<string> {
  console.log('🎥 Starting video upload and processing...');
  
  // Twelve Labs requires multipart/form-data for video uploads
  const formData = new FormData();
  formData.append('index_id', indexId);
  formData.append('video_url', videoUrl);
  formData.append('enable_video_stream', 'false');

  console.log('📤 Creating indexing task:', {
    url: `${baseUrl}/tasks`,
    indexId: indexId,
    videoUrl: videoUrl.substring(0, 50) + '...'
  });

  // Use multipart/form-data headers
  const uploadHeaders = {
    'x-api-key': headers['x-api-key'],
    // Don't set Content-Type - let browser set it with boundary for FormData
  };

  const taskResponse = await fetch(`${baseUrl}/tasks`, {
    method: 'POST',
    headers: uploadHeaders,
    body: formData,
  });

  console.log(`📥 Task creation response status: ${taskResponse.status}`);

  if (!taskResponse.ok) {
    const errorText = await taskResponse.text();
    console.error('❌ Task creation failed:', errorText);
    throw new Error(`Failed to create indexing task (${taskResponse.status}): ${errorText}`);
  }

  const taskResult = await taskResponse.json();
  const taskId = taskResult._id;
  let videoId = taskResult.video_id || null;
  
  console.log('✅ Indexing task created successfully:', { taskId, videoId });

  // Monitor the indexing process
  let processingComplete = false;
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes max (edge function timeout limit)
  const sleepInterval = 10; // 10 seconds between checks

  console.log(`🔄 Monitoring video processing (max ${maxAttempts * sleepInterval / 60} minutes)...`);

  while (!processingComplete && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, sleepInterval * 1000));
    
    const statusResponse = await fetch(`${baseUrl}/tasks/${taskId}`, {
      headers: {
        'x-api-key': headers['x-api-key'],
      },
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log(`📊 Task status: ${statusData.status} (attempt ${attempts + 1}/${maxAttempts})`);
      
      if (statusData.status === 'ready') {
        processingComplete = true;
        if (!videoId && (statusData.video_id || statusData.videoId)) {
          videoId = statusData.video_id || statusData.videoId;
        }
        console.log('✅ Video processing completed successfully');
      } else if (statusData.status === 'failed') {
        const errorMsg = statusData.message || 'Unknown processing error';
        console.error('❌ Video processing failed:', errorMsg);
        throw new Error(`Video processing failed: ${errorMsg}`);
      }
    } else {
      console.warn(`⚠️ Status check failed: ${statusResponse.status}`);
    }
    
    attempts++;
  }

  if (!processingComplete) {
    const timeoutMinutes = (maxAttempts * sleepInterval) / 60;
    throw new Error(`Video processing timeout after ${timeoutMinutes} minutes`);
  }

  if (!videoId) {
    throw new Error('Video ID could not be retrieved after processing completion');
  }

  console.log('🎉 Video fully processed and ready for analysis:', videoId);
  return videoId;
}

/**
 * Step 3: Generate Audio Descriptions using Analyze API
 */
async function generateAudioDescriptions(
  baseUrl: string,
  headers: any,
  videoId: string,
  silenceGaps: SilenceGap[],
  language: string
): Promise<AudioDescriptionSegment[]> {
  const audioDescriptions: AudioDescriptionSegment[] = [];
  
  console.log(`🎬 Starting audio description generation for ${silenceGaps.length} silence gaps...`);

  // Select representative gaps across the whole timeline to prevent early cutoffs
  const maxGaps = 12;
  let limitedGaps: SilenceGap[] = [];
  if (silenceGaps.length <= maxGaps) {
    limitedGaps = silenceGaps;
  } else {
    const sorted = [...silenceGaps].sort((a, b) => a.startTime - b.startTime);
    const totalSpan = (sorted[sorted.length - 1].endTime - sorted[0].startTime) || 1;
    const bucketSize = totalSpan / maxGaps;
    const selected: SilenceGap[] = [];

    for (let i = 0; i < maxGaps; i++) {
      const bucketStart = sorted[0].startTime + i * bucketSize;
      const bucketEnd = i === maxGaps - 1 ? Infinity : bucketStart + bucketSize;
      const inBucket = sorted.filter(g => g.startTime >= bucketStart && g.startTime < bucketEnd);
      if (inBucket.length > 0) {
        inBucket.sort((a, b) => b.duration - a.duration);
        selected.push(inBucket[0]);
      }
    }

    // Ensure we include a gap near the end of the video
    const lastGap = sorted[sorted.length - 1];
    if (!selected.some(g => g.startTime === lastGap.startTime && g.endTime === lastGap.endTime)) {
      selected[selected.length - 1] = lastGap;
    }

    // Deduplicate and cap to max
    const keySet = new Set<string>();
    limitedGaps = selected.filter(g => {
      const key = `${g.startTime}-${g.endTime}`;
      if (keySet.has(key)) return false;
      keySet.add(key);
      return true;
    }).slice(0, maxGaps);
  }
  if (limitedGaps.length < silenceGaps.length) {
    console.log(`⚠️ Selected ${limitedGaps.length}/${silenceGaps.length} representative gaps across full timeline`);
  }

  for (let i = 0; i < limitedGaps.length; i++) {
    const gap = limitedGaps[i];
    
    try {
      console.log(`🎯 Processing gap ${i + 1}/${limitedGaps.length}: ${gap.startTime}s-${gap.endTime}s (${gap.duration}s)`);
      
      const analysisPrompt = `Analyze the video segment from ${gap.startTime} to ${gap.endTime} seconds and create a concise audio description for this ${gap.duration.toFixed(1)}-second moment.

Focus on visual elements during this time period:
- Character actions, movements, and expressions
- Environmental details and setting changes  
- Visual storytelling elements (lighting, composition)
- Important objects or visual elements
- Emotional undertones conveyed visually

Requirements:
- Write in present tense
- Keep concise for ${gap.duration.toFixed(1)} seconds of narration
- Focus only on visual elements during this specific time segment
- Use cinematic language appropriate for audio description
- Do not mention audio, dialogue, or sound

Generate only the audio description text.`;

      const requestData = {
        video_id: videoId,
        prompt: analysisPrompt,
        temperature: 0.3,
        stream: false,
        max_tokens: Math.min(300, Math.floor(gap.duration * 20)),
      };

      console.log('📤 Sending analyze request for gap', i + 1);

      const response = await fetch(`${baseUrl}/analyze`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestData),
      });

      console.log(`📥 Analyze response status for gap ${i + 1}: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        let description = data.data || '';
        
        // Clean and validate description
        description = cleanDescription(description, gap.duration);
        
        if (description && description.length > 10) {
          audioDescriptions.push({
            text: description,
            startTime: gap.startTime,
            endTime: gap.endTime,
            duration: gap.duration,
            type: 'silence_gap'
          });
          
          console.log(`✅ Generated description ${i + 1}: "${description.substring(0, 70)}..."`);
        } else {
          // Use fallback if description is too short
          const fallback = createFallbackDescription(gap, i);
          audioDescriptions.push(fallback);
          console.log(`🔄 Using fallback for gap ${i + 1}: "${fallback.text.substring(0, 50)}..."`);
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ Analyze API error for gap ${gap.startTime}s-${gap.endTime}s (${response.status}):`, errorText);
        
        // Create fallback description
        const fallback = createFallbackDescription(gap, i);
        audioDescriptions.push(fallback);
        console.log(`🔄 Created fallback for failed analysis: "${fallback.text.substring(0, 50)}..."`);
      }

      // Reduced rate limiting for edge function timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error processing gap ${gap.startTime}s-${gap.endTime}s:`, error);
      
      // Always provide a fallback
      const fallback = createFallbackDescription(gap, i);
      audioDescriptions.push(fallback);
      console.log(`🔄 Exception fallback for gap ${i + 1}: "${fallback.text.substring(0, 50)}..."`);
    }
  }

  // Sort by start time
  audioDescriptions.sort((a, b) => a.startTime - b.startTime);
  
  console.log(`🎉 Audio description generation completed: ${audioDescriptions.length} descriptions created`);
  return audioDescriptions;
}

/**
 * Step 4: Cleanup Index
 */
async function cleanupIndex(baseUrl: string, headers: any, indexId: string): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/indexes/${indexId}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': headers['x-api-key'],
      },
    });
    
    if (!response.ok) {
      console.warn(`⚠️ Failed to delete index ${indexId}:`, await response.text());
    }
  } catch (error) {
    console.warn('⚠️ Error during index cleanup:', error);
  }
}

// ============== UTILITY FUNCTIONS ==============

function detectSilenceGaps(transcriptSegments: any[]): SilenceGap[] {
  const gaps: SilenceGap[] = [];
  
  // Handle undefined or empty transcript segments
  if (!transcriptSegments || transcriptSegments.length === 0) {
    // Create more default intervals if no transcript
    const intervals = [];
    for (let i = 0; i < 300; i += 8) { // Every 8 seconds for 5 minutes
      intervals.push({ startTime: i, endTime: i + 4, duration: 4 });
    }
    console.log(`📊 No transcript found, created ${intervals.length} default intervals`);
    return intervals;
  }
  
  // Sort segments by start time
  const sortedSegments = [...transcriptSegments]
    .filter(s => typeof s.startTime === 'number' && typeof s.endTime === 'number')
    .sort((a, b) => a.startTime - b.startTime);

  if (sortedSegments.length === 0) {
    // Create more default intervals if no transcript
    const intervals = [];
    for (let i = 0; i < 300; i += 8) { // Every 8 seconds for 5 minutes
      intervals.push({ startTime: i, endTime: i + 4, duration: 4 });
    }
    console.log(`📊 No transcript found, created ${intervals.length} default intervals`);
    return intervals;
  }

  const minGapDuration = 0.8; // Reduced minimum gap (was 1.0)
  const bufferTime = 0.1; // Smaller buffer around speech (was 0.2)
  
  // Add opening gap if needed
  if (sortedSegments[0].startTime > 0.5) {
    const gapEnd = Math.max(0, sortedSegments[0].startTime - bufferTime);
    const duration = gapEnd;
    if (duration >= minGapDuration) {
      gaps.push({
        startTime: 0,
        endTime: gapEnd,
        duration
      });
    }
  }

  // Find gaps between segments - more aggressive detection
  for (let i = 0; i < sortedSegments.length - 1; i++) {
    const currentEnd = sortedSegments[i].endTime + bufferTime;
    const nextStart = sortedSegments[i + 1].startTime - bufferTime;
    const gapDuration = nextStart - currentEnd;
    
    if (gapDuration >= minGapDuration) {
      gaps.push({
        startTime: currentEnd,
        endTime: nextStart,
        duration: gapDuration
      });
    }
  }

  // Add more trailing gaps to cover the full video
  const lastSegment = sortedSegments[sortedSegments.length - 1];
  const estimatedVideoEnd = Math.max(lastSegment.endTime + 180, 400); // Assume longer video
  
  let currentTime = lastSegment.endTime + bufferTime;
  let gapCount = 0;
  while (currentTime < estimatedVideoEnd && gapCount < 50) { // Up to 50 trailing gaps
    const gapEnd = Math.min(currentTime + 4, estimatedVideoEnd); // Longer segments
    const duration = gapEnd - currentTime;
    
    if (duration >= minGapDuration) {
      gaps.push({
        startTime: currentTime,
        endTime: gapEnd,
        duration
      });
      gapCount++;
    }
    
    currentTime = gapEnd + 5; // Skip 5 seconds ahead to find next opportunity
  }

  // Add additional mid-video gaps by finding longer pauses within speech segments
  for (let i = 0; i < sortedSegments.length - 1; i++) {
    const currentSegment = sortedSegments[i];
    const nextSegment = sortedSegments[i + 1];
    const gapBetween = nextSegment.startTime - currentSegment.endTime;
    
    // If there's a gap longer than 3 seconds, create multiple smaller descriptions
    if (gapBetween > 3) {
      const numSubGaps = Math.floor(gapBetween / 2);
      for (let j = 0; j < Math.min(numSubGaps, 3); j++) {
        const subGapStart = currentSegment.endTime + (j * 2);
        const subGapEnd = Math.min(subGapStart + 1.5, nextSegment.startTime - 0.1);
        if (subGapEnd > subGapStart) {
          gaps.push({
            startTime: subGapStart,
            endTime: subGapEnd,
            duration: subGapEnd - subGapStart
          });
        }
      }
    }
  }

  console.log(`📊 Detected ${gaps.length} silence gaps total from ${sortedSegments.length} speech segments`);
  return gaps.sort((a, b) => a.startTime - b.startTime);
}

function createFallbackDescription(gap: SilenceGap, index: number): AudioDescriptionSegment {
  const fallbacks = [
    "The scene unfolds with carefully composed visuals that enhance the narrative atmosphere.",
    "Character interactions and environmental details develop through expressive cinematography.", 
    "Visual storytelling elements create dramatic tension and emotional resonance.",
    "The composition draws attention to key narrative elements through lighting and framing.",
    "Atmospheric details and character positioning advance the story's emotional journey.",
    "Visual metaphors and symbolic elements enrich the narrative's thematic depth.",
    "The mise-en-scène establishes mood and context through deliberate visual choices.",
    "Character expressions and body language convey subtext and emotional complexity.",
    "Environmental storytelling elements provide context and enhance immersion.",
    "The visual narrative builds tension through strategic composition and timing."
  ];
  
  return {
    text: fallbacks[index % fallbacks.length],
    startTime: gap.startTime,
    endTime: gap.endTime,
    duration: gap.duration,
    type: 'silence_gap'
  };
}

function cleanDescription(description: string, maxDuration: number): string {
  if (!description) return '';
  
  // Remove common prefixes and artifacts
  description = description.trim()
    .replace(/^(The scene shows|We see|The video shows|In this segment|Audio description:|Description:|Analysis:|Here's what happens|This is|During this time)/i, '')
    .replace(/\b(audio description|for blind audiences|visually impaired|screen reader|accessibility)\b/gi, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Ensure it starts with a capital letter
  if (description.length > 0) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }
  
  // Ensure it ends properly
  if (description && !description.match(/[.!?]$/)) {
    description += '.';
  }
  
  // Word count check
  const maxWords = Math.floor(maxDuration * 2.5);
  const words = description.split(' ');
  if (words.length > maxWords && maxWords > 5) {
    description = words.slice(0, maxWords).join(' ') + '.';
  }
  
  return description;
}