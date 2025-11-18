import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Download, 
  Video, 
  Film,
  Youtube,
  Instagram,
  Linkedin,
  Twitter,
  CheckCircle,
  Loader2,
  Copy
} from 'lucide-react';

interface ExportPreset {
  id: string;
  name: string;
  platform: string;
  icon: any;
  format: 'mp4' | 'mov' | 'webm';
  resolution: string;
  aspectRatio: string;
  fps: number;
  bitrate: string;
  audioCodec: string;
  description: string;
}

interface ExportJob {
  id: string;
  preset_name: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  output_url: string | null;
  progress: number;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  export_options: any;
}

interface ExportOptions {
  includeSubtitles: boolean;
  includeAD: boolean;
  includeASL: boolean;
  burnCaptions: boolean;
  exportSRT: boolean;
  exportVTT: boolean;
  exportPDF: boolean;
}

interface ExportManagerProps {
  videoId: string;
  projectId: string;
  duration: number;
}

const VIDEO_PRESETS: ExportPreset[] = [
  {
    id: 'youtube-1080p',
    name: 'YouTube 1080p',
    platform: 'YouTube',
    icon: Youtube,
    format: 'mp4',
    resolution: '1920x1080',
    aspectRatio: '16:9',
    fps: 30,
    bitrate: '8M',
    audioCodec: 'aac',
    description: 'Optimized for YouTube uploads'
  },
  {
    id: 'instagram-story',
    name: 'Instagram Story',
    platform: 'Instagram',
    icon: Instagram,
    format: 'mp4',
    resolution: '1080x1920',
    aspectRatio: '9:16',
    fps: 30,
    bitrate: '5M',
    audioCodec: 'aac',
    description: 'Vertical format for stories'
  },
  {
    id: 'instagram-feed',
    name: 'Instagram Feed',
    platform: 'Instagram',
    icon: Instagram,
    format: 'mp4',
    resolution: '1080x1080',
    aspectRatio: '1:1',
    fps: 30,
    bitrate: '5M',
    audioCodec: 'aac',
    description: 'Square format for feed posts'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    platform: 'TikTok',
    icon: Video,
    format: 'mp4',
    resolution: '1080x1920',
    aspectRatio: '9:16',
    fps: 30,
    bitrate: '5M',
    audioCodec: 'aac',
    description: 'Vertical format for TikTok'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    platform: 'LinkedIn',
    icon: Linkedin,
    format: 'mp4',
    resolution: '1920x1080',
    aspectRatio: '16:9',
    fps: 30,
    bitrate: '8M',
    audioCodec: 'aac',
    description: 'Professional video format'
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    platform: 'Twitter',
    icon: Twitter,
    format: 'mp4',
    resolution: '1280x720',
    aspectRatio: '16:9',
    fps: 30,
    bitrate: '5M',
    audioCodec: 'aac',
    description: 'Optimized for Twitter/X'
  },
  {
    id: 'prores-4k',
    name: 'ProRes 4K',
    platform: 'Professional',
    icon: Film,
    format: 'mov',
    resolution: '3840x2160',
    aspectRatio: '16:9',
    fps: 30,
    bitrate: '150M',
    audioCodec: 'pcm_s16le',
    description: 'High quality for editing'
  }
];

export function ExportManager({ videoId, projectId, duration }: ExportManagerProps) {
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>(VIDEO_PRESETS[0]);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeSubtitles: true,
    includeAD: false,
    includeASL: false,
    burnCaptions: true,
    exportSRT: false,
    exportVTT: false,
    exportPDF: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Load export history
  useEffect(() => {
    loadExportJobs();
  }, [videoId]);

  // Poll active export
  useEffect(() => {
    if (!activeJobId) return;

    const pollInterval = setInterval(async () => {
      await checkExportStatus(activeJobId);
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [activeJobId]);

  const loadExportJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Map to include preset_name from export_options
      const mappedJobs = (data || []).map(job => {
        const exportOpts = typeof job.export_options === 'object' && job.export_options !== null 
          ? job.export_options as any 
          : {};
        return {
          id: job.id,
          preset_name: exportOpts.preset || 'Unknown',
          status: job.status as 'queued' | 'processing' | 'completed' | 'failed',
          output_url: job.output_url,
          progress: job.progress || 0,
          created_at: job.created_at!,
          completed_at: job.completed_at,
          error_message: job.error_message,
          export_options: job.export_options
        };
      });

      setExportJobs(mappedJobs);
    } catch (error) {
      console.error('Failed to load export jobs:', error);
    }
  };

  const checkExportStatus = async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      // Map preset_name
      const exportOpts = typeof data.export_options === 'object' && data.export_options !== null 
        ? data.export_options as any 
        : {};
      const mappedJob: ExportJob = {
        id: data.id,
        preset_name: exportOpts.preset || 'Unknown',
        status: data.status as 'queued' | 'processing' | 'completed' | 'failed',
        output_url: data.output_url,
        progress: data.progress || 0,
        created_at: data.created_at!,
        completed_at: data.completed_at,
        error_message: data.error_message,
        export_options: data.export_options
      };

      // Update job in list
      setExportJobs(prev => prev.map(job => 
        job.id === jobId ? mappedJob : job
      ));

      if (data.status === 'completed') {
        setActiveJobId(null);
        setIsExporting(false);
        toast({
          title: 'Export complete! 🎉',
          description: 'Your video is ready to download',
        });
      } else if (data.status === 'failed') {
        setActiveJobId(null);
        setIsExporting(false);
        toast({
          title: 'Export failed',
          description: data.error_message || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to check export status:', error);
    }
  };

  const startExport = async () => {
    setIsExporting(true);

    try {
      toast({
        title: `Starting ${selectedPreset.name} export...`,
      });

      // Call existing queue-export-job Edge Function
      const { data, error } = await supabase.functions.invoke('queue-export-job', {
        body: {
          videoId,
          projectId,
          exportOptions: {
            preset: selectedPreset.name,
            format: selectedPreset.format,
            resolution: selectedPreset.resolution,
            aspectRatio: selectedPreset.aspectRatio,
            fps: selectedPreset.fps,
            bitrate: selectedPreset.bitrate,
            audioCodec: selectedPreset.audioCodec,
            includeSubtitles: exportOptions.includeSubtitles,
            includeAudioDescription: exportOptions.includeAD,
            includeSignLanguage: exportOptions.includeASL,
            burnCaptions: exportOptions.burnCaptions
          }
        }
      });

      if (error) throw error;

      const jobId = data.jobId;
      setActiveJobId(jobId);

      // Reload jobs to get the new one
      await loadExportJobs();

      toast({
        title: 'Export queued!',
        description: 'Processing will start shortly...',
      });

      // Also export subtitle files if requested
      if (exportOptions.exportSRT || exportOptions.exportVTT) {
        await exportSubtitles();
      }

    } catch (error: any) {
      console.error('Export failed:', error);
      toast({
        title: 'Failed to start export',
        description: error.message,
        variant: 'destructive'
      });
      setIsExporting(false);
    }
  };

  const exportSubtitles = async () => {
    try {
      // Fetch transcript
      const { data: segments, error } = await supabase
        .from('transcript_segments_clean')
        .select('*')
        .eq('video_id', videoId)
        .order('start_time');

      if (error) throw error;

      // Generate SRT
      if (exportOptions.exportSRT) {
        const srtContent = generateSRT(segments);
        downloadFile(srtContent, `${videoId}.srt`, 'text/plain');
        toast({
          title: 'SRT file downloaded',
        });
      }

      // Generate VTT
      if (exportOptions.exportVTT) {
        const vttContent = generateVTT(segments);
        downloadFile(vttContent, `${videoId}.vtt`, 'text/vtt');
        toast({
          title: 'VTT file downloaded',
        });
      }

    } catch (error) {
      console.error('Subtitle export failed:', error);
      toast({
        title: 'Failed to export subtitles',
        variant: 'destructive'
      });
    }
  };

  const generateSRT = (segments: any[]): string => {
    return segments.map((seg, index) => {
      const start = msToSRT(seg.start_time * 1000);
      const end = msToSRT(seg.end_time * 1000);
      return `${index + 1}\n${start} --> ${end}\n${seg.text}\n`;
    }).join('\n');
  };

  const generateVTT = (segments: any[]): string => {
    const entries = segments.map(seg => {
      const start = msToVTT(seg.start_time * 1000);
      const end = msToVTT(seg.end_time * 1000);
      return `${start} --> ${end}\n${seg.text}`;
    }).join('\n\n');
    
    return `WEBVTT\n\n${entries}`;
  };

  const msToSRT = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
  };

  const msToVTT = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`;
  };

  const pad = (num: number, size: number = 2): string => {
    return String(num).padStart(size, '0');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard!',
    });
  };

  const estimateFileSize = (): string => {
    const bitrateNum = parseInt(selectedPreset.bitrate.replace('M', ''));
    const sizeInMB = (bitrateNum * duration) / 8;
    return `~${sizeInMB.toFixed(0)} MB`;
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="presets" className="flex-1 flex flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Presets Tab */}
        <TabsContent value="presets" className="flex-1 overflow-y-auto p-4 space-y-3">
          {VIDEO_PRESETS.map(preset => {
            const Icon = preset.icon;
            const isSelected = selectedPreset.id === preset.id;

            return (
              <Card 
                key={preset.id}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  isSelected ? 'border-primary border-2' : ''
                }`}
                onClick={() => setSelectedPreset(preset)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {preset.name}
                    </div>
                    <Badge variant={isSelected ? 'default' : 'outline'} className="text-xs">
                      {preset.resolution}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                </CardHeader>
                {isSelected && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Format:</span>
                        <span className="ml-1 font-medium">{preset.format.toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">FPS:</span>
                        <span className="ml-1 font-medium">{preset.fps}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Aspect:</span>
                        <span className="ml-1 font-medium">{preset.aspectRatio}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Size:</span>
                        <span className="ml-1 font-medium">{estimateFileSize()}</span>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

        {/* Custom Tab */}
        <TabsContent value="custom" className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground">
            Custom export settings (implement advanced options)
          </p>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {exportJobs.length === 0 ? (
                <div className="text-center py-12">
                  <Download className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">No exports yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start your first export from the Presets tab
                  </p>
                </div>
              ) : (
                exportJobs.map(job => (
                  <Card key={job.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {job.status === 'completed' && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            {(job.status === 'processing' || job.status === 'queued') && (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            )}
                            <span className="font-medium text-sm">{job.preset_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {job.status}
                            </Badge>
                          </div>

                          {job.status === 'processing' && job.id === activeJobId && (
                            <Progress value={job.progress || 33} className="h-1 mb-2" />
                          )}

                          <p className="text-xs text-muted-foreground">
                            {new Date(job.created_at).toLocaleString()}
                          </p>

                          {job.error_message && (
                            <p className="text-xs text-red-500 mt-2">{job.error_message}</p>
                          )}
                        </div>

                        {job.status === 'completed' && job.output_url && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(job.output_url!, '_blank')}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(job.output_url!)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Export Options */}
      <Separator />
      <div className="p-4 space-y-3 border-t bg-muted/50">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Accessibility Options</Label>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeSubtitles"
              checked={exportOptions.includeSubtitles}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, includeSubtitles: checked as boolean }))
              }
            />
            <label htmlFor="includeSubtitles" className="text-sm cursor-pointer">
              Include Subtitles
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="burnCaptions"
              checked={exportOptions.burnCaptions}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, burnCaptions: checked as boolean }))
              }
              disabled={!exportOptions.includeSubtitles}
            />
            <label htmlFor="burnCaptions" className="text-sm cursor-pointer">
              Burn Captions (CWI Styled)
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeAD"
              checked={exportOptions.includeAD}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, includeAD: checked as boolean }))
              }
            />
            <label htmlFor="includeAD" className="text-sm cursor-pointer">
              Include Audio Description
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeASL"
              checked={exportOptions.includeASL}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, includeASL: checked as boolean }))
              }
            />
            <label htmlFor="includeASL" className="text-sm cursor-pointer">
              Include Sign Language (PiP)
            </label>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-sm font-semibold">Export Formats</Label>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exportSRT"
              checked={exportOptions.exportSRT}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, exportSRT: checked as boolean }))
              }
            />
            <label htmlFor="exportSRT" className="text-sm cursor-pointer">
              Export SRT File
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="exportVTT"
              checked={exportOptions.exportVTT}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, exportVTT: checked as boolean }))
              }
            />
            <label htmlFor="exportVTT" className="text-sm cursor-pointer">
              Export VTT File
            </label>
          </div>
        </div>

        <Button
          onClick={startExport}
          disabled={isExporting}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export {selectedPreset.name}
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Estimated file size: {estimateFileSize()} • Duration: {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}
