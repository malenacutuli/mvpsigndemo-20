import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, videoId } = await req.json();

    if (!videoUrl || !videoId) {
      throw new Error('Video URL and video ID are required');
    }

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

    // Step 5: Store results in Supabase for caching
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
    } catch (dbError) {
      console.warn('⚠️ Failed to cache results:', dbError);
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