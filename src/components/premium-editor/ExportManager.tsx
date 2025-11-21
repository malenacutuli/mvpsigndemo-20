import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { 
  Download, Video, FileText, Music, 
  Loader2, CheckCircle, AlertCircle,
  Play, Copy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AccessibleVideoExporter } from '@/components/AccessibleVideoExporter';
import { Scene } from '@/lib/premium-editor/scene-manager';

interface ExportManagerProps {
  videoId: string;
  videoUrl: string;
  scenes: Scene[];
  captions?: any[];
  audioDescriptions?: any[];
  characterColors?: { [key: string]: string };
  currentLanguage?: string;
}

interface ExportJob {
  id: string;
  format: ExportFormat;
  preset: ExportPreset;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  fileSize?: number;
  duration?: number;
  createdAt: Date;
  completedAt?: Date;
}

type ExportFormat = 
  | 'video-mp4' 
  | 'video-webm' 
  | 'audio-mp3' 
  | 'audio-wav'
  | 'transcript-srt'
  | 'transcript-vtt'
  | 'transcript-txt'
  | 'captions-srt'
  | 'timeline-json'
  | 'project-zip';

type ExportPreset = 
  | 'web-optimized'
  | 'high-quality'
  | 'social-media'
  | 'broadcast'
  | 'archive'
  | 'accessibility-full'
  | 'custom';

const EXPORT_PRESETS = {
  'web-optimized': {
    name: 'Web Optimized',
    description: 'Balanced quality and file size for web',
    icon: '🌐',
    formats: ['video-mp4'],
    settings: {
      resolution: '1920x1080',
      bitrate: '5000k',
      fps: 30,
      codec: 'h264',
      audioCodec: 'aac',
      audioBitrate: '192k'
    },
    includeBurnedCaptions: true,
    includeAccessibilityTrack: false
  },
  'high-quality': {
    name: 'High Quality',
    description: 'Maximum quality for professional use',
    icon: '⭐',
    formats: ['video-mp4'],
    settings: {
      resolution: '3840x2160',
      bitrate: '20000k',
      fps: 60,
      codec: 'h264',
      audioCodec: 'aac',
      audioBitrate: '320k'
    },
    includeBurnedCaptions: false,
    includeAccessibilityTrack: true
  },
  'social-media': {
    name: 'Social Media Ready',
    description: 'Optimized for Instagram, TikTok, YouTube',
    icon: '📱',
    formats: ['video-mp4'],
    settings: {
      resolution: '1080x1920',
      bitrate: '8000k',
      fps: 30,
      codec: 'h264',
      audioCodec: 'aac',
      audioBitrate: '192k'
    },
    includeBurnedCaptions: true,
    includeAccessibilityTrack: false
  },
  'broadcast': {
    name: 'Broadcast Standard',
    description: 'Broadcast-ready HD video',
    icon: '📺',
    formats: ['video-mp4'],
    settings: {
      resolution: '1920x1080',
      bitrate: '50000k',
      fps: 29.97,
      codec: 'h264',
      audioCodec: 'pcm',
      audioBitrate: '1411k'
    },
    includeBurnedCaptions: true,
    includeAccessibilityTrack: true
  },
  'archive': {
    name: 'Archive',
    description: 'Uncompressed master for archival',
    icon: '💾',
    formats: ['video-mp4'],
    settings: {
      resolution: '3840x2160',
      bitrate: '100000k',
      fps: 60,
      codec: 'prores',
      audioCodec: 'pcm',
      audioBitrate: '1411k'
    },
    includeBurnedCaptions: false,
    includeAccessibilityTrack: true
  },
  'accessibility-full': {
    name: 'Full Accessibility',
    description: 'All accessibility features included',
    icon: '♿',
    formats: ['video-mp4', 'captions-srt', 'transcript-txt'],
    settings: {
      resolution: '1920x1080',
      bitrate: '8000k',
      fps: 30,
      codec: 'h264',
      audioCodec: 'aac',
      audioBitrate: '192k'
    },
    includeBurnedCaptions: true,
    includeAccessibilityTrack: true,
    includeAudioDescription: true,
    includeSignLanguage: true,
    separateAudioDescriptionTrack: true,
    separateCaptionFiles: true
  }
};

