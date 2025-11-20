import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Download, Film, Info } from 'lucide-react';
import { toast } from 'sonner';
import { downloadOriginalVideo, formatFileSize } from '@/lib/videoExporter';
import type { ExportSettings } from './ExportQualitySettings';

interface VideoExporterProps {
  videoFile: File | null;
  exportSettings: ExportSettings | null;
  videoDuration?: number;
}

export function VideoExporter({ videoFile, exportSettings, videoDuration = 0 }: VideoExporterProps) {
  
  const handleDownloadOriginal = () => {
    if (!videoFile) {
      toast.error('No video file loaded');
      return;
    }

    downloadOriginalVideo(videoFile);
    toast.success('Download started');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="w-5 h-5" />
          Export Video
        </CardTitle>
        <CardDescription>
          Download video with configured settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Video re-encoding with custom settings requires server-side processing. 
            For now, you can download the original video file.
          </AlertDescription>
        </Alert>

        {/* Export Settings Summary */}
        {exportSettings && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Configured Export Settings:</div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{exportSettings.codec.toUpperCase()}</Badge>
              <Badge variant="outline">{exportSettings.quality}</Badge>
              <Badge variant="outline">
                {(exportSettings.videoBitrate / 1_000_000).toFixed(1)} Mbps
              </Badge>
              {exportSettings.maxWidth && (
                <Badge variant="outline">
                  {exportSettings.maxWidth}x{exportSettings.maxHeight}
                </Badge>
              )}
              {exportSettings.fps && (
                <Badge variant="outline">{exportSettings.fps} fps</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              These settings will be available when server-side export is implemented
            </div>
          </div>
        )}

        {/* Original Video Info */}
        {videoFile && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Original Video:</div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Filename:</span>
                <span className="font-medium">{videoFile.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span className="font-medium">{formatFileSize(videoFile.size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">{videoFile.type}</span>
              </div>
            </div>
          </div>
        )}

        {/* Download Button */}
        <Button
          onClick={handleDownloadOriginal}
          disabled={!videoFile}
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Original Video
        </Button>
      </CardContent>
    </Card>
  );
}

