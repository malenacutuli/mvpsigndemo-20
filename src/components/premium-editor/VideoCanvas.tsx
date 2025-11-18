import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Element } from '@/store/premiumEditorStore';

interface VideoCanvasProps {
  videoUrl: string;
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  elements: Element[];
  selectedElementId: string | null;
  onTimeUpdate: (time: number) => void;
  onTogglePlayback: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onElementSelect: (elementId: string | null) => void;
  onElementUpdate: (elementId: string, updates: Partial<Element>) => void;
}

export function VideoCanvas({
  videoUrl,
  currentTime,
  isPlaying,
  playbackRate,
  volume,
  isMuted,
  elements,
  selectedElementId,
  onTimeUpdate,
  onTogglePlayback,
  onVolumeChange,
  onToggleMute,
  onElementSelect,
  onElementUpdate
}: VideoCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeout = useRef<NodeJS.Timeout>();

  // Sync video with state
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!videoRef.current) return;
    
    // Only seek if difference is significant (avoid small jumps)
    const diff = Math.abs(videoRef.current.currentTime - currentTime);
    if (diff > 0.1) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = isMuted;
  }, [isMuted]);

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleVideoClick = () => {
    onTogglePlayback();
  };

  const handleFullscreen = () => {
    if (!canvasRef.current) return;
    
    if (!isFullscreen) {
      canvasRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render element overlay
  const renderElement = (element: Element) => {
    const isSelected = element.id === selectedElementId;
    
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${element.x}px`,
      top: `${element.y}px`,
      width: `${element.width}px`,
      height: `${element.height}px`,
      transform: `rotate(${element.rotation}deg)`,
      opacity: element.opacity,
      zIndex: element.zIndex,
      cursor: 'move',
    };

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onElementSelect(element.id);
    };

    // Render based on element type
    switch (element.type) {
      case 'rectangle':
        return (
          <div
            key={element.id}
            style={{
              ...style,
              backgroundColor: element.data.fill,
              border: `${element.data.strokeWidth || 0}px solid ${element.data.stroke}`,
            }}
            onClick={handleClick}
            className={cn(
              'transition-all',
              isSelected && 'ring-2 ring-primary ring-offset-2'
            )}
          />
        );

      case 'circle':
        return (
          <div
            key={element.id}
            style={{
              ...style,
              backgroundColor: element.data.fill,
              border: `${element.data.strokeWidth || 0}px solid ${element.data.stroke}`,
              borderRadius: '50%',
            }}
            onClick={handleClick}
            className={cn(
              'transition-all',
              isSelected && 'ring-2 ring-primary ring-offset-2'
            )}
          />
        );

      case 'text-title':
      case 'text-subtitle':
      case 'text-body':
        return (
          <div
            key={element.id}
            style={{
              ...style,
              color: element.data.fill,
              fontSize: `${element.data.fontSize || 20}px`,
              fontWeight: element.data.fontWeight || 'normal',
              textAlign: (element.data.textAlign as any) || 'left',
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
            onClick={handleClick}
            className={cn(
              'transition-all',
              isSelected && 'ring-2 ring-primary ring-offset-2'
            )}
          >
            {element.data.text}
          </div>
        );

      case 'overlay-blur':
        return (
          <div
            key={element.id}
            style={{
              ...style,
              backgroundColor: element.data.fill,
              backdropFilter: 'blur(10px)',
            }}
            onClick={handleClick}
            className={cn(
              'transition-all',
              isSelected && 'ring-2 ring-primary ring-offset-2'
            )}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(true)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="max-w-full max-h-full"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onClick={handleVideoClick}
        playsInline
      />

      {/* Element Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="relative w-full h-full pointer-events-auto">
          {elements
            .sort((a, b) => a.zIndex - b.zIndex)
            .map(element => renderElement(element))}
        </div>
      </div>

      {/* Video Controls */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Progress Bar */}
        <div className="mb-4">
          <Slider
            value={[currentTime]}
            onValueChange={([value]) => onTimeUpdate(value)}
            max={duration}
            step={0.1}
            className="cursor-pointer"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <Button
              size="sm"
              variant="ghost"
              onClick={onTogglePlayback}
              className="text-white hover:text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleMute}
                className="text-white hover:text-white hover:bg-white/20"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={([value]) => onVolumeChange(value / 100)}
                max={100}
                step={1}
                className="w-24"
              />
            </div>

            {/* Time */}
            <span className="text-white text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Settings */}
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:text-white hover:bg-white/20"
            >
              <Settings className="w-5 h-5" />
            </Button>

            {/* Fullscreen */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleFullscreen}
              className="text-white hover:text-white hover:bg-white/20"
            >
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {!videoUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white">No video loaded</p>
        </div>
      )}
    </div>
  );
}