const EXPORT_FORMATS = {
  'video-mp4': {
    name: 'MP4 Video',
    description: 'Universal video format',
    icon: Video,
    extension: '.mp4',
    mimeType: 'video/mp4'
  },
  'video-webm': {
    name: 'WebM Video',
    description: 'Web-optimized format',
    icon: Video,
    extension: '.webm',
    mimeType: 'video/webm'
  },
  'audio-mp3': {
    name: 'MP3 Audio',
    description: 'Audio only',
    icon: Music,
    extension: '.mp3',
    mimeType: 'audio/mpeg'
  },
  'audio-wav': {
    name: 'WAV Audio',
    description: 'Uncompressed audio',
    icon: Music,
    extension: '.wav',
    mimeType: 'audio/wav'
  },
  'transcript-srt': {
    name: 'SRT Subtitles',
    description: 'Timed subtitles',
    icon: FileText,
    extension: '.srt',
    mimeType: 'text/plain'
  },
  'transcript-vtt': {
    name: 'WebVTT Subtitles',
    description: 'Web subtitles',
    icon: FileText,
    extension: '.vtt',
    mimeType: 'text/vtt'
  },
  'transcript-txt': {
    name: 'Plain Text Transcript',
    description: 'Simple text file',
    icon: FileText,
    extension: '.txt',
    mimeType: 'text/plain'
  },
  'captions-srt': {
    name: 'Captions (SRT)',
    description: 'Captions with speaker names',
    icon: FileText,
    extension: '.srt',
    mimeType: 'text/plain'
  },
  'timeline-json': {
    name: 'Timeline Data',
    description: 'Scene and timing data',
    icon: FileText,
    extension: '.json',
    mimeType: 'application/json'
  },
  'project-zip': {
    name: 'Complete Project',
    description: 'All files bundled',
    icon: Download,
    extension: '.zip',
    mimeType: 'application/zip'
  }
};

