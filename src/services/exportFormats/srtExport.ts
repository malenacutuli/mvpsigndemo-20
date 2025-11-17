import { supabase } from '@/integrations/supabase/client';

export async function generateSRTSubtitles(videoId: string): Promise<Blob> {
  // Get transcript segments
  const { data: segments } = await supabase
    .from('transcript_segments_clean')
    .select('*')
    .eq('video_id', videoId)
    .order('idx');

  if (!segments) throw new Error('No transcript segments found');

  // Generate SRT format
  const srtContent = segments.map((segment, index) => {
    const startTime = formatSRTTime(segment.start_time);
    const endTime = formatSRTTime(segment.end_time);
    const text = segment.speaker 
      ? `[${segment.speaker.toUpperCase()}] ${segment.text}`
      : segment.text;

    return `${index + 1}\n${startTime} --> ${endTime}\n${text}\n`;
  }).join('\n');

  const blob = new Blob([srtContent], { type: 'text/plain' });
  return blob;
}

export async function generateVTTSubtitles(videoId: string): Promise<Blob> {
  // Get transcript segments
  const { data: segments } = await supabase
    .from('transcript_segments_clean')
    .select('*')
    .eq('video_id', videoId)
    .order('idx');

  if (!segments) throw new Error('No transcript segments found');

  // Generate WebVTT format with color styling
  let vttContent = 'WEBVTT\n\n';
  
  segments.forEach((segment, index) => {
    const startTime = formatVTTTime(segment.start_time);
    const endTime = formatVTTTime(segment.end_time);
    const color = segment.speaker_color || '#FFFFFF';
    const text = segment.speaker 
      ? `<v.${segment.speaker}><c.${color}>${segment.text}</c></v>`
      : segment.text;

    vttContent += `${index + 1}\n${startTime} --> ${endTime}\n${text}\n\n`;
  });

  const blob = new Blob([vttContent], { type: 'text/vtt' });
  return blob;
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
