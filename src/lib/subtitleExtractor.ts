/**
 * Subtitle extraction and WebVTT generation from video tracks
 */

import { Input, BlobSource, ALL_FORMATS } from 'mediabunny';

export interface SubtitleCue {
  id: string;
  startTime: number; // seconds
  endTime: number; // seconds
  text: string;
  language?: string;
}

export interface SubtitleTrack {
  language: string;
  label?: string;
  isDefault: boolean;
  isForced: boolean;
  cues: SubtitleCue[];
}

/**
 * Extract subtitle tracks from video file
 * Note: Simplified version - returns empty array as subtitle extraction
 * from video containers requires additional codec parsing
 */
export async function extractSubtitles(videoFile: File): Promise<SubtitleTrack[]> {
  // Subtitle extraction from video files would require packet-level parsing
  // For now, return empty array - users can import WebVTT files
  console.log('📝 Subtitle extraction - use Import VTT to add subtitles');
  return [];
}

/**
 * Convert subtitle track to WebVTT format
 */
export function convertToWebVTT(track: SubtitleTrack): string {
  let vtt = 'WEBVTT\n\n';

  if (track.language) {
    vtt += `NOTE Language: ${track.language}\n\n`;
  }

  track.cues.forEach((cue, index) => {
    // Cue identifier
    vtt += `${cue.id || index + 1}\n`;

    // Timings
    vtt += `${formatVTTTime(cue.startTime)} --> ${formatVTTTime(cue.endTime)}\n`;

    // Text
    vtt += `${cue.text}\n\n`;
  });

  return vtt;
}

/**
 * Format time in WebVTT format (HH:MM:SS.mmm)
 */
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

/**
 * Parse WebVTT file into subtitle track
 */
export function parseWebVTT(vttContent: string, language: string = 'und'): SubtitleTrack {
  const cues: SubtitleCue[] = [];
  const lines = vttContent.split('\n');
  
  let i = 0;
  // Skip WEBVTT header and notes
  while (i < lines.length && (lines[i].startsWith('WEBVTT') || lines[i].startsWith('NOTE') || lines[i].trim() === '')) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      i++;
      continue;
    }

    // Check if this line is a timing line
    if (line.includes('-->')) {
      const id = lines[i - 1]?.trim() || `cue-${cues.length + 1}`;
      const [startStr, endStr] = line.split('-->').map(s => s.trim());
      
      const startTime = parseVTTTime(startStr);
      const endTime = parseVTTTime(endStr);
      
      // Collect text lines until next empty line
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i]);
        i++;
      }
      
      cues.push({
        id,
        startTime,
        endTime,
        text: textLines.join('\n')
      });
    }
    
    i++;
  }

  return {
    language,
    isDefault: false,
    isForced: false,
    cues
  };
}

/**
 * Parse VTT time format to seconds
 */
function parseVTTTime(timeStr: string): number {
  const parts = timeStr.split(':');
  
  if (parts.length === 3) {
    // HH:MM:SS.mmm
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const [seconds, millis] = parts[2].split('.').map(s => parseInt(s, 10));
    
    return hours * 3600 + minutes * 60 + seconds + (millis || 0) / 1000;
  } else if (parts.length === 2) {
    // MM:SS.mmm
    const minutes = parseInt(parts[0], 10);
    const [seconds, millis] = parts[1].split('.').map(s => parseInt(s, 10));
    
    return minutes * 60 + seconds + (millis || 0) / 1000;
  }
  
  return 0;
}

/**
 * Download WebVTT file
 */
export function downloadWebVTT(track: SubtitleTrack, filename: string = 'subtitles.vtt') {
  const vttContent = convertToWebVTT(track);
  const blob = new Blob([vttContent], { type: 'text/vtt' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Create sample subtitles from transcript segments
 */
export function createSubtitlesFromTranscript(
  segments: Array<{ start_time: number; end_time: number; text: string }>,
  language: string = 'en'
): SubtitleTrack {
  const cues: SubtitleCue[] = segments.map((seg, idx) => ({
    id: `${idx + 1}`,
    startTime: seg.start_time,
    endTime: seg.end_time,
    text: seg.text
  }));

  return {
    language,
    isDefault: true,
    isForced: false,
    cues
  };
}
