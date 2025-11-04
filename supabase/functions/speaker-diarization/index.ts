import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpeakerSegment {
  speaker: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
}

// Rate limiting helper
async function checkRateLimit(
  supabase: any,
  userId: string,
  functionName: string,
  maxCallsPerHour: number = 20
): Promise<{ allowed: boolean; remaining: number }> {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  
  const { count } = await supabase
    .from('usage_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('processing_type', functionName)
    .gte('created_at', oneHourAgo);

  const callCount = count || 0;
  const remaining = Math.max(0, maxCallsPerHour - callCount);
  
  return {
    allowed: callCount < maxCallsPerHour,
    remaining
  };
}

// Structured logging
function logAPICall(details: {
  userId?: string;
  videoId?: string;
  apiService: string;
  status: 'start' | 'success' | 'error';
  duration?: number;
  error?: string;
}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    function: 'speaker-diarization',
    ...details
  }));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Get user from JWT for rate limiting
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(supabase, user.id, 'speaker-diarization', 20);
    if (!rateLimit.allowed) {
      logAPICall({
        userId: user.id,
        apiService: 'AssemblyAI',
        status: 'error',
        error: 'Rate limit exceeded'
      });
      
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: `Maximum 20 speaker diarization requests per hour. ${rateLimit.remaining} remaining.`,
        retryAfter: 3600
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' }
      });
    }

    const { videoUrl, videoId } = await req.json();

    if (!videoUrl || !videoId) {
      throw new Error('Video URL and video ID are required');
    }

    logAPICall({
      userId: user.id,
      videoId,
      apiService: 'AssemblyAI',
      status: 'start'
    });

    console.log('🎤 Starting speaker diarization for video:', videoId);
    
    const assemblyAIKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyAIKey) {
      throw new Error('AssemblyAI API key not configured');
    }

    // Step 1: Submit audio for transcription with speaker diarization
    console.log('📤 Submitting audio to AssemblyAI...');
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': assemblyAIKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: videoUrl,
        speaker_labels: true, // Enable speaker diarization
        speakers_expected: 4, // Expect up to 4 speakers (adjustable)
        auto_chapters: false,
        sentiment_analysis: false,
        entity_detection: false,
        iab_categories: false,
        content_safety: false,
        auto_highlights: false,
        language_detection: false,
        punctuate: true,
        format_text: true,
        dual_channel: false,
        speech_model: 'best' // Use the most accurate model
      }),
    });

    if (!transcriptResponse.ok) {
      const error = await transcriptResponse.text();
      throw new Error(`AssemblyAI submission failed: ${error}`);
    }

    const { id: transcriptId } = await transcriptResponse.json();
    console.log('✅ Transcript submitted, ID:', transcriptId);

    // Step 2: Poll for completion
    console.log('⏳ Polling for transcription completion...');
    let transcript;
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max wait time
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'Authorization': assemblyAIKey,
        },
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check transcription status');
      }

      transcript = await statusResponse.json();
      console.log('📊 Transcription status:', transcript.status);

      if (transcript.status === 'completed') {
        break;
      } else if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      attempts++;
    }

    if (!transcript || transcript.status !== 'completed') {
      throw new Error('Transcription timed out or failed');
    }

    console.log('🎯 Transcription completed, processing speaker segments...');

    // Step 3: Process utterances with speaker labels
    const speakerSegments: SpeakerSegment[] = [];
    const speakerMap = new Map<string, number>();
    let speakerCounter = 0;

    // Color palette for speakers (high contrast, accessible colors)
    const speakerColors = [
      '#E5E517', // Bright Yellow
      '#17E5E5', // Bright Cyan  
      '#E51717', // Bright Red
      '#E58017', // Bright Orange
      '#17E517', // Bright Green
      '#E517E5', // Bright Magenta
      '#47C2EB', // Light Blue
      '#EBC247', // Gold
      '#C2EB47', // Lime Green
      '#EB47C2', // Pink
      '#8C6BED', // Purple
      '#ED5E82'  // Rose
    ];

    if (transcript.utterances && transcript.utterances.length > 0) {
      console.log(`🗣️ Processing ${transcript.utterances.length} utterances with speaker labels`);
      
      transcript.utterances.forEach((utterance: any) => {
        const speakerLabel = utterance.speaker || 'Unknown';
        
        // Assign consistent speaker ID and color
        if (!speakerMap.has(speakerLabel)) {
          speakerMap.set(speakerLabel, speakerCounter);
          speakerCounter++;
        }
        
        const speakerIndex = speakerMap.get(speakerLabel)!;
        const speakerColor = speakerColors[speakerIndex % speakerColors.length];
        
        speakerSegments.push({
          speaker: `Speaker ${speakerIndex + 1}`,
          startTime: utterance.start / 1000, // Convert ms to seconds
          endTime: utterance.end / 1000,
          text: utterance.text,
          confidence: utterance.confidence
        });
      });
    } else {
      // Fallback: use words with speaker labels if utterances not available
      console.log('📝 Using word-level speaker labels as fallback');
      
      if (transcript.words && transcript.words.length > 0) {
        let currentSpeaker = '';
        let currentText = '';
        let currentStart = 0;
        let currentEnd = 0;
        
        transcript.words.forEach((word: any, index: number) => {
          const wordSpeaker = word.speaker || 'A';
          
          if (wordSpeaker !== currentSpeaker && currentText) {
            // Save previous segment
            if (!speakerMap.has(currentSpeaker)) {
              speakerMap.set(currentSpeaker, speakerCounter);
              speakerCounter++;
            }
            
            const speakerIndex = speakerMap.get(currentSpeaker)!;
            const speakerColor = speakerColors[speakerIndex % speakerColors.length];
            
            speakerSegments.push({
              speaker: `Speaker ${speakerIndex + 1}`,
              startTime: currentStart / 1000,
              endTime: currentEnd / 1000,
              text: currentText.trim(),
              confidence: word.confidence || 0.9
            });
            
            // Reset for new speaker
            currentText = '';
          }
          
          // Update current segment
          if (!currentText) {
            currentStart = word.start;
          }
          currentSpeaker = wordSpeaker;
          currentText += (currentText ? ' ' : '') + word.text;
          currentEnd = word.end;
          
          // Handle last word
          if (index === transcript.words.length - 1) {
            if (!speakerMap.has(currentSpeaker)) {
              speakerMap.set(currentSpeaker, speakerCounter);
              speakerCounter++;
            }
            
            const speakerIndex = speakerMap.get(currentSpeaker)!;
            
            speakerSegments.push({
              speaker: `Speaker ${speakerIndex + 1}`,
              startTime: currentStart / 1000,
              endTime: currentEnd / 1000,
              text: currentText.trim(),
              confidence: word.confidence || 0.9
            });
          }
        });
      }
    }

    // Step 4: Generate speaker metadata
    const speakerMetadata = Array.from(speakerMap.entries()).map(([originalLabel, index]) => ({
      id: `speaker_${index + 1}`,
      name: `Speaker ${index + 1}`,
      originalLabel,
      color: speakerColors[index % speakerColors.length],
      segmentCount: speakerSegments.filter(s => s.speaker === `Speaker ${index + 1}`).length,
      totalTimeSeconds: speakerSegments
        .filter(s => s.speaker === `Speaker ${index + 1}`)
        .reduce((total, segment) => total + (segment.endTime - segment.startTime), 0)
    }));

    console.log(`✅ Speaker diarization complete: ${speakerCounter} speakers identified, ${speakerSegments.length} segments`);
    console.log('🎨 Speaker metadata:', speakerMetadata);

    logAPICall({
      userId: user.id,
      videoId,
      apiService: 'AssemblyAI',
      status: 'success',
      duration: Date.now() - startTime
    });

    // Step 5: Store results in Supabase and update transcript segments
    try {

      // First, cache the results
      await supabase
        .from('content_generation_cache')
        .upsert({
          video_id: videoId,
          content_type: 'speaker_diarization',
          language: 'en',
          generation_params: {
            speakers_expected: speakerCounter,
            model: 'assemblyai_best',
            timestamp: Date.now()
          },
          result_data: {
            segments: speakerSegments,
            speakers: speakerMetadata,
            total_speakers: speakerCounter,
            processing_time_ms: Date.now()
          }
        }, {
          onConflict: 'video_id,content_type,language'
        });

      console.log('💾 Results cached to database');

      // Step 6: Apply speaker labels to existing transcript segments
      console.log('🔄 Applying speaker labels to transcript segments...');
      
      for (const segment of speakerSegments) {
        // Find matching transcript segments by time overlap
        const { data: matchingSegments } = await supabase
          .from('transcript_segments_clean')
          .select('id, start_time, end_time')
          .eq('video_id', videoId)
          .gte('start_time', segment.startTime - 0.5) // Allow 0.5s tolerance
          .lte('end_time', segment.endTime + 0.5);

        if (matchingSegments && matchingSegments.length > 0) {
          // Update all matching segments with speaker info
          const speakerIndex = parseInt(segment.speaker.split(' ')[1]) - 1;
          const speakerColor = speakerColors[speakerIndex % speakerColors.length];
          
          for (const matchingSegment of matchingSegments) {
            await supabase
              .from('transcript_segments_clean')
              .update({
                speaker: segment.speaker,
                speaker_color: speakerColor
              })
              .eq('id', matchingSegment.id);
          }
          
          console.log(`✅ Updated ${matchingSegments.length} segments for ${segment.speaker}`);
        }
      }

      console.log('🎯 Speaker diarization and segment updates complete');
      
    } catch (dbError) {
      console.warn('⚠️ Failed to cache results or update segments:', dbError);
      // Continue anyway - caching is optional
    }

    return new Response(
      JSON.stringify({
        success: true,
        speakers: speakerMetadata,
        segments: speakerSegments,
        totalSpeakers: speakerCounter,
        transcriptId,
        processingTimeMs: Date.now()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Speaker diarization error:', error);
    
    logAPICall({
      apiService: 'AssemblyAI',
      status: 'error',
      duration: Date.now() - startTime,
      error: error.message
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Speaker diarization failed',
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});