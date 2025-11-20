import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { TimelineClip as TimelineClipType } from './types';

interface TimelineClipProps {
  clip: TimelineClipType;
  zoom: number;
  isSelected: boolean;
  onSelect: (clipId: string, multi: boolean) => void;
}

export function TimelineClip({ clip, zoom, isSelected, onSelect }: TimelineClipProps) {
  const pixelsPerSecond = zoom * 10;
  const duration = clip.endTime - clip.startTime;
  const width = duration * pixelsPerSecond;
  const left = clip.startTime * pixelsPerSecond;
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: clip.id,
    data: { clip }
  });
  
  const style = {
    transform: CSS.Translate.toString(transform),
    width: `${width}px`,
    left: `${left}px`,
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(clip.id, e.metaKey || e.ctrlKey);
  };
  
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`
        absolute top-1 h-10 rounded
        bg-card border-2 cursor-move
        transition-all overflow-hidden
        ${isSelected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-border'}
        ${isDragging ? 'opacity-50 z-50' : 'z-10'}
        hover:brightness-110
      `}
      style={{
        ...style,
        backgroundColor: clip.color || 'hsl(var(--card))',
      }}
    >
      <div className="px-2 py-1 text-xs text-foreground truncate">
        {clip.label || 'Untitled'}
      </div>
      
      {/* Trim handles */}
      {isSelected && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary cursor-ew-resize" />
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary cursor-ew-resize" />
        </>
      )}
    </div>
  );
}