export function ExportManager({
  videoId,
  videoUrl,
  scenes,
  captions = [],
  audioDescriptions = [],
  characterColors = {},
  currentLanguage = 'en'
}: ExportManagerProps) {
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>('web-optimized');
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(['video-mp4']);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  
  const [burnCaptions, setBurnCaptions] = useState(true);
  const [includeCaptionFile, setIncludeCaptionFile] = useState(true);
  const [includeAudioDescription, setIncludeAudioDescription] = useState(false);
  const [includeSignLanguage, setIncludeSignLanguage] = useState(false);
  const [useCWIColors, setUseCWIColors] = useState(true);
  
  const [resolution, setResolution] = useState('1920x1080');
  const [quality, setQuality] = useState(80);
  const [fps, setFps] = useState(30);

  useEffect(() => {
    loadExistingExports();
  }, [videoId]);

  useEffect(() => {
    const preset = EXPORT_PRESETS[selectedPreset];
    if (preset) {
      setResolution(preset.settings.resolution);
      setBurnCaptions(preset.includeBurnedCaptions);
      setIncludeAudioDescription(preset.includeAudioDescription || false);
      
      if (preset.formats) {
        setSelectedFormats(preset.formats as ExportFormat[]);
      }
    }
  }, [selectedPreset]);

  const loadExistingExports = async () => {
    try {
      const { data, error } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const jobs: ExportJob[] = (data || []).map(j => {
        const options = j.export_options as any || {};
        return {
          id: j.id,
          format: (options.format || 'video-mp4') as ExportFormat,
          preset: (options.preset || 'web-optimized') as ExportPreset,
          status: (j.status || 'pending') as 'pending' | 'processing' | 'completed' | 'failed',
          progress: j.progress || 0,
          outputUrl: j.output_url || undefined,
          fileSize: undefined,
          duration: undefined,
          createdAt: new Date(j.created_at),
          completedAt: j.completed_at ? new Date(j.completed_at) : undefined
        };
      });

      setExportJobs(jobs);
    } catch (error) {
      console.error('Failed to load exports:', error);
    }
  };

  const startExport = async () => {
    setIsExporting(true);
    
    try {
      if (selectedFormats.length === 0) {
        toast.error('Please select at least one export format');
        return;
      }

      const exportCaptions = captions.map(caption => ({
        ...caption,
        speakerColor: useCWIColors ? (characterColors[caption.speaker] || '#FFFFFF') : '#FFFFFF'
      }));

      for (const format of selectedFormats) {
        const jobId = `export-${Date.now()}-${format}`;
        
        const job: ExportJob = {
          id: jobId,
          format,
          preset: selectedPreset,
          status: 'pending',
          progress: 0,
          createdAt: new Date()
        };

        setExportJobs(prev => [job, ...prev]);

        if (format.startsWith('video-')) {
          await exportVideo(job, exportCaptions);
        } else if (format.startsWith('audio-')) {
          await exportAudio(job);
        } else if (format.startsWith('transcript-') || format.startsWith('captions-')) {
          await exportText(job, exportCaptions);
        } else if (format === 'timeline-json') {
          await exportTimeline(job);
        } else if (format === 'project-zip') {
          await exportProject(job, exportCaptions);
        }
      }

      toast.success('Export started!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to start export');
    } finally {
      setIsExporting(false);
    }
  };

  const exportVideo = async (job: ExportJob, exportCaptions: any[]) => {
    try {
      setExportJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'processing', progress: 10 } : j
      ));

      const preset = EXPORT_PRESETS[selectedPreset];

      const { data, error } = await supabase.functions.invoke('export-video', {
        body: {
          videoId,
          videoUrl,
          format: job.format,
          preset: job.preset,
          settings: {
            ...preset.settings,
            resolution,
            quality,
            fps
          },
          captions: burnCaptions ? exportCaptions : [],
          audioDescriptions: includeAudioDescription ? audioDescriptions : [],
          includeSignLanguage,
          separateCaptionTrack: includeCaptionFile,
          captionStyle: useCWIColors ? 'cwi' : 'standard'
        }
      });

      if (error) throw error;

      setExportJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, progress: 30 } : j
      ));

      if (data.processId) {
        await pollExportStatus(job.id, data.processId);
      } else {
        setExportJobs(prev => prev.map(j => 
          j.id === job.id 
            ? { 
                ...j, 
                status: 'completed', 
                progress: 100, 
                outputUrl: data.downloadUrl,
                fileSize: data.fileSize,
                completedAt: new Date()
              } 
            : j
        ));
      }

      await supabase.from('export_jobs').insert({
        video_id: videoId,
        user_id: (await supabase.auth.getUser()).data.user?.id || '',
        export_options: {
          format: job.format,
          preset: job.preset
        },
        status: 'completed',
        output_url: data.downloadUrl
      });
    } catch (error) {
      setExportJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'failed' } : j
      ));
      throw error;
    }
  };

  const exportAudio = async (job: ExportJob) => {
    try {
      setExportJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'processing', progress: 10 } : j
      ));

      const { data, error } = await supabase.functions.invoke('export-audio', {
        body: {
          videoId,
          videoUrl,
          format: job.format,
          includeAudioDescription: includeAudioDescription && audioDescriptions.length > 0
        }
      });

      if (error) throw error;

      setExportJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { 
              ...j, 
              status: 'completed', 
              progress: 100,
              outputUrl: data.downloadUrl,
              fileSize: data.fileSize,
              completedAt: new Date()
            } 
          : j
      ));

      toast.success('Audio exported successfully!');
    } catch (error) {
      setExportJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'failed' } : j
      ));
      toast.error('Audio export failed');
    }
  };

  const exportText = async (job: ExportJob, exportCaptions: any[]) => {
    try {
      let content = '';
      let filename = '';

      if (job.format === 'transcript-srt' || job.format === 'captions-srt') {
        content = generateSRT(exportCaptions, job.format === 'captions-srt');
        filename = `${videoId}-${job.format === 'captions-srt' ? 'captions' : 'transcript'}.srt`;
      } else if (job.format === 'transcript-vtt') {
        content = generateVTT(exportCaptions);
        filename = `${videoId}-transcript.vtt`;
      } else if (job.format === 'transcript-txt') {
        content = exportCaptions.map(c => c.text).join('\n\n');
        filename = `${videoId}-transcript.txt`;
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('exports')
        .upload(filename, new Blob([content], { type: 'text/plain' }), {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('exports')
        .getPublicUrl(filename);

      setExportJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { 
              ...j, 
              status: 'completed', 
              progress: 100,
              outputUrl: publicUrl,
              fileSize: content.length,
              completedAt: new Date()
            } 
          : j
      ));

      toast.success('Text export completed!');
    } catch (error) {
      setExportJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'failed' } : j
      ));
      toast.error('Text export failed');
    }
  };

  const exportTimeline = async (job: ExportJob) => {
    try {
      const timelineData = {
        videoId,
        scenes: scenes.map(s => ({
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          duration: s.endTime - s.startTime,
          speaker: s.speaker,
          speakerColor: s.speakerColor,
          text: s.text,
          layout: s.layout
        })),
        captions,
        audioDescriptions,
        characterColors,
        metadata: {
          exportedAt: new Date().toISOString(),
          preset: selectedPreset,
          totalDuration: scenes[scenes.length - 1]?.endTime || 0
        }
      };

      const content = JSON.stringify(timelineData, null, 2);
      const filename = `${videoId}-timeline.json`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('exports')
        .upload(filename, new Blob([content], { type: 'application/json' }), {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('exports')
        .getPublicUrl(filename);

      setExportJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { 
              ...j, 
              status: 'completed', 
              progress: 100,
              outputUrl: publicUrl,
              fileSize: content.length,
              completedAt: new Date()
            } 
          : j
      ));

      toast.success('Timeline exported!');
    } catch (error) {
      setExportJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'failed' } : j
      ));
      toast.error('Timeline export failed');
    }
  };

  const exportProject = async (job: ExportJob, exportCaptions: any[]) => {
    try {
      setExportJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'processing', progress: 10 } : j
      ));

      const { data, error } = await supabase.functions.invoke('export-project-bundle', {
        body: {
          videoId,
          videoUrl,
          scenes,
          captions: exportCaptions,
          audioDescriptions,
          characterColors,
          includeVideo: true,
          includeAudio: true,
          includeTranscripts: true,
          includeTimeline: true
        }
      });

      if (error) throw error;

      if (data.processId) {
        await pollExportStatus(job.id, data.processId);
      } else {
        setExportJobs(prev => prev.map(j => 
          j.id === job.id 
            ? { 
                ...j, 
                status: 'completed', 
                progress: 100,
                outputUrl: data.downloadUrl,
                fileSize: data.fileSize,
                completedAt: new Date()
              } 
            : j
        ));
      }

      toast.success('Project bundle created!');
    } catch (error) {
      setExportJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'failed' } : j
      ));
      toast.error('Project export failed');
    }
  };

  const pollExportStatus = async (jobId: string, processId: string) => {
    const maxAttempts = 120;
    let attempts = 0;

    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('export-status', {
          body: { processId, videoId }
        });

        if (error) throw error;

        if (data.status === 'complete') {
          setExportJobs(prev => prev.map(j => 
            j.id === jobId 
              ? { 
                  ...j, 
                  status: 'completed', 
                  progress: 100,
                  outputUrl: data.downloadUrl,
                  fileSize: data.fileSize,
                  completedAt: new Date()
                } 
              : j
          ));
          
          toast.success('Export completed!');
          return;
        }

        if (data.status === 'failed') {
          throw new Error(data.error || 'Export failed');
        }

        const progress = Math.min(90, 30 + (attempts * 2));
        setExportJobs(prev => prev.map(j => 
          j.id === jobId ? { ...j, progress } : j
        ));

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          throw new Error('Export timeout');
        }
      } catch (error) {
        setExportJobs(prev => prev.map(j => 
          j.id === jobId ? { ...j, status: 'failed' } : j
        ));
        toast.error('Export failed');
      }
    };

    poll();
  };

  const generateSRT = (captions: any[], includeSpeaker: boolean): string => {
    return captions.map((caption, index) => {
      const startTime = formatSRTTime(caption.startTime);
      const endTime = formatSRTTime(caption.endTime);
      const text = includeSpeaker && caption.speaker 
        ? `[${caption.speaker}] ${caption.text}`
        : caption.text;
      
      return `${index + 1}\n${startTime} --> ${endTime}\n${text}\n`;
    }).join('\n');
  };

  const generateVTT = (captions: any[]): string => {
    const header = 'WEBVTT\n\n';
    const content = captions.map((caption, index) => {
      const startTime = formatVTTTime(caption.startTime);
      const endTime = formatVTTTime(caption.endTime);
      const color = caption.speakerColor || '#FFFFFF';
      
      return `${index + 1}\n${startTime} --> ${endTime}\n<c.${caption.speaker} style="color:${color}">${caption.text}</c>\n`;
    }).join('\n');
    
    return header + content;
  };

  const formatSRTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const formatVTTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Manager
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Export your video with accessibility features
        </p>
      </div>

      <Tabs defaultValue="export" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none px-4">
          <TabsTrigger value="export">Export Settings</TabsTrigger>
          <TabsTrigger value="jobs">
            Export History
            {exportJobs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {exportJobs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="browser">Browser Export</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Export Preset</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select 
                    value={selectedPreset} 
                    onValueChange={(v) => setSelectedPreset(v as ExportPreset)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXPORT_PRESETS).map(([key, preset]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{preset.icon}</span>
                            <div>
                              <div className="font-medium">{preset.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {preset.description}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Export Formats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(EXPORT_FORMATS).map(([key, format]) => {
                    const Icon = format.icon;
                    const isSelected = selectedFormats.includes(key as ExportFormat);
                    
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedFormats(prev => prev.filter(f => f !== key));
                          } else {
                            setSelectedFormats(prev => [...prev, key as ExportFormat]);
                          }
                        }}
                      >
                        <Icon className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{format.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {format.description}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Accessibility Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="burn-captions">Burn Captions Into Video</Label>
                      <p className="text-xs text-muted-foreground">
                        Captions permanently visible in video
                      </p>
                    </div>
                    <Switch
                      id="burn-captions"
                      checked={burnCaptions}
                      onCheckedChange={setBurnCaptions}
                    />
                  </div>

                  {burnCaptions && (
                    <div className="flex items-center justify-between ml-6">
                      <div>
                        <Label htmlFor="cwi-colors">Use CWI Colors</Label>
                        <p className="text-xs text-muted-foreground">
                          Character-specific caption colors
                        </p>
                      </div>
                      <Switch
                        id="cwi-colors"
                        checked={useCWIColors}
                        onCheckedChange={setUseCWIColors}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="caption-file">Include Caption File</Label>
                      <p className="text-xs text-muted-foreground">
                        Separate SRT/VTT file
                      </p>
                    </div>
                    <Switch
                      id="caption-file"
                      checked={includeCaptionFile}
                      onCheckedChange={setIncludeCaptionFile}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="audio-desc">Audio Description</Label>
                      <p className="text-xs text-muted-foreground">
                        Descriptive narration track
                      </p>
                    </div>
                    <Switch
                      id="audio-desc"
                      checked={includeAudioDescription}
                      onCheckedChange={setIncludeAudioDescription}
                      disabled={audioDescriptions.length === 0}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sign-lang">Sign Language</Label>
                      <p className="text-xs text-muted-foreground">
                        Picture-in-picture ASL
                      </p>
                    </div>
                    <Switch
                      id="sign-lang"
                      checked={includeSignLanguage}
                      onCheckedChange={setIncludeSignLanguage}
                    />
                  </div>
                </CardContent>
              </Card>

              {selectedFormats.some(f => f.startsWith('video-')) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quality Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Resolution</Label>
                      <Select value={resolution} onValueChange={setResolution}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3840x2160">4K (3840x2160)</SelectItem>
                          <SelectItem value="2560x1440">2K (2560x1440)</SelectItem>
                          <SelectItem value="1920x1080">Full HD (1920x1080)</SelectItem>
                          <SelectItem value="1280x720">HD (1280x720)</SelectItem>
                          <SelectItem value="1080x1920">Vertical HD (1080x1920)</SelectItem>
                          <SelectItem value="720x1280">Vertical (720x1280)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Quality: {quality}%</Label>
                      <Slider
                        value={[quality]}
                        onValueChange={([v]) => setQuality(v)}
                        min={1}
                        max={100}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Frame Rate: {fps} FPS</Label>
                      <Select value={fps.toString()} onValueChange={(v) => setFps(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">24 FPS (Cinematic)</SelectItem>
                          <SelectItem value="30">30 FPS (Standard)</SelectItem>
                          <SelectItem value="60">60 FPS (Smooth)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={startExport}
                disabled={isExporting || selectedFormats.length === 0}
                size="lg"
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export {selectedFormats.length} Format{selectedFormats.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="jobs" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {exportJobs.length > 0 ? (
                exportJobs.map((job) => {
                  const format = EXPORT_FORMATS[job.format];
                  const Icon = format.icon;
                  
                  return (
                    <Card key={job.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{format.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <span>{EXPORT_PRESETS[job.preset]?.name}</span>
                                  {job.fileSize && (
                                    <>
                                      <span>•</span>
                                      <span>{formatFileSize(job.fileSize)}</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span>{job.createdAt.toLocaleString()}</span>
                                </div>
                              </div>
                              
                              <Badge 
                                variant={
                                  job.status === 'completed' ? 'default' :
                                  job.status === 'failed' ? 'destructive' :
                                  'secondary'
                                }
                                className="ml-2"
                              >
                                {job.status}
                              </Badge>
                            </div>

                            {job.status === 'processing' && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span>Processing...</span>
                                  <span>{job.progress}%</span>
                                </div>
                                <Progress value={job.progress} />
                              </div>
                            )}

                            {job.status === 'completed' && job.outputUrl && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(job.outputUrl, '_blank')}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Preview
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => downloadFile(job.outputUrl!, `export-${job.id}${format.extension}`)}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    navigator.clipboard.writeText(job.outputUrl!);
                                    toast.success('Link copied!');
                                  }}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            )}

                            {job.status === 'failed' && (
                              <div className="flex items-center gap-2 text-xs text-destructive">
                                <AlertCircle className="w-4 h-4" />
                                <span>Export failed</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Download className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No exports yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="browser" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <AccessibleVideoExporter
                videoUrl={videoUrl}
                videoId={videoId}
                captions={captions}
                audioDescriptions={audioDescriptions}
                characterColors={characterColors}
                currentLanguage={currentLanguage}
                onExportComplete={(url) => {
                  toast.success('Browser export complete!');
                  window.open(url, '_blank');
                }}
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
