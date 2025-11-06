/**
 * Extended Audio Description (EAD) Analyzer
 * Analyzes audio descriptions against transcript gaps to determine if video pause/slowdown is needed
 */

import { supabase } from '@/integrations/supabase/client';
import { estimateAudioDuration, classifyGapSufficiency, calculateExtensionDuration } from './gapUtils';

export interface EADAnalysisResult {
  descriptionId: string;
  text: string;
  startTime: number;
  endTime: number;
  gapDuration: number;
  estimatedAudioDuration: number;
  sufficiency: 'sufficient' | 'tight' | 'requires-ead';
  requiresExtension: boolean;
  extensionDuration: number;
  extensionType: 'pause' | 'slowdown' | 'none';
}

/**
 * Analyze all audio descriptions for a video and populate EAD metadata
 */
export async function analyzeAndPopulateEAD(
  videoId: string,
  language: string = 'en'
): Promise<EADAnalysisResult[]> {
  console.log('🔍 Starting EAD analysis for video:', videoId);

  // Fetch transcript segments to identify dialogue gaps
  const { data: transcriptSegments, error: transcriptError } = await supabase
    .from('transcript_segments')
    .select('start_time, end_time, text')
    .eq('video_id', videoId)
    .eq('language', language)
    .order('start_time', { ascending: true });

  if (transcriptError) {
    console.error('Error fetching transcript:', transcriptError);
    throw new Error('Failed to fetch transcript for gap analysis');
  }

  // Fetch audio descriptions
  const { data: audioDescriptions, error: adError } = await supabase
    .from('audio_descriptions')
    .select('id, description, start_time, end_time')
    .eq('video_id', videoId)
    .eq('language', language)
    .order('start_time', { ascending: true });

  if (adError) {
    console.error('Error fetching audio descriptions:', adError);
    throw new Error('Failed to fetch audio descriptions');
  }

  if (!audioDescriptions || audioDescriptions.length === 0) {
    console.log('⚠️ No audio descriptions found for analysis');
    return [];
  }

  console.log(`📊 Analyzing ${audioDescriptions.length} descriptions against ${transcriptSegments?.length || 0} transcript segments`);

  const results: EADAnalysisResult[] = [];

  // Analyze each audio description
  for (const ad of audioDescriptions) {
    const adStart = Number(ad.start_time);
    const adEnd = Number(ad.end_time);
    
    // Calculate available gap duration
    const gapDuration = calculateGapDuration(adStart, adEnd, transcriptSegments || []);
    
    // Estimate how long the audio will take to speak
    const estimatedDuration = estimateAudioDuration(ad.description);
    
    // Classify if the description fits in the gap
    const sufficiency = classifyGapSufficiency(gapDuration, estimatedDuration);
    
    // Calculate extension needed
    const extensionDuration = calculateExtensionDuration(gapDuration, estimatedDuration);
    
    // Determine extension type
    const extensionType = determineExtensionType(sufficiency, extensionDuration);
    
    const result: EADAnalysisResult = {
      descriptionId: ad.id,
      text: ad.description,
      startTime: adStart,
      endTime: adEnd,
      gapDuration,
      estimatedAudioDuration: estimatedDuration,
      sufficiency,
      requiresExtension: sufficiency === 'requires-ead',
      extensionDuration,
      extensionType,
    };
    
    results.push(result);
    
    // Update database with EAD metadata
    await updateEADMetadata(ad.id, {
      estimated_duration: estimatedDuration,
      gap_duration: gapDuration,
      requires_extension: sufficiency === 'requires-ead',
      extension_duration: extensionDuration,
      extension_type: extensionType,
    });
    
    console.log(`✅ Analyzed AD "${ad.description.substring(0, 50)}...":`, {
      gap: gapDuration.toFixed(2) + 's',
      estimated: estimatedDuration.toFixed(2) + 's',
      sufficiency,
      needsEAD: sufficiency === 'requires-ead'
    });
  }

  console.log('✨ EAD analysis complete:', {
    total: results.length,
    sufficient: results.filter(r => r.sufficiency === 'sufficient').length,
    tight: results.filter(r => r.sufficiency === 'tight').length,
    requiresEAD: results.filter(r => r.sufficiency === 'requires-ead').length,
  });

  return results;
}

