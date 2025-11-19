import { useState, useCallback, useRef } from 'react';
import { TimelineMarkers } from '@/types/premium-editor';

interface UsePremiumPlayerOptions {
  initialVolume?: number;
  initialPlaybackRate?: number;
}

export function usePremiumPlayer(options: UsePremiumPlayerOptions = {}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(options.initialVolume ?? 1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(options.initialPlaybackRate ?? 1);
  const [markers, setMarkers] = useState<TimelineMarkers>({
    inPoint: null,
    outPoint: null
  });

  const previousVolumeRef = useRef(volume);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handlePlayPauseToggle = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
      previousVolumeRef.current = newVolume;
    }
  }, []);

  const handleMuteToggle = useCallback(() => {
    setIsMuted(prev => {
      if (!prev) {
        // Muting
        previousVolumeRef.current = volume;
        setVolume(0);
        return true;
      } else {
        // Unmuting
        setVolume(previousVolumeRef.current || 1);
        return false;
      }
    });
  }, [volume]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
  }, []);

  const handleDurationChange = useCallback((newDuration: number) => {
    setDuration(newDuration);
  }, []);

  const handleSetInPoint = useCallback(() => {
    setMarkers(prev => ({ ...prev, inPoint: currentTime }));
  }, [currentTime]);

  const handleSetOutPoint = useCallback(() => {
    setMarkers(prev => ({ ...prev, outPoint: currentTime }));
  }, [currentTime]);

  const clearInPoint = useCallback(() => {
    setMarkers(prev => ({ ...prev, inPoint: null }));
  }, []);

  const clearOutPoint = useCallback(() => {
    setMarkers(prev => ({ ...prev, outPoint: null }));
  }, []);

  const clearMarkers = useCallback(() => {
    setMarkers({ inPoint: null, outPoint: null });
  }, []);

  return {
    // State
    currentTime,
    duration,
    isPlaying,
    volume,
    isMuted,
    playbackRate,
    markers,

    // Handlers
    onTimeUpdate: handleTimeUpdate,
    onPlayPauseToggle: handlePlayPauseToggle,
    onPlay: handlePlay,
    onPause: handlePause,
    onVolumeChange: handleVolumeChange,
    onMuteToggle: handleMuteToggle,
    onSeek: handleSeek,
    onPlaybackRateChange: handlePlaybackRateChange,
    onDurationChange: handleDurationChange,
    onSetInPoint: handleSetInPoint,
    onSetOutPoint: handleSetOutPoint,

    // Utilities
    clearInPoint,
    clearOutPoint,
    clearMarkers,
    setCurrentTime,
    setIsPlaying
  };
}
