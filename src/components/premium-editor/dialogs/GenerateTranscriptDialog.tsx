'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { TranscriptionService, TranscriptionJobStatus } from '@/lib/premium/transcriptionService';
import { TranscriptGenerationOptions } from '@/types/premium-transcript';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface GenerateTranscriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  videoUrl: string;
  onComplete: () => void;
}

export function GenerateTranscriptDialog({
  open,
  onOpenChange,
  projectId,
  videoUrl,
  onComplete
}: GenerateTranscriptDialogProps) {
  const [options, setOptions] = useState<TranscriptGenerationOptions>({
    language: 'en',
    speaker_labels: true,
    sentiment_analysis: true,
    entity_detection: true,
    auto_highlights: true
  });

  const [status, setStatus] = useState<TranscriptionJobStatus | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setStatus({ status: 'processing', progress: 0 });

      const id = await TranscriptionService.generateTranscript(
        projectId,
        videoUrl,
        options
      );

      setJobId(id);

      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const jobStatus = await TranscriptionService.getJobStatus(id);
          setStatus(jobStatus);

          if (jobStatus.status === 'completed') {
            clearInterval(pollInterval);
            setIsGenerating(false);
            
            setTimeout(() => {
              onComplete();
              onOpenChange(false);
            }, 1500);
          } else if (jobStatus.status === 'failed') {
            clearInterval(pollInterval);
            setIsGenerating(false);
          }
        } catch (error) {
          console.error('Failed to poll status:', error);
          clearInterval(pollInterval);
          setIsGenerating(false);
        }
      }, 3000);

      return () => clearInterval(pollInterval);
    } catch (error) {
      console.error('Failed to generate transcript:', error);
      setStatus({
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setIsGenerating(false);
    }
  };

  const languages = TranscriptionService.getSupportedLanguages();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Transcript</DialogTitle>
          <DialogDescription>
            Configure transcription settings and generate a transcript for your video.
          </DialogDescription>
        </DialogHeader>

        {!isGenerating && !status ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={options.language}
                onValueChange={(value) => setOptions({ ...options, language: value })}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Speaker Diarization</Label>
                  <p className="text-xs text-muted-foreground">
                    Identify and label different speakers
                  </p>
                </div>
                <Switch
                  checked={options.speaker_labels}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, speaker_labels: checked })
                  }
                  disabled={isGenerating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sentiment Analysis</Label>
                  <p className="text-xs text-muted-foreground">
                    Detect positive, negative, and neutral sentiment
                  </p>
                </div>
                <Switch
                  checked={options.sentiment_analysis}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, sentiment_analysis: checked })
                  }
                  disabled={isGenerating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Entity Detection</Label>
                  <p className="text-xs text-muted-foreground">
                    Identify names, locations, organizations
                  </p>
                </div>
                <Switch
                  checked={options.entity_detection}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, entity_detection: checked })
                  }
                  disabled={isGenerating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Highlights</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically detect important moments
                  </p>
                </div>
                <Switch
                  checked={options.auto_highlights}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, auto_highlights: checked })
                  }
                  disabled={isGenerating}
                />
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-sm text-foreground">
                <strong>Cost Estimate:</strong> $0.00062/second of audio
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Additional features may incur extra charges
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8">
            <div className="space-y-4">
              {status?.status === 'processing' && (
                <>
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground mb-2">
                      Generating Transcript...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This may take a few minutes depending on video length
                    </p>
                  </div>
                  <Progress value={status.progress} className="w-full" />
                </>
              )}

              {status?.status === 'completed' && (
                <>
                  <div className="flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground mb-2">
                      Transcript Generated!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {status.segmentCount} segments created
                    </p>
                  </div>
                </>
              )}

              {status?.status === 'failed' && (
                <>
                  <div className="flex items-center justify-center">
                    <XCircle className="w-12 h-12 text-destructive" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground mb-2">
                      Generation Failed
                    </p>
                    <p className="text-sm text-destructive">
                      {status.error || 'Unknown error occurred'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {!isGenerating && !status ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerate}>
                Generate Transcript
              </Button>
            </>
          ) : status?.status === 'failed' ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStatus(null);
                  setJobId(null);
                }}
              >
                Try Again
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </>
          ) : status?.status === 'completed' ? (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
