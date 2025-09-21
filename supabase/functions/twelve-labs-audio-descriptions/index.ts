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

    console.log('🎬 Starting Twelve Labs audio description analysis for video:', inputVideoId);

    const baseUrl = 'https://api.twelvelabs.io/v1.3';

    // Step 1: Create index for video analysis
    const indexResponse = await fetch(`${baseUrl}/indexes`, {
      method: 'POST',
      headers: {
        'x-api-key': twelveLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        index_name: `audio_desc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        models: [
          { model_name: 'pegasus-1.2', model_options: ['audio', 'visual'] }
        ]
      }),
    });

    if (!indexResponse.ok) {
      const error = await indexResponse.text();
      throw new Error(`Failed to create index: ${error}`);
    }

    const indexData = await indexResponse.json();
    const indexId = indexData._id;
    console.log('✅ Created Twelve Labs index for audio descriptions:', indexId);

    // Step 2: Create video indexing task
    const taskCreateResponse = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        'x-api-key': twelveLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        index_id: indexId,
        video_url: videoUrl,
        enable_video_stream: false
      }),
    });

    if (!taskCreateResponse.ok) {
      const error = await taskCreateResponse.text();
      throw new Error(`Failed to create indexing task: ${error}`);
    }

    const taskData = await taskCreateResponse.json();
    const taskId = taskData._id;
    let videoId = taskData.video_id || null;
    console.log('🎥 Indexing task created for audio descriptions:', { taskId, videoId });

    // Step 3: Wait for video processing to complete
    let processingComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max

    while (!processingComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const statusResponse = await fetch(`${baseUrl}/tasks/${taskId}`, {
        headers: {
          'x-api-key': twelveLabsApiKey,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log(`📊 Processing status: ${statusData.status}`);
        
        if (statusData.status === 'ready') {
          processingComplete = true;
          if (!videoId && (statusData.video_id || statusData.videoId)) {
            videoId = statusData.video_id || statusData.videoId;
          }
        } else if (statusData.status === 'failed') {
          throw new Error(`Video processing failed: ${statusData.message || 'Unknown error'}`);
        }
      }
      
      attempts++;
    }

    if (!processingComplete) {
      throw new Error('Video processing timeout');
    }

    if (!videoId) {
      throw new Error('Video ID could not be retrieved after processing');
    }

    // Step 4: Detect silence gaps from transcript segments
    const silenceGaps = detectSilenceGaps(transcriptSegments);
    console.log(`🔇 Detected ${silenceGaps.length} silence gaps for audio descriptions`);

    // Step 5: Generate audio descriptions for each silence gap using Twelve Labs
    const audioDescriptions: AudioDescriptionSegment[] = [];

    for (const gap of silenceGaps) {
      try {
        // Custom prompt for audio descriptions in silence gaps
        const customPrompt = `Analyze the provided video segment from ${gap.startTime}s to ${gap.endTime}s and perform the following steps:

SILENCE GAP ANALYSIS:
- This is a ${gap.duration.toFixed(1)}-second silent gap with no dialogue or narration
- Create a concise audio description that fits naturally within this ${gap.duration.toFixed(1)}-second window

CREATIVE DESCRIPTION REQUIREMENTS:
- Write a cinematic narrative description suitable for audio description
- Style: creative advertising copywriter, blending audiobook storytelling with cinematic atmosphere
- Focus on story, emotions, and sensory details, not technical aspects like camera angles
- Call out character names if visible and identifiable
- Description should flow like a narrative podcast, enhancing immersion
- Keep it concise (max ${Math.floor(gap.duration * 3)} words) to fit in the ${gap.duration.toFixed(1)}-second gap

OUTPUT: Provide only the narrative description text, nothing else.`;

        const descriptionResponse = await fetch(`${baseUrl}/generate`, {
          method: 'POST',
          headers: {
            'x-api-key': twelveLabsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_id: videoId,
            type: 'summary',
            prompt: customPrompt,
            temperature: 0.8,
            max_tokens: Math.min(150, Math.floor(gap.duration * 5)), // Scale tokens with gap duration
          }),
        });

        if (descriptionResponse.ok) {
          const descData = await descriptionResponse.json();
          let description = descData.data || '';
          
          // Clean and validate the description
          description = cleanDescription(description, gap.duration);
          
          if (description && description.length > 10) {
            audioDescriptions.push({
              text: description,
              startTime: gap.startTime,
              endTime: gap.endTime,
              duration: gap.duration,
              type: 'silence_gap'
            });
            console.log(`✅ Generated description for gap ${gap.startTime}s-${gap.endTime}s: "${description.substring(0, 50)}..."`);
          }
        } else {
          console.warn(`⚠️ Failed to generate description for gap ${gap.startTime}s-${gap.endTime}s`);
        }
      } catch (error) {
        console.error(`❌ Error generating description for gap ${gap.startTime}s-${gap.endTime}s:`, error);
      }
      
      // Add small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 6: Cleanup - delete the temporary index
    try {
      await fetch(`${baseUrl}/indexes/${indexId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': twelveLabsApiKey,
        },
      });
      console.log('🧹 Cleaned up temporary index');
    } catch (error) {
      console.warn('⚠️ Failed to cleanup index:', error);
    }

    return new Response(JSON.stringify({
      success: true,
      audioDescriptions,
      silenceGapsAnalyzed: silenceGaps.length,
      descriptionsGenerated: audioDescriptions.length,
      language: language || 'en'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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

function detectSilenceGaps(transcriptSegments: any[]): Array<{startTime: number, endTime: number, duration: number}> {
  const gaps: Array<{startTime: number, endTime: number, duration: number}> = [];
  
  // Sort segments by start time
  const sortedSegments = [...transcriptSegments]
    .filter(s => typeof s.startTime === 'number' && typeof s.endTime === 'number')
    .sort((a, b) => a.startTime - b.startTime);

  if (sortedSegments.length === 0) return gaps;

  const minGapDuration = 3.0; // Minimum 3 seconds for audio description
  const bufferTime = 0.5; // Buffer around speech

  // Check for gap at the beginning
  if (sortedSegments[0].startTime > minGapDuration + bufferTime) {
    const gapEnd = sortedSegments[0].startTime - bufferTime;
    const duration = gapEnd;
    if (duration >= minGapDuration) {
      gaps.push({
        startTime: 0,
        endTime: gapEnd,
        duration
      });
    }
  }

  // Check gaps between segments
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

  // Check for gap at the end (if video continues after last transcript)
  const lastSegment = sortedSegments[sortedSegments.length - 1];
  const potentialGapStart = lastSegment.endTime + bufferTime;
  // We don't know the total video duration, so we'll skip the end gap for now
  
  return gaps.slice(0, 10); // Limit to first 10 gaps to avoid overwhelming
}

function cleanDescription(description: string, maxDuration: number): string {
  if (!description) return '';
  
  // Remove common prefixes and artifacts
  description = description.trim()
    .replace(/^(The scene shows|We see|The video shows|In this segment|Audio description:|Description:)/i, '')
    .replace(/\b(audio description|for blind audiences|visually)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Ensure it starts with a capital letter
  if (description.length > 0) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }
  
  // Rough word count check (assuming ~3 words per second for natural speech)
  const maxWords = Math.floor(maxDuration * 2.5); // Conservative estimate
  const words = description.split(/\s+/);
  
  if (words.length > maxWords) {
    // Truncate and add proper ending
    description = words.slice(0, maxWords).join(' ');
    // Remove incomplete sentence at the end
    const lastPeriod = description.lastIndexOf('.');
    if (lastPeriod > description.length * 0.5) {
      description = description.substring(0, lastPeriod + 1);
    }
  }
  
  // Ensure it ends with proper punctuation
  if (description && !description.match(/[.!?]$/)) {
    description += '.';
  }
  
  return description;
}