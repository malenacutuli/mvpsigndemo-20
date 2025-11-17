import { supabase } from '@/integrations/supabase/client';
import { SegmentSelection } from '@/hooks/useMultiSegmentStitching';

export async function processMultiSegmentClip(
  clipId: string,
  videoId: string,
  segments: SegmentSelection[],
  captionTemplateId?: string
) {
  try {
    // Update status to processing
    await supabase
      .from('social_clips')
      .update({ 
        status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', clipId);

    // Call edge function to handle processing
    const { data, error } = await supabase.functions.invoke('generate-social-clip', {
      body: {
        clipId,
        videoId,
        segments: segments.map(s => ({
          segment_id: s.segmentId,
          start_time: s.startTime,
          end_time: s.endTime,
          text: s.text
        })),
        captionTemplateId
      }
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Failed to process multi-segment clip:', error);
    
    // Update status to failed
    await supabase
      .from('social_clips')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Processing failed'
      })
      .eq('id', clipId);

    throw error;
  }
}
