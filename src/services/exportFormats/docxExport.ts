import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export async function generateTranscriptDOCX(videoId: string): Promise<Blob> {
  try {
    // Get video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('title, description, duration_seconds')
      .eq('id', videoId)
      .single();

    if (videoError) {
      toast.error('Failed to fetch video details');
      throw new Error(`Video fetch error: ${videoError.message}`);
    }

    // Get transcript segments
    const { data: segments, error: segmentsError } = await supabase
      .from('transcript_segments_clean')
      .select('*')
      .eq('video_id', videoId)
      .order('idx');

    if (segmentsError) {
      toast.error('Failed to fetch transcript segments');
      throw new Error(`Segments fetch error: ${segmentsError.message}`);
    }

    if (!segments || segments.length === 0) {
      toast.error('No transcript segments found for this video');
      throw new Error('No transcript segments found');
    }

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

    // Generate blob with correct MIME type
    const blob = await Packer.toBlob(doc);
    
    // Verify blob type
    if (blob.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.warn('Unexpected blob type:', blob.type);
    }
    
    return blob;
  } catch (error) {
    console.error('DOCX generation error:', error);
    toast.error('Failed to generate Word document');
    throw error;
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
