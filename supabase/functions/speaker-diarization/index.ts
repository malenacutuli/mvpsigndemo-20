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
    const { videoUrl, videoId, analysisDepth = 'standard', minSpeakerDuration = 1, confidenceThreshold = 0.6 } = await req.json();

    if (!videoUrl || !videoId) {
      throw new Error('Video URL and video ID are required');
    }

    console.log('🎤 Starting speaker diarization for video:', videoId);
    console.log('⚙️ Analysis depth:', analysisDepth, 'Min duration:', minSpeakerDuration, 'Confidence:', confidenceThreshold);
    
    const assemblyAIKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyAIKey) {
      throw new Error('AssemblyAI API key not configured');
    }

    // Step 1: Submit audio for transcription with enhanced speaker diarization
    console.log('📤 Submitting audio to AssemblyAI...');
    
    // Configure analysis parameters based on depth
    const baseConfig = {
      audio_url: videoUrl,
      speaker_labels: true,
      speakers_expected: analysisDepth === 'advanced' ? 6 : 4,
      
      // Enhanced speaker diarization settings
      speaker_labels_threshold: confidenceThreshold || 0.65, // Higher threshold for more confident assignments
      speech_threshold: 0.5, // Minimum speech confidence
      auto_chapters: false,
      sentiment_analysis: analysisDepth === 'advanced',
      entity_detection: false,
      iab_categories: false,
      content_safety: false,
      auto_highlights: false,
      language_detection: true,
      punctuate: true,
      format_text: true,
      dual_channel: false,
      speech_model: 'best', // Use the most accurate model
      
      // Audio preprocessing for better speaker separation
      filter_profanity: false,
      boost_param: 'low', // Boost low frequencies which help distinguish voices
      redact_pii: false,
      speed_boost: false // Prioritize accuracy over speed
    };
    
    // Add advanced features if requested
    if (analysisDepth === 'advanced') {
      Object.assign(baseConfig, {
        filter_profanity: false,
        redact_pii: false,
        redact_pii_audio: false,
        redact_pii_audio_quality: 'mp3',
        redact_pii_policies: [],
        redact_pii_sub: 'hash'
      });
    }

    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': assemblyAIKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(baseConfig),
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

    // Step 4: Generate enhanced speaker metadata with pattern analysis
    const speakerMetadata = Array.from(speakerMap.entries()).map(([originalLabel, index]) => {
      const speakerSegments_filtered = speakerSegments.filter(s => s.speaker === `Speaker ${index + 1}`);
      const totalTime = speakerSegments_filtered.reduce((total, segment) => total + (segment.endTime - segment.startTime), 0);
      const avgDuration = totalTime / speakerSegments_filtered.length || 0;
      const avgConfidence = speakerSegments_filtered.reduce((sum, s) => sum + s.confidence, 0) / speakerSegments_filtered.length || 0;
      
      // Filter out very short segments that might be noise
      const validSegments = speakerSegments_filtered.filter(s => (s.endTime - s.startTime) >= minSpeakerDuration);
      
      return {
        id: `Speaker ${index + 1}`,
        name: `Speaker ${index + 1}`,
        originalLabel,
        color: speakerColors[index % speakerColors.length],
        segmentCount: validSegments.length,
        totalTimeSeconds: totalTime,
        averageDuration: avgDuration,
        confidence: avgConfidence,
        // Add speaker pattern analysis
        speakingStyle: avgDuration > 10 ? 'narrative' : avgDuration > 5 ? 'conversational' : 'responsive',
        likelihood: validSegments.length >= 3 && avgConfidence >= confidenceThreshold ? 'high' : validSegments.length >= 2 ? 'medium' : 'low'
      };
    }).filter(speaker => speaker.likelihood !== 'low' && speaker.segmentCount >= 2); // Filter out unlikely speakers

    console.log(`✅ Enhanced speaker analysis complete: ${speakerMetadata.length} confirmed speakers, ${speakerSegments.length} segments`);
    console.log('🎨 Speaker metadata:', speakerMetadata);

    // Normalize speaker IDs deterministically per video (by total time desc, then earliest start)
    const earliestStartByLabel = new Map<string, number>();
    const totalTimeByLabel = new Map<string, number>();
    const labelSet = new Set<string>();
    for (const seg of speakerSegments) {
      labelSet.add(seg.speaker);
      const prevEarliest = earliestStartByLabel.get(seg.speaker) ?? Number.POSITIVE_INFINITY;
      earliestStartByLabel.set(seg.speaker, Math.min(prevEarliest, seg.startTime));
      const prevTime = totalTimeByLabel.get(seg.speaker) ?? 0;
      totalTimeByLabel.set(seg.speaker, prevTime + (seg.endTime - seg.startTime));
    }
    const normalizedOrder = Array.from(labelSet).sort((a, b) => {
      const ta = totalTimeByLabel.get(a) ?? 0;
      const tb = totalTimeByLabel.get(b) ?? 0;
      if (tb !== ta) return tb - ta;
      const ea = earliestStartByLabel.get(a) ?? 0;
      const eb = earliestStartByLabel.get(b) ?? 0;
      return ea - eb;
    });
    const labelToNormalized = new Map<string, string>();
    normalizedOrder.forEach((label, idx) => {
      labelToNormalized.set(label, `Speaker ${idx + 1}`);
    });

    // Apply normalization to segments
    for (const seg of speakerSegments) {
      const norm = labelToNormalized.get(seg.speaker) || seg.speaker;
      seg.speaker = norm;
    }

    // Also normalize speakerMetadata ids/names and colors to match deterministic order
    const normalizedSpeakerMetadata = normalizedOrder.map((label, idx) => {
      const originalIndex = parseInt((label.match(/Speaker\s+(\d+)/)?.[1] || '1'), 10) - 1;
      const orig = speakerMetadata[originalIndex];
      return {
        id: `Speaker ${idx + 1}`,
        name: `Speaker ${idx + 1}`,
        originalLabel: (orig as any)?.originalLabel || label,
        color: speakerColors[idx % speakerColors.length],
        segmentCount: (orig as any)?.segmentCount ?? speakerSegments.filter(s => s.speaker === `Speaker ${idx + 1}`).length,
        totalTimeSeconds: totalTimeByLabel.get(label) ?? 0,
        averageDuration: (orig as any)?.averageDuration ?? 0,
        confidence: (orig as any)?.confidence ?? 0.9,
        speakingStyle: (orig as any)?.speakingStyle ?? 'conversational',
        likelihood: (orig as any)?.likelihood ?? 'high'
      };
    });

    // Step 5: Store results in Supabase and update transcript segments with final names/colors
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Load existing speaker mappings and characters to resolve final names/colors
      const { data: mappingRow } = await supabase
        .from('speaker_mappings')
        .select('mappings')
        .eq('video_id', videoId)
        .maybeSingle();
      const { data: chars } = await supabase
        .from('characters')
        .select('name,color')
        .eq('video_id', videoId);

      const mappings: Record<string, string> = (mappingRow?.mappings as any) || {};
      const colorByName: Record<string, string> = (chars || []).reduce((acc: Record<string,string>, c: any) => {
        if (c?.name) acc[c.name] = c.color || '#3B82F6';
        return acc;
      }, {});

      // Build final name/color per normalized speaker label
      const finalNameByLabel = new Map<string, string>();
      const finalColorByLabel = new Map<string, string>();
      normalizedOrder.forEach((originalLabel, idx) => {
        const normalizedLabel = `Speaker ${idx + 1}`;
        const mappedCharacter = mappings[normalizedLabel];
        if (mappedCharacter && colorByName[mappedCharacter]) {
          finalNameByLabel.set(normalizedLabel, mappedCharacter);
          finalColorByLabel.set(normalizedLabel, colorByName[mappedCharacter]);
        } else {
          finalNameByLabel.set(normalizedLabel, normalizedLabel);
          finalColorByLabel.set(normalizedLabel, speakerColors[idx % speakerColors.length]);
        }
      });

      // Update cache with normalized speakers and final mapping used
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
            segments: speakerSegments.map(s => ({ ...s })),
            speakers: normalizedSpeakerMetadata,
            total_speakers: normalizedOrder.length,
            mapping_applied: Object.fromEntries(Array.from(finalNameByLabel.entries())),
            processing_time_ms: Date.now()
          }
        }, {
          onConflict: 'video_id,content_type,language'
        });

      console.log('💾 Results cached to database with normalized speakers and mapping');

      // Step 6: Apply speaker labels to existing transcript segments
      console.log('🔄 Applying speaker labels to transcript segments...');
      
      for (const segment of speakerSegments) {
        // Find matching transcript segments by time overlap
        const { data: matchingSegments } = await supabase
          .from('transcript_segments')
          .select('id, start_time, end_time')
          .eq('video_id', videoId)
          .gte('start_time', segment.startTime - 0.5) // Allow 0.5s tolerance
          .lte('end_time', segment.endTime + 0.5);

        if (matchingSegments && matchingSegments.length > 0) {
          // Update all matching segments with final name/color
          const label = segment.speaker;
          const finalName = finalNameByLabel.get(label) || label;
          const finalColor = finalColorByLabel.get(label) || speakerColors[(parseInt(label.split(' ')[1]) - 1) % speakerColors.length];
          
          for (const matchingSegment of matchingSegments) {
            await supabase
              .from('transcript_segments')
              .update({
                speaker: finalName,
                speaker_color: finalColor
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
          speakers: normalizedSpeakerMetadata,
          segments: speakerSegments,
          totalSpeakers: normalizedOrder.length,
          speakerMappings: Object.fromEntries(
            Array.from(finalNameByLabel.entries())
          ),
          analysisMetadata: {
            analysisDepth,
            minSpeakerDuration,
            confidenceThreshold,
            originalSpeakerCount: speakerCounter,
            filteredSpeakerCount: speakerMetadata.length
          },
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