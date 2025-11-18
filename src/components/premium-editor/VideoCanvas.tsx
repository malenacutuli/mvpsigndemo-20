import { useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface Scene {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker: string;
  speakerColor: string;
  order: number;
  layout: 'fullscreen' | 'pip' | 'split' | 'multicam' | 'intro';
  elements: any[];
}

interface VideoCanvasProps {
  videoUrl: string;
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  scenes: Scene[];
  selectedSceneId: string | null;
  onTimeUpdate: (time: number) => void;
  onPlayToggle: () => void;
}

export function VideoCanvas({
  videoUrl,
  currentTime,
  isPlaying,
  playbackRate,
  scenes,
  selectedSceneId,
  onTimeUpdate,
  onPlayToggle,
}: VideoCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync video element with playback state
  useEffect(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Sync current time from store to video
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      onTimeUpdate(value[0]);
    }
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
      onTimeUpdate(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Video Container */}
      <div className="flex-1 flex items-center justify-center relative">
        <video
          ref={videoRef}
          src={videoUrl}
          className="max-w-full max-h-full"
          onTimeUpdate={handleTimeUpdate}
        />
        
        {/* Scene Overlay - render elements based on current scene */}
        {selectedSceneId && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Render scene elements here */}
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="bg-background/95 backdrop-blur border-t border-border p-4 space-y-3">
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={videoRef.current?.duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-12">
            {formatTime(videoRef.current?.duration || 0)}
          </span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleSkip(-5)}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            onClick={onPlayToggle}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleSkip(5)}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
