import { useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremiumEditor } from '@/store/premiumEditorStore';
import { supabase } from '@/integrations/supabase/client';
import { extractVideoFrame } from '@/lib/videoFrameExtractor';

interface Scene {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker: string;
  speakerColor: string;
  order: number;
  layout: string;
  elements: any[];
}

interface TimelineThumbnail {
  timestamp: number;
  url: string;
}

interface MultiTrackTimelineProps {
  scenes: Scene[];
  duration: number;
  currentTime: number;
  zoom: number;
  onTimeUpdate: (time: number) => void;
  onSceneSelect: (sceneId: string | null) => void;
}

export function MultiTrackTimeline({
  scenes,
  duration,
  currentTime,
  zoom,
  onTimeUpdate,
  onSceneSelect,
}: MultiTrackTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnails, setThumbnails] = useState<TimelineThumbnail[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { setTimelineZoom, project } = usePremiumEditor();

  const pixelsPerSecond = (zoom / 100) * 10;

  // Generate thumbnails for the timeline
  const generateTimelineThumbnails = async () => {
    if (!project || !project.videoUrl) return;
    
    setIsGenerating(true);
    
    try {
      // Calculate thumbnail interval based on zoom
      const thumbnailInterval = zoom > 150 ? 1 : zoom > 100 ? 2 : 5;
      const thumbnailCount = Math.ceil(duration / thumbnailInterval);
      
      // Fetch video as blob
      const videoResponse = await fetch(project.videoUrl);
      const videoBlob = await videoResponse.blob();
      const videoFile = new File([videoBlob], 'video.mp4', { type: 'video/mp4' });

      const newThumbnails: TimelineThumbnail[] = [];

      // Generate thumbnails
      for (let i = 0; i < thumbnailCount && i < 50; i++) {
        const timestamp = i * thumbnailInterval;
        
        // Extract frame
        const frame = await extractVideoFrame(videoFile, {
          quality: 0.7,
          maxWidth: 160,
          maxHeight: 90,
          timeInSeconds: timestamp
        });

        // Upload to Supabase Storage
        const fileName = `${project.id}/timeline/${timestamp}.jpg`;
        const { error } = await supabase.storage
          .from('thumbnails')
          .upload(fileName, frame.blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(fileName);

          newThumbnails.push({
            timestamp,
            url: publicUrl
          });
        }
      }

      setThumbnails(newThumbnails);
    } catch (error) {
      console.error('Failed to generate timeline thumbnails:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate thumbnails on zoom change (debounced)
  useEffect(() => {
    if (!project || thumbnails.length > 0) return;
    
    const timer = setTimeout(() => {
      generateTimelineThumbnails();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [duration, zoom, project]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / (pixelsPerSecond * duration)) * duration;
    onTimeUpdate(Math.max(0, Math.min(duration, time)));
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(50, Math.min(300, zoom + delta));
    setTimelineZoom(newZoom);
  };

  const handleFitToView = () => {
    setTimelineZoom(100);
  };

  // Auto-scroll timeline to keep playhead visible
  useEffect(() => {
    if (!timelineRef.current) return;
    const playheadPosition = (currentTime / duration) * (pixelsPerSecond * duration);
    const containerWidth = timelineRef.current.clientWidth;
    const scrollLeft = timelineRef.current.scrollLeft;

    if (playheadPosition < scrollLeft || playheadPosition > scrollLeft + containerWidth) {
      timelineRef.current.scrollLeft = playheadPosition - containerWidth / 2;
    }
  }, [currentTime, duration, pixelsPerSecond]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Timeline</span>
          <span className="text-xs text-muted-foreground">
            {scenes.length} scene{scenes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleZoom(-25)}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleZoom(25)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleFitToView}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline Content */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative"
        onClick={handleTimelineClick}
      >
        <div
          className="relative h-full"
          style={{ width: `${pixelsPerSecond * duration}px` }}
        >
          {/* Time Ruler */}
          <div className="absolute top-0 left-0 right-0 h-8 border-b border-border bg-muted/30">
            {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-border"
                style={{ left: `${(i / duration) * 100}%` }}
              >
                <span className="text-xs text-muted-foreground ml-1">
                  {Math.floor(i / 60)}:{(i % 60).toString().padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          {/* Thumbnail Track */}
          {isGenerating ? (
            <div className="absolute top-8 left-0 right-0 h-20 border-b border-border flex items-center justify-center bg-muted/20">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              <span className="text-xs text-muted-foreground">Generating thumbnails...</span>
            </div>
          ) : thumbnails.length > 0 ? (
            <div className="absolute top-8 left-0 right-0 h-20 border-b border-border flex overflow-hidden">
              {thumbnails.map((thumb) => (
                <div
                  key={thumb.timestamp}
                  className="relative flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ 
                    width: `${(zoom / 100) * 160}px`,
                    marginLeft: thumb.timestamp > 0 ? `${(thumb.timestamp / duration) * pixelsPerSecond * duration - (zoom / 100) * 160}px` : 0
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTimeUpdate(thumb.timestamp);
                  }}
                >
                  <img
                    src={thumb.url}
                    alt={`Frame at ${thumb.timestamp}s`}
                    className="h-full w-full object-cover rounded-sm"
                  />
                  <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[10px] px-1 rounded">
                    {Math.floor(thumb.timestamp / 60)}:{Math.floor(thumb.timestamp % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Scenes Track */}
          <div className="absolute top-28 left-0 right-0 h-16 border-b border-border">
            {scenes.map((scene) => {
              const left = (scene.startTime / duration) * 100;
              const width = ((scene.endTime - scene.startTime) / duration) * 100;

              return (
                <button
                  key={scene.id}
                  className="absolute top-2 bottom-2 rounded px-2 text-xs text-left truncate hover:brightness-110 transition-all"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: scene.speakerColor || 'hsl(var(--primary))',
                    color: 'white',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSceneSelect(scene.id);
                  }}
                >
                  {scene.text}
                </button>
              );
            })}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
