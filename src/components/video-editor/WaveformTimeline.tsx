import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface WaveformTimelineProps {
  videoUrl: string;
  duration: number;
  segments: Array<{
    id: string;
    startTime: number;
    endTime: number;
    speaker: string;
    speakerColor: string;
    isIncluded: boolean;
  }>;
  selectedSegments: Set<string>;
  onSegmentClick: (segmentId: string) => void;
  onTimeUpdate: (time: number) => void;
}

export function WaveformTimeline({
  videoUrl,
  duration,
  segments,
  selectedSegments,
  onSegmentClick,
  onTimeUpdate
}: WaveformTimelineProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !videoUrl) return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#6366f1',
      progressColor: '#4f46e5',
      cursorColor: '#ef4444',
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 2,
      height: 100,
      barGap: 2,
      url: videoUrl,
      normalize: true,
      minPxPerSec: 50,
      fillParent: true
    });

    // Add regions plugin for segment visualization
    const regions = wavesurfer.registerPlugin(RegionsPlugin.create());
    regionsRef.current = regions;

    // Track time updates
    wavesurfer.on('timeupdate', (time) => {
      setCurrentTime(time);
      onTimeUpdate(time);
    });

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
    };
  }, [videoUrl]);

  // Update regions when segments change
  useEffect(() => {
    if (!regionsRef.current) return;

    // Clear existing regions
    regionsRef.current.clearRegions();

    // Add regions for each segment
    segments.forEach((segment) => {
      const isSelected = selectedSegments.has(segment.id);
      
      regionsRef.current.addRegion({
        id: segment.id,
        start: segment.startTime,
        end: segment.endTime,
        color: isSelected 
          ? `${segment.speakerColor}40` // 40 = 25% opacity
          : '#cccccc20',
        drag: false,
        resize: false
      });
    });

    // Handle region clicks
    regionsRef.current.on('region-clicked', (region: any) => {
      onSegmentClick(region.id);
    });
  }, [segments, selectedSegments]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const handleSkip = (seconds: number) => {
    if (wavesurferRef.current) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      wavesurferRef.current.setTime(newTime);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Waveform */}
        <div 
          ref={waveformRef} 
          className="w-full bg-muted/20 rounded-lg overflow-hidden"
        />

        {/* Transport Controls */}
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleSkip(-5)}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="default"
              size="icon"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleSkip(5)}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 text-center text-sm text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Zoom Controls */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (wavesurferRef.current) {
                  wavesurferRef.current.zoom(50);
                }
              }}
            >
              Zoom In
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (wavesurferRef.current) {
                  wavesurferRef.current.zoom(10);
                }
              }}
            >
              Zoom Out
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/25 rounded" />
            <span>Selected Segments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded" />
            <span>Unselected Segments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-destructive" />
            <span>Playhead</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
