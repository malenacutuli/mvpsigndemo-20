import { SupabaseClient } from '@supabase/supabase-js';

interface SpeakerAnalysis {
  totalSegments: number;
  uniqueSpeakers: number;
  speakers: string[];
  uniqueColors: number;
  colors: string[];
  isOverSegmented: boolean;
  hasInconsistentColors: boolean;
  recommendation: string;
}

export async function validateSpeakerDetection(
  videoId: string, 
  supabase: SupabaseClient
): Promise<SpeakerAnalysis> {
  const { data: segments, error } = await supabase
    .from('transcript_segments')
    .select('speaker, start_time, end_time, speaker_color')
    .eq('video_id', videoId)
    .eq('language', 'en')
    .order('start_time');

  if (error) {
    throw new Error(`Failed to fetch segments: ${error.message}`);
  }

  if (!segments || segments.length === 0) {
    return {
      totalSegments: 0,
      uniqueSpeakers: 0,
      speakers: [],
      uniqueColors: 0,
      colors: [],
      isOverSegmented: false,
      hasInconsistentColors: false,
      recommendation: 'No transcript segments found'
    };
  }

  const uniqueSpeakers = new Set(segments.map(s => s.speaker));
  const uniqueColors = new Set(segments.map(s => s.speaker_color));
  
  const analysis: SpeakerAnalysis = {
    totalSegments: segments.length,
    uniqueSpeakers: uniqueSpeakers.size,
    speakers: Array.from(uniqueSpeakers),
    uniqueColors: uniqueColors.size,
    colors: Array.from(uniqueColors),
    isOverSegmented: uniqueSpeakers.size > 3 && segments.length < 50,
    hasInconsistentColors: uniqueColors.size > uniqueSpeakers.size,
    recommendation: ''
  };
  
  if (analysis.isOverSegmented) {
    analysis.recommendation = 'Run intelligent detection with Conservative mode';
  } else if (analysis.hasInconsistentColors) {
    analysis.recommendation = 'Run Quick Consolidation to fix colors';
  } else {
    analysis.recommendation = 'Speaker detection looks good!';
  }
  
  console.log('🔍 Speaker Detection Analysis:', analysis);
  return analysis;
}
