import { Button } from "@/components/ui/button";
import { SkipBack, SkipForward, Image } from "lucide-react";
import type { VideoSampleSink } from "mediabunny";

interface FrameNavigatorProps {
  videoSink: VideoSampleSink | null;
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onFrameExtracted?: (canvas: HTMLCanvasElement) => void;
}

export const FrameNavigator = ({ 
  videoSink, 
  duration,
  currentTime, 
  onSeek,
  onFrameExtracted 
}: FrameNavigatorProps) => {
  const frameRate = 30;
  const frameDuration = 1 / frameRate;

  const handlePreviousFrame = async () => {
    const newTime = Math.max(0, currentTime - frameDuration);
    onSeek(newTime);
    await extractCurrentFrame();
  };

  const handleNextFrame = async () => {
    if (!videoSink) return;
    const newTime = Math.min(duration, currentTime + frameDuration);
    onSeek(newTime);
    await extractCurrentFrame();
  };

  const extractCurrentFrame = async () => {
    if (!videoSink || !onFrameExtracted) return;

    try {

      const sample = await videoSink.getSample(currentTime);
      if (!sample) return;

      // Create canvas and render frame
      const canvas = document.createElement('canvas');
      canvas.width = sample.codedWidth;
      canvas.height = sample.codedHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        sample.draw(ctx, 0, 0);
        onFrameExtracted(canvas);
      }

      sample.close();
    } catch (error) {
      console.error('Error extracting frame:', error);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-background/80 backdrop-blur-sm rounded-lg border border-border">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreviousFrame}
        disabled={!videoSink || currentTime <= 0}
        className="h-8 w-8 p-0"
      >
        <SkipBack className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleNextFrame}
        disabled={!videoSink || currentTime >= duration}
        className="h-8 w-8 p-0"
      >
        <SkipForward className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={extractCurrentFrame}
        disabled={!videoSink}
        className="h-8 gap-2"
      >
        <Image className="h-4 w-4" />
        Extract Frame
      </Button>

      <span className="text-xs text-muted-foreground ml-2">
        Frame: {Math.floor(currentTime * frameRate)}
      </span>
    </div>
  );
};
