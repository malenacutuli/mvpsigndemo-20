import React from 'react';

interface PlayheadProps {
  time: number;
  zoom: number;
}

export function Playhead({ time, zoom }: PlayheadProps) {
  const pixelsPerSecond = zoom * 10;
  const left = time * pixelsPerSecond;
  
  return (
    <>
      {/* Playhead handle */}
      <div
        className="absolute top-0 z-50 pointer-events-none"
        style={{ left: `${left}px`, transform: 'translateX(-50%)' }}
      >
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-primary" />
      </div>
      
      {/* Playhead line */}
      <div
        className="absolute top-8 bottom-0 w-0.5 bg-primary z-40 pointer-events-none"
        style={{ left: `${left}px` }}
      />
    </>
  );
}
