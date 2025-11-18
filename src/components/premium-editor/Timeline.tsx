import React, { useState, useRef, useEffect } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { sceneManager } from '@/lib/premium-editor/scene-manager';
import { Plus, Scissors, Trash2, Copy, Play, Pause, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface Scene {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  speakerColor: string;
  transcriptSegmentId: string;
  timeline_start?: number;
  timeline_end?: number;
  duration_seconds?: number;
}

interface TimelineProps {
  scenes: Scene[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSceneSelect: (sceneId: string) => void;
  onSceneReorder: (sceneId: string, newStartTime: number) => void;
  onSeek: (time: number) => void;
  waveformData?: number[];
  projectId?: string;
  onTimeChange?: (time: number) => void;
  onScenesReorder?: (scenes: any[]) => void;
}

const PIXELS_PER_SECOND = 100;
const TIME_RULER_HEIGHT = 30;
const WAVEFORM_HEIGHT = 40;
const SCENE_TRACK_HEIGHT = 60;

export function Timeline({
  scenes = [],
  currentTime = 0,
  duration = 60,
  isPlaying,
  onSceneSelect,
  onSceneReorder,
  onSeek,
  onTimeChange,
  waveformData,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [zoom, setZoom] = useState(1);

  const timelineWidth = duration * PIXELS_PER_SECOND * zoom;

  // Auto-scroll to keep playhead visible
  useEffect(() => {
    if (!scrollContainerRef.current || !isPlaying) return;

    const playheadX = currentTime * PIXELS_PER_SECOND * zoom;
    const container = scrollContainerRef.current;
    const containerWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;

    // If playhead is out of view, scroll to center it
    if (playheadX < scrollLeft || playheadX > scrollLeft + containerWidth) {
      container.scrollTo({
        left: playheadX - containerWidth / 2,
        behavior: 'smooth',
      });
    }
  }, [currentTime, isPlaying, zoom]);

  // Handle playhead drag
  const handlePlayheadDrag = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;

    setIsDraggingPlayhead(true);
    e.preventDefault();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!timelineRef.current || !scrollContainerRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const x = moveEvent.clientX - rect.left + scrollLeft;
      const time = Math.max(0, Math.min(duration, x / (PIXELS_PER_SECOND * zoom)));
      
      // Snap to 0.1s increments
      const snappedTime = Math.round(time * 10) / 10;
      onSeek(snappedTime);
      if (onTimeChange) onTimeChange(snappedTime);
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle ruler click to seek
  const handleRulerClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || !scrollContainerRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const time = Math.max(0, Math.min(duration, x / (PIXELS_PER_SECOND * zoom)));
    onSeek(time);
    if (onTimeChange) onTimeChange(time);
  };

  // Handle scene click
  const handleSceneClick = (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSceneId(sceneId);
    onSceneSelect(sceneId);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate time markers (every 5 seconds)
  const timeMarkers = [];
  for (let i = 0; i <= duration; i += 5) {
    timeMarkers.push(i);
  }

  // Generate minor ticks (every second)
  const minorTicks = [];
  for (let i = 0; i <= duration; i += 1) {
    if (i % 5 !== 0) {
      minorTicks.push(i);
    }
  }

  // Calculate scene width and position
  const getSceneStyle = (scene: Scene) => {
    const start = scene.startTime || scene.timeline_start || 0;
    const end = scene.endTime || scene.timeline_end || (start + (scene.duration_seconds || 0));
    return {
      left: `${start * PIXELS_PER_SECOND * zoom}px`,
      width: `${(end - start) * PIXELS_PER_SECOND * zoom}px`,
    };
  };

  // Handle zoom
  const handleZoomIn = () => setZoom((z) => Math.min(z * 2, 8));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 2, 0.5));
  const handleFitToView = () => {
    if (!scrollContainerRef.current) return;
    const containerWidth = scrollContainerRef.current.clientWidth;
    const idealZoom = containerWidth / (duration * PIXELS_PER_SECOND);
    setZoom(Math.max(0.5, Math.min(idealZoom, 2)));
  };

  if (scenes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <p className="text-muted-foreground font-light mb-2">No scenes yet</p>
          <p className="text-sm text-muted-foreground font-light">
            Generate scenes from transcript to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Zoom Controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <button
          onClick={handleZoomOut}
          className="px-2 py-1 text-xs hover:bg-muted rounded transition-colors"
          disabled={zoom <= 0.5}
        >
          -
        </button>
        <span className="text-xs text-muted-foreground font-light min-w-[3rem] text-center">
          {zoom}x
        </span>
        <button
          onClick={handleZoomIn}
          className="px-2 py-1 text-xs hover:bg-muted rounded transition-colors"
          disabled={zoom >= 8}
        >
          +
        </button>
        <button
          onClick={handleFitToView}
          className="px-2 py-1 text-xs hover:bg-muted rounded transition-colors ml-2"
        >
          Fit
        </button>
      </div>

      {/* Scrollable Timeline */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
      >
        <div
          ref={timelineRef}
          className="relative"
          style={{ width: `${timelineWidth}px`, minHeight: '200px' }}
        >
          {/* Time Ruler */}
          <div
            className="relative bg-muted border-b border-border cursor-pointer"
            style={{ height: `${TIME_RULER_HEIGHT}px` }}
            onClick={handleRulerClick}
          >
            {/* Major time markers (every 5 seconds) */}
            {timeMarkers.map((time) => (
              <div
                key={`marker-${time}`}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${time * PIXELS_PER_SECOND * zoom}px` }}
              >
                <div className="w-px h-2 bg-border" />
                <span className="text-xs text-muted-foreground font-light mt-1">
                  {formatTime(time)}
                </span>
              </div>
            ))}

            {/* Minor ticks (every second) */}
            {minorTicks.map((time) => (
              <div
                key={`tick-${time}`}
                className="absolute top-0"
                style={{ left: `${time * PIXELS_PER_SECOND * zoom}px` }}
              >
                <div className="w-px h-1 bg-border/50" />
              </div>
            ))}
          </div>

          {/* Waveform */}
          <div
            className="relative bg-muted/50 border-b border-border"
            style={{ height: `${WAVEFORM_HEIGHT}px` }}
          >
            {waveformData ? (
              <div className="flex items-center h-full px-1">
                {waveformData.map((amplitude, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-muted-foreground/30 mx-px"
                    style={{
                      height: `${amplitude * 100}%`,
                      minWidth: '2px',
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-xs text-muted-foreground font-light">Waveform</span>
              </div>
            )}
          </div>

          {/* Scene Blocks Track */}
          <div
            className="relative bg-muted/20"
            style={{ height: `${SCENE_TRACK_HEIGHT}px` }}
          >
            <TooltipProvider>
              {scenes.map((scene) => {
                const start = scene.startTime || scene.timeline_start || 0;
                const end = scene.endTime || scene.timeline_end || (start + (scene.duration_seconds || 0));
                const sceneDuration = end - start;
                
                return (
                  <Tooltip key={scene.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'absolute top-2 h-14 rounded bg-background border border-border transition-all cursor-pointer hover:shadow-md',
                          selectedSceneId === scene.id && 'ring-2 ring-primary shadow-lg'
                        )}
                        style={{
                          ...getSceneStyle(scene),
                          borderLeftWidth: '4px',
                          borderLeftColor: scene.speakerColor || '#3B82F6',
                        }}
                        onClick={(e) => handleSceneClick(scene.id, e)}
                      >
                        <div className="px-2 py-1 h-full flex flex-col justify-between overflow-hidden">
                          <div className="text-xs font-medium truncate">
                            {scene.name}
                          </div>
                          <Badge variant="secondary" className="text-xs self-start">
                            {sceneDuration.toFixed(1)}s
                          </Badge>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-medium mb-1">{scene.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(start)} - {formatTime(end)}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>

          {/* Playhead */}
          <div
            className={cn(
              'absolute top-0 bottom-0 w-px bg-red-500 z-10 transition-opacity',
              isDraggingPlayhead ? 'cursor-grabbing' : 'cursor-ew-resize'
            )}
            style={{ left: `${currentTime * PIXELS_PER_SECOND * zoom}px` }}
            onMouseDown={handlePlayheadDrag}
          >
            {/* Playhead handle */}
            <div className="absolute -top-1 -left-2 w-4 h-4 bg-red-500 rounded-full shadow-md" />
            
            {/* Time indicator */}
            <div className="absolute -top-6 -left-6 px-2 py-0.5 bg-red-500 text-white text-xs rounded whitespace-nowrap">
              {formatTime(currentTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
