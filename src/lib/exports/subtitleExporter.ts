interface SubtitleSegment {
  start_time: number;
  end_time: number;
  text: string;
  speaker?: string;
}

interface SubtitleExportOptions {
  segments: SubtitleSegment[];
  includeSpeakers?: boolean;
}

function formatSRTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms
    .toString()
    .padStart(3, '0')}`;
}

function formatVTTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms
    .toString()
    .padStart(3, '0')}`;
}

export function generateSRT(options: SubtitleExportOptions): string {
  const { segments, includeSpeakers = false } = options;

  return segments
    .map((segment, index) => {
      const text = includeSpeakers && segment.speaker
        ? `${segment.speaker}: ${segment.text}`
        : segment.text;

      return [
        index + 1,
        `${formatSRTTimestamp(segment.start_time)} --> ${formatSRTTimestamp(segment.end_time)}`,
        text,
        ''
      ].join('\n');
    })
    .join('\n');
}

export function generateVTT(options: SubtitleExportOptions): string {
  const { segments, includeSpeakers = false } = options;

  const cues = segments
    .map((segment, index) => {
      const text = includeSpeakers && segment.speaker
        ? `<v ${segment.speaker}>${segment.text}</v>`
        : segment.text;

      return [
        `${index + 1}`,
        `${formatVTTTimestamp(segment.start_time)} --> ${formatVTTTimestamp(segment.end_time)}`,
        text,
        ''
      ].join('\n');
    })
    .join('\n');

  return `WEBVTT\n\n${cues}`;
}

export function downloadSubtitle(content: string, filename: string, format: 'srt' | 'vtt'): void {
  const mimeType = format === 'srt' ? 'application/x-subrip' : 'text/vtt';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
