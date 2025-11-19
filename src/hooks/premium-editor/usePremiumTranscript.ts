import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PremiumTranscript } from '@/types/premium-transcript';

interface UsePremiumTranscriptOptions {
  projectId: string;
  onTranscriptChange?: () => void;
}

export function usePremiumTranscript({ projectId, onTranscriptChange }: UsePremiumTranscriptOptions) {
  const [segments, setSegments] = useState<PremiumTranscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load transcript from database
  useEffect(() => {
    if (!projectId) return;
    loadTranscript();
  }, [projectId]);

  async function loadTranscript() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('premium_transcript_segments')
        .select('*')
        .eq('project_id', projectId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Map database format to PremiumTranscript format
      const mappedSegments: PremiumTranscript[] = (data || []).map((seg, idx) => ({
        id: seg.id,
        version_id: seg.project_id,
        idx,
        start_time: seg.start_time,
        end_time: seg.end_time,
        text: seg.text,
        speaker: seg.speaker,
        speaker_normalized: seg.speaker,
        speaker_confidence: null,
        character_id: null,
        emphasis: null,
        pitch: null,
        vocal_intensity: null,
        sentiment: null,
        sentiment_score: null,
        is_off_camera: false,
        is_music: false,
        is_sound_effect: false,
        words: [],
        character_color: null,
        language: 'en',
        created_at: seg.created_at,
        updated_at: seg.updated_at
      }));

      setSegments(mappedSegments);
    } catch (error) {
      console.error('Failed to load transcript:', error);
    } finally {
      setLoading(false);
    }
  }

  // Update segment text
  const updateSegmentText = useCallback(async (segmentId: string, newText: string) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('premium_transcript_segments')
        .update({ 
          text: newText,
          is_modified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', segmentId);

      if (error) throw error;

      setSegments(prev => prev.map(seg =>
        seg.id === segmentId ? { ...seg, text: newText } : seg
      ));

      onTranscriptChange?.();
    } catch (error) {
      console.error('Failed to update segment:', error);
    } finally {
      setSaving(false);
    }
  }, [onTranscriptChange]);

  // Delete segment
  const deleteSegment = useCallback(async (segmentId: string) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('premium_transcript_segments')
        .update({ is_deleted: true })
        .eq('id', segmentId);

      if (error) throw error;

      setSegments(prev => prev.filter(seg => seg.id !== segmentId));
      onTranscriptChange?.();
    } catch (error) {
      console.error('Failed to delete segment:', error);
    } finally {
      setSaving(false);
    }
  }, [onTranscriptChange]);

  // Merge segments
  const mergeSegments = useCallback(async (segmentIds: string[]) => {
    if (segmentIds.length < 2) return;

    try {
      setSaving(true);

      const segmentsToMerge = segments
        .filter(s => segmentIds.includes(s.id))
        .sort((a, b) => a.start_time - b.start_time);

      if (segmentsToMerge.length < 2) return;

      const firstSegment = segmentsToMerge[0];
      const lastSegment = segmentsToMerge[segmentsToMerge.length - 1];
      const mergedText = segmentsToMerge.map(s => s.text).join(' ');

      await supabase
        .from('premium_transcript_segments')
        .update({
          text: mergedText,
          end_time: lastSegment.end_time,
          is_modified: true
        })
        .eq('id', firstSegment.id);

      await supabase
        .from('premium_transcript_segments')
        .update({ is_deleted: true })
        .in('id', segmentIds.slice(1));

      await loadTranscript();
      onTranscriptChange?.();
    } catch (error) {
      console.error('Failed to merge segments:', error);
    } finally {
      setSaving(false);
    }
  }, [segments, onTranscriptChange]);

  // Split segment at word
  const splitSegment = useCallback(async (segmentId: string, splitIndex: number) => {
    try {
      setSaving(true);

      const segment = segments.find(s => s.id === segmentId);
      if (!segment) return;

      const words = segment.text.split(' ');
      if (splitIndex <= 0 || splitIndex >= words.length) return;

      const leftText = words.slice(0, splitIndex).join(' ');
      const rightText = words.slice(splitIndex).join(' ');
      const splitTime = segment.start_time + (segment.end_time - segment.start_time) * (splitIndex / words.length);

      await supabase
        .from('premium_transcript_segments')
        .update({
          text: leftText,
          end_time: splitTime,
          is_modified: true
        })
        .eq('id', segmentId);

      await supabase
        .from('premium_transcript_segments')
        .insert({
          project_id: projectId,
          start_time: splitTime,
          end_time: segment.end_time,
          text: rightText,
          speaker: segment.speaker
        });

      await loadTranscript();
      onTranscriptChange?.();
    } catch (error) {
      console.error('Failed to split segment:', error);
    } finally {
      setSaving(false);
    }
  }, [segments, projectId, onTranscriptChange]);

  // Assign character to segment
  const assignCharacter = useCallback(async (segmentId: string, characterId: string) => {
    try {
      setSaving(true);

      const { data: character } = await supabase
        .from('characters')
        .select('color')
        .eq('id', characterId)
        .single();

      setSegments(prev => prev.map(seg =>
        seg.id === segmentId
          ? { ...seg, character_id: characterId, character_color: character?.color || null }
          : seg
      ));

      onTranscriptChange?.();
    } catch (error) {
      console.error('Failed to assign character:', error);
    } finally {
      setSaving(false);
    }
  }, [onTranscriptChange]);

  const filteredSegments = searchQuery
    ? segments.filter(seg =>
        seg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seg.speaker?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : segments;

  return {
    segments: filteredSegments,
    allSegments: segments,
    loading,
    saving,
    selectedSegmentIds,
    searchQuery,
    setSearchQuery,
    setSelectedSegmentIds,
    updateSegmentText,
    deleteSegment,
    mergeSegments,
    splitSegment,
    assignCharacter,
    reloadTranscript: loadTranscript
  };
}
