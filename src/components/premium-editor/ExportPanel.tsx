import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Download, Film, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportPanelProps {
  videoFile: File | null;
  scenes: any[];
  captions: any[];
  audioTracks: any[];
}

interface ExportSettings {
  resolution: string;
  format: string;
  quality: number;
  fps: number;
}

export const ExportPanel = ({ videoFile, scenes, captions, audioTracks }: ExportPanelProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [settings, setSettings] = useState<ExportSettings>({
    resolution: "1920x1080",
    format: "mp4",
    quality: 80,
    fps: 30,
  });

  const resolutionOptions = [
    { value: "3840x2160", label: "4K (3840x2160)" },
    { value: "1920x1080", label: "Full HD (1920x1080)" },
    { value: "1280x720", label: "HD (1280x720)" },
    { value: "854x480", label: "SD (854x480)" },
  ];

  const formatOptions = [
    { value: "mp4", label: "MP4 (H.264)" },
    { value: "webm", label: "WebM (VP9)" },
    { value: "mov", label: "MOV (QuickTime)" },
  ];

  const fpsOptions = [
    { value: 24, label: "24 fps (Cinematic)" },
    { value: 30, label: "30 fps (Standard)" },
    { value: 60, label: "60 fps (Smooth)" },
  ];

  const handleExport = async () => {
    if (!videoFile) {
      toast({
        title: "No video loaded",
        description: "Please load a video before exporting",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    // Simulate export progress
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          toast({
            title: "Export complete!",
            description: "Your video has been exported successfully",
          });
          return 100;
        }
        return prev + 5;
      });
    }, 200);

    // TODO: Implement actual video export using FFmpeg
    // This would involve:
    // 1. Loading the video file
    // 2. Applying scene cuts
    // 3. Rendering captions
    // 4. Mixing audio tracks
    // 5. Encoding with selected settings
  };

  const estimatedFileSize = () => {
    if (!videoFile) return "N/A";
    
    const [width, height] = settings.resolution.split("x").map(Number);
    const pixels = width * height;
    const bitrate = (pixels * settings.fps * settings.quality) / 1000000; // Rough estimate
    const durationSeconds = 60; // Placeholder
    const sizeInMB = (bitrate * durationSeconds * 0.125).toFixed(1);
    
    return `~${sizeInMB} MB`;
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Film className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Export Video</h3>
      </div>

      {!isExporting ? (
        <div className="space-y-6">
          {/* Resolution */}
          <div className="space-y-2">
            <Label>Resolution</Label>
            <Select
              value={settings.resolution}
              onValueChange={(value) => setSettings({ ...settings, resolution: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resolutionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>Format</Label>
            <Select
              value={settings.format}
              onValueChange={(value) => setSettings({ ...settings, format: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* FPS */}
          <div className="space-y-2">
            <Label>Frame Rate</Label>
            <Select
              value={settings.fps.toString()}
              onValueChange={(value) => setSettings({ ...settings, fps: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fpsOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quality */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Quality</Label>
              <span className="text-sm text-muted-foreground">{settings.quality}%</span>
            </div>
            <Slider
              value={[settings.quality]}
              onValueChange={(value) => setSettings({ ...settings, quality: value[0] })}
              min={20}
              max={100}
              step={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Smaller file</span>
              <span>Better quality</span>
            </div>
          </div>

          {/* Export Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Settings className="w-4 h-4" />
              <span className="font-medium">Export Summary</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Estimated size:</span>
                <span>{estimatedFileSize()}</span>
              </div>
              <div className="flex justify-between">
                <span>Scenes:</span>
                <span>{scenes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Captions:</span>
                <span>{captions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Audio tracks:</span>
                <span>{audioTracks.length}</span>
              </div>
            </div>
          </div>

          <Button onClick={handleExport} className="w-full" size="lg" disabled={!videoFile}>
            <Download className="w-4 h-4 mr-2" />
            Export Video
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <Film className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
            <h4 className="font-semibold mb-2">Exporting your video...</h4>
            <p className="text-sm text-muted-foreground">This may take a few minutes</p>
          </div>

          <div className="space-y-2">
            <Progress value={exportProgress} />
            <p className="text-center text-sm text-muted-foreground">{exportProgress}%</p>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            {exportProgress < 30 && <p>• Processing video scenes...</p>}
            {exportProgress >= 30 && exportProgress < 60 && <p>• Rendering captions...</p>}
            {exportProgress >= 60 && exportProgress < 90 && <p>• Mixing audio tracks...</p>}
            {exportProgress >= 90 && <p>• Finalizing export...</p>}
          </div>
        </div>
      )}
    </Card>
  );
};
