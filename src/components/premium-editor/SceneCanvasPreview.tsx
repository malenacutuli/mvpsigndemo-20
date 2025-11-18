/**
 * Scene Canvas Preview
 * 
 * Displays the selected scene with video playback, captions, and accessibility features.
 * Provides real-time preview of scene layout and composition.
 */

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Scene } from '@/lib/premium-editor/scene-manager';
import { cn } from '@/lib/utils';

interface SceneCanvasPreviewProps {
  scene: Scene;
  videoUrl: string;
  videoId: string;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayStateChange: (playing: boolean) => void;
}

export function SceneCanvasPreview({
  scene,
  videoUrl,
  videoId,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onPlayStateChange
}: SceneCanvasPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync video playback state
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.play().catch(() => onPlayStateChange(false));
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, onPlayStateChange]);

  // Seek to current time when it changes externally
  useEffect(() => {
    if (!videoRef.current || isPlaying) return;
    videoRef.current.currentTime = currentTime;
  }, [currentTime, isPlaying]);

  // Constrain playback to scene bounds
  useEffect(() => {
    if (!videoRef.current) return;
    
    const handleTimeUpdate = () => {
      if (!videoRef.current) return;
      const time = videoRef.current.currentTime;
      
      // Stop at scene end
      if (time >= scene.endTime) {
        videoRef.current.pause();
        onPlayStateChange(false);
        onTimeUpdate(scene.endTime);
        return;
      }
      
      // Update time
      if (isPlaying) {
        onTimeUpdate(time);
      }
    };
    
    videoRef.current.addEventListener('timeupdate', handleTimeUpdate);
    return () => videoRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
  }, [scene, isPlaying, onTimeUpdate, onPlayStateChange]);

  // Seek to scene start when scene changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = scene.startTime;
      onTimeUpdate(scene.startTime);
    }
  }, [scene.id, scene.startTime, onTimeUpdate]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      // If at end, restart from beginning
      if (currentTime >= scene.endTime) {
        videoRef.current.currentTime = scene.startTime;
      }
      videoRef.current.play();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const relativeTime = currentTime - scene.startTime;
  const progress = Math.min((relativeTime / scene.duration) * 100, 100);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Scene Info Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{scene.name}</h3>
          <Badge variant="outline" className="font-mono text-xs">
            {scene.duration.toFixed(1)}s
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {scene.hasAudioDescription && (
            <Badge variant="secondary" className="text-xs">
              Audio Description
            </Badge>
          )}
          {scene.hasSignLanguage && (
            <Badge variant="secondary" className="text-xs">
              Sign Language
            </Badge>
          )}
        </div>
      </div>

      {/* Video Canvas */}
      <div className="flex-1 relative bg-black rounded-lg overflow-hidden flex items-center justify-center">
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              className={cn(
                "max-w-full max-h-full",
                scene.layout === 'fullscreen' && "w-full h-full object-contain",
                scene.layout === 'pip' && "w-3/4 h-3/4 object-contain",
                scene.layout === 'split' && "w-1/2 h-full object-contain"
              )}
              onPlay={() => onPlayStateChange(true)}
              onPause={() => onPlayStateChange(false)}
            />
            
            {/* Scene Text Overlay */}
            {scene.text && (
              <div className="absolute bottom-16 left-0 right-0 px-8">
                <div 
                  className="bg-background/90 backdrop-blur-sm px-4 py-3 rounded-lg border border-border max-w-4xl mx-auto"
                  style={{ borderLeftColor: scene.speakerColor, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: scene.speakerColor }}
                    />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">
                        {scene.speaker}
                      </div>
                      <div className="text-sm font-medium">
                        {scene.text}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Layout Indicator */}
            <div className="absolute top-4 right-4">
              <Badge variant="secondary" className="text-xs font-mono">
                {scene.layout}
              </Badge>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground">Loading video...</div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="mt-4 space-y-2">
        {/* Progress Bar */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time Display */}
        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>{formatTime(relativeTime)}</span>
          <span>/ {formatTime(scene.duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlayPause}
            className="w-24"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Play
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
