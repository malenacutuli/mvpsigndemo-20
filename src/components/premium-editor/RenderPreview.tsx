import { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Maximize2, Eye, EyeOff } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface Scene {
  id: string;
  startTime: number;
  endTime: number;
  transition?: {
    type: string;
    duration: number;
  };
  effects?: Array<{
    id: string;
    type: string;
    intensity: number;
    enabled: boolean;
  }>;
}

interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style: any;
}

interface RenderPreviewProps {
  videoUrl: string;
  scenes: Scene[];
  captions: Caption[];
  currentTime: number;
  duration: number;
  onTimeUpdate: (time: number) => void;
}

export const RenderPreview = ({
  videoUrl,
  scenes,
  captions,
  currentTime,
  duration,
  onTimeUpdate,
}: RenderPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEffects, setShowEffects] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);
  const animationFrameRef = useRef<number>();

  // Find active scene and effects
  const activeScene = scenes.find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime
  );

  const activeCaptions = captions.filter(
    (c) => currentTime >= c.startTime && currentTime <= c.endTime
  );

  // Sync video with current time
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.1) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Render video frame to canvas with effects
  const renderFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas size to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply effects if enabled
    if (showEffects && activeScene?.effects) {
      activeScene.effects.forEach((effect) => {
        if (!effect.enabled) return;

        const intensity = effect.intensity / 100;

        switch (effect.type) {
          case "blur":
            ctx.filter = `blur(${intensity * 10}px)`;
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = "none";
            break;

          case "brightness":
            ctx.filter = `brightness(${0.5 + intensity * 1.5})`;
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = "none";
            break;

          case "contrast":
            ctx.filter = `contrast(${0.5 + intensity * 1.5})`;
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = "none";
            break;

          case "saturation":
            ctx.filter = `saturate(${intensity * 2})`;
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = "none";
            break;

          case "grayscale":
            ctx.filter = `grayscale(${intensity})`;
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = "none";
            break;

          case "sepia":
            ctx.filter = `sepia(${intensity})`;
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = "none";
            break;

          case "invert":
            ctx.filter = `invert(${intensity})`;
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = "none";
            break;

          case "vignette":
            const gradient = ctx.createRadialGradient(
              canvas.width / 2,
              canvas.height / 2,
              0,
              canvas.width / 2,
              canvas.height / 2,
              Math.max(canvas.width, canvas.height) / 2
            );
            gradient.addColorStop(0, `rgba(0,0,0,0)`);
            gradient.addColorStop(1, `rgba(0,0,0,${intensity * 0.8})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;

          case "noise":
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const amount = intensity * 50;
            for (let i = 0; i < data.length; i += 4) {
              const noise = (Math.random() - 0.5) * amount;
              data[i] += noise;
              data[i + 1] += noise;
              data[i + 2] += noise;
            }
            ctx.putImageData(imageData, 0, 0);
            break;
        }
      });
    }

    // Draw captions if enabled
    if (showCaptions && activeCaptions.length > 0) {
      activeCaptions.forEach((caption) => {
        const style = caption.style || {};
        const fontSize = style.fontSize || 48;
        const fontFamily = style.fontFamily || "Arial";
        const color = style.color || "#FFFFFF";
        const backgroundColor = style.backgroundColor || "rgba(0,0,0,0.7)";
        const position = style.position || "bottom";

        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const x = canvas.width / 2;
        let y = canvas.height / 2;

        switch (position) {
          case "top":
            y = fontSize + 20;
            break;
          case "center":
            y = canvas.height / 2;
            break;
          case "bottom":
            y = canvas.height - fontSize - 20;
            break;
        }

        // Background
        const textMetrics = ctx.measureText(caption.text);
        const textWidth = textMetrics.width;
        const padding = 20;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(
          x - textWidth / 2 - padding,
          y - fontSize / 2 - padding / 2,
          textWidth + padding * 2,
          fontSize + padding
        );

        // Text
        ctx.fillStyle = color;
        ctx.fillText(caption.text, x, y);
      });
    }

    // Draw scene transition indicator
    if (activeScene?.transition) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = "14px Arial";
      ctx.textAlign = "left";
      ctx.fillText(
        `Transition: ${activeScene.transition.type} (${activeScene.transition.duration}s)`,
        10,
        30
      );
    }
  };

  // Animation loop
  useEffect(() => {
    const animate = () => {
      renderFrame();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeScene, activeCaptions, showEffects, showCaptions]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      onTimeUpdate(0);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleFullscreen = () => {
    if (canvasRef.current) {
      canvasRef.current.requestFullscreen();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Render Preview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showEffects ? "default" : "outline"}
              onClick={() => setShowEffects(!showEffects)}
            >
              <Eye className="w-3 h-3 mr-1" />
              Effects
            </Button>
            <Button
              size="sm"
              variant={showCaptions ? "default" : "outline"}
              onClick={() => setShowCaptions(!showCaptions)}
            >
              <Eye className="w-3 h-3 mr-1" />
              Captions
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Canvas */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl}
            className="hidden"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
          />
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
          />

          {/* Active Scene Badge */}
          {activeScene && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-black/70 text-white">
                Scene {scenes.indexOf(activeScene) + 1}
                {activeScene.effects && activeScene.effects.length > 0 && (
                  <span className="ml-1">
                    • {activeScene.effects.filter(e => e.enabled).length} effects
                  </span>
                )}
              </Badge>
            </div>
          )}

          {/* Active Captions Count */}
          {activeCaptions.length > 0 && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-black/70 text-white">
                {activeCaptions.length} caption{activeCaptions.length > 1 ? "s" : ""}
              </Badge>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <div className="flex-1 flex items-center gap-2 text-sm">
              <span className="font-mono">
                {currentTime.toFixed(2)}s
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="font-mono text-muted-foreground">
                {duration.toFixed(2)}s
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleFullscreen}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Timeline Slider */}
          <Slider
            value={[currentTime]}
            onValueChange={(value) => {
              onTimeUpdate(value[0]);
              if (videoRef.current) {
                videoRef.current.currentTime = value[0];
              }
            }}
            min={0}
            max={duration}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-medium">{scenes.length}</div>
            <div className="text-xs text-muted-foreground">Scenes</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-medium">{captions.length}</div>
            <div className="text-xs text-muted-foreground">Captions</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-medium">
              {scenes.reduce((acc, s) => acc + (s.effects?.filter(e => e.enabled).length || 0), 0)}
            </div>
            <div className="text-xs text-muted-foreground">Effects</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
