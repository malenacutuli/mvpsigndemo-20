/**
 * Normalize transcript data from various provider formats
 */
export function normalizeTranscript(data: any): any {
  if (!data) {
    throw new Error('Transcript data is required');
  }

  // Already normalized
  if (data.normalized === true) {
    return data;
  }

  // Handle AssemblyAI format
  if (data.utterances && Array.isArray(data.utterances)) {
    return {
      normalized: true,
      utterances: data.utterances.map((u: any) => ({
        speaker: u.speaker || `SPEAKER_${u.speaker_id || '0'}`,
        speaker_id: u.speaker_id,
        start: u.start / 1000, // Convert ms to seconds if needed
        end: u.end / 1000,
        text: u.text,
        confidence: u.confidence || 1.0,
        words: u.words?.map((w: any) => ({
          word: w.text || w.word,
          start: w.start / 1000,
          end: w.end / 1000,
          confidence: w.confidence || 1.0
        }))
      }))
    };
  }

  // Handle Deepgram format
  if (data.results?.channels?.[0]?.alternatives?.[0]) {
    const alternative = data.results.channels[0].alternatives[0];
    
    // Group words by speaker if available
    const segments = [];
    let currentSegment: any = null;

    for (const word of alternative.words || []) {
      const speaker = word.speaker !== undefined ? `SPEAKER_${word.speaker}` : 'SPEAKER_0';
      
      if (!currentSegment || currentSegment.speaker !== speaker) {
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          speaker,
          start: word.start,
          end: word.end,
          text: word.punctuated_word || word.word,
          confidence: word.confidence || 1.0,
          words: []
        };
      } else {
        currentSegment.text += ' ' + (word.punctuated_word || word.word);
        currentSegment.end = word.end;
      }

      currentSegment.words.push({
        word: word.word,
        start: word.start,
        end: word.end,
        confidence: word.confidence || 1.0
      });
    }

    if (currentSegment) {
      segments.push(currentSegment);
    }

    return {
      normalized: true,
      segments
    };
  }

  // Handle generic segments format
  if (data.segments && Array.isArray(data.segments)) {
    return {
      normalized: true,
      segments: data.segments.map((s: any) => ({
        speaker: s.speaker || `SPEAKER_${s.speaker_id || '0'}`,
        speaker_id: s.speaker_id,
        start: typeof s.start === 'number' ? s.start : parseFloat(s.start || '0'),
        end: typeof s.end === 'number' ? s.end : parseFloat(s.end || '0'),
        text: s.text || s.transcript || '',
        confidence: s.confidence || 1.0,
        words: s.words?.map((w: any) => ({
          word: w.word || w.text,
          start: typeof w.start === 'number' ? w.start : parseFloat(w.start || '0'),
          end: typeof w.end === 'number' ? w.end : parseFloat(w.end || '0'),
          confidence: w.confidence || 1.0
        }))
      }))
    };
  }

  // Handle plain text with no speaker info
  if (typeof data === 'string' || data.text) {
    const text = typeof data === 'string' ? data : data.text;
    return {
      normalized: true,
      segments: [{
        speaker: 'SPEAKER_0',
        speaker_id: 0,
        start: 0,
        end: 0,
        text,
        confidence: 1.0,
        words: []
      }]
    };
  }

  throw new Error('Unsupported transcript format');
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
