import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Maximize2 } from "lucide-react";
import { toast } from "sonner";

interface FrameCanvasProps {
  width?: number;
  height?: number;
  className?: string;
}

export const FrameCanvas = forwardRef<any, FrameCanvasProps>(({ 
  width = 800, 
  height = 600, 
  className = "" 
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasFrame, setHasFrame] = useState(false);

  const updateFrame = (sourceCanvas: HTMLCanvasElement) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Calculate scaling to fit
    const scaleX = canvasRef.current.width / sourceCanvas.width;
    const scaleY = canvasRef.current.height / sourceCanvas.height;
    const scale = Math.min(scaleX, scaleY);

    const scaledWidth = sourceCanvas.width * scale;
    const scaledHeight = sourceCanvas.height * scale;
    const x = (canvasRef.current.width - scaledWidth) / 2;
    const y = (canvasRef.current.height - scaledHeight) / 2;

    // Draw frame centered
    ctx.drawImage(sourceCanvas, x, y, scaledWidth, scaledHeight);
    setHasFrame(true);
  };

  // Expose updateFrame method via ref
  useImperativeHandle(ref, () => ({
    updateFrame
  }));

  const handleDownload = () => {
    if (!canvasRef.current || !hasFrame) return;

    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frame-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Frame downloaded!');
    });
  };

  const handleFullscreen = () => {
    if (!canvasRef.current) return;
    canvasRef.current.requestFullscreen();
  };

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto border border-border rounded-lg bg-muted/50"
      />
      
      {hasFrame && (
        <div className="absolute top-2 right-2 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            className="h-8 w-8 p-0"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleFullscreen}
            className="h-8 w-8 p-0"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!hasFrame && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          No frame extracted yet
        </div>
      )}
    </div>
  );
});

FrameCanvas.displayName = 'FrameCanvas';
