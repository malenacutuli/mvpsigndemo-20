import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mic, Languages, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CaptionSegment } from './CaptionsWithIntention';

interface TranscriptionJob {
  id: string;
  language: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  segments?: CaptionSegment[];
  error?: string;
}

interface TranscriptionManagerProps {
  videoUrl: string;
  onTranscriptionComplete?: (segments: CaptionSegment[], language: string) => void;
  className?: string;
}

const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
];

export const TranscriptionManager: React.FC<TranscriptionManagerProps> = ({
  videoUrl,
  onTranscriptionComplete,
  className = ""
}) => {
  const [jobs, setJobs] = useState<TranscriptionJob[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isProcessing, setIsProcessing] = useState(false);

  const startTranscription = async (language: string) => {
    try {
      setIsProcessing(true);
      
      const jobId = `transcribe-${Date.now()}-${language}`;
      const newJob: TranscriptionJob = {
        id: jobId,
        language,
        status: 'pending',
        progress: 0
      };
      
      setJobs(prev => [...prev, newJob]);
      toast.info(`Starting transcription for ${supportedLanguages.find(l => l.code === language)?.name}...`);
      
      // Update job status to processing
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: 'processing', progress: 10 } : job
      ));
      
      // Call transcription service with language parameter
      const { data, error } = await supabase.functions.invoke('transcribe', {
        body: { 
          videoUrl, 
          language,
          rangeBytes: 25000000 // Increased for better quality
        }
      });
      
      if (error) throw error;
      
      // Simulate progress updates
      for (let i = 20; i <= 90; i += 20) {
        setTimeout(() => {
          setJobs(prev => prev.map(job => 
            job.id === jobId ? { ...job, progress: i } : job
          ));
        }, (i - 10) * 100);
      }
      
      // Process segments
      const segments = (data as any)?.segments || [];
      const mappedSegments: CaptionSegment[] = segments.map((seg: any) => {
        const start = Number(seg.start ?? 0);
        const end = Number(seg.end ?? (start + 2));
        const txt: string = String(seg.text ?? '').trim();
        const wordsRaw = txt.length ? txt.split(/\s+/) : [];
        const dur = Math.max(end - start, 0.001);
        const step = wordsRaw.length ? dur / wordsRaw.length : dur;
        const words = wordsRaw.map((w: string, i: number) => ({
          text: w,
          startTime: start + i * step,
          endTime: Math.min(end, start + (i + 1) * step),
          emphasis: 'normal' as const,
          pitch: 'normal' as const,
        }));
        return {
          text: txt,
          speaker: 'narrator',
          startTime: start,
          endTime: end,
          words,
        } as CaptionSegment;
      });
      
      // Complete the job
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'completed', progress: 100, segments: mappedSegments }
          : job
      ));
      
      toast.success(`Transcription completed for ${supportedLanguages.find(l => l.code === language)?.name}!`);
      
      if (onTranscriptionComplete) {
        onTranscriptionComplete(mappedSegments, language);
      }
      
    } catch (error: any) {
      console.error('Transcription failed:', error);
      setJobs(prev => prev.map(job => 
        job.id.startsWith(`transcribe-`) && job.language === language
          ? { ...job, status: 'failed', error: error.message || 'Transcription failed' }
          : job
      ));
      toast.error(`Transcription failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTranscript = (job: TranscriptionJob) => {
    if (!job.segments) return;
    
    const transcript = job.segments
      .map(seg => `${formatTime(seg.startTime)} --> ${formatTime(seg.endTime)}\n${seg.text}`)
      .join('\n\n');
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${job.language}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const getStatusIcon = (status: TranscriptionJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Loader2 className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Auto-Generated Transcripts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Transcription */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <div className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => startTranscription(selectedLanguage)}
              disabled={isProcessing || !videoUrl}
              className="whitespace-nowrap"
            >
              <Languages className="w-4 h-4 mr-2" />
              Generate
            </Button>
          </div>
        </div>

        {/* Active Jobs */}
        {jobs.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Transcription Jobs</h4>
            {jobs.map(job => {
              const language = supportedLanguages.find(l => l.code === job.language);
              return (
                <div key={job.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className="font-medium">{language?.flag} {language?.name}</span>
                      <Badge variant={
                        job.status === 'completed' ? 'default' : 
                        job.status === 'failed' ? 'destructive' : 
                        'secondary'
                      }>
                        {job.status}
                      </Badge>
                    </div>
                    {job.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTranscript(job)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                  
                  {job.status === 'processing' && (
                    <div className="space-y-1">
                      <Progress value={job.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Processing audio... {job.progress}%
                      </p>
                    </div>
                  )}
                  
                  {job.status === 'failed' && job.error && (
                    <p className="text-xs text-red-600">{job.error}</p>
                  )}
                  
                  {job.status === 'completed' && job.segments && (
                    <p className="text-xs text-muted-foreground">
                      Generated {job.segments.length} caption segments
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p><strong>Automatic Transcription:</strong> Powered by AI speech recognition</p>
          <p><strong>Multi-language:</strong> Support for 20+ languages with high accuracy</p>
          <p><strong>SEO Benefits:</strong> Searchable content improves discoverability</p>
        </div>
      </CardContent>
    </Card>
  );
};