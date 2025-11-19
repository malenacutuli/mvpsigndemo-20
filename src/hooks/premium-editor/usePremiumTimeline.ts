import { useState, useCallback, useEffect } from 'react';
import { TimelineState, TimelineTrack, TimelineClip } from '@/types/premium-timeline';
import { PremiumScene } from '@/types/premium-editor';
import { supabase } from '@/integrations/supabase/client';

interface UsePremiumTimelineOptions {
  projectId: string;
  onSceneSelect?: (sceneId: string | null) => void;
}

export function usePremiumTimeline({ projectId, onSceneSelect }: UsePremiumTimelineOptions) {
  const [state, setState] = useState<TimelineState>({
    currentTime: 0,
    zoom: 100, // 100 pixels per second
    scrollLeft: 0,
    selectedClipIds: [],
    selectedTrackId: null,
    playheadPosition: 0,
    duration: 0,
    tracks: [
      {
        id: 'video-track-1',
        type: 'video',
        name: 'Video',
        height: 120,
        isLocked: false,
        isMuted: false,
        isVisible: true,
        color: 'hsl(var(--primary))'
      },
      {
        id: 'audio-track-1',
        type: 'audio',
        name: 'Audio',
        height: 80,
        isLocked: false,
        isMuted: false,
        isVisible: true,
        color: 'hsl(var(--accent))'
      },
      {
        id: 'caption-track-1',
        type: 'caption',
        name: 'Captions',
        height: 60,
        isLocked: false,
        isMuted: false,
        isVisible: true,
        color: 'hsl(var(--secondary))'
      },
      {
        id: 'ad-track-1',
        type: 'ad',
        name: 'Audio Descriptions',
        height: 60,
        isLocked: false,
        isMuted: false,
        isVisible: true,
        color: 'hsl(var(--muted))'
      }
    ],
    clips: []
  });

  const [scenes, setScenes] = useState<PremiumScene[]>([]);
  const [loading, setLoading] = useState(true);

  // Load scenes from database
  useEffect(() => {
    loadScenes();
  }, [projectId]);

  async function loadScenes() {
    try {
      setLoading(true);
      
      // For now, we'll use mock data since premium_scenes table structure needs to be verified
      // In production, this would query the actual database
      console.log('Loading scenes for project:', projectId);
      
      // Mock data for testing
      const mockClips: TimelineClip[] = [];
      
      setState(prev => ({
        ...prev,
        clips: mockClips,
        duration: 0
      }));
      
      setScenes([]);
    } catch (error) {
      console.error('Failed to load scenes:', error);
    } finally {
      setLoading(false);
    }
  }

  // Zoom controls
  const zoomIn = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.5, 500)
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.5, 20)
    }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState(prev => ({
      ...prev,
      zoom: Math.max(20, Math.min(500, zoom))
    }));
  }, []);

  // Selection
  const selectClip = useCallback((clipId: string, addToSelection: boolean = false) => {
    setState(prev => {
      const newSelection = addToSelection
        ? [...prev.selectedClipIds, clipId]
        : [clipId];
      
      // Find corresponding scene
      const clip = prev.clips.find(c => c.id === clipId);
      if (clip && onSceneSelect) {
        onSceneSelect(clip.sceneId);
      }

      return {
        ...prev,
        selectedClipIds: newSelection
      };
    });
  }, [onSceneSelect]);

  const deselectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedClipIds: []
    }));
    onSceneSelect?.(null);
  }, [onSceneSelect]);

  // Playhead
  const setCurrentTime = useCallback((time: number) => {
    setState(prev => ({
      ...prev,
      currentTime: Math.max(0, Math.min(time, prev.duration)),
      playheadPosition: time * prev.zoom
    }));
  }, []);

  // Scroll
  const setScrollLeft = useCallback((scrollLeft: number) => {
    setState(prev => ({
      ...prev,
      scrollLeft
    }));
  }, []);

  // Clip operations
  const moveClip = useCallback(async (clipId: string, newStartTime: number) => {
    const clip = state.clips.find(c => c.id === clipId);
    if (!clip) return;

    const duration = clip.duration;
    const newEndTime = newStartTime + duration;

    // Update in state
    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c =>
        c.id === clipId
          ? { ...c, startTime: newStartTime, endTime: newEndTime }
          : c
      )
    }));
  }, [state.clips]);

  const trimClip = useCallback(async (
    clipId: string,
    side: 'start' | 'end',
    newTime: number
  ) => {
    const clip = state.clips.find(c => c.id === clipId);
    if (!clip) return;

    let newStartTime = clip.startTime;
    let newEndTime = clip.endTime;
    let newTrimStart = clip.trimStart;
    let newTrimEnd = clip.trimEnd;

    if (side === 'start') {
      newStartTime = newTime;
      newTrimStart = clip.trimStart + (newTime - clip.startTime);
    } else {
      newEndTime = newTime;
      newTrimEnd = clip.trimEnd - (clip.endTime - newTime);
    }

    const newDuration = newEndTime - newStartTime;

    // Update in state
    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c =>
        c.id === clipId
          ? {
              ...c,
              startTime: newStartTime,
              endTime: newEndTime,
              duration: newDuration,
              trimStart: newTrimStart,
              trimEnd: newTrimEnd
            }
          : c
      )
    }));
  }, [state.clips]);

  const deleteClip = useCallback(async (clipId: string) => {
    // Delete from state
    setState(prev => ({
      ...prev,
      clips: prev.clips.filter(c => c.id !== clipId),
      selectedClipIds: prev.selectedClipIds.filter(id => id !== clipId)
    }));
  }, []);

  const splitClip = useCallback(async (clipId: string, splitTime: number) => {
    const clip = state.clips.find(c => c.id === clipId);
    if (!clip || splitTime <= clip.startTime || splitTime >= clip.endTime) return;

    const leftDuration = splitTime - clip.startTime;
    const rightDuration = clip.endTime - splitTime;

    // Create two clips from the split
    setState(prev => ({
      ...prev,
      clips: [
        ...prev.clips.filter(c => c.id !== clipId),
        {
          ...clip,
          endTime: splitTime,
          duration: leftDuration,
          trimEnd: clip.trimStart + leftDuration
        },
        {
          ...clip,
          id: `${clip.id}-split`,
          startTime: splitTime,
          duration: rightDuration,
          trimStart: clip.trimStart + leftDuration
        }
      ]
    }));
  }, [state.clips]);

  return {
    state,
    scenes,
    loading,
    zoomIn,
    zoomOut,
    setZoom,
    selectClip,
    deselectAll,
    setCurrentTime,
    setScrollLeft,
    moveClip,
    trimClip,
    deleteClip,
    splitClip,
    reloadScenes: loadScenes
  };
}
