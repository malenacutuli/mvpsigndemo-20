import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AccessibilityCheckResults {
  hasTranscript: boolean;
  hasAudioDescription: boolean;
  hasCaptions: boolean;
  hasSignLanguage: boolean;
  loading: boolean;
}

/**
 * Queries the database to determine whether real accessibility assets
 * (transcript segments, audio descriptions, sign-language clips) exist
 * for a given video.  Returns booleans that reflect actual data — not
 * UI toggle state.
 */
export function useAccessibilityScore(videoId: string | undefined): AccessibilityCheckResults {
  const [results, setResults] = useState<AccessibilityCheckResults>({
    hasTranscript: false,
    hasAudioDescription: false,
    hasCaptions: false,
    hasSignLanguage: false,
    loading: true,
  });

  useEffect(() => {
    if (!videoId) {
      setResults(prev => ({ ...prev, loading: false }));
      return;
    }

    let cancelled = false;

    const check = async () => {
      const [transcriptRes, adRes, slRes] = await Promise.all([
        supabase
          .from('transcript_segments' as any)
          .select('id', { count: 'exact', head: true })
          .eq('video_id', videoId),
        supabase
          .from('audio_descriptions')
          .select('id', { count: 'exact', head: true })
          .eq('video_id', videoId),
        supabase
          .from('sign_language_clips' as any)
          .select('id', { count: 'exact', head: true })
          .eq('video_id', videoId),
      ]);

      if (cancelled) return;

      const transcriptCount = transcriptRes.count ?? 0;
      const adCount = adRes.count ?? 0;
      const slCount = slRes.count ?? 0;

      setResults({
        hasTranscript: transcriptCount > 0,
        hasCaptions: transcriptCount > 0, // captions come from transcript segments
        hasAudioDescription: adCount > 0,
        hasSignLanguage: slCount > 0,
        loading: false,
      });
    };

    check();

    // Subscribe to changes so the score updates in real-time
    const channel = supabase
      .channel(`a11y_score_${videoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transcript_segments', filter: `video_id=eq.${videoId}` }, () => check())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audio_descriptions', filter: `video_id=eq.${videoId}` }, () => check())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sign_language_clips', filter: `video_id=eq.${videoId}` }, () => check())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [videoId]);

  return results;
}
