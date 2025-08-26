export type Segment = { start: number; end: number; text: string };
export type Gap = { start: number; end: number; dur: number };
export type AdSlot = { start: number; end: number; maxDur: number };

export function computeGaps(segments: Segment[], videoDur: number, minGap = 1.0, pad = 0.12): Gap[] {
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const out: Gap[] = [];
  let cursor = 0;
  
  for (const s of sorted) {
    const gapStart = Math.max(0, cursor);
    const gapEnd = Math.max(0, s.start - pad);
    const dur = gapEnd - gapStart;
    if (dur >= minGap) out.push({ start: gapStart, end: gapEnd, dur });
    cursor = Math.max(cursor, s.end + pad);
  }
  
  if (videoDur - cursor >= minGap) {
    out.push({ start: cursor, end: videoDur, dur: videoDur - cursor });
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