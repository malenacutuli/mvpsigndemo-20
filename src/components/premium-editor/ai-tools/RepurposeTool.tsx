'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AIService } from '@/lib/premium/aiService';
import { RepurposeOptions } from '@/types/premium-ai-tools';
import { Loader2, Youtube, Instagram, Video as TikTok, Linkedin, Twitter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RepurposeToolProps {
  projectId: string;
  videoUrl: string;
  onJobComplete?: () => void;
}

export function RepurposeTool({ projectId, videoUrl, onJobComplete }: RepurposeToolProps) {
  const [platform, setPlatform] = useState<'youtube' | 'instagram' | 'tiktok' | 'linkedin' | 'twitter'>('youtube');
  const [outputFormat, setOutputFormat] = useState<'short' | 'reel' | 'story' | 'post' | 'tweet'>('short');
  const [options, setOptions] = useState({
    includeSubtitles: true,
    includeCaptions: true,
    duration: 60
  });
  const [isRepurposing, setIsRepurposing] = useState(false);

  const platforms = [
    { value: 'youtube', label: 'YouTube', icon: Youtube, formats: ['short', 'video'] },
    { value: 'instagram', label: 'Instagram', icon: Instagram, formats: ['reel', 'story', 'post'] },
    { value: 'tiktok', label: 'TikTok', icon: TikTok, formats: ['video'] },
    { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, formats: ['post', 'video'] },
    { value: 'twitter', label: 'Twitter', icon: Twitter, formats: ['tweet', 'video'] }
  ];

  const handleRepurpose = async () => {
    try {
      setIsRepurposing(true);

      const repurposeOptions: RepurposeOptions = {
        outputFormat,
        platform,
        duration: options.duration,
        includeSubtitles: options.includeSubtitles,
        includeCaptions: options.includeCaptions
      };

      const job = await AIService.repurpose(projectId, repurposeOptions);

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const status = await AIService.getJobStatus(job.id);
          
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval);
            setIsRepurposing(false);
            
            if (status.status === 'completed') {
              onJobComplete?.();
            }
          }
        } catch (error) {
          clearInterval(pollInterval);
          setIsRepurposing(false);
        }
      }, 3000);
    } catch (error) {
      console.error('Failed to repurpose:', error);
      setIsRepurposing(false);
    }
  };

  const selectedPlatform = platforms.find(p => p.value === platform);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Repurpose for Platform
        </h3>
        <p className="text-sm text-muted-foreground">
          Automatically adapt your video for different social media platforms
        </p>
      </div>

      {/* Platform selector */}
      <div className="space-y-2">
        <Label>Target Platform</Label>
        <div className="grid grid-cols-3 gap-3">
          {platforms.map((plat) => {
            const Icon = plat.icon;
            return (
              <button
                key={plat.value}
                onClick={() => {
                  setPlatform(plat.value as any);
                  setOutputFormat(plat.formats[0] as any);
                }}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  platform === plat.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background hover:border-border/80'
                )}
              >
                <Icon className={cn('w-6 h-6', platform === plat.value ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-sm font-medium', platform === plat.value ? 'text-primary' : 'text-foreground')}>
                  {plat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Format selector */}
      {selectedPlatform && (
        <div className="space-y-2">
          <Label>Output Format</Label>
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as any)}
            className="w-full px-3 py-2 border rounded bg-background"
            disabled={isRepurposing}
          >
            {selectedPlatform.formats.map((format) => (
              <option key={format} value={format}>
                {format.charAt(0).toUpperCase() + format.slice(1)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Duration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Duration (seconds)</Label>
          <span className="text-sm text-muted-foreground">{options.duration}s</span>
        </div>
        <input
          type="range"
          min={15}
          max={300}
          step={5}
          value={options.duration}
          onChange={(e) => setOptions({ ...options, duration: parseInt(e.target.value) })}
          className="w-full"
          disabled={isRepurposing}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>15s</span>
          <span>300s</span>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Include Subtitles</Label>
            <p className="text-xs text-muted-foreground">Add burned-in subtitles</p>
          </div>
          <Switch
            checked={options.includeSubtitles}
            onCheckedChange={(checked) => setOptions({ ...options, includeSubtitles: checked })}
            disabled={isRepurposing}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Auto-Generate Captions</Label>
            <p className="text-xs text-muted-foreground">AI-generated description</p>
          </div>
          <Switch
            checked={options.includeCaptions}
            onCheckedChange={(checked) => setOptions({ ...options, includeCaptions: checked })}
            disabled={isRepurposing}
          />
        </div>
      </div>

      {/* Preview specs */}
      <div className="bg-muted border rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">Output Specifications:</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          {platform === 'youtube' && outputFormat === 'short' && (
            <>
              <p>• Aspect Ratio: 9:16 (Vertical)</p>
              <p>• Max Duration: 60 seconds</p>
              <p>• Resolution: 1080x1920</p>
            </>
          )}
          {platform === 'instagram' && outputFormat === 'reel' && (
            <>
              <p>• Aspect Ratio: 9:16 (Vertical)</p>
              <p>• Max Duration: 90 seconds</p>
              <p>• Resolution: 1080x1920</p>
            </>
          )}
          {platform === 'tiktok' && (
            <>
              <p>• Aspect Ratio: 9:16 (Vertical)</p>
              <p>• Max Duration: 180 seconds</p>
              <p>• Resolution: 1080x1920</p>
            </>
          )}
          {platform === 'linkedin' && (
            <>
              <p>• Aspect Ratio: 16:9 (Horizontal)</p>
              <p>• Max Duration: 600 seconds</p>
              <p>• Resolution: 1920x1080</p>
            </>
          )}
        </div>
      </div>

      {/* Repurpose button */}
      <Button
        onClick={handleRepurpose}
        disabled={isRepurposing}
        className="w-full gap-2"
        size="lg"
      >
        {isRepurposing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Repurposing...
          </>
        ) : (
          <>
            {selectedPlatform && <selectedPlatform.icon className="w-5 h-5" />}
            Repurpose for {selectedPlatform?.label} (5 credits)
          </>
        )}
      </Button>
    </div>
  );
}
