import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3x3
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TimelineControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
  selectedSceneId: string | null;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onZoomChange: (zoom: number) => void;
  onSplitScene: () => void;
  onDeleteScene: () => void;
  onDuplicateScene: () => void;
  onFitToView: () => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  zoom,
  selectedSceneId,
  onPlayPause,
  onSeek,
  onZoomChange,
  onSplitScene,
  onDeleteScene,
  onDuplicateScene,
  onFitToView
}) => {
  // Format time display (MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space: Play/Pause
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        onPlayPause();
      }

      // S: Split scene
      if (e.code === 'KeyS' && !e.repeat && selectedSceneId) {
        e.preventDefault();
        onSplitScene();
      }

      // +/-: Zoom
      if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        e.preventDefault();
        onZoomChange(Math.min(4, zoom + 0.25));
      }
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        onZoomChange(Math.max(0.25, zoom - 0.25));
      }

      // 0: Fit to view
      if (e.code === 'Digit0' || e.code === 'Numpad0') {
        e.preventDefault();
        onFitToView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom, selectedSceneId, onPlayPause, onSeek, onZoomChange, onSplitScene, onFitToView]);

  return (
    <TooltipProvider>
      <div className="timeline-controls flex items-center justify-between px-4 py-3 bg-muted/50 border-t border-border backdrop-blur-sm">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSeek(Math.max(0, currentTime - 5))}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Skip back 5s</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={onPlayPause}
                className="w-10 h-10"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Play/Pause (Space)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSeek(Math.min(duration, currentTime + 5))}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Skip forward 5s</TooltipContent>
          </Tooltip>

          <div className="ml-4 text-sm font-mono text-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Scene Editing Controls */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={onSplitScene}
                disabled={!selectedSceneId}
              >
                <Scissors className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split scene at playhead (S)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDuplicateScene}
                disabled={!selectedSceneId}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate scene (Cmd+D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDeleteScene}
                disabled={!selectedSceneId}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete scene (Del)</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-2" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={onFitToView}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit to view (0)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Snap to grid</TooltipContent>
          </Tooltip>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out (-)</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2">
            <Slider
              value={[zoom * 100]}
              onValueChange={([value]) => onZoomChange(value / 100)}
              min={25}
              max={400}
              step={25}
              className="w-32"
            />
            <span className="text-sm font-mono text-muted-foreground w-12">
              {(zoom * 100).toFixed(0)}%
            </span>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onZoomChange(Math.min(4, zoom + 0.25))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in (+)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TimelineControls;
