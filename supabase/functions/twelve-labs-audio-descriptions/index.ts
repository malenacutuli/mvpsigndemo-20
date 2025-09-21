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

    console.log('🎬 Starting comprehensive Twelve Labs audio description analysis...');
    console.log('📊 Video analysis parameters:', {
      videoId: inputVideoId,
      videoUrl: videoUrl.substring(0, 50) + '...',
      transcriptSegments: transcriptSegments.length,
      language
    });

    const baseUrl = 'https://api.twelvelabs.io/v1.3';

    // Step 1: Create index for video analysis (with retries)
    let indexId: string | null = null;
    for (let attempt = 0; attempt < 3 && !indexId; attempt++) {
      try {
        const res = await fetch(`${baseUrl}/indexes`, {
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

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Failed to create index: ${error}`);
        }

        const created = await res.json();
        indexId = created._id;
      } catch (e) {
        console.warn(`⚠️ Create index attempt ${attempt + 1} failed`, e);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    if (!indexId) {
      throw new Error('Failed to create Twelve Labs index after retries');
    }

    console.log('✅ Created Twelve Labs index for audio descriptions:', indexId);

    // Step 2: Create video indexing task (with retries)
    let taskId: string | null = null;
    let videoId: string | null = null;
    for (let attempt = 0; attempt < 3 && !taskId; attempt++) {
      try {
        const res = await fetch(`${baseUrl}/tasks`, {
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

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Failed to create indexing task: ${error}`);
        }

        const taskData = await res.json();
        taskId = taskData._id;
        videoId = taskData.video_id || null;
      } catch (e) {
        console.warn(`⚠️ Create task attempt ${attempt + 1} failed`, e);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    if (!taskId) {
      throw new Error('Failed to create Twelve Labs task after retries');
    }

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

    // Step 5: Generate comprehensive audio descriptions using the exact prompt structure
    console.log('🎬 Generating comprehensive audio descriptions with detailed analysis...');
    
    // Use the comprehensive prompt that matches the platform's direct analysis
    const comprehensivePrompt = `Analyze the provided video and perform the following steps:

Detect Silence:
Identify every moment in the video where there is no character dialogue or narration.
Provide exact start and end timestamps for each silent gap.

Duration Check:
Calculate the length of each silent gap.
Ensure that any generated description fits naturally within the available time — concise, clear, and not exceeding the gap's duration.

Creative Descriptions:
For each silent moment, write a cinematic narrative description that could be spoken as audio description. Call out the name of the characters if known.
Style: creative advertising copywriter, blending audiobook storytelling with cinematic atmosphere.
Focus on story, emotions, and sensory details, not technical aspects like camera angles.
Descriptions should flow like a narrative podcast, enhancing immersion for listeners who cannot see the visuals.

Output Format:
For each silent gap, provide:
Timestamp (start → end)
Gap duration
Narrative description (concise enough to fit in the silence)

Analyze the entire video comprehensively and provide detailed results for ALL silent moments you detect.`;

    // Generate comprehensive analysis
    const comprehensiveResponse = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'x-api-key': twelveLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id: videoId,
        type: 'summary',
        prompt: comprehensivePrompt,
        temperature: 0.7,
        max_tokens: 4000, // Increased for comprehensive analysis
      }),
    });

    const audioDescriptions: AudioDescriptionSegment[] = [];

    if (comprehensiveResponse.ok) {
      const comprehensiveData = await comprehensiveResponse.json();
      const analysisResult = comprehensiveData.data || '';
      
      console.log('📊 Comprehensive analysis result:', analysisResult.substring(0, 300) + '...');
      
      // Parse the comprehensive analysis to extract timestamp and description pairs
      const parsedDescriptions = parseComprehensiveAnalysis(analysisResult);
      
      if (parsedDescriptions.length > 0) {
        audioDescriptions.push(...parsedDescriptions);
        console.log(`✅ Successfully parsed ${parsedDescriptions.length} audio descriptions from comprehensive analysis`);
      } else {
        console.warn('⚠️ No descriptions could be parsed from comprehensive analysis, falling back to gap-based approach');
        
        // Fallback: generate descriptions for detected silence gaps
        for (const gap of silenceGaps.slice(0, 20)) { // Generate up to 20 gaps to match platform analysis
          try {
            const gapPrompt = `For the video segment from ${gap.startTime}s to ${gap.endTime}s (${gap.duration.toFixed(1)} seconds), write a cinematic narrative audio description. Style: creative advertising copywriter, blending audiobook storytelling with cinematic atmosphere. Focus on story, emotions, and sensory details. Call out character names if known. Keep it concise to fit in ${gap.duration.toFixed(1)} seconds.`;

            const gapResponse = await fetch(`${baseUrl}/generate`, {
              method: 'POST',
              headers: {
                'x-api-key': twelveLabsApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                video_id: videoId,
                type: 'summary',
                prompt: gapPrompt,
                temperature: 0.8,
                max_tokens: Math.min(200, Math.floor(gap.duration * 8)),
              }),
            });

            if (gapResponse.ok) {
              const gapData = await gapResponse.json();
              let description = gapData.data || '';
              
              description = cleanDescription(description, gap.duration);
              
              if (description && description.length > 10) {
                audioDescriptions.push({
                  text: description,
                  startTime: gap.startTime,
                  endTime: gap.endTime,
                  duration: gap.duration,
                  type: 'silence_gap'
                });
              }
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1500));
          } catch (error) {
            console.error(`❌ Error generating fallback description for gap ${gap.startTime}s-${gap.endTime}s:`, error);
          }
        }
      }
    } else {
      const errorText = await comprehensiveResponse.text();
      console.error('❌ Comprehensive analysis failed:', errorText);
      throw new Error(`Comprehensive analysis failed: ${errorText}`);
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

function parseComprehensiveAnalysis(analysisText: string): AudioDescriptionSegment[] {
  const descriptions: AudioDescriptionSegment[] = [];
  
  try {
    // Extract all timestamp patterns and their descriptions
    const timestampPattern = /Timestamp:\s*(\d+)s?\s*\(?\d*:?\d*\)?\s*→\s*(\d+)s?\s*\(?\d*:?\d*\)?\s*(?:\n|$)/gi;
    const gapDurationPattern = /Gap Duration:\s*(\d+(?:\.\d+)?)\s*seconds?/gi;
    const descriptionPattern = /Narrative Description:\s*"([^"]+)"/gi;
    
    // Split text into segments by timestamp
    const segments = analysisText.split(/(?=Timestamp:)/gi).filter(segment => segment.trim());
    
    for (const segment of segments) {
      // Reset regex lastIndex
      timestampPattern.lastIndex = 0;
      gapDurationPattern.lastIndex = 0;
      descriptionPattern.lastIndex = 0;
      
      const timestampMatch = timestampPattern.exec(segment);
      const durationMatch = gapDurationPattern.exec(segment);
      const descriptionMatch = descriptionPattern.exec(segment);
      
      if (timestampMatch && descriptionMatch) {
        const startTime = parseInt(timestampMatch[1]);
        const endTime = parseInt(timestampMatch[2]);
        const duration = durationMatch ? parseFloat(durationMatch[1]) : (endTime - startTime);
        const description = descriptionMatch[1];
        
        // Validate the extracted data
        if (startTime >= 0 && endTime > startTime && description.length > 5) {
          descriptions.push({
            text: description,
            startTime: startTime,
            endTime: endTime,
            duration: duration,
            type: 'silence_gap'
          });
        }
      }
    }
    
    console.log(`📝 Parsed ${descriptions.length} descriptions from comprehensive analysis`);
    return descriptions;
    
  } catch (error) {
    console.error('❌ Error parsing comprehensive analysis:', error);
    return [];
  }
}

function detectSilenceGaps(transcriptSegments: any[]): Array<{startTime: number, endTime: number, duration: number}> {
  const gaps: Array<{startTime: number, endTime: number, duration: number}> = [];
  
  // Sort segments by start time
  const sortedSegments = [...transcriptSegments]
    .filter(s => typeof s.startTime === 'number' && typeof s.endTime === 'number')
    .sort((a, b) => a.startTime - b.startTime);

  if (sortedSegments.length === 0) {
    // If no transcript segments, create comprehensive intervals for descriptions
    return [
      { startTime: 0, endTime: 6, duration: 6 },
      { startTime: 15, endTime: 20, duration: 5 },
      { startTime: 35, endTime: 40, duration: 5 },
      { startTime: 60, endTime: 65, duration: 5 },
      { startTime: 90, endTime: 95, duration: 5 }
    ];
  }

  // More comprehensive gap detection to match platform analysis
  const minGapDuration = 1.0; // Reduced minimum for more comprehensive detection
  const bufferTime = 0.2; // Smaller buffer for more precise gaps
  
  // Always add opening gap if video doesn't start immediately with speech
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

  // Comprehensive gap detection between all segments
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

  // Add comprehensive trailing gaps
  const lastSegment = sortedSegments[sortedSegments.length - 1];
  const estimatedVideoDuration = Math.max(lastSegment.endTime + 60, 300); // Assume video continues
  
  // Add multiple trailing gaps for comprehensive coverage
  let currentTime = lastSegment.endTime + bufferTime;
  while (currentTime < estimatedVideoDuration) {
    const gapEnd = Math.min(currentTime + 5, estimatedVideoDuration);
    const duration = gapEnd - currentTime;
    
    if (duration >= minGapDuration) {
      gaps.push({
        startTime: currentTime,
        endTime: gapEnd,
        duration
      });
    }
    
    currentTime = gapEnd + 10; // Skip ahead to find more gaps
  }

  // If we still have limited gaps, create strategic intervals throughout the video
  if (gaps.length < 5) {
    const totalDuration = Math.max(lastSegment.endTime, 180);
    const intervalSize = totalDuration / 8; // Create 8 potential intervals
    
    for (let i = 0; i < 8; i++) {
      const start = i * intervalSize + 2;
      const end = start + 4;
      
      // Only add if it doesn't overlap significantly with existing speech
      const overlaps = sortedSegments.some(seg => 
        (start >= seg.startTime - 1 && start <= seg.endTime + 1) ||
        (end >= seg.startTime - 1 && end <= seg.endTime + 1)
      );
      
      if (!overlaps && start < totalDuration && !gaps.some(gap => 
        Math.abs(gap.startTime - start) < 5
      )) {
        gaps.push({
          startTime: start,
          endTime: end,
          duration: 4
        });
      }
    }
  }
  
  // Sort gaps by start time and return comprehensive list
  return gaps.sort((a, b) => a.startTime - b.startTime).slice(0, 20); // Allow up to 20 gaps for comprehensive analysis
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