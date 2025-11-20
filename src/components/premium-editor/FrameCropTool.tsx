import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Crop, RotateCw, RotateCcw, Maximize2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FrameCropToolProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  onApply?: (croppedImageUrl: string, rotation: number) => void;
}

export function FrameCropTool({ imageUrl, imageWidth, imageHeight, onApply }: FrameCropToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [crop, setCrop] = useState<CropRect>({
    x: 0,
    y: 0,
    width: imageWidth,
    height: imageHeight
  });
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    drawCanvas();
  }, [crop, rotation]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on rotation
    const isRotated = rotation === 90 || rotation === 270;
    canvas.width = isRotated ? imageHeight : imageWidth;
    canvas.height = isRotated ? imageWidth : imageHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply rotation
    ctx.save();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-imageWidth / 2, -imageHeight / 2);

    // Draw image
    ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
    ctx.restore();

    // Draw crop overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(crop.x, crop.y, crop.width, crop.height);

    // Draw crop border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);

    // Draw corner handles
    const handleSize = 10;
    ctx.fillStyle = '#3b82f6';
    [
      [crop.x, crop.y],
      [crop.x + crop.width, crop.y],
      [crop.x, crop.y + crop.height],
      [crop.x + crop.width, crop.y + crop.height]
    ].forEach(([x, y]) => {
      ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const width = Math.abs(x - dragStart.x);
    const height = Math.abs(y - dragStart.y);
    const newX = Math.min(x, dragStart.x);
    const newY = Math.min(y, dragStart.y);

    setCrop({
      x: Math.max(0, newX),
      y: Math.max(0, newY),
      width: Math.min(width, canvas.width - newX),
      height: Math.min(height, canvas.height - newY)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRotate = (direction: 'cw' | 'ccw') => {
    setRotation(prev => {
      const delta = direction === 'cw' ? 90 : -90;
      return ((prev + delta + 360) % 360) as 0 | 90 | 180 | 270;
    });
  };

  const handleReset = () => {
    setCrop({
      x: 0,
      y: 0,
      width: imageWidth,
      height: imageHeight
    });
    setRotation(0);
  };

  const handleApply = async () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    try {
      // Create output canvas with crop dimensions
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = crop.width;
      outputCanvas.height = crop.height;
      const ctx = outputCanvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      // Apply transformations
      ctx.save();
      
      // Handle rotation
      if (rotation !== 0) {
        const centerX = crop.width / 2;
        const centerY = crop.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

      // Draw cropped area
      ctx.drawImage(
        img,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, crop.width, crop.height
      );
      ctx.restore();

      // Convert to data URL
      const croppedUrl = outputCanvas.toDataURL('image/png');
      
      if (onApply) {
        onApply(croppedUrl, rotation);
      }

      toast.success('Crop and rotation applied');
    } catch (error: any) {
      console.error('Failed to apply crop:', error);
      toast.error('Failed to apply transformations');
    }
  };

  const handleDownload = async () => {
    await handleApply();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `cropped-frame-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Crop className="w-4 h-4" />
          Crop & Rotate Frame
        </CardTitle>
        <CardDescription className="text-xs">
          Click and drag to select crop area
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas */}
        <div className="relative bg-muted rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Crop Controls */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-xs text-muted-foreground">Width</label>
              <div className="font-medium">{Math.round(crop.width)}px</div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Height</label>
              <div className="font-medium">{Math.round(crop.height)}px</div>
            </div>
          </div>

          {/* Rotation Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRotate('ccw')}
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Rotate Left
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRotate('cw')}
              className="flex-1"
            >
              <RotateCw className="w-4 h-4 mr-1" />
              Rotate Right
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            Current rotation: {rotation}°
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="flex-1"
            >
              <Maximize2 className="w-4 h-4 mr-1" />
              Reset
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={handleApply}
              className="flex-1"
            >
              <Crop className="w-4 h-4 mr-1" />
              Apply
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
