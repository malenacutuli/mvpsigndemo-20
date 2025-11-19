import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TimelineTrack, TimelineClip } from '@/types/premium-timeline';
import { ZoomIn, ZoomOut, Scissors, Trash2, Lock, Unlock, Eye, EyeOff } from 'lucide-react';

interface MultiTrackTimelineProps {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  currentTime: number;
  duration: number;
  zoom: number;
  scrollLeft: number;
  selectedClipIds: string[];
  onTimeChange: (time: number) => void;
  onClipSelect: (clipId: string, addToSelection: boolean) => void;
  onClipMove: (clipId: string, newStartTime: number) => void;
  onClipTrim: (clipId: string, side: 'start' | 'end', newTime: number) => void;
  onClipDelete: (clipId: string) => void;
  onClipSplit: (clipId: string, time: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onScrollChange: (scrollLeft: number) => void;
  className?: string;
}

export function MultiTrackTimeline({
  tracks,
  clips,
  currentTime,
  duration,
  zoom,
  scrollLeft,
  selectedClipIds,
  onTimeChange,
  onClipSelect,
  onClipMove,
  onClipTrim,
  onClipDelete,
  onClipSplit,
  onZoomIn,
  onZoomOut,
  onScrollChange,
  className
}: MultiTrackTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<{
    clipId: string;
    type: 'move' | 'trim-start' | 'trim-end';
    initialX: number;
    initialTime: number;
  } | null>(null);

  const timelineWidth = Math.max(duration * zoom, 1000);

  // Sync scroll position
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollLeft]);

  // Handle playhead click
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const time = x / zoom;
    onTimeChange(time);
  };

  // Handle clip drag start
  const handleClipMouseDown = (
    e: React.MouseEvent,
    clipId: string,
    type: 'move' | 'trim-start' | 'trim-end'
  ) => {
    e.stopPropagation();
    
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;

    setIsDragging(true);
    setDragTarget({
      clipId,
      type,
      initialX: e.clientX,
      initialTime: type === 'trim-end' ? clip.endTime : clip.startTime
    });

    // Select clip
    onClipSelect(clipId, e.shiftKey);
  };

  // Handle mouse move (dragging)
  useEffect(() => {
    if (!isDragging || !dragTarget) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragTarget.initialX;
      const deltaTime = deltaX / zoom;
      const newTime = dragTarget.initialTime + deltaTime;

      if (dragTarget.type === 'move') {
        onClipMove(dragTarget.clipId, newTime);
      } else {
        onClipTrim(dragTarget.clipId, dragTarget.type === 'trim-start' ? 'start' : 'end', newTime);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragTarget(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragTarget, zoom, onClipMove, onClipTrim]);

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    onScrollChange(e.currentTarget.scrollLeft);
  };

  return (
    <div ref={containerRef} className={cn('flex flex-col h-full bg-background', className)}>
      {/* Timeline header */}
      <div className="flex-shrink-0 h-12 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <span className="text-foreground text-sm font-medium">
            {formatTimeDisplay(currentTime)} / {formatTimeDisplay(duration)}
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onZoomOut}
              className="p-1.5 hover:bg-accent rounded text-foreground transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-muted-foreground text-xs font-mono w-16 text-center">
              {zoom.toFixed(0)}px/s
            </span>
            <button
              onClick={onZoomIn}
              className="p-1.5 hover:bg-accent rounded text-foreground transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedClipIds.length > 0 && (
            <>
              <button
                onClick={() => onClipSplit(selectedClipIds[0], currentTime)}
                className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm rounded flex items-center gap-2 transition-colors"
                title="Split Clip (S)"
              >
                <Scissors className="w-4 h-4" />
                Split
              </button>
              <button
                onClick={() => selectedClipIds.forEach(onClipDelete)}
                className="px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm rounded flex items-center gap-2 transition-colors"
                title="Delete (Delete)"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Timeline ruler */}
      <div className="flex-shrink-0 h-8 bg-card border-b border-border overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="h-full overflow-x-auto overflow-y-hidden"
          onScroll={handleScroll}
        >
          <div
            className="h-full relative"
            style={{ width: `${timelineWidth}px` }}
          >
            <TimelineRuler duration={duration} zoom={zoom} />
            
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-destructive z-30 pointer-events-none"
              style={{ left: `${currentTime * zoom}px` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-destructive rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Tracks */}
      <div className="flex-1 overflow-hidden">
        <div
          className="h-full overflow-x-auto overflow-y-auto"
          onScroll={handleScroll}
        >
          <div style={{ width: `${timelineWidth}px` }}>
            {tracks.map(track => (
              <TimelineTrackComponent
                key={track.id}
                track={track}
                clips={clips.filter(c => c.trackId === track.id)}
                zoom={zoom}
                currentTime={currentTime}
                selectedClipIds={selectedClipIds}
                onTimelineClick={handleTimelineClick}
                onClipMouseDown={handleClipMouseDown}
                onClipSelect={onClipSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Timeline Ruler Component
function TimelineRuler({ duration, zoom }: { duration: number; zoom: number }) {
  const markers: React.ReactNode[] = [];
  const interval = zoom > 100 ? 1 : zoom > 50 ? 5 : zoom > 20 ? 10 : 30;

  for (let time = 0; time <= duration; time += interval) {
    const x = time * zoom;
    const isMajor = time % (interval * 5) === 0;

    markers.push(
      <div
        key={time}
        className="absolute top-0 bottom-0 flex flex-col"
        style={{ left: `${x}px` }}
      >
        <div className={cn('w-px bg-border', isMajor ? 'h-4' : 'h-2')} />
        {isMajor && (
          <span className="text-foreground text-xs mt-1 -translate-x-1/2">
            {formatTimeDisplay(time)}
          </span>
        )}
      </div>
    );
  }

  return <div className="relative h-full">{markers}</div>;
}

// Timeline Track Component
interface TimelineTrackComponentProps {
  track: TimelineTrack;
  clips: TimelineClip[];
  zoom: number;
  currentTime: number;
  selectedClipIds: string[];
  onTimelineClick: (e: React.MouseEvent) => void;
  onClipMouseDown: (e: React.MouseEvent, clipId: string, type: 'move' | 'trim-start' | 'trim-end') => void;
  onClipSelect: (clipId: string, addToSelection: boolean) => void;
}

function TimelineTrackComponent({
  track,
  clips,
  zoom,
  currentTime,
  selectedClipIds,
  onTimelineClick,
  onClipMouseDown,
  onClipSelect
}: TimelineTrackComponentProps) {
  return (
    <div
      className="relative border-b border-border"
      style={{ height: `${track.height}px` }}
    >
      {/* Track header */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-card border-r border-border flex items-center justify-between px-3 z-10">
        <span className="text-foreground text-sm font-medium truncate">{track.name}</span>
        <div className="flex items-center gap-1">
          {track.isLocked ? (
            <Lock className="w-3 h-3 text-muted-foreground" />
          ) : (
            <Unlock className="w-3 h-3 text-muted-foreground" />
          )}
          {track.isVisible ? (
            <Eye className="w-3 h-3 text-muted-foreground" />
          ) : (
            <EyeOff className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Track content */}
      <div
        className="absolute left-32 top-0 right-0 bottom-0 bg-muted cursor-pointer"
        onClick={onTimelineClick}
      >
        {clips.map(clip => (
          <TimelineClipComponent
            key={clip.id}
            clip={clip}
            zoom={zoom}
            isSelected={selectedClipIds.includes(clip.id)}
            onMouseDown={onClipMouseDown}
            onClick={(e) => {
              e.stopPropagation();
              onClipSelect(clip.id, e.shiftKey);
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Timeline Clip Component
interface TimelineClipComponentProps {
  clip: TimelineClip;
  zoom: number;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, clipId: string, type: 'move' | 'trim-start' | 'trim-end') => void;
  onClick: (e: React.MouseEvent) => void;
}

function TimelineClipComponent({
  clip,
  zoom,
  isSelected,
  onMouseDown,
  onClick
}: TimelineClipComponentProps) {
  const left = clip.startTime * zoom;
  const width = clip.duration * zoom;

  return (
    <div
      className={cn(
        'absolute top-1 bottom-1 rounded overflow-hidden cursor-move transition-all',
        isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-muted' : ''
      )}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: clip.color
      }}
      onClick={onClick}
      onMouseDown={(e) => onMouseDown(e, clip.id, 'move')}
    >
      {/* Clip content */}
      <div className="h-full flex items-center justify-center px-2">
        {clip.thumbnailUrl && width > 100 && (
          <img
            src={clip.thumbnailUrl}
            alt=""
            className="h-full w-auto object-cover opacity-50"
          />
        )}
        <span className="text-primary-foreground text-xs font-medium truncate">
          Scene {clip.id.slice(0, 8)}
        </span>
      </div>

      {/* Trim handles */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 bg-background/20 hover:bg-background/40 cursor-ew-resize"
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e, clip.id, 'trim-start');
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-2 bg-background/20 hover:bg-background/40 cursor-ew-resize"
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e, clip.id, 'trim-end');
        }}
      />
    </div>
  );
}

function formatTimeDisplay(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30); // Assuming 30fps
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}
