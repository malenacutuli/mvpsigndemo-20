import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TimelineSegment {
  id: string;
  idx: number;
  start_time: number;
  end_time: number;
  text: string;
  speaker: string | null;
  character_id: string | null;
}

interface UseVideoTimelineResult {
  segments: TimelineSegment[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useVideoTimeline(videoId: string | null): UseVideoTimelineResult {
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSegments = async () => {
    if (!videoId) {
      setSegments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('transcript_segments_clean')
        .select(`
          id,
          idx,
          start_time,
          end_time,
          text,
          speaker,
          character_id
        `)
        .eq('video_id', videoId)
        .order('idx', { ascending: true });

      if (queryError) {
        throw new Error(`Failed to fetch timeline segments: ${queryError.message}`);
      }

      setSegments(data || []);
    } catch (err) {
      console.error('Timeline query error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setSegments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, [videoId]);

  return {
    segments,
    loading,
    error,
    refetch: fetchSegments
  };
}
