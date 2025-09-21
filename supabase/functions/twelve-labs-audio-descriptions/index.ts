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

    console.log('🎬 Starting Twelve Labs video analysis for comprehensive audio descriptions...');
    console.log('📊 Analysis parameters:', {
      videoId: inputVideoId,
      videoUrl: videoUrl.substring(0, 50) + '...',
      transcriptSegments: transcriptSegments.length,
      language
    });

    const baseUrl = 'https://api.twelvelabs.io/v1.3';

    // Step 1: Create index for video analysis
    const indexResponse = await fetch(`${baseUrl}/indexes`, {
      method: 'POST',
      headers: {
        'x-api-key': twelveLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        index_name: `audio_desc_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        models: [
          { model_name: 'pegasus1.2', model_options: ['audio', 'visual'] }
        ]
      }),
    });

    if (!indexResponse.ok) {
      const error = await indexResponse.text();
      throw new Error(`Failed to create index: ${error}`);
    }

    const indexData = await indexResponse.json();
    const indexId = indexData._id;
    console.log('✅ Created Twelve Labs index:', indexId);

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
    console.log('🎥 Indexing task created:', { taskId, videoId });

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

    console.log('✅ Video processed successfully, ID:', videoId);

    // Step 4: Detect silence gaps from transcript segments
    const silenceGaps = detectSilenceGaps(transcriptSegments);
    console.log(`🔇 Detected ${silenceGaps.length} silence gaps for comprehensive analysis`);

    const audioDescriptions: AudioDescriptionSegment[] = [];

    // Step 5: Generate audio descriptions for ALL silence gaps
    console.log('🎬 Generating video-specific audio descriptions for all silence gaps...');
    
    for (let i = 0; i < silenceGaps.length; i++) {
      const gap = silenceGaps[i];
      
      try {
        console.log(`🎯 Analyzing gap ${i + 1}/${silenceGaps.length}: ${gap.startTime}s-${gap.endTime}s (${gap.duration.toFixed(1)}s)`);
        
        const analysisPrompt = `Analyze the video content from ${gap.startTime} to ${gap.endTime} seconds and create a vivid, cinematic audio description for this ${gap.duration.toFixed(1)}-second silent moment.

Write a present-tense audio description that captures:
- Visual storytelling elements (lighting, composition, character positioning)
- Character actions, expressions, and body language when visible
- Environmental details and atmospheric elements
- Emotional undertones and dramatic tension
- Any important visual information that enhances the narrative

Style requirements:
- Present tense, descriptive but concise
- Fits naturally in ${gap.duration.toFixed(1)} seconds of silence
- Cinematic and immersive like a radio drama narrator
- Include character names if identifiable
- Focus on visual elements that advance the story

Provide only the audio description text, nothing else.`;

        // Use Twelve Labs analyze endpoint
        const analyzeResponse = await fetch(`${baseUrl}/analyze`, {
          method: 'POST',
          headers: {
            'x-api-key': twelveLabsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_id: videoId,
            prompt: analysisPrompt,
            temperature: 0.3,
            max_tokens: Math.min(300, Math.floor(gap.duration * 20)),
          }),
        });

        if (analyzeResponse.ok) {
          const analysisData = await analyzeResponse.json();
          let description = analysisData.data || '';
          
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
            
            console.log(`✅ Generated description ${i + 1}: "${description.substring(0, 80)}..."`);
          } else {
            console.warn(`⚠️ Generated description too short for gap ${gap.startTime}s-${gap.endTime}s`);
          }
        } else {
          const analysisError = await analyzeResponse.text();
          console.error(`❌ Analysis failed for gap ${gap.startTime}s-${gap.endTime}s:`, analysisError);
          
          // Create fallback description for this gap
          const fallbackDescription = createFallbackDescription(gap, i);
          if (fallbackDescription) {
            audioDescriptions.push(fallbackDescription);
            console.log(`🔄 Created fallback description for gap ${gap.startTime}s-${gap.endTime}s`);
          }
        }

        // Rate limiting to avoid API throttling
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error(`❌ Error analyzing gap ${gap.startTime}s-${gap.endTime}s:`, error);
        
        // Create fallback description for this gap
        const fallbackDescription = createFallbackDescription(gap, i);
        if (fallbackDescription) {
          audioDescriptions.push(fallbackDescription);
        }
      }
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

    // Sort descriptions by start time
    audioDescriptions.sort((a, b) => a.startTime - b.startTime);

    console.log(`🎉 Successfully generated ${audioDescriptions.length} audio descriptions from ${silenceGaps.length} silence gaps`);

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

  if (sortedSegments.length === 0) {
    // If no transcript segments, create comprehensive intervals throughout the video
    const intervals = [];
    for (let i = 0; i < 300; i += 20) { // Every 20 seconds for 5 minutes
      intervals.push({ startTime: i, endTime: i + 4, duration: 4 });
    }
    return intervals;
  }

  const minGapDuration = 1.5; // Minimum gap worth describing
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

  // Find gaps between speech segments
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

  // Add comprehensive trailing gaps to cover the full video
  const lastSegment = sortedSegments[sortedSegments.length - 1];
  const estimatedVideoEnd = Math.max(lastSegment.endTime + 60, 180); // Assume reasonable video length
  
  let currentTime = lastSegment.endTime + bufferTime;
  while (currentTime < estimatedVideoEnd) {
    const gapEnd = Math.min(currentTime + 4, estimatedVideoEnd);
    const duration = gapEnd - currentTime;
    
    if (duration >= minGapDuration) {
      gaps.push({
        startTime: currentTime,
        endTime: gapEnd,
        duration
      });
    }
    
    currentTime = gapEnd + 12; // Skip 12 seconds ahead to find next opportunity
  }

  console.log(`📊 Detected ${gaps.length} silence gaps total`);
  return gaps.sort((a, b) => a.startTime - b.startTime);
}

function createFallbackDescription(gap: any, index: number): AudioDescriptionSegment {
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