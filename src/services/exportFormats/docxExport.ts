import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import { supabase } from '@/integrations/supabase/client';

export async function generateTranscriptDOCX(videoId: string): Promise<Blob> {
  // Get video details
  const { data: video } = await supabase
    .from('videos')
    .select('title, description, duration_seconds')
    .eq('id', videoId)
    .single();

  // Get transcript segments
  const { data: segments } = await supabase
    .from('transcript_segments_clean')
    .select('*')
    .eq('video_id', videoId)
    .order('idx');

  if (!segments) throw new Error('No transcript segments found');

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title page
        new Paragraph({
          text: video?.title || 'Video Transcript',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: `Duration: ${Math.floor((video?.duration_seconds || 0) / 60)}:${Math.floor((video?.duration_seconds || 0) % 60).toString().padStart(2, '0')}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: video?.description || '',
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 }
        }),

        // Transcript content
        ...segments.flatMap(segment => [
          new Paragraph({
            children: [
              new TextRun({
                text: `[${formatTime(segment.start_time)}] `,
                bold: true,
                font: 'Courier New',
                size: 20
              }),
              new TextRun({
                text: segment.speaker ? `${segment.speaker}: ` : '',
                bold: true,
                color: segment.speaker_color?.replace('#', '') || '3B82F6',
                size: 22
              }),
              new TextRun({
                text: segment.text,
                size: 22
              })
            ],
            spacing: { after: 200 }
          })
        ])
      ]
    }]
  });

  // Generate blob
  const blob = await Packer.toBlob(doc);
  return blob;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
