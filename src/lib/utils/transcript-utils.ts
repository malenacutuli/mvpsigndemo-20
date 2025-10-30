export interface NormalizedTranscript {
  utterances?: Array<{
    speaker: string;
    speaker_id?: string | number;
    start: number;
    end: number;
    text: string;
    confidence?: number;
    words?: Array<{
      word: string;
      start: number;
      end: number;
      confidence?: number;
    }>;
  }>;
  segments?: Array<{
    speaker: string;
    speaker_id?: string | number;
    start: number;
    end: number;
    text?: string;
    transcript?: string;
    confidence?: number;
    words?: Array<{
      word: string;
      start: number;
      end: number;
      confidence?: number;
    }>;
  }>;
  metadata?: {
    duration?: number;
    language?: string;
    speaker_count?: number;
  };
}

/**
 * Normalize transcript data from various providers
 */
export function normalizeTranscript(data: any): NormalizedTranscript {
  const normalized: NormalizedTranscript = {
    metadata: {}
  };
  
  // Handle AssemblyAI format
  if (data.utterances && Array.isArray(data.utterances)) {
    normalized.utterances = data.utterances.map((u: any) => ({
      speaker: u.speaker || `SPEAKER_${u.speaker_label || u.speaker_id || 'UNKNOWN'}`,
      speaker_id: u.speaker_id || u.speaker_label,
      start: u.start / 1000, // Convert to seconds if needed
      end: u.end / 1000,
      text: u.text || u.transcript || '',
      confidence: u.confidence || 1.0,
      words: u.words?.map((w: any) => ({
        word: w.text || w.word,
        start: w.start / 1000,
        end: w.end / 1000,
        confidence: w.confidence || 1.0
      }))
    }));
  }
  
  // Handle Deepgram format
  if (data.results?.channels?.[0]?.alternatives?.[0]?.paragraphs) {
    const paragraphs = data.results.channels[0].alternatives[0].paragraphs;
    normalized.segments = [];
    
    paragraphs.paragraphs?.forEach((paragraph: any) => {
      paragraph.sentences?.forEach((sentence: any) => {
        normalized.segments!.push({
          speaker: `SPEAKER_${paragraph.speaker || 0}`,
          speaker_id: paragraph.speaker || 0,
          start: sentence.start,
          end: sentence.end,
          text: sentence.text,
          confidence: data.results.channels[0].alternatives[0].confidence || 1.0
        });
      });
    });
  }
  
  // Handle Whisper/OpenAI format
  if (data.segments && Array.isArray(data.segments) && !normalized.segments) {
    normalized.segments = data.segments.map((s: any) => ({
      speaker: s.speaker || `SPEAKER_${s.speaker_id || 0}`,
      speaker_id: s.speaker_id || 0,
      start: s.start,
      end: s.end,
      text: s.text,
      confidence: 1.0,
      words: s.words?.map((w: any) => ({
        word: w.word || w.text,
        start: typeof w.start === 'number' ? w.start : parseFloat(w.start || '0'),
        end: typeof w.end === 'number' ? w.end : parseFloat(w.end || '0'),
        confidence: w.confidence || 1.0
      }))
    }));
  }
  
  // Handle AWS Transcribe format
  if (data.results?.items) {
    const items = data.results.items;
    const segments: any[] = [];
    let currentSegment: any = null;
    
    items.forEach((item: any) => {
      if (item.type === 'pronunciation') {
        if (!currentSegment || item.speaker_label !== currentSegment.speaker_id) {
          if (currentSegment) {
            segments.push(currentSegment);
          }
          currentSegment = {
            speaker: `SPEAKER_${item.speaker_label || 0}`,
            speaker_id: item.speaker_label || 0,
            start: parseFloat(item.start_time),
            end: parseFloat(item.end_time),
            text: item.alternatives[0].content,
            confidence: parseFloat(item.alternatives[0].confidence || 1)
          };
        } else {
          currentSegment.end = parseFloat(item.end_time);
          currentSegment.text += ' ' + item.alternatives[0].content;
        }
      }
    });
    
    if (currentSegment) {
      segments.push(currentSegment);
    }
    
    normalized.segments = segments;
  }
  
  // Extract metadata
  if (data.duration) {
    normalized.metadata!.duration = data.duration;
  }
  if (data.language || data.language_code) {
    normalized.metadata!.language = data.language || data.language_code;
  }
  
  // Count speakers
  const speakerSet = new Set();
  (normalized.utterances || normalized.segments || []).forEach((item: any) => {
    speakerSet.add(item.speaker);
  });
  normalized.metadata!.speaker_count = speakerSet.size;
  
  return normalized;
}