/**
 * Calculate the available gap duration by finding dialogue-free time
 */
function calculateGapDuration(
  adStart: number,
  adEnd: number,
  transcriptSegments: Array<{ start_time: number; end_time: number }>
): number {
  const PAD = 0.3; // Padding around dialogue
  
  // Find dialogue segments that overlap or are near the AD time window
  const nearbySegments = transcriptSegments.filter(seg => {
    const segStart = Number(seg.start_time);
    const segEnd = Number(seg.end_time);
    
    // Check if segment overlaps with AD window or is adjacent
    return (
      (segEnd + PAD >= adStart && segStart - PAD <= adEnd) ||
      (segStart - PAD <= adEnd && segEnd + PAD >= adStart)
    );
  });
  
  if (nearbySegments.length === 0) {
    // No nearby dialogue, use the full AD window
    return adEnd - adStart;
  }
  
  // Find the largest gap within the AD window
  let maxGap = 0;
  
  // Check gap before first segment
  const firstSeg = nearbySegments[0];
  if (Number(firstSeg.start_time) - PAD > adStart) {
    maxGap = Math.max(maxGap, Number(firstSeg.start_time) - PAD - adStart);
  }
  
  // Check gaps between segments
  for (let i = 0; i < nearbySegments.length - 1; i++) {
    const gapStart = Number(nearbySegments[i].end_time) + PAD;
    const gapEnd = Number(nearbySegments[i + 1].start_time) - PAD;
    const gap = Math.max(0, gapEnd - gapStart);
    maxGap = Math.max(maxGap, gap);
  }
  
  // Check gap after last segment
  const lastSeg = nearbySegments[nearbySegments.length - 1];
  if (adEnd > Number(lastSeg.end_time) + PAD) {
    maxGap = Math.max(maxGap, adEnd - (Number(lastSeg.end_time) + PAD));
  }
  
  return maxGap;
}

/**
 * Determine the best extension strategy based on gap analysis
 */
function determineExtensionType(
  sufficiency: 'sufficient' | 'tight' | 'requires-ead',
  extensionDuration: number
): 'pause' | 'slowdown' | 'none' {
  if (sufficiency === 'sufficient') {
    return 'none';
  }
  
  if (sufficiency === 'tight') {
    // For borderline cases, try slowdown first
    return 'slowdown';
  }
  
  // For requires-ead, use pause for longer extensions, slowdown for shorter ones
  if (extensionDuration < 2.0) {
    return 'slowdown'; // 0.75x playback can handle < 2s extension
  }
  
  return 'pause'; // Full pause for longer extensions
}

/**
 * Update audio description record with EAD metadata
 */
async function updateEADMetadata(
  descriptionId: string,
  metadata: {
    estimated_duration: number;
    gap_duration: number;
    requires_extension: boolean;
    extension_duration: number;
    extension_type: 'pause' | 'slowdown' | 'none';
  }
) {
  const { error } = await supabase
    .from('audio_descriptions')
    .update(metadata)
    .eq('id', descriptionId);
  
  if (error) {
    console.error('Error updating EAD metadata:', error);
    throw error;
  }
}

/**
 * Get EAD status badge info for UI display
 */
export function getEADStatusBadge(sufficiency: 'sufficient' | 'tight' | 'requires-ead'): {
  label: string;
  color: string;
  icon: string;
} {
  switch (sufficiency) {
    case 'sufficient':
      return {
        label: '✓ Fits in gap',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: '🟢'
      };
    case 'tight':
      return {
        label: '⚠ Tight fit',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: '🟡'
      };
    case 'requires-ead':
      return {
        label: '⏸ Requires EAD',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: '🔴'
      };
  }
}
