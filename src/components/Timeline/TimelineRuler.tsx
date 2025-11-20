import React from 'react';

interface TimelineRulerProps {
  duration: number;
  zoom: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

export function TimelineRuler({ duration, zoom, currentTime, onSeek }: TimelineRulerProps) {
  const pixelsPerSecond = zoom * 10;
  const width = duration * pixelsPerSecond;
  
  // Calculate marker intervals based on zoom
  const getMarkerInterval = () => {
    if (zoom > 10) return 0.1; // 100ms
    if (zoom > 5) return 0.5;  // 500ms
    if (zoom > 2) return 1;    // 1s
    if (zoom > 1) return 5;    // 5s
    return 10;                 // 10s
  };
  
  const interval = getMarkerInterval();
  const markers: number[] = [];
  
  for (let t = 0; t <= duration; t += interval) {
    markers.push(t);
  }
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    
    if (interval < 1) {
      return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    onSeek(Math.max(0, Math.min(duration, time)));
  };
  
  return (
    <div 
      className="relative h-8 bg-muted border-b border-border cursor-pointer"
      style={{ width: `${width}px` }}
      onClick={handleClick}
    >
      {/* Time markers */}
      {markers.map((time) => {
        const x = time * pixelsPerSecond;
        const isMajor = time % (interval * 5) === 0;
        
        return (
          <div
            key={time}
            className="absolute flex flex-col items-center"
            style={{ left: `${x}px` }}
          >
            <div className={`w-px bg-border ${isMajor ? 'h-3' : 'h-2'}`} />
            {isMajor && (
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {formatTime(time)}
              </span>
            )}
          </div>
        );
      })}
      
      {/* Current time indicator */}
      <div
        className="absolute top-0 bottom-0 w-px bg-primary z-10"
        style={{ left: `${currentTime * pixelsPerSecond}px` }}
      />
    </div>
  );
}
