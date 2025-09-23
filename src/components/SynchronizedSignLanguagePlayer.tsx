import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SignLanguageClip {
  id: string;
  video_id: string;
  transcript_segment_id: string;
  start_time_ms: number;
  end_time_ms: number;
  clip_url: string;
}

interface SynchronizedSignLanguagePlayerProps {
  videoId: string;
  currentTimeMs: number;
  isSignLanguageEnabled: boolean;
  onPreloadStart?: () => void;
  onPreloadComplete?: () => void;
}

export const SynchronizedSignLanguagePlayer: React.FC<SynchronizedSignLanguagePlayerProps> = ({
  videoId,
  currentTimeMs,
  isSignLanguageEnabled,
  onPreloadStart,
  onPreloadComplete
}) => {
  const [signLanguageClips, setSignLanguageClips] = useState<SignLanguageClip[]>([]);
  const [currentClip, setCurrentClip] = useState<SignLanguageClip | null>(null);
  const [preloadedClips, setPreloadedClips] = useState<Map<string, string>>(new Map());
  const videoRef = useRef<HTMLVideoElement>(null);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load Sign Language clips for the video
  useEffect(() => {
    const loadSignLanguageClips = async () => {
      try {
        const { data, error } = await supabase
          .from('sign_language_clips')
          .select('*')
          .eq('video_id', videoId)
          .order('start_time_ms');

        if (error) throw error;
        setSignLanguageClips(data || []);
      } catch (error) {
        console.error('Error loading Sign Language clips:', error);
      }
    };

    if (videoId) {
      loadSignLanguageClips();
    }
  }, [videoId]);

  // Find current clip based on time
  useEffect(() => {
    if (!isSignLanguageEnabled || signLanguageClips.length === 0) {
      setCurrentClip(null);
      return;
    }

    const activeClip = signLanguageClips.find(clip => 
      currentTimeMs >= clip.start_time_ms && currentTimeMs <= clip.end_time_ms
    );

    if (activeClip !== currentClip) {
      setCurrentClip(activeClip || null);
    }
  }, [currentTimeMs, isSignLanguageEnabled, signLanguageClips, currentClip]);

  // Preload next clip logic
  useEffect(() => {
    if (!isSignLanguageEnabled || signLanguageClips.length === 0) return;

    // Clear existing timeout
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    // Find next clip that starts within 3 seconds
    const nextClip = signLanguageClips.find(clip => 
      clip.start_time_ms > currentTimeMs && 
      clip.start_time_ms <= currentTimeMs + 3000 &&
      !preloadedClips.has(clip.id)
    );

    if (nextClip) {
      const preloadDelay = Math.max(0, nextClip.start_time_ms - currentTimeMs - 3000);
      
      preloadTimeoutRef.current = setTimeout(() => {
        preloadClip(nextClip);
      }, preloadDelay);
    }

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [currentTimeMs, isSignLanguageEnabled, signLanguageClips, preloadedClips]);

  const preloadClip = async (clip: SignLanguageClip) => {
    try {
      onPreloadStart?.();
      
      // Create a hidden video element to preload
      const preloadVideo = document.createElement('video');
      preloadVideo.src = clip.clip_url;
      preloadVideo.preload = 'metadata';
      preloadVideo.muted = true;
      
      await new Promise((resolve, reject) => {
        preloadVideo.onloadedmetadata = resolve;
        preloadVideo.onerror = reject;
        preloadVideo.load();
      });
      
      setPreloadedClips(prev => new Map(prev.set(clip.id, clip.clip_url)));
      onPreloadComplete?.();
      
    } catch (error) {
      console.error('Error preloading Sign Language clip:', error);
      onPreloadComplete?.();
    }
  };

  // Sync video playback with current clip
  useEffect(() => {
    if (!currentClip || !videoRef.current) return;

    const video = videoRef.current;
    const clipStartTimeSeconds = currentClip.start_time_ms / 1000;
    const relativeTime = (currentTimeMs - currentClip.start_time_ms) / 1000;
    
    // Sync video time with the clip's relative position
    if (Math.abs(video.currentTime - relativeTime) > 0.1) {
      video.currentTime = Math.max(0, relativeTime);
    }
  }, [currentTimeMs, currentClip]);

  if (!isSignLanguageEnabled || !currentClip) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 w-48 h-36 bg-black/80 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
      <div className="absolute top-1 left-1 z-10">
        <div className="bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          Sign Language
        </div>
      </div>
      
      <video
        ref={videoRef}
        src={currentClip.clip_url}
        className="w-full h-full object-cover"
        autoPlay
        muted
        loop={false}
        playsInline
        onError={(e) => {
          console.error('Error playing Sign Language clip:', e);
        }}
      />
    </div>
  );
};