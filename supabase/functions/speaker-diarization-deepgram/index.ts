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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, videoId } = await req.json();

    if (!videoUrl || !videoId) {
      throw new Error('Video URL and video ID are required');
    }

    console.log('🎤 Starting Deepgram speaker diarization for video:', videoId);
    
    const deepgramKey = Deno.env.get('DEEPGRAM_API_KEY');
    if (!deepgramKey) {
      throw new Error('Deepgram API key not configured');
    }

    // Call Deepgram API with speaker diarization enabled
    console.log('📤 Submitting audio to Deepgram Nova-2...');
    const startTime = Date.now();
    
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: videoUrl,
        model: 'nova-2',
        smart_format: true,
        punctuate: true,
        diarize: true,
        utterances: true,
        language: 'en'
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deepgram request failed: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Deepgram transcription complete');

    // Process utterances with speaker labels
    const speakerSegments: SpeakerSegment[] = [];
    const speakerMap = new Map<number, number>();
    let speakerCounter = 0;

    // Color palette matching AssemblyAI for consistency
    const speakerColors = [
      '#E5E517', '#17E5E5', '#E51717', '#E58017', '#17E517', '#E517E5',
      '#47C2EB', '#EBC247', '#C2EB47', '#EB47C2', '#8C6BED', '#ED5E82'
    ];

    if (result.results?.utterances && result.results.utterances.length > 0) {
      console.log(`🗣️ Processing ${result.results.utterances.length} utterances with speaker labels`);
      
      result.results.utterances.forEach((utterance: any) => {
        const speakerIndex = utterance.speaker ?? 0;
        
        // Assign consistent speaker ID
        if (!speakerMap.has(speakerIndex)) {
          speakerMap.set(speakerIndex, speakerCounter);
          speakerCounter++;
        }
        
        const mappedIndex = speakerMap.get(speakerIndex)!;
        
        speakerSegments.push({
          speaker: `Speaker ${mappedIndex + 1}`,
          startTime: utterance.start,
          endTime: utterance.end,
          text: utterance.transcript,
          confidence: utterance.confidence || 0.9
        });
      });
    } else {
      throw new Error('No utterances with speaker labels found in Deepgram response');
    }

    // Generate speaker metadata
    const speakerMetadata = Array.from(speakerMap.entries()).map(([originalLabel, index]) => ({
      id: `speaker_${index + 1}`,
      name: `Speaker ${index + 1}`,
      originalLabel: `Speaker ${originalLabel}`,
      color: speakerColors[index % speakerColors.length],
      segmentCount: speakerSegments.filter(s => s.speaker === `Speaker ${index + 1}`).length,
      totalTimeSeconds: speakerSegments
        .filter(s => s.speaker === `Speaker ${index + 1}`)
        .reduce((total, segment) => total + (segment.endTime - segment.startTime), 0)
    }));

    const processingTime = Date.now() - startTime;
    console.log(`✅ Deepgram diarization complete: ${speakerCounter} speakers identified, ${speakerSegments.length} segments in ${processingTime}ms`);

    // Cache results and update transcript segments
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabase
        .from('content_generation_cache')
        .upsert({
          video_id: videoId,
          content_type: 'speaker_diarization',
          language: 'en',
          generation_params: {
            speakers_expected: speakerCounter,
            model: 'deepgram_nova2',
            timestamp: Date.now()
          },
          result_data: {
            segments: speakerSegments,
            speakers: speakerMetadata,
            total_speakers: speakerCounter,
            processing_time_ms: processingTime
          }
        }, {
          onConflict: 'video_id,content_type,language'
        });

      console.log('💾 Results cached to database');

      // Apply speaker labels to transcript segments
      console.log('🔄 Applying speaker labels to transcript segments...');
      
      for (const segment of speakerSegments) {
        const { data: matchingSegments } = await supabase
          .from('transcript_segments')
          .select('id, start_time, end_time')
          .eq('video_id', videoId)
          .gte('start_time', segment.startTime - 0.5)
          .lte('end_time', segment.endTime + 0.5);

        if (matchingSegments && matchingSegments.length > 0) {
          const speakerIndex = parseInt(segment.speaker.split(' ')[1]) - 1;
          const speakerColor = speakerColors[speakerIndex % speakerColors.length];
          
          for (const matchingSegment of matchingSegments) {
            await supabase
              .from('transcript_segments')
              .update({
                speaker: segment.speaker,
                speaker_color: speakerColor
              })
              .eq('id', matchingSegment.id);
          }
          
          console.log(`✅ Updated ${matchingSegments.length} segments for ${segment.speaker}`);
        }
      }

      console.log('🎯 Deepgram diarization and segment updates complete');
      
    } catch (dbError) {
      console.warn('⚠️ Failed to cache results or update segments:', dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        speakers: speakerMetadata,
        segments: speakerSegments,
        totalSpeakers: speakerCounter,
        provider: 'deepgram',
        processingTimeMs: processingTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Deepgram speaker diarization error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Deepgram speaker diarization failed',
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
