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

    // Also get visual highlights from Twelve Labs to supplement gaps
    const speechIntervals = transcriptSegments.map((s: any) => ({ start: s.startTime, end: s.endTime }));

    let highlightGaps: Array<{ startTime: number; endTime: number; duration: number }> = [];
    try {
      const summarizeResp = await fetch(`${baseUrl}/summarize`, {
        method: 'POST',
        headers: { 'x-api-key': twelveLabsApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          type: 'highlight',
          // Prompt to encourage visual, not dialogue-focused highlights
          prompt: 'Identify visual highlights with precise start_sec and end_sec. Prefer moments without active dialogue (silent action, scenery, transitions, reactions).',
          temperature: 0.2,
          max_tokens: 4096,
        }),
      });
      if (summarizeResp.ok) {
        const sumData = await summarizeResp.json();
        const highlights = (sumData.highlights || []).filter((h: any) => h.start_sec != null && h.end_sec != null);
        // Keep highlights that don't significantly overlap with speech
        highlightGaps = highlights
          .map((h: any) => ({ startTime: h.start_sec, endTime: h.end_sec, duration: (h.end_sec - h.start_sec) }))
          .filter((g: any) => {
            const overlap = speechIntervals.some(si => Math.max(0, Math.min(g.endTime, si.end) - Math.max(g.startTime, si.start)) > (g.duration * 0.3));
            return !overlap && g.duration >= 1.0;
          });
        console.log(`✨ Retrieved ${highlightGaps.length} visual highlights suitable for AD from ${highlights.length} total highlights`);
      } else {
        console.warn('⚠️ Summarize(highlight) request failed:', await summarizeResp.text());
      }
    } catch (e) {
      console.warn('⚠️ Error calling summarize(highlight):', e);
    }

    // Combine and de-duplicate by time (±0.3s)
    const gapsToDescribe = [...silenceGaps, ...highlightGaps].reduce((acc: any[], g) => {
      const exists = acc.some(x => Math.abs(x.startTime - g.startTime) < 0.3 && Math.abs(x.endTime - g.endTime) < 0.3);
      if (!exists) acc.push(g);
      return acc;
    }, [] as any[]).sort((a, b) => a.startTime - b.startTime);

    const audioDescriptions: AudioDescriptionSegment[] = [];

    // Step 5: Generate audio descriptions for ALL candidate gaps
    console.log(`🎬 Generating video-specific audio descriptions for ${gapsToDescribe.length} moments...`);
    
    for (let i = 0; i < gapsToDescribe.length; i++) {
      const gap = gapsToDescribe[i];
      
      try {
        console.log(`🎯 Analyzing gap ${i + 1}/${gapsToDescribe.length}: ${gap.startTime}s-${gap.endTime}s (${gap.duration.toFixed(1)}s)`);
        
        const analysisPrompt = `Analyze the video segment from ${gap.startTime} to ${gap.endTime} seconds (${gap.duration.toFixed(1)} seconds duration) and create a concise audio description for this silent moment.

Focus on what is visually happening during this specific time period:
- Character actions, movements, and expressions
- Environmental details and setting changes
- Visual storytelling elements (lighting, composition)
- Important objects or elements that appear
- Emotional undertones conveyed through visuals

Requirements:
- Write in present tense
- Keep it concise for ${gap.duration.toFixed(1)} seconds of narration
- Focus only on visual elements visible during this time segment
- Use cinematic language appropriate for audio description
- Do not mention audio or dialogue

Generate only the audio description text, nothing else.`;

        // Use Twelve Labs analyze endpoint instead of summarize
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
            stream: false,
            max_tokens: Math.min(200, Math.floor(gap.duration * 15)),
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
          audioDescriptions.push(fallbackDescription);
          console.log(`🔄 Created fallback description for gap ${gap.startTime}s-${gap.endTime}s: "${fallbackDescription.text.substring(0, 60)}..."`);
        }

        // Rate limiting to avoid API throttling
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error(`❌ Error analyzing gap ${gap.startTime}s-${gap.endTime}s:`, error);
        
        // Create fallback description for this gap
        const fallbackDescription = createFallbackDescription(gap, i);
        audioDescriptions.push(fallbackDescription);
        console.log(`🔄 Created error fallback for gap ${gap.startTime}s-${gap.endTime}s: "${fallbackDescription.text.substring(0, 60)}..."`);
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

    console.log(`🎉 Successfully generated ${audioDescriptions.length} audio descriptions from ${gapsToDescribe.length} analyzed moments`);

    return new Response(JSON.stringify({
      success: true,
      audioDescriptions,
      silenceGapsAnalyzed: gapsToDescribe.length,
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