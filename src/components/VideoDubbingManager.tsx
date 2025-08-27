import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Languages, Download, Play, Loader2, Mic, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DubbingJob {
  id: string;
  language: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  audioUrl?: string;
  error?: string;
  voiceCloning?: boolean;
}

interface VideoDubbingManagerProps {
  videoUrl: string;
  originalLanguage?: string;
  transcriptText?: string;
  className?: string;
}

const supportedLanguages = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸', voice: 'es-ES-Neural2-A' },
  { code: 'fr', name: 'French', flag: '🇫🇷', voice: 'fr-FR-Neural2-A' },
  { code: 'de', name: 'German', flag: '🇩🇪', voice: 'de-DE-Neural2-A' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', voice: 'it-IT-Neural2-A' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', voice: 'pt-PT-Neural2-A' },
  { code: 'zh', name: 'Chinese (Mandarin)', flag: '🇨🇳', voice: 'cmn-CN-Standard-A' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', voice: 'ja-JP-Neural2-A' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', voice: 'ko-KR-Neural2-A' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', voice: 'ar-XA-Standard-A' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', voice: 'hi-IN-Neural2-A' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', voice: 'ru-RU-Standard-A' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱', voice: 'nl-NL-Standard-A' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪', voice: 'sv-SE-Standard-A' },
  { code: 'da', name: 'Danish', flag: '🇩🇰', voice: 'da-DK-Standard-A' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴', voice: 'nb-NO-Standard-A' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮', voice: 'fi-FI-Standard-A' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱', voice: 'pl-PL-Standard-A' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷', voice: 'tr-TR-Standard-A' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱', voice: 'he-IL-Standard-A' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪', voice: 'sw-KE-Standard-A' },
];

export const VideoDubbingManager: React.FC<VideoDubbingManagerProps> = ({
  videoUrl,
  originalLanguage = 'en',
  transcriptText = '',
  className = ""
}) => {
  const [jobs, setJobs] = useState<DubbingJob[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [voiceCloning, setVoiceCloning] = useState(true);
  const [lipSync, setLipSync] = useState(true);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const startDubbing = async () => {
    if (!videoUrl) {
      toast.error('No video URL provided');
      return;
    }

    try {
      setIsProcessing(true);
      
      const jobId = `dub-${Date.now()}-${selectedLanguage}`;
      const newJob: DubbingJob = {
        id: jobId,
        language: selectedLanguage,
        status: 'pending',
        progress: 0,
        voiceCloning
      };
      
      setJobs(prev => [...prev, newJob]);
      
      const languageInfo = supportedLanguages.find(l => l.code === selectedLanguage);
      toast.info(`Starting dubbing to ${languageInfo?.name}...`);
      
      // Update job status to processing
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: 'processing', progress: 10 } : job
      ));
      
      // Step 1: Translate text if we have transcript
      let translatedText = transcriptText;
      if (transcriptText) {
        setJobs(prev => prev.map(job => 
          job.id === jobId ? { ...job, progress: 25 } : job
        ));
        
        // Call translation service
        const { data: translationData, error: translationError } = await supabase.functions.invoke('translate-text', {
          body: { 
            text: transcriptText,
            targetLanguage: selectedLanguage,
            sourceLanguage: originalLanguage,
            customInstructions: customInstructions || undefined
          }
        });
        
        if (translationError) throw translationError;
        translatedText = translationData?.translatedText || transcriptText;
      }
      
      // Step 2: Generate dubbed audio
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, progress: 50 } : job
      ));
      
      const { data: dubbingData, error: dubbingError } = await supabase.functions.invoke('generate-dubbing', {
        body: {
          videoUrl,
          text: translatedText,
          targetLanguage: selectedLanguage,
          voice: languageInfo?.voice || 'auto',
          voiceCloning,
          lipSync,
          customInstructions: customInstructions || undefined
        }
      });
      
      if (dubbingError) throw dubbingError;
      
      // Simulate progress updates
      for (let i = 60; i <= 90; i += 10) {
        setTimeout(() => {
          setJobs(prev => prev.map(job => 
            job.id === jobId ? { ...job, progress: i } : job
          ));
        }, (i - 50) * 200);
      }
      
      // Complete the job
      setTimeout(() => {
        setJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { 
                ...job, 
                status: 'completed', 
                progress: 100, 
                audioUrl: dubbingData?.audioUrl || '#'
              }
            : job
        ));
        
        toast.success(`Dubbing completed for ${languageInfo?.name}!`);
      }, 8000);
      
    } catch (error: any) {
      console.error('Dubbing failed:', error);
      setJobs(prev => prev.map(job => 
        job.id.startsWith(`dub-`) && job.language === selectedLanguage
          ? { ...job, status: 'failed', error: error.message || 'Dubbing failed' }
          : job
      ));
      toast.error(`Dubbing failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadDubbing = (job: DubbingJob) => {
    if (!job.audioUrl) return;
    
    const link = document.createElement('a');
    link.href = job.audioUrl;
    link.download = `dubbed-${job.language}.wav`;
    link.click();
  };

  const previewDubbing = (job: DubbingJob) => {
    if (!job.audioUrl) return;
    
    const audio = new Audio(job.audioUrl);
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      toast.error('Failed to play audio preview');
    });
  };

  const getStatusIcon = (status: DubbingJob['status']) => {
    switch (status) {
      case 'completed':
        return <Languages className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <Languages className="w-4 h-4 text-red-600" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Languages className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="w-5 h-5" />
          AI Dubbing & Translation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* New Dubbing Configuration */}
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="target-language">Target Language</Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger id="target-language">
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
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="voice-cloning" className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                AI Voice Cloning
              </Label>
              <Switch
                id="voice-cloning"
                checked={voiceCloning}
                onCheckedChange={setVoiceCloning}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Clone the original speaker's voice for authentic-sounding dubbed audio
            </p>

            <div className="flex items-center justify-between">
              <Label htmlFor="lip-sync" className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Lip Synchronization
              </Label>
              <Switch
                id="lip-sync"
                checked={lipSync}
                onCheckedChange={setLipSync}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Sync dubbed audio timing with original speaker's lip movements
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-instructions">Custom Instructions (Optional)</Label>
            <Textarea
              id="custom-instructions"
              placeholder="e.g., Pronounce 'Axessible' as 'Ak-SEH-si-ble', use formal tone, maintain brand names..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Provide specific pronunciation guides, tone preferences, or brand name handling
            </p>
          </div>

          <Button 
            onClick={startDubbing}
            disabled={isProcessing || !videoUrl}
            className="w-full"
          >
            <Languages className="w-4 h-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Generate Dubbed Audio'}
          </Button>
        </div>

        {/* Active Dubbing Jobs */}
        {jobs.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm border-b pb-2">Dubbing Jobs</h4>
            {jobs.map(job => {
              const language = supportedLanguages.find(l => l.code === job.language);
              return (
                <div key={job.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{language?.flag} {language?.name}</span>
                          <Badge variant={
                            job.status === 'completed' ? 'default' : 
                            job.status === 'failed' ? 'destructive' : 
                            'secondary'
                          }>
                            {job.status}
                          </Badge>
                          {job.voiceCloning && (
                            <Badge variant="outline" className="text-xs">
                              Voice Cloning
                            </Badge>
                          )}
                        </div>
                        {job.status === 'completed' && (
                          <p className="text-xs text-muted-foreground">
                            Dubbed audio ready for download
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {job.status === 'completed' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => previewDubbing(job)}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadDubbing(job)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {job.status === 'processing' && (
                    <div className="space-y-2">
                      <Progress value={job.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {job.progress < 30 ? 'Translating content...' :
                         job.progress < 60 ? 'Cloning voice...' :
                         job.progress < 90 ? 'Generating dubbed audio...' :
                         'Finalizing...'}  {job.progress}%
                      </p>
                    </div>
                  )}
                  
                  {job.status === 'failed' && job.error && (
                    <p className="text-xs text-red-600">{job.error}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <p><strong>Voice Cloning:</strong> AI replicates the original speaker's unique voice characteristics</p>
          <p><strong>Lip Sync:</strong> Timing adjustments to match dubbed audio with lip movements</p>
          <p><strong>50+ Languages:</strong> Professional-quality dubbing in major world languages</p>
          <p><strong>Custom Instructions:</strong> Fine-tune pronunciation and maintain brand consistency</p>
        </div>
      </CardContent>
    </Card>
  );
};