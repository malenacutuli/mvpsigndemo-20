import { AudioDescriptionSegment, GapClassification } from '@/types/audioDescription';
import { estimateAudioDuration, classifyGapSufficiency, calculateExtensionDuration } from './gapUtils';

export type Segment = { start: number; end: number; text: string };
export type Gap = { start: number; end: number; dur: number; st?: number };
export type AdSlot = { start: number; end: number; maxDur: number };

export function computeGaps(segments: Segment[], videoDur: number, minGap = 1.0, pad = 0.12): Gap[] {
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const out: Gap[] = [];
  let cursor = 0;
  
  for (const s of sorted) {
    const gapStart = Math.max(0, cursor);
    const gapEnd = Math.max(0, s.start - pad);
    const dur = gapEnd - gapStart;
    if (dur >= minGap) out.push({ start: gapStart, end: gapEnd, dur, st: gapStart });
    cursor = Math.max(cursor, s.end + pad);
  }
  
  if (videoDur - cursor >= minGap) {
    out.push({ start: cursor, end: videoDur, dur: videoDur - cursor, st: cursor });
  }
  
  return out;
}

export function allocateAdSlots(gaps: Gap[], targetDurPerSlot = 2.0): AdSlot[] {
  return gaps
    .map(g => ({ 
      start: g.start, 
      end: g.end, 
      maxDur: Math.min(targetDurPerSlot, g.dur - 0.1) 
    }))
    .filter(s => s.maxDur > 0.7);
}

export function validateNoOverlap(segments: Segment[], adSlots: AdSlot[]): boolean {
  for (const slot of adSlots) {
    for (const seg of segments) {
      // Check if AD slot overlaps with any dialogue segment
      if (!(slot.start >= seg.end || slot.end <= seg.start)) {
        return false; // Overlap detected
      }
    }
  }
  return true; // No overlaps
}

/**
 * Classify a gap for Extended Audio Description (EAD) requirements
 * @param gapStart - Start time of the gap (seconds)
 * @param gapEnd - End time of the gap (seconds)
 * @param descriptionText - The audio description text
 * @returns Gap classification with EAD metadata
 */
export function classifyGap(
  gapStart: number,
  gapEnd: number,
  descriptionText: string
): GapClassification {
  const gapDuration = gapEnd - gapStart;
  const estimatedAudioDuration = estimateAudioDuration(descriptionText);
  const sufficiency = classifyGapSufficiency(gapDuration, estimatedAudioDuration);
  const recommendedExtension = calculateExtensionDuration(gapDuration, estimatedAudioDuration);
  
  return {
    gapStart,
    gapEnd,
    gapDuration,
    descriptionLength: descriptionText.length,
    estimatedAudioDuration,
    sufficiency,
    recommendedExtension
  };
}

/**
 * Allocate audio description slots with Extended Audio Description (EAD) metadata
 * @param gaps - Available gaps in the video
 * @param descriptions - Audio description segments
 * @param targetDurPerSlot - Target duration per slot (optional)
 * @returns Audio descriptions enhanced with EAD metadata
 */
export function allocateAdSlotsWithEAD(
  gaps: Gap[],
  descriptions: AudioDescriptionSegment[],
  targetDurPerSlot = 2.0
): AudioDescriptionSegment[] {
  return descriptions.map((desc, idx) => {
    const gap = gaps[idx];
    if (!gap) return desc;
    
    const classification = classifyGap(gap.st || gap.start, (gap.st || gap.start) + gap.dur, desc.text);
    
    return {
      ...desc,
      gapDuration: gap.dur,
      estimatedDuration: classification.estimatedAudioDuration,
      requiresExtension: classification.sufficiency === 'requires-ead',
      extensionDuration: classification.recommendedExtension,
      extensionType: classification.sufficiency === 'requires-ead' ? 'pause' : 'none',
      priorityLevel: desc.priorityLevel || 'important'
    };
  });
}