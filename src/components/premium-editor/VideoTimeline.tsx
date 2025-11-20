import React, { useRef, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineScene {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  thumbnail?: string;
  name?: string;
  color?: string;
}

interface VideoTimelineProps {
  videoUrl: string;
  duration: number;
  scenes?: TimelineScene[];
  onTimeUpdate?: (currentTime: number) => void;
  onSceneSelect?: (sceneId: string) => void;
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  videoUrl,
  duration,
  scenes = [],
  onTimeUpdate,
  onSceneSelect,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(video.currentTime);
        onTimeUpdate?.(video.currentTime);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isDragging, onTimeUpdate]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = value[0];
    video.currentTime = newTime;
    setCurrentTime(newTime);
    onTimeUpdate?.(newTime);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 5);
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(duration, video.currentTime + 5);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const timeline = timelineRef.current;
    const video = videoRef.current;
    if (!timeline || !video) return;

    const rect = timeline.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
    onTimeUpdate?.(newTime);
  };

  const handleSceneClick = (scene: TimelineScene) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = scene.startTime;
    setCurrentTime(scene.startTime);
    onSceneSelect?.(scene.id);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full"
          onClick={togglePlay}
        />
        
        {/* Play Overlay */}
        {!isPlaying && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
            onClick={togglePlay}
          >
            <div className="w-16 h-16 rounded-full bg-primary/80 flex items-center justify-center">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
        )}

        {/* Time Indicator */}
        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={skipBackward}
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button
            size="icon"
            variant="default"
            onClick={togglePlay}
            className="w-10 h-10"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={skipForward}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Seek Bar */}
        <div className="flex-1">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration}
            step={0.1}
            onValueChange={handleSeek}
            onPointerDown={() => setIsDragging(true)}
            onPointerUp={() => setIsDragging(false)}
            className="cursor-pointer"
          />
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleMute}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          
          <Slider
            value={[isMuted ? 0 : volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-20"
          />
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={toggleFullscreen}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Timeline with Scenes */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Timeline</div>
        
        <div
          ref={timelineRef}
          className="relative h-20 bg-muted rounded-lg cursor-pointer overflow-hidden"
          onClick={handleTimelineClick}
        >
          {/* Scenes */}
          {scenes.map((scene) => {
            const startPercent = (scene.startTime / duration) * 100;
            const widthPercent = (scene.duration / duration) * 100;
            
            return (
              <div
                key={scene.id}
                className={cn(
                  "absolute top-0 h-full border-l-2 border-r-2 border-border transition-colors hover:bg-primary/20",
                  scene.color || "bg-primary/10"
                )}
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSceneClick(scene);
                }}
              >
                {scene.thumbnail && (
                  <img
                    src={scene.thumbnail}
                    alt={scene.name}
                    className="w-full h-full object-cover opacity-40"
                  />
                )}
                {scene.name && (
                  <div className="absolute bottom-1 left-1 text-xs font-medium truncate max-w-full px-1">
                    {scene.name}
                  </div>
                )}
              </div>
            );
          })}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
            style={{
              left: `${(currentTime / duration) * 100}%`,
            }}
          >
            <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-primary rounded-full" />
          </div>

          {/* Time Markers */}
          <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 text-xs text-muted-foreground">
            {Array.from({ length: 5 }).map((_, i) => {
              const time = (duration * i) / 4;
              return (
                <span key={i}>
                  {formatTime(time)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};
