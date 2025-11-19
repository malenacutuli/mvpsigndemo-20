'use client';

import React from 'react';
import { PremiumTranscript } from '@/types/premium-transcript';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SentimentVisualizerProps {
  segments: PremiumTranscript[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
}

export function SentimentVisualizer({
  segments,
  currentTime,
  duration,
  onSeek,
  className
}: SentimentVisualizerProps) {
  if (segments.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground text-sm', className)}>
        No sentiment data available
      </div>
    );
  }

  const sentimentStats = calculateSentimentStats(segments);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-900">Positive</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {sentimentStats.positive}%
          </p>
        </div>

        <div className="bg-muted border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Minus className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">Neutral</span>
          </div>
          <p className="text-2xl font-bold text-muted-foreground">
            {sentimentStats.neutral}%
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-red-900">Negative</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {sentimentStats.negative}%
          </p>
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Sentiment Timeline</span>
          <span>Click to jump to moment</span>
        </div>
        
        <div className="relative h-12 bg-muted rounded overflow-hidden">
          {/* Sentiment bars */}
          {segments.map((segment) => {
            const left = (segment.start_time / duration) * 100;
            const width = ((segment.end_time - segment.start_time) / duration) * 100;
            const color = getSentimentColor(segment.sentiment);

            return (
              <button
                key={segment.id}
                onClick={() => onSeek(segment.start_time)}
                className="absolute top-0 bottom-0 hover:opacity-80 transition-opacity"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: color
                }}
                title={`${segment.sentiment || 'neutral'}: ${segment.text.slice(0, 50)}...`}
              />
            );
          })}

          {/* Current time indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-background pointer-events-none"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-background rounded-full border-2 border-primary" />
          </div>
        </div>
      </div>

      {/* Sentiment legend */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-muted-foreground">Positive</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-400" />
          <span className="text-muted-foreground">Neutral</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-muted-foreground">Negative</span>
        </div>
      </div>

      {/* Sentiment graph */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-foreground">
          Sentiment Over Time
        </div>
        <SentimentGraph segments={segments} duration={duration} />
      </div>
    </div>
  );
}

function SentimentGraph({ segments, duration }: { segments: PremiumTranscript[]; duration: number }) {
  const height = 100;
  const width = 600;
  const points: { x: number; y: number; sentiment: string }[] = [];

  segments.forEach((segment) => {
    const x = (segment.start_time / duration) * width;
    const score = segment.sentiment_score || 0;
    const y = height - ((score + 1) / 2) * height;

    points.push({ x, y, sentiment: segment.sentiment || 'neutral' });
  });

  const pathData = points.map((point, idx) =>
    idx === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
  ).join(' ');

  return (
    <div className="bg-background border rounded overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: '120px' }}
      >
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="hsl(var(--border))" strokeWidth="1" />
        <line x1="0" y1={height / 4} x2={width} y2={height / 4} stroke="hsl(var(--muted))" strokeWidth="1" />
        <line x1="0" y1={(height * 3) / 4} x2={width} y2={(height * 3) / 4} stroke="hsl(var(--muted))" strokeWidth="1" />

        <path
          d={pathData}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((point, idx) => (
          <circle
            key={idx}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={getSentimentColor(point.sentiment)}
            stroke="white"
            strokeWidth="1"
          />
        ))}

        <text x="5" y="12" fontSize="10" fill="hsl(var(--muted-foreground))">Positive</text>
        <text x="5" y={height - 5} fontSize="10" fill="hsl(var(--muted-foreground))">Negative</text>
      </svg>
    </div>
  );
}

function calculateSentimentStats(segments: PremiumTranscript[]) {
  const counts = {
    positive: 0,
    negative: 0,
    neutral: 0
  };

  segments.forEach((seg) => {
    const sentiment = seg.sentiment || 'neutral';
    counts[sentiment]++;
  });

  const total = segments.length;

  return {
    positive: Math.round((counts.positive / total) * 100),
    negative: Math.round((counts.negative / total) * 100),
    neutral: Math.round((counts.neutral / total) * 100)
  };
}

function getSentimentColor(sentiment: string | null): string {
  switch (sentiment) {
    case 'positive':
      return '#10B981';
    case 'negative':
      return '#EF4444';
    case 'neutral':
    default:
      return '#9CA3AF';
  }
}
