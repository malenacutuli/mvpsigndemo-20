import React, { useEffect, useRef, useState } from 'react';

interface WaveformProps {
  audioUrl?: string;
  duration: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  aiSuggestions?: Array<{
    suggestion_type: string;
    start_time: number;
    end_time: number;
    confidence: number;
  }>;
  height?: number;
}

export const Waveform: React.FC<WaveformProps> = ({
  audioUrl,
  duration,
  currentTime,
  onTimeChange,
  aiSuggestions = [],
  height = 80
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Generate fake waveform data (in production, use real audio analysis)
  const generateWaveform = (width: number) => {
    const points = Math.floor(width / 3);
    const waveform: number[] = [];
    
    for (let i = 0; i < points; i++) {
      // Generate semi-random waveform pattern
      const base = Math.sin(i * 0.1) * 0.5 + 0.5;
      const noise = Math.random() * 0.3;
      waveform.push(base + noise);
    }
    
    return waveform;
  };

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.clientWidth;
    const height = canvas.height;
    
    // Set canvas size
    canvas.width = width;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Generate waveform data
    const waveform = generateWaveform(width);
    
    // Draw waveform
    const barWidth = 3;
    const gap = 1;
    const playheadX = (currentTime / duration) * width;
    
    waveform.forEach((amplitude, i) => {
      const x = i * (barWidth + gap);
      const barHeight = amplitude * (height * 0.8);
      const y = (height - barHeight) / 2;
      
      // Color: played = purple, unplayed = gray
      if (x < playheadX) {
        ctx.fillStyle = '#818cf8'; // Purple
      } else {
        ctx.fillStyle = '#4b5563'; // Gray
      }
      
      ctx.fillRect(x, y, barWidth, barHeight);
    });
    
  }, [currentTime, duration, height]);

  // Handle click to seek
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    onTimeChange(newTime);
  };

  // Render AI markers
  const renderAIMarkers = () => {
    return aiSuggestions.map((suggestion, index) => {
      const startPercent = (suggestion.start_time / duration) * 100;
      const widthPercent = ((suggestion.end_time - suggestion.start_time) / duration) * 100;

      const colors: Record<string, string> = {
        'filler-word': 'bg-yellow-500/40 border-yellow-500',
        'highlight': 'bg-green-500/40 border-green-500',
        'chapter': 'bg-blue-500/40 border-blue-500'
      };

      const colorClass = colors[suggestion.suggestion_type] || 'bg-purple-500/40 border-purple-500';

      return (
        <div
          key={index}
          className={`absolute top-0 bottom-0 border-l-2 ${colorClass}`}
          style={{
            left: `${startPercent}%`,
            width: `${widthPercent}%`
          }}
          title={`${suggestion.suggestion_type} (${(suggestion.confidence * 100).toFixed(0)}%)`}
        />
      );
    });
  };

  return (
    <div 
      ref={containerRef}
      className="waveform-container relative bg-gray-800 rounded-lg overflow-hidden cursor-pointer"
      style={{ height: `${height}px` }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* AI Markers Layer */}
      <div className="ai-markers absolute inset-0 pointer-events-none z-10">
        {renderAIMarkers()}
      </div>

      {/* Waveform Canvas */}
      <canvas
        ref={canvasRef}
        height={height}
        className="w-full h-full"
      />

      {/* Playhead */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
        style={{ left: `${(currentTime / duration) * 100}%` }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
      </div>

      {/* Hover indicator */}
      {isHovering && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-gray-900/80 px-2 py-1 rounded">
          Click to seek
        </div>
      )}
    </div>
  );
};

export default Waveform;
