import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Lock, Volume2, VolumeX, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimelineClip } from './TimelineClip';
import type { Track } from './types';

interface TimelineTrackProps {
  track: Track;
  zoom: number;
  duration: number;
  selectedClipIds: string[];
  onSelectClip: (clipId: string, multi: boolean) => void;
  onToggleMute?: (trackId: string) => void;
  onToggleLock?: (trackId: string) => void;
  onToggleVisible?: (trackId: string) => void;
}

export function TimelineTrack({
  track,
  zoom,
  duration,
  selectedClipIds,
  onSelectClip,
  onToggleMute,
  onToggleLock,
  onToggleVisible,
}: TimelineTrackProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: track.id,
    data: { track }
  });
  
  const pixelsPerSecond = zoom * 10;
  const width = duration * pixelsPerSecond;
  const height = track.height || 48;
  
  const getTrackIcon = () => {
    switch (track.type) {
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'captions': return '💬';
      case 'audio-desc': return '📢';
      case 'sign-lang': return '🤟';
      default: return '📋';
    }
  };
  
  return (
    <div 
      className={`
        flex border-b border-border
        ${track.locked ? 'opacity-60' : ''}
        ${isOver ? 'bg-primary/10' : ''}
      `}
      style={{ height: `${height}px` }}
    >
      {/* Track header */}
      <div className="w-48 flex-shrink-0 flex items-center gap-2 px-3 bg-muted border-r border-border">
        <span className="text-lg">{getTrackIcon()}</span>
        <span className="text-sm font-medium truncate flex-1">{track.name}</span>
        
        {/* Track controls */}
        <div className="flex gap-1">
          {track.type === 'audio' && onToggleMute && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onToggleMute(track.id)}
            >
              {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </Button>
          )}
          
          {onToggleVisible && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onToggleVisible(track.id)}
            >
              {track.visible === false ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          )}
          
          {onToggleLock && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onToggleLock(track.id)}
            >
              <Lock className={`h-3 w-3 ${track.locked ? 'text-primary' : ''}`} />
            </Button>
          )}
        </div>
      </div>
      
      {/* Track content area */}
      <div 
        ref={setNodeRef}
        className="relative flex-1 bg-background"
        style={{ width: `${width}px`, minWidth: `${width}px` }}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-border/30"
              style={{ left: `${i * pixelsPerSecond}px` }}
            />
          ))}
        </div>
        
        {/* Clips */}
        {!track.locked && track.clips.map(clip => (
          <TimelineClip
            key={clip.id}
            clip={clip}
            zoom={zoom}
            isSelected={selectedClipIds.includes(clip.id)}
            onSelect={onSelectClip}
          />
        ))}
      </div>
    </div>
  );
}
