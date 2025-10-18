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

// Color palette for speakers
const SPEAKER_COLORS = [
  '#E5E517', '#17E5E5', '#E51717', '#E58017', 
  '#17E517', '#E517E5', '#47C2EB', '#EBC247', 
  '#C2EB47', '#EB47C2', '#8C6BED', '#ED5E82'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, videoId, mode = 'moderate' } = await req.json();

    if (!videoUrl || !videoId) {
      throw new Error('Video URL and video ID are required');
    }

    console.log(`🎤 Starting speaker diarization (${mode} mode) for video:`, videoId);

    let speakerSegments: SpeakerSegment[] = [];
    let speakerMetadata: any[] = [];
    let provider = 'unknown';
    let confidence = 0;

    // Try Deepgram first (primary provider)
    try {
      console.log('🚀 Attempting Deepgram speaker diarization...');
      const deepgramResult = await analyzeWithDeepgram(videoUrl);
      speakerSegments = deepgramResult.segments;
      speakerMetadata = deepgramResult.speakers;
      provider = 'deepgram';
      confidence = deepgramResult.confidence;
      console.log(`✅ Deepgram analysis complete: ${speakerMetadata.length} speakers detected`);
    } catch (deepgramError) {
      console.warn('⚠️ Deepgram failed, falling back to AssemblyAI:', deepgramError);
      
      // Fallback to AssemblyAI
      try {
        console.log('🔄 Attempting AssemblyAI speaker diarization...');
        const assemblyResult = await analyzeWithAssemblyAI(videoUrl);
        speakerSegments = assemblyResult.segments;
        speakerMetadata = assemblyResult.speakers;
        provider = 'assemblyai';
        confidence = assemblyResult.confidence;
        console.log(`✅ AssemblyAI analysis complete: ${speakerMetadata.length} speakers detected`);
      } catch (assemblyError) {
        console.error('❌ Both providers failed, using single speaker fallback');
        // Ultimate fallback: single speaker
        speakerSegments = [{
          speaker: 'Speaker 1',
          startTime: 0,
          endTime: 60,
          text: 'Default segment',
          confidence: 0.5
        }];
        speakerMetadata = [{
          id: 'speaker_1',
          name: 'Speaker 1',
          color: SPEAKER_COLORS[0],
          segmentCount: 1,
          totalTimeSeconds: 60
        }];
        provider = 'fallback';
        confidence = 0.5;
      }
    }

    // Validate and consolidate speakers based on mode
    const validated = validateAndConsolidateSpeakers(speakerSegments, speakerMetadata, mode);
    speakerSegments = validated.segments;
    speakerMetadata = validated.speakers;
    // Update database with validated results
    await storeSpeakerResults(videoId, speakerSegments, speakerMetadata, provider);

    return new Response(
      JSON.stringify({
        success: true,
        speakers: speakerMetadata,
        segments: speakerSegments,
        totalSpeakers: speakerMetadata.length,
        provider,
        confidence,
        mode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Speaker diarization error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Deepgram analysis
async function analyzeWithDeepgram(videoUrl: string) {
  const deepgramKey = Deno.env.get('DEEPGRAM_API_KEY');
  if (!deepgramKey) throw new Error('Deepgram API key not configured');

  const response = await fetch('https://api.deepgram.com/v1/listen', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${deepgramKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: videoUrl,
      model: 'nova-2',
      version: 'latest',
      language: 'en',
      punctuate: true,
      diarize: true,
      utterances: true,
      smart_format: true
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram failed: ${error}`);
  }

  const result = await response.json();
  const speakers = new Set<string>();
  const segments: SpeakerSegment[] = [];

  result.results?.utterances?.forEach((utterance: any) => {
    const speakerLabel = `Speaker ${utterance.speaker + 1}`;
    speakers.add(speakerLabel);
    
    segments.push({
      speaker: speakerLabel,
      startTime: utterance.start,
      endTime: utterance.end,
      text: utterance.transcript,
      confidence: utterance.confidence || 0.9
    });
  });

  const speakerArray = Array.from(speakers);
  const speakerMetadata = speakerArray.map((speaker, idx) => ({
    id: `speaker_${idx + 1}`,
    name: speaker,
    color: SPEAKER_COLORS[idx % SPEAKER_COLORS.length],
    segmentCount: segments.filter(s => s.speaker === speaker).length,
    totalTimeSeconds: segments
      .filter(s => s.speaker === speaker)
      .reduce((total, seg) => total + (seg.endTime - seg.startTime), 0)
  }));

  return {
    segments,
    speakers: speakerMetadata,
    confidence: result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0.9
  };
}

// AssemblyAI analysis (fallback)
async function analyzeWithAssemblyAI(videoUrl: string) {
  const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');
  if (!assemblyKey) throw new Error('AssemblyAI API key not configured');

  const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': assemblyKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: videoUrl,
      speaker_labels: true,
      punctuate: true,
      format_text: true,
      speech_model: 'best'
    }),
  });

  if (!transcriptResponse.ok) {
    throw new Error('AssemblyAI submission failed');
  }

  const { id: transcriptId } = await transcriptResponse.json();
  let transcript: any;
  let attempts = 0;

  while (attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { 'Authorization': assemblyKey },
    });

    transcript = await statusResponse.json();
    if (transcript.status === 'completed') break;
    if (transcript.status === 'error') throw new Error('AssemblyAI failed');
    attempts++;
  }

  const speakerMap = new Map<string, number>();
  const segments: SpeakerSegment[] = [];
  let counter = 0;

  transcript.utterances?.forEach((utterance: any) => {
    const speakerLabel = utterance.speaker || 'A';
    if (!speakerMap.has(speakerLabel)) {
      speakerMap.set(speakerLabel, counter++);
    }
    
    const idx = speakerMap.get(speakerLabel)!;
    segments.push({
      speaker: `Speaker ${idx + 1}`,
      startTime: utterance.start / 1000,
      endTime: utterance.end / 1000,
      text: utterance.text,
      confidence: utterance.confidence
    });
  });

  const speakerMetadata = Array.from(speakerMap.entries()).map(([_, idx]) => ({
    id: `speaker_${idx + 1}`,
    name: `Speaker ${idx + 1}`,
    color: SPEAKER_COLORS[idx % SPEAKER_COLORS.length],
    segmentCount: segments.filter(s => s.speaker === `Speaker ${idx + 1}`).length,
    totalTimeSeconds: segments
      .filter(s => s.speaker === `Speaker ${idx + 1}`)
      .reduce((total, seg) => total + (seg.endTime - seg.startTime), 0)
  }));

  return { segments, speakers: speakerMetadata, confidence: 0.85 };
}

// Validation and consolidation
function validateAndConsolidateSpeakers(
  segments: SpeakerSegment[], 
  speakers: any[], 
  mode: string
) {
  const rules = {
    conservative: { maxSpeakers: 2, overlapThreshold: 0.1 },
    moderate: { maxSpeakers: 4, overlapThreshold: 0.2 },
    aggressive: { maxSpeakers: 8, overlapThreshold: 0.3 }
  };

  const config = rules[mode as keyof typeof rules] || rules.moderate;
  
  if (speakers.length <= config.maxSpeakers) {
    return { segments, speakers };
  }

  console.log(`⚠️ Over-segmentation detected (${speakers.length} speakers), consolidating...`);
  
  // Build overlap matrix
  const overlapMatrix: Record<string, Record<string, boolean>> = {};
  segments.forEach(seg1 => {
    segments.forEach(seg2 => {
      if (seg1.speaker !== seg2.speaker) {
        const overlap = seg1.startTime < seg2.endTime && seg1.endTime > seg2.startTime;
        if (!overlapMatrix[seg1.speaker]) overlapMatrix[seg1.speaker] = {};
        overlapMatrix[seg1.speaker][seg2.speaker] = overlapMatrix[seg1.speaker][seg2.speaker] || overlap;
      }
    });
  });

  // Merge non-overlapping speakers
  const mergeMap: Record<string, string> = { [speakers[0].name]: speakers[0].name };
  const consolidated = [speakers[0]];

  speakers.slice(1).forEach(speaker => {
    const overlapsWithAny = Object.keys(mergeMap).some(existing => 
      overlapMatrix[speaker.name]?.[existing] || overlapMatrix[existing]?.[speaker.name]
    );
    
    if (overlapsWithAny && consolidated.length < config.maxSpeakers) {
      consolidated.push(speaker);
      mergeMap[speaker.name] = speaker.name;
    } else {
      mergeMap[speaker.name] = consolidated[0].name;
    }
  });

  // Apply merge map
  const consolidatedSegments = segments.map(seg => ({
    ...seg,
    speaker: mergeMap[seg.speaker] || seg.speaker
  }));

  console.log(`✅ Consolidated from ${speakers.length} to ${consolidated.length} speakers`);
  return { segments: consolidatedSegments, speakers: consolidated };
}

// Store results in database
async function storeSpeakerResults(
  videoId: string, 
  segments: SpeakerSegment[], 
  speakers: any[], 
  provider: string
) {
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
      generation_params: { provider, timestamp: Date.now() },
      result_data: { segments, speakers, total_speakers: speakers.length }
    }, { onConflict: 'video_id,content_type,language' });

  for (const segment of segments) {
    const { data: matchingSegments } = await supabase
      .from('transcript_segments')
      .select('id')
      .eq('video_id', videoId)
      .gte('start_time', segment.startTime - 0.5)
      .lte('end_time', segment.endTime + 0.5);

    if (matchingSegments?.length) {
      const speakerIndex = parseInt(segment.speaker.split(' ')[1]) - 1;
      const color = SPEAKER_COLORS[speakerIndex % SPEAKER_COLORS.length];
      
      for (const match of matchingSegments) {
        await supabase
          .from('transcript_segments')
          .update({ speaker: segment.speaker, speaker_color: color })
          .eq('id', match.id);
      }
    }
  }

  console.log('💾 Results stored in database');
}