import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwelveLabsSegment {
  text: string;
  start: number;
  end: number;
  speaker?: string;
}

interface AudioDescriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  type: 'visual' | 'action' | 'emotion' | 'atmosphere';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, videoId: inputVideoId, language } = await req.json();
    
    if (!videoUrl) {
      throw new Error('Video URL is required');
    }

    const twelveLabsApiKey = Deno.env.get('TWELVE_LABS_API_KEY');
    if (!twelveLabsApiKey) {
      throw new Error('Twelve Labs API key not configured');
    }

    console.log('🎬 Starting Twelve Labs analysis for video:', inputVideoId);

    // Use direct API calls instead of SDK for better Deno compatibility
    const baseUrl = 'https://api.twelvelabs.io/v1.3';

    // Step 1: Create index for video analysis
    const indexResponse = await fetch(`${baseUrl}/indexes`, {
      method: 'POST',
      headers: {
        'x-api-key': twelveLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        index_name: `video_analysis_${inputVideoId || Date.now()}`,
        models: [
          { model_name: 'marengo2.6', options: ['visual', 'conversation', 'text_in_video'] }
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

    // Ensure we have the video_id
    if (!videoId) {
      const finalTaskResponse = await fetch(`${baseUrl}/tasks/${taskId}`, {
        headers: {
          'x-api-key': twelveLabsApiKey,
        },
      });
      const finalTask = await finalTaskResponse.json();
      videoId = finalTask.video_id || finalTask.videoId;
    }

    if (!videoId) {
      throw new Error('Video ID could not be retrieved after processing');
    }

    // Step 4: Get transcript with speaker identification
    const transcriptResponse = await fetch(`${baseUrl}/indexes/${indexId}/videos/${videoId}/conversation`, {
      headers: {
        'x-api-key': twelveLabsApiKey,
      },
    });

    if (!transcriptResponse.ok) {
      const error = await transcriptResponse.text();
      throw new Error(`Failed to get transcript: ${error}`);
    }

    const transcriptData = await transcriptResponse.json();
    console.log('📝 Retrieved transcript data');

    // Step 5: Generate creative audio descriptions using comprehensive AI analysis
    const videoDescriptionResponse = await fetch(`${baseUrl}/indexes/${indexId}/search`, {
      method: 'POST',
      headers: {
        'x-api-key': twelveLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Visual storytelling elements including cinematography, lighting, facial expressions, body language, environmental details, actions, transitions, camera movements, set design, wardrobe, props, spatial relationships, emotional atmosphere, and dramatic tension for immersive audio description',
        search_options: ['visual'],
        filter: {
          video_ids: [videoId]
        },
        page_limit: 50,
        sort_option: 'score',
      }),
    });

    let audioDescriptions: AudioDescriptionSegment[] = [];
    
    if (videoDescriptionResponse.ok) {
      const descriptionData = await videoDescriptionResponse.json();
      console.log('🎨 Retrieved visual analysis data');
      
      // Process visual analysis into timed audio descriptions
      audioDescriptions = await generateTimedAudioDescriptions(
        descriptionData.data || [],
        transcriptData.conversation || [],
        twelveLabsApiKey
      );
    } else {
      console.warn('⚠️ Visual search failed');
    }

    // Step 6: Process transcript segments with speaker identification
    const speakerColors = ['#E5E517', '#17E5E5', '#E51717', '#E58017', '#17E517', '#E517E5'];
    const speakerMap = new Map<string, { color: string; displayName: string }>();
    
    const segments = (transcriptData.conversation || []).map((segment: any, index: number) => {
      const speakerKey = segment.speaker || 'Unknown';
      
      // Assign speaker colors and names
      if (!speakerMap.has(speakerKey)) {
        const speakerIndex = speakerMap.size;
        speakerMap.set(speakerKey, {
          color: speakerColors[speakerIndex % speakerColors.length],
          displayName: speakerKey === 'Unknown' ? `Speaker ${speakerIndex + 1}` : speakerKey
        });
      }
      
      const speaker = speakerMap.get(speakerKey)!;
      
      return {
        text: segment.text,
        start: segment.start,
        end: segment.end,
        speaker: speaker.displayName,
        speakerColor: speaker.color,
        confidence: segment.confidence || 0.9,
        words: segment.words || []
      };
    }).filter(segment => segment.text.length > 0); // Filter out empty segments

    // Step 7: Cleanup - delete the temporary index
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
      segments,
      audioDescriptions,
      language: language || 'en',
      speakers: Array.from(speakerMap.entries()).map(([key, value]) => ({
        id: key,
        name: value.displayName,
        color: value.color
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Twelve Labs analysis error:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500) // Truncate stack trace
    });
    
    // Skipping index cleanup on error to avoid scope issues; indexes auto-expire

    
    // Return error as 200 response so client can handle gracefully
    return new Response(JSON.stringify({ 
      error: error.message || 'Twelve Labs analysis failed',
      errorType: 'twelve_labs_error',
      details: error.toString(),
      fallbackToWhisper: true
    }), {
      status: 200, // Return 200 so client receives the error details
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateTimedAudioDescriptions(
  visualData: any[],
  conversation: any[],
  apiKey: string
): Promise<AudioDescriptionSegment[]> {
  const descriptions: AudioDescriptionSegment[] = [];
  
  // Create enhanced speech interval map with buffer zones
  const speechIntervals = conversation.map(seg => ({
    start: Math.max(0, seg.start - 0.5), // 0.5s buffer before speech
    end: seg.end + 0.5, // 0.5s buffer after speech
    originalStart: seg.start,
    originalEnd: seg.end
  }));
  
  // Sort visual data by relevance and timing
  const sortedVisualData = visualData
    .filter(clip => clip.video_id && clip.start !== undefined && clip.end !== undefined)
    .sort((a, b) => (b.score || 0) - (a.score || 0)); // Higher relevance first
  
  for (const clip of sortedVisualData) {
    const startTime = clip.start;
    const endTime = clip.end;
    const clipDuration = endTime - startTime;
    
    // Skip very short clips (less than 2 seconds)
    if (clipDuration < 2) continue;
    
    // Check for speech overlap with enhanced logic
    const hasOverlap = speechIntervals.some(speech => {
      // More sophisticated overlap detection
      const overlapStart = Math.max(startTime, speech.start);
      const overlapEnd = Math.min(endTime, speech.end);
      const overlapDuration = Math.max(0, overlapEnd - overlapStart);
      
      // Allow if overlap is minimal (less than 20% of clip duration)
      return overlapDuration > clipDuration * 0.2;
    });
    
    if (!hasOverlap) {
      // Find contextual information for richer descriptions
      const surroundingContext = getSurroundingContext(clip, visualData, conversation);
      
      // Generate creative audio description with context
      const description = await generateCreativeDescription(clip, apiKey, surroundingContext);
      
      if (description && description.length > 10) { // Ensure meaningful content
        descriptions.push({
          text: description,
          startTime,
          endTime,
          type: determineDescriptionType(clip)
        });
      }
    }
  }
  
  // Remove overlapping descriptions and ensure proper spacing
  const finalDescriptions = removeDuplicatesAndOverlaps(descriptions);
  
  return finalDescriptions.sort((a, b) => a.startTime - b.startTime);
}

async function generateCreativeDescription(clip: any, apiKey: string, context?: any): Promise<string | null> {
  try {
    // Enhanced creative prompt for cinematic storytelling
    const contextInfo = context ? `Context: ${context.narrative || ''}` : '';
    
    const cinematicPrompt = `You are a master audio description artist creating immersive experiences for blind audiences. Transform this video segment into compelling narrative prose that captures the visual poetry and emotional landscape.

${contextInfo}

Guidelines for cinematic audio description:
- Paint the scene with rich, sensory language that evokes mood and atmosphere
- Focus on visual storytelling elements: lighting, composition, movement, expressions
- Capture the emotional undercurrent and dramatic tension
- Use evocative, literary language while remaining accessible
- Think "cinematic podcast" - engaging narrative that flows beautifully
- Prioritize what serves the story and emotional journey
- Keep concise (30-45 words) but impactful
- Avoid technical jargon, focus on experience

Create an audio description that makes the visual content come alive through words, helping listeners feel present in the scene.`;

    const response = await fetch('https://api.twelvelabs.io/v1.3/generate', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id: clip.video_id,
        type: 'summary',
        prompt: cinematicPrompt,
        temperature: 0.8, // Higher creativity
        max_tokens: 150,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      let description = data.data || null;
      
      // Post-process to ensure quality and appropriate length
      if (description) {
        description = description.trim();
        // Remove redundant phrases and ensure flow
        description = description.replace(/\b(audio description|for blind audiences|visually)\b/gi, '');
        description = description.replace(/\s+/g, ' ').trim();
        
        // Ensure appropriate length (20-60 words)
        const wordCount = description.split(/\s+/).length;
        if (wordCount < 10 || wordCount > 80) {
          return null; // Skip if too short or too long
        }
      }
      
      return description;
    }
  } catch (error) {
    console.error('Failed to generate description:', error);
  }
  
  return null;
}

function getSurroundingContext(clip: any, allVisualData: any[], conversation: any[]): any {
  const clipStart = clip.start;
  const clipEnd = clip.end;
  
  // Find nearby conversation for narrative context
  const nearbyDialogue = conversation
    .filter(seg => Math.abs(seg.start - clipStart) < 30) // Within 30 seconds
    .map(seg => seg.text)
    .join(' ');
  
  // Find visual patterns and themes
  const relatedVisuals = allVisualData
    .filter(v => v.video_id === clip.video_id && Math.abs(v.start - clipStart) < 15)
    .map(v => v.text || '')
    .join(' ');
  
  return {
    narrative: nearbyDialogue.substring(0, 200), // Limit context
    visualThemes: relatedVisuals.substring(0, 100),
    timing: { start: clipStart, end: clipEnd }
  };
}

function removeDuplicatesAndOverlaps(descriptions: AudioDescriptionSegment[]): AudioDescriptionSegment[] {
  const sorted = descriptions.sort((a, b) => a.startTime - b.startTime);
  const filtered: AudioDescriptionSegment[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    let shouldAdd = true;
    
    // Check against already added descriptions
    for (const existing of filtered) {
      // Check for time overlap
      const overlapStart = Math.max(current.startTime, existing.startTime);
      const overlapEnd = Math.min(current.endTime, existing.endTime);
      
      if (overlapStart < overlapEnd) {
        shouldAdd = false;
        break;
      }
      
      // Check for very similar content (avoid redundancy)
      const similarity = calculateTextSimilarity(current.text, existing.text);
      if (similarity > 0.7) {
        shouldAdd = false;
        break;
      }
    }
    
    if (shouldAdd) {
      filtered.push(current);
    }
  }
  
  return filtered;
}

function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = Math.max(words1.length, words2.length);
  
  return commonWords.length / totalWords;
}

function determineDescriptionType(clip: any): 'visual' | 'action' | 'emotion' | 'atmosphere' {
  const text = (clip.text || '').toLowerCase();
  const metadata = clip.metadata || {};
  
  // Enhanced type classification based on content analysis
  if (text.includes('move') || text.includes('walk') || text.includes('run') || 
      text.includes('gesture') || metadata.action) return 'action';
  
  if (text.includes('smile') || text.includes('expression') || text.includes('feel') ||
      text.includes('emotion') || metadata.emotion) return 'emotion';
  
  if (text.includes('light') || text.includes('shadow') || text.includes('mood') ||
      text.includes('atmosphere') || text.includes('setting') || metadata.atmosphere) return 'atmosphere';
  
  return 'visual';
}