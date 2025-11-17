import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { processMultiSegmentClip } from '@/services/multiSegmentProcessor';

export interface SegmentSelection {
  segmentId: string;
  startTime: number;
  endTime: number;
  text: string;
}

export function useMultiSegmentStitching(videoId: string) {
  const [selectedSegments, setSelectedSegments] = useState<SegmentSelection[]>([]);
  const queryClient = useQueryClient();

  const totalDuration = selectedSegments.reduce(
    (acc, seg) => acc + (seg.endTime - seg.startTime),
    0
  );

  const toggleSegment = (segment: SegmentSelection) => {
    setSelectedSegments(prev => {
      const exists = prev.find(s => s.segmentId === segment.segmentId);
      if (exists) {
        return prev.filter(s => s.segmentId !== segment.segmentId);
      }
      return [...prev, segment].sort((a, b) => a.startTime - b.startTime);
    });
  };

  const clearSelection = () => setSelectedSegments([]);

  const generateClip = useMutation({
    mutationFn: async ({
      platform,
      title,
      captionTemplateId
    }: {
      platform: string;
      title: string;
      captionTemplateId?: string;
    }) => {
      // Create clip record
      const { data: clip, error: clipError } = await supabase
        .from('social_clips')
        .insert({
          video_id: videoId,
          platform,
          title,
          caption_template_id: captionTemplateId,
          source_segments: selectedSegments.map(s => ({
            segment_id: s.segmentId,
            start_time: s.startTime,
            end_time: s.endTime,
            text: s.text
          })),
          start_time: selectedSegments[0]?.startTime || 0,
          end_time: selectedSegments[selectedSegments.length - 1]?.endTime || 0,
          duration: totalDuration,
          status: 'pending',
          aspect_ratio: platform === 'tiktok' || platform === 'instagram_reel' ? '9:16' : '16:9',
          resolution: platform === 'tiktok' || platform === 'instagram_reel' ? '1080x1920' : '1920x1080'
        })
        .select()
        .single();

      if (clipError) throw clipError;

      // Process in background
      processMultiSegmentClip(clip.id, videoId, selectedSegments, captionTemplateId);

      return clip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialClips', videoId] });
      clearSelection();
    }
  });

  return {
    selectedSegments,
    totalDuration,
    toggleSegment,
    clearSelection,
    generateClip
  };
}
