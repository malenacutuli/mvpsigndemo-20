import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioDescriptionSegment, EADPlaybackState, UserEADPreferences } from '@/types/audioDescription';

/**
 * Hook for managing Extended Audio Description (EAD) playback
 * Handles video pause/resume, audio synchronization, and smooth transitions
 */
export function useExtendedAudioDescription(
  videoRef: React.RefObject<HTMLVideoElement>,
  preferences: UserEADPreferences
) {
  const [eadState, setEADState] = useState<EADPlaybackState>({
    isActive: false,
    currentDescriptionId: null,
    pausedAt: null,
    resumeAt: null,
    remainingDuration: null,
    canSkip: true
  });
  
  const adAudioRef = useRef<HTMLAudioElement | null>(null);
  const resumeTimeoutRef = useRef<number | null>(null);
  const audioFadeIntervalRef = useRef<number | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        window.clearTimeout(resumeTimeoutRef.current);
      }
      if (audioFadeIntervalRef.current) {
        window.clearInterval(audioFadeIntervalRef.current);
      }
      if (adAudioRef.current) {
        adAudioRef.current.pause();
        adAudioRef.current = null;
      }
    };
  }, []);

  const fadeOutVideo = useCallback((duration: number = 500) => {
    const video = videoRef.current;
    if (!video) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const startVolume = video.volume;
      const steps = 20;
      const stepDuration = duration / steps;
      let currentStep = 0;

      audioFadeIntervalRef.current = window.setInterval(() => {
        currentStep++;
        video.volume = startVolume * (1 - currentStep / steps);
        
        if (currentStep >= steps) {
          if (audioFadeIntervalRef.current) {
            window.clearInterval(audioFadeIntervalRef.current);
          }
          video.volume = 0;
          resolve();
        }
      }, stepDuration);
    });
  }, [videoRef]);

  const fadeInVideo = useCallback((targetVolume: number = 1, duration: number = 300) => {
    const video = videoRef.current;
    if (!video) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const steps = 15;
      const stepDuration = duration / steps;
      let currentStep = 0;

      audioFadeIntervalRef.current = window.setInterval(() => {
        currentStep++;
        video.volume = targetVolume * (currentStep / steps);
        
        if (currentStep >= steps) {
          if (audioFadeIntervalRef.current) {
            window.clearInterval(audioFadeIntervalRef.current);
          }
          video.volume = targetVolume;
          resolve();
        }
      }, stepDuration);
    });
  }, [videoRef]);

  const playExtendedAD = useCallback(async (
    description: AudioDescriptionSegment,
    audioUrl: string
  ) => {
    const video = videoRef.current;
    if (!video || !preferences.eadEnabled) return;

    console.log('🎬 Playing Extended Audio Description:', description.text.substring(0, 50) + '...');

    try {
      // Store current state
      const pausedAt = video.currentTime;
      const resumeAt = description.endTime;

      setEADState({
        isActive: true,
        currentDescriptionId: description.id || null,
        pausedAt,
        resumeAt,
        remainingDuration: description.extensionDuration || 0,
        canSkip: true
      });

      // Fade out video audio
      await fadeOutVideo(500);

      // Pause video
      video.pause();

      // Create and play AD audio
      if (!adAudioRef.current) {
        adAudioRef.current = new Audio(audioUrl);
      } else {
        adAudioRef.current.src = audioUrl;
      }

      const adAudio = adAudioRef.current;

      // Handle AD completion
      const handleADEnded = async () => {
        console.log('✅ Extended AD completed, resuming video...');
        
        // Fade in video audio
        await fadeInVideo(1, 300);

        // Resume video
        if (preferences.autoResume) {
          video.currentTime = resumeAt;
          await video.play();
        }

        setEADState({
          isActive: false,
          currentDescriptionId: null,
          pausedAt: null,
          resumeAt: null,
          remainingDuration: null,
          canSkip: true
        });

        adAudio.removeEventListener('ended', handleADEnded);
      };

      adAudio.addEventListener('ended', handleADEnded);
      await adAudio.play();

    } catch (error) {
      console.error('❌ Error playing Extended AD:', error);
      
      // Recovery: resume video
      setEADState({
        isActive: false,
        currentDescriptionId: null,
        pausedAt: null,
        resumeAt: null,
        remainingDuration: null,
        canSkip: true
      });
      
      if (video) {
        await fadeInVideo(1, 300);
        video.play().catch(e => console.error('Video resume failed:', e));
      }
    }
  }, [videoRef, preferences, fadeOutVideo, fadeInVideo]);

  const skipCurrentAD = useCallback(() => {
    const video = videoRef.current;
    if (!video || !eadState.isActive || !eadState.resumeAt) return;

    console.log('⏭️ Skipping Extended AD...');

    // Stop AD audio
    if (adAudioRef.current) {
      adAudioRef.current.pause();
      adAudioRef.current.currentTime = 0;
    }

    // Resume video
    fadeInVideo(1, 300).then(() => {
      if (video && eadState.resumeAt) {
        video.currentTime = eadState.resumeAt;
        video.play().catch(e => console.error('Video resume failed:', e));
      }
    });

    setEADState({
      isActive: false,
      currentDescriptionId: null,
      pausedAt: null,
      resumeAt: null,
      remainingDuration: null,
      canSkip: true
    });
  }, [videoRef, eadState, fadeInVideo]);

  return {
    eadState,
    playExtendedAD,
    skipCurrentAD
  };
}
