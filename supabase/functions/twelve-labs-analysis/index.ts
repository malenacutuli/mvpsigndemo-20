import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { videoUrl, videoId, language } = await req.json();
    
    if (!videoUrl) {
      throw new Error('Video URL is required');
    }

    const twelveLabsApiKey = Deno.env.get('TWELVE_LABS_API_KEY');
    if (!twelveLabsApiKey) {
      throw new Error('Twelve Labs API key not configured');
    }

    console.log('🎬 Starting Twelve Labs analysis for video:', videoId);

    // Step 1: Create index for video analysis
    const indexResponse = await fetch('https://api.twelvelabs.io/v1.2/indexes', {
      method: 'POST',
      headers: {
        'x-api-key': twelveLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        engine_name: 'marengo2.6',
        index_options: ['visual', 'conversation', 'text_in_video'],
        index_name: `video_analysis_${videoId}`,
      }),
    });

    if (!indexResponse.ok) {
      const error = await indexResponse.text();
      throw new Error(`Failed to create index: ${error}`);
    }

    const indexData = await indexResponse.json();
    const indexId = indexData._id;
    console.log('✅ Created Twelve Labs index:', indexId);

    // Step 2: Upload video for analysis
    const uploadResponse = await fetch(`https://api.twelvelabs.io/v1.2/indexes/${indexId}/videos`, {
      method: 'POST',
      headers: {
        'x-api-key': twelveLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: videoUrl,
        language: language || 'en',
      }),
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Failed to upload video: ${error}`);
    }

    const uploadData = await uploadResponse.json();
    const taskId = uploadData._id;
    console.log('🎥 Video upload initiated, task ID:', taskId);

    // Step 3: Wait for video processing to complete
    let processingComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max

    while (!processingComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const statusResponse = await fetch(`https://api.twelvelabs.io/v1.2/tasks/${taskId}`, {
        headers: {
          'x-api-key': twelveLabsApiKey,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log(`📊 Processing status: ${statusData.status}`);
        
        if (statusData.status === 'ready') {
          processingComplete = true;
        } else if (statusData.status === 'failed') {
          throw new Error(`Video processing failed: ${statusData.message}`);
        }
      }
      
      attempts++;
    }

    if (!processingComplete) {
      throw new Error('Video processing timeout');
    }

    // Step 4: Get transcript with speaker identification
    const transcriptResponse = await fetch(`https://api.twelvelabs.io/v1.2/indexes/${indexId}/videos/${taskId}/conversation`, {
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

    // Step 5: Generate creative audio descriptions using AI analysis
    const videoDescriptionResponse = await fetch(`https://api.twelvelabs.io/v1.2/indexes/${indexId}/search`, {
      method: 'POST',
      headers: {
        'x-api-key': twelveLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Describe all visual elements, actions, emotions, and atmosphere in detail for blind accessibility',
        search_options: ['visual'],
        filter: {
          video_ids: [taskId]
        },
        page_limit: 20,
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
    });

    // Step 7: Cleanup - delete the temporary index
    try {
      await fetch(`https://api.twelvelabs.io/v1.2/indexes/${indexId}`, {
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
    
    // Try to clean up any created index
    if (typeof indexId !== 'undefined') {
      try {
        console.log('🧹 Attempting cleanup of index:', indexId);
        await fetch(`https://api.twelvelabs.io/v1.2/indexes/${indexId}`, {
          method: 'DELETE',
          headers: {
            'x-api-key': Deno.env.get('TWELVE_LABS_API_KEY'),
          },
        });
        console.log('✨ Index cleanup completed');
      } catch (cleanupError) {
        console.error('⚠️ Failed to cleanup index:', cleanupError);
      }
    }
    
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
  
  // Create a map of speech intervals to avoid overlap
  const speechIntervals = conversation.map(seg => ({
    start: seg.start,
    end: seg.end
  }));
  
  for (const clip of visualData) {
    if (!clip.video_id || !clip.start || !clip.end) continue;
    
    const startTime = clip.start;
    const endTime = clip.end;
    
    // Check if this time slot overlaps with speech
    const hasOverlap = speechIntervals.some(speech => 
      !(endTime <= speech.start || startTime >= speech.end)
    );
    
    if (!hasOverlap) {
      // Generate creative audio description for this visual segment
      const description = await generateCreativeDescription(clip, apiKey);
      
      if (description) {
        descriptions.push({
          text: description,
          startTime,
          endTime,
          type: determineDescriptionType(clip)
        });
      }
    }
  }
  
  return descriptions.sort((a, b) => a.startTime - b.startTime);
}

async function generateCreativeDescription(clip: any, apiKey: string): Promise<string | null> {
  try {
    // Use Twelve Labs' generate API for creative descriptions
    const response = await fetch('https://api.twelvelabs.io/v1.2/generate', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id: clip.video_id,
        type: 'summary',
        prompt: `Create a creative, cinematic audio description for this video segment. Focus on visual storytelling that helps blind listeners understand the mood, atmosphere, actions, and emotions. Be creative and engaging, like a podcast narrator. Keep it under 50 words and make it immersive.`,
        temperature: 0.7,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data || null;
    }
  } catch (error) {
    console.error('Failed to generate description:', error);
  }
  
  return null;
}

function determineDescriptionType(clip: any): 'visual' | 'action' | 'emotion' | 'atmosphere' {
  const confidence = clip.confidence || 0;
  const metadata = clip.metadata || {};
  
  if (metadata.action || clip.text?.includes('action')) return 'action';
  if (metadata.emotion || clip.text?.includes('emotion')) return 'emotion';
  if (metadata.atmosphere || clip.text?.includes('atmosphere')) return 'atmosphere';
  
  return 'visual';
}