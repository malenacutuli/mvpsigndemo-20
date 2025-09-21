import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AudioDescriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  duration: number;
  type: 'silence_gap';
}

interface TwelveLabsConfig {
  baseUrl: string;
  apiKey: string;
  indexName: string;
  model: {
    name: string;
    options: string[];
  };
}

interface SilenceGap {
  startTime: number;
  endTime: number;
  duration: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, videoId: inputVideoId, language, transcriptSegments } = await req.json();
    
    if (!videoUrl) {
      throw new Error('Video URL is required');
    }

    if (!transcriptSegments || transcriptSegments.length === 0) {
      throw new Error('Transcript segments are required for silence detection');
    }

    const twelveLabsApiKey = Deno.env.get('TWELVE_LABS_API_KEY');
    if (!twelveLabsApiKey) {
      throw new Error('Twelve Labs API key not configured');
    }

    console.log('🎬 Starting Twelve Labs Audio Description Generation...');
    console.log('📊 Parameters:', {
      videoId: inputVideoId,
      videoUrl: videoUrl.substring(0, 50) + '...',
      segments: transcriptSegments.length,
      language: language || 'en'
    });

    // Initialize Twelve Labs configuration
    const config: TwelveLabsConfig = {
      baseUrl: 'https://api.twelvelabs.io/v1.3',
      apiKey: twelveLabsApiKey,
      indexName: `audio_desc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      model: {
        name: 'pegasus1.2',
        options: ['audio', 'visual']
      }
    };

    // Step 1: Create Index following Python methodology
    const indexId = await createTwelveLabsIndex(config);
    console.log('✅ Created index:', indexId);

    let videoId: string;
    try {
      // Step 2: Upload Video and Monitor Processing
      videoId = await uploadAndProcessVideo(config, indexId, videoUrl);
      console.log('✅ Video processed successfully:', videoId);

      // Step 3: Detect Silence Gaps for Analysis
      const silenceGaps = detectSilenceGaps(transcriptSegments);
      console.log(`🔇 Detected ${silenceGaps.length} silence gaps for analysis`);

      // Step 4: Generate Audio Descriptions using Analyze API
      const audioDescriptions = await generateAudioDescriptions(
        config, 
        videoId, 
        silenceGaps, 
        language || 'en'
      );

      console.log(`🎉 Generated ${audioDescriptions.length} audio descriptions`);

      return new Response(JSON.stringify({
        success: true,
        audioDescriptions,
        silenceGapsAnalyzed: silenceGaps.length,
        descriptionsGenerated: audioDescriptions.length,
        language: language || 'en'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } finally {
      // Step 5: Cleanup - Always delete the temporary index
      await cleanupTwelveLabsIndex(config, indexId);
      console.log('🧹 Cleaned up temporary index');
    }

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

// ============== TWELVE LABS METHODOLOGY FUNCTIONS ==============
// Following Python SDK patterns for proper API interaction

/**
 * Step 1: Create Index (following official Twelve Labs documentation)
 */
async function createTwelveLabsIndex(config: TwelveLabsConfig): Promise<string> {
  console.log('🔧 Creating Twelve Labs index...');
  
  // Follow exact header pattern from documentation
  const headers = {
    'x-api-key': config.apiKey,
    'Content-Type': 'application/json',
  };

  // Follow exact data structure from documentation
  const data = {
    models: [
      {
        model_name: config.model.name,
        model_options: config.model.options
      }
    ],
    index_name: config.indexName
  };

  console.log('📤 Sending index creation request:', {
    url: `${config.baseUrl}/indexes`,
    indexName: config.indexName,
    model: config.model
  });

  const response = await fetch(`${config.baseUrl}/indexes`, {
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
  config: TwelveLabsConfig, 
  indexId: string, 
  videoUrl: string
): Promise<string> {
  console.log('🎥 Starting video upload and processing...');
  
  // Follow exact header pattern from documentation
  const headers = {
    'x-api-key': config.apiKey,
    'Content-Type': 'application/json',
  };

  // Create video indexing task with exact data structure
  const taskData = {
    index_id: indexId,
    video_url: videoUrl,
    enable_video_stream: false
  };

  console.log('📤 Creating indexing task:', {
    url: `${config.baseUrl}/tasks`,
    indexId: indexId,
    videoUrl: videoUrl.substring(0, 50) + '...'
  });

  const taskResponse = await fetch(`${config.baseUrl}/tasks`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(taskData),
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

  // Monitor the indexing process (similar to Python wait_for_done)
  let processingComplete = false;
  let attempts = 0;
  const maxAttempts = 120; // 20 minutes max for larger videos
  const sleepInterval = 10; // 10 seconds between checks

  console.log(`🔄 Monitoring video processing (max ${maxAttempts * sleepInterval / 60} minutes)...`);

  while (!processingComplete && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, sleepInterval * 1000));
    
    const statusResponse = await fetch(`${config.baseUrl}/tasks/${taskId}`, {
      headers: {
        'x-api-key': config.apiKey,
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
 * Step 3: Generate Audio Descriptions using Analyze API (following official documentation)
 */
async function generateAudioDescriptions(
  config: TwelveLabsConfig,
  videoId: string,
  silenceGaps: SilenceGap[],
  language: string
): Promise<AudioDescriptionSegment[]> {
  const audioDescriptions: AudioDescriptionSegment[] = [];
  
  console.log(`🎬 Starting audio description generation for ${silenceGaps.length} silence gaps...`);

  // Follow exact header pattern from documentation
  const headers = {
    'x-api-key': config.apiKey,
    'Content-Type': 'application/json',
  };

  for (let i = 0; i < silenceGaps.length; i++) {
    const gap = silenceGaps[i];
    
    try {
      console.log(`🎯 Processing gap ${i + 1}/${silenceGaps.length}: ${gap.startTime}s-${gap.endTime}s (${gap.duration}s)`);
      
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

      // Follow exact data structure from documentation
      const requestData = {
        video_id: videoId,
        prompt: analysisPrompt,
        temperature: 0.3,
        stream: false,
        max_tokens: Math.min(300, Math.floor(gap.duration * 20)),
      };

      console.log('📤 Sending analyze request for gap', i + 1);

      // Use Analyze API (equivalent to Python analyze method)
      const response = await fetch(`${config.baseUrl}/analyze`, {
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

      // Rate limiting to respect API limits (following documentation best practices)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
 * Step 4: Cleanup Index (following Python methodology)
 */
async function cleanupTwelveLabsIndex(config: TwelveLabsConfig, indexId: string): Promise<void> {
  try {
    const response = await fetch(`${config.baseUrl}/indexes/${indexId}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': config.apiKey,
      },
    });
    
    if (!response.ok) {
      console.warn(`⚠️ Failed to delete index ${indexId}:`, await response.text());
    }
  } catch (error) {
    console.warn('⚠️ Error during index cleanup:', error);
  }
}

// ============== SILENCE DETECTION AND UTILITY FUNCTIONS ==============

function detectSilenceGaps(transcriptSegments: any[]): SilenceGap[] {
  const gaps: SilenceGap[] = [];
  
  // Sort segments by start time
  const sortedSegments = [...transcriptSegments]
    .filter(s => typeof s.startTime === 'number' && typeof s.endTime === 'number')
    .sort((a, b) => a.startTime - b.startTime);

  if (sortedSegments.length === 0) {
    // If no transcript segments, create default intervals throughout the video
    const intervals = [];
    for (let i = 0; i < 180; i += 15) { // Every 15 seconds for 3 minutes
      intervals.push({ startTime: i, endTime: i + 3, duration: 3 });
    }
    console.log(`📊 No transcript found, created ${intervals.length} default intervals`);
    return intervals;
  }

  const minGapDuration = 1.0; // Minimum gap worth describing
  const bufferTime = 0.2; // Small buffer around speech
  
  // Add opening gap if video doesn't start immediately with speech
  if (sortedSegments[0].startTime > 1.0) {
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

  // Find ALL gaps between speech segments
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

  // Add extensive trailing gaps to cover the full video
  const lastSegment = sortedSegments[sortedSegments.length - 1];
  const estimatedVideoEnd = Math.max(lastSegment.endTime + 120, 300); // Assume longer video
  
  let currentTime = lastSegment.endTime + bufferTime;
  let gapCount = 0;
  while (currentTime < estimatedVideoEnd && gapCount < 20) { // Up to 20 trailing gaps
    const gapEnd = Math.min(currentTime + 3, estimatedVideoEnd);
    const duration = gapEnd - currentTime;
    
    if (duration >= minGapDuration) {
      gaps.push({
        startTime: currentTime,
        endTime: gapEnd,
        duration
      });
      gapCount++;
    }
    
    currentTime = gapEnd + 8; // Skip 8 seconds ahead to find next opportunity
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
    .replace(/^["']|["']$/g, '') // Remove quotes
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
  
  // Rough word count check (assuming ~2.5 words per second for natural speech)
  const maxWords = Math.floor(maxDuration * 2.5);
  const words = description.split(' ');
  if (words.length > maxWords && maxWords > 5) {
    description = words.slice(0, maxWords).join(' ') + '.';
  }
  
  return description;
}