import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PremiumVideoPlayerProps {
  videoSrc: string;
  posterSrc?: string;
  title: string;
  videoId: string;
  currentTime: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  onTimeUpdate: (time: number) => void;
  onPlayPauseToggle: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSeek: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  className?: string;
}

export function PremiumVideoPlayer({
  videoSrc,
  posterSrc,
  title,
  currentTime,
  isPlaying,
  volume,
  isMuted,
  playbackRate,
  onTimeUpdate,
  onPlayPauseToggle,
  onVolumeChange,
  onMuteToggle,
  onSeek,
  onDurationChange,
  className
}: PremiumVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync video element with playback state
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (isPlaying && video.paused) {
      video.play().catch(err => console.error('Play error:', err));
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Sync external time changes (from timeline scrubbing)
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Only seek if difference is significant (avoid feedback loops)
    if (Math.abs(video.currentTime - currentTime) > 0.5) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && onDurationChange) {
      onDurationChange(videoRef.current.duration);
    }
  };

  const handleClick = () => {
    onPlayPauseToggle();
  };

  return (
    <div className={cn("relative w-full h-full bg-black", className)}>
      <video
        ref={videoRef}
        src={videoSrc}
        poster={posterSrc}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={handleClick}
        playsInline
      >
        <track kind="captions" label={title} />
      </video>
    </div>
  );
}
