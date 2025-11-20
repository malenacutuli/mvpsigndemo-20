import React, { useRef, useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrack } from './TimelineTrack';
import { Playhead } from './Playhead';
import type { Track, TimelineClip } from './types';

interface TimelineProps {
  tracks: Track[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onTracksChange?: (tracks: Track[]) => void;
  onSelectClips?: (clipIds: string[]) => void;
}

export function Timeline({
  tracks: initialTracks,
  duration,
  currentTime,
  onSeek,
  onTracksChange,
  onSelectClips
}: TimelineProps) {
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(2);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  useEffect(() => {
    setTracks(initialTracks);
  }, [initialTracks]);
  
  const handleSelectClip = (clipId: string, multi: boolean) => {
    setSelectedClipIds(prev => {
      let newSelection: string[];
      if (multi) {
        newSelection = prev.includes(clipId)
          ? prev.filter(id => id !== clipId)
          : [...prev, clipId];
      } else {
        newSelection = [clipId];
      }
      
      onSelectClips?.(newSelection);
      return newSelection;
    });
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    
    if (!over) return;
    
    const clip = active.data.current?.clip as TimelineClip;
    const targetTrack = over.data.current?.track as Track;
    
    if (!clip || !targetTrack) return;
    
    // Calculate new position based on drop location
    const pixelsPerSecond = zoom * 10;
    const delta = event.delta.x;
    const timeDelta = delta / pixelsPerSecond;
    const newStartTime = Math.max(0, clip.startTime + timeDelta);
    const newEndTime = newStartTime + (clip.endTime - clip.startTime);
    
    // Update tracks
    const updatedTracks = tracks.map(track => {
      // Remove from old track
      if (track.id === clip.trackId) {
        return {
          ...track,
          clips: track.clips.filter(c => c.id !== clip.id)
        };
      }
      
      // Add to new track
      if (track.id === targetTrack.id) {
        return {
          ...track,
          clips: [
            ...track.clips,
            {
              ...clip,
              trackId: track.id,
              startTime: newStartTime,
              endTime: newEndTime
            }
          ]
        };
      }
      
      return track;
    });
    
    setTracks(updatedTracks);
    onTracksChange?.(updatedTracks);
  };
  
  const handleToggleMute = (trackId: string) => {
    const updatedTracks = tracks.map(track =>
      track.id === trackId ? { ...track, muted: !track.muted } : track
    );
    setTracks(updatedTracks);
    onTracksChange?.(updatedTracks);
  };
  
  const handleToggleLock = (trackId: string) => {
    const updatedTracks = tracks.map(track =>
      track.id === trackId ? { ...track, locked: !track.locked } : track
    );
    setTracks(updatedTracks);
    onTracksChange?.(updatedTracks);
  };
  
  const handleToggleVisible = (trackId: string) => {
    const updatedTracks = tracks.map(track =>
      track.id === trackId ? { ...track, visible: !track.visible } : track
    );
    setTracks(updatedTracks);
    onTracksChange?.(updatedTracks);
  };
  
  const handleZoomIn = () => setZoom(prev => Math.min(20, prev * 1.5));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev / 1.5));
  const handleZoomToFit = () => {
    if (scrollRef.current) {
      const containerWidth = scrollRef.current.clientWidth - 192; // minus track header width
      const idealZoom = (containerWidth / (duration * 10));
      setZoom(Math.max(0.5, Math.min(20, idealZoom)));
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-background border-t border-border">
      {/* Timeline toolbar */}
      <div className="h-10 flex items-center gap-2 px-4 bg-muted border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            className="h-7 w-7"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <Slider
            value={[zoom]}
            onValueChange={([value]) => setZoom(value)}
            min={0.5}
            max={20}
            step={0.1}
            className="w-24"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            className="h-7 w-7"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomToFit}
            className="h-7 w-7"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground ml-auto">
          Zoom: {zoom.toFixed(1)}x
        </div>
      </div>
      
      {/* Timeline content */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="relative">
          <DndContext
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
          >
            {/* Time ruler */}
            <div className="sticky top-0 z-30 bg-background">
              <div className="flex">
                <div className="w-48 flex-shrink-0 h-8 bg-muted border-r border-b border-border" />
                <TimelineRuler
                  duration={duration}
                  zoom={zoom}
                  currentTime={currentTime}
                  onSeek={onSeek}
                />
              </div>
            </div>
            
            {/* Tracks */}
            <div className="relative">
              {tracks.map(track => (
                <TimelineTrack
                  key={track.id}
                  track={track}
                  zoom={zoom}
                  duration={duration}
                  selectedClipIds={selectedClipIds}
                  onSelectClip={handleSelectClip}
                  onToggleMute={handleToggleMute}
                  onToggleLock={handleToggleLock}
                  onToggleVisible={handleToggleVisible}
                />
              ))}
              
              {/* Playhead overlay */}
              <div className="absolute left-48 top-0 bottom-0 pointer-events-none">
                <Playhead time={currentTime} zoom={zoom} />
              </div>
            </div>
            
            <DragOverlay>
              {isDragging && <div className="bg-primary/20 rounded p-2">Moving clip...</div>}
            </DragOverlay>
          </DndContext>
        </div>
      </ScrollArea>
    </div>
  );
}