/**
 * Merge consecutive segments from the same speaker
 */
export function mergeConsecutiveSpeakerSegments(segments: any[]): any[] {
  if (!segments || segments.length === 0) return [];

  const merged = [];
  let current = { ...segments[0] };

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    
    // Merge if same speaker and close in time (within 2 seconds)
    if (segment.speaker === current.speaker && segment.start - current.end < 2) {
      current.text += ' ' + segment.text;
      current.end = segment.end;
      if (segment.words) {
        current.words = [...(current.words || []), ...segment.words];
      }
    } else {
      merged.push(current);
      current = { ...segment };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Merge consecutive segments with configurable gap tolerance
 */
export function mergeConsecutiveSegments(segments: any[], maxGap: number = 1.0): any[] {
  if (!segments || segments.length === 0) return [];
  
  const merged: any[] = [];
  let current = { ...segments[0] };
  
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    
    if (segment.speaker === current.speaker && 
        segment.start - current.end <= maxGap) {
      // Merge with current segment
      current.end = segment.end;
      current.text = (current.text + ' ' + segment.text).trim();
      if (segment.words && current.words) {
        current.words = [...current.words, ...segment.words];
      }
    } else {
      // Start new segment
      merged.push(current);
      current = { ...segment };
    }
  }
  
  merged.push(current);
  return merged;
}

/**
 * Split long segments into smaller chunks
 */
export function splitLongSegments(
  segments: any[],
  maxDuration: number = 30,
  maxWords: number = 50
): any[] {
  const result = [];

  for (const segment of segments) {
    const duration = segment.end - segment.start;
    const words = segment.words || [];

    // If segment is short enough, keep as is
    if (duration <= maxDuration && words.length <= maxWords) {
      result.push(segment);
      continue;
    }

    // Split by words
    const chunks = [];
    let currentChunk: any = {
      speaker: segment.speaker,
      speaker_id: segment.speaker_id,
      start: segment.start,
      end: segment.start,
      text: '',
      confidence: segment.confidence,
      words: []
    };

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const chunkDuration = word.end - currentChunk.start;
      
      // Start new chunk if limits exceeded
      if (currentChunk.words.length >= maxWords || chunkDuration >= maxDuration) {
        if (currentChunk.words.length > 0) {
          chunks.push(currentChunk);
        }
        currentChunk = {
          speaker: segment.speaker,
          speaker_id: segment.speaker_id,
          start: word.start,
          end: word.end,
          text: word.word,
          confidence: segment.confidence,
          words: [word]
        };
      } else {
        currentChunk.text += (currentChunk.text ? ' ' : '') + word.word;
        currentChunk.end = word.end;
        currentChunk.words.push(word);
      }
    }

    if (currentChunk.words.length > 0) {
      chunks.push(currentChunk);
    }

    result.push(...chunks);
  }

  return result;
}

/**
 * Validate transcript integrity
 */
export function validateTranscript(data: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data) {
    errors.push('Transcript data is missing');
    return { valid: false, errors, warnings };
  }

  const segments = data.segments || data.utterances || [];

  if (segments.length === 0) {
    errors.push('No segments found in transcript');
    return { valid: false, errors, warnings };
  }

  // Check timing consistency
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    
    if (seg.start >= seg.end) {
      errors.push(`Invalid timing at segment ${i}: start=${seg.start} >= end=${seg.end}`);
    }

    if (i > 0 && seg.start < segments[i - 1].end) {
      warnings.push(`Overlapping segments at ${i}: ${seg.start} < ${segments[i - 1].end}`);
    }

    if (!seg.text || seg.text.trim().length === 0) {
      warnings.push(`Empty text at segment ${i}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
