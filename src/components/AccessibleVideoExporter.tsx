import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Loader2, Video, FileText, Volume2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AccessibleVideoExporterProps {
  videoUrl: string;
  videoId: string;
  captions?: any[];
  audioDescriptions?: any[];
  characterColors?: { [key: string]: string };
  currentLanguage?: string;
  onExportComplete?: (downloadUrl: string) => void;
}

interface ExportProgress {
  stage: 'preparing' | 'processing' | 'finalizing' | 'complete';
  progress: number;
  message: string;
}

export const AccessibleVideoExporter: React.FC<AccessibleVideoExporterProps> = ({
  videoUrl,
  videoId,
  captions = [],
  audioDescriptions = [],
  characterColors = {},
  currentLanguage = 'en',
  onExportComplete
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const getProgressMessage = (stage: string, progress: number): string => {
    switch (stage) {
      case 'preparing': return 'Preparing video for caption rendering...';
      case 'processing': return `Rendering captions directly into video... ${progress}%`;
      case 'finalizing': return 'Finalizing social media-ready MP4...';
      case 'complete': return 'Video with burned-in captions ready!';
      default: return 'Processing...';
    }
  };

  const handleExport = async () => {
    if (!captions.length) {
      toast.error('No captions to embed. Please generate captions first.');
      return;
    }

    setIsExporting(true);
    setExportProgress({ stage: 'preparing', progress: 10, message: 'Preparing export...' });

    try {
      console.log('🎬 Starting accessible video export:', {
        videoId,
        captionsCount: captions.length,
        audioDescriptionsCount: audioDescriptions.length,
        language: currentLanguage,
        characterColorsCount: Object.keys(characterColors).length
      });

      // Prepare export data
      const exportData = {
        videoId,
        videoUrl,
        captions: captions.map(caption => ({
          ...caption,
          speakerColor: characterColors[caption.speaker] || '#FFFFFF'
        })),
        audioDescriptions,
        language: currentLanguage,
        exportOptions: {
          includeSubtitles: captions.length > 0,
          includeAudioDescriptions: audioDescriptions.length > 0,
          subtitleStyle: {
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            outlineWidth: '2px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '8px 12px',
            borderRadius: '4px'
          }
        }
      };

      setExportProgress({ stage: 'processing', progress: 30, message: 'Rendering captions into video...' });

      // Call edge function to process video
      console.log('🚀 Starting export with data:', exportData);
      const { data, error } = await supabase.functions.invoke('export-accessible-video', {
        body: exportData
      });

      console.log('📥 Export response:', { data, error });

      if (error) {
        console.error('❌ Export function error:', error);
        throw new Error(error.message || 'Failed to export video');
      }

      setExportProgress({ stage: 'finalizing', progress: 90, message: 'Finalizing...' });

      // Handle the response based on whether it's a streaming response or direct URL
      if (data.downloadUrl) {
        setDownloadUrl(data.downloadUrl);
        setExportProgress({ stage: 'complete', progress: 100, message: 'Export complete!' });
        
        toast.success('Accessible video exported successfully!');
        onExportComplete?.(data.downloadUrl);
      } else if (data.processId) {
        // Poll for completion if processing is async
        await pollExportStatus(data.processId);
      } else {
        throw new Error('Invalid response from export service');
      }

    } catch (error) {
      console.error('❌ Export failed:', error);
      toast.error(`Export failed: ${error.message}`);
      setExportProgress(null);
    } finally {
      setIsExporting(false);
    }
  };

  const pollExportStatus = async (processId: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('export-status', {
          body: { processId }
        });

        if (error) throw error;

        if (data.status === 'complete') {
          setDownloadUrl(data.downloadUrl);
          setExportProgress({ stage: 'complete', progress: 100, message: 'Export complete!' });
          toast.success('Accessible video exported successfully!');
          onExportComplete?.(data.downloadUrl);
          return;
        }

        if (data.status === 'failed') {
          throw new Error(data.error || 'Export failed');
        }

        // Update progress
        const progress = Math.min(90, 30 + (attempts * 2));
        setExportProgress({ 
          stage: 'processing', 
          progress, 
          message: `Burning captions into video... ${Math.round(progress)}%` 
        });

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          throw new Error('Export timeout - please try again');
        }
      } catch (error) {
        console.error('❌ Polling failed:', error);
        toast.error(`Export failed: ${error.message}`);
        setExportProgress(null);
        setIsExporting(false);
      }
    };

    poll();
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `accessible-video-${videoId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started!');
    }
  };

  const featuresCount = (captions.length > 0 ? 1 : 0);
  const speakersCount = Object.keys(characterColors).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Export Accessible Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Captions to Burn Into Video:
            </h4>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {captions.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Captions with Speaker Colors ({captions.length})
              </Badge>
            )}
            
            {speakersCount > 0 && (
              <Badge variant="outline">
                {speakersCount} Speaker{speakersCount > 1 ? 's' : ''} with Colors
              </Badge>
            )}
          </div>

          {captions.length === 0 && (
            <Alert>
              <AlertDescription>
                Generate captions first to create a video with burned-in subtitles.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {exportProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{exportProgress.stage.charAt(0).toUpperCase() + exportProgress.stage.slice(1)}</span>
              <span>{exportProgress.progress}%</span>
            </div>
            <Progress value={exportProgress.progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{exportProgress.message}</p>
          </div>
        )}

        {downloadUrl && !isExporting && (
          <Alert>
            <Download className="w-4 h-4" />
            <AlertDescription>
              Your video with burned-in captions is ready! No need to add subtitles when uploading to social media.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={handleExport}
            disabled={isExporting || captions.length === 0}
            className="flex-1"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Burning Captions...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Render Video with Captions
              </>
            )}
          </Button>

          {downloadUrl && (
            <Button onClick={handleDownload} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p><strong>Output format:</strong> MP4 with captions burned directly into video</p>
          <p><strong>Social media ready:</strong> Upload anywhere without needing to add subtitles</p>
          <p><strong>Speaker colors:</strong> Each speaker gets a unique color for easy identification</p>
        </div>
      </CardContent>
    </Card>
  );
};