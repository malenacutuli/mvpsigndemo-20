'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AIService } from '@/lib/premium/aiService';
import { GenerateOptions } from '@/types/premium-ai-tools';
import { Loader2, Video, Music, Image as ImageIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GenerateToolProps {
  projectId: string;
  onJobComplete?: () => void;
}

export function GenerateTool({ projectId, onJobComplete }: GenerateToolProps) {
  const [type, setType] = useState<'video' | 'audio' | 'image' | 'text'>('video');
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<Partial<GenerateOptions>>({
    duration: 30,
    aspectRatio: '16:9',
    style: 'realistic',
    language: 'en'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const contentTypes = [
    { value: 'video', label: 'Video', icon: Video, credits: 10 },
    { value: 'audio', label: 'Audio', icon: Music, credits: 5 },
    { value: 'image', label: 'Image', icon: ImageIcon, credits: 2 },
    { value: 'text', label: 'Text', icon: FileText, credits: 1 }
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    try {
      setIsGenerating(true);

      const generateOptions: GenerateOptions = {
        type,
        prompt,
        ...options
      };

      const job = await AIService.generate(projectId, generateOptions);
      
      toast.success('Generation started');

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const status = await AIService.getJobStatus(job.id);
          
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.success('Content generated successfully');
            onJobComplete?.();
            setPrompt('');
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.error(status.error_message || 'Generation failed');
          }
        } catch (error) {
          clearInterval(pollInterval);
          setIsGenerating(false);
          toast.error('Failed to check generation status');
        }
      }, 3000);
    } catch (error) {
      console.error('Failed to generate:', error);
      toast.error('Failed to start generation');
      setIsGenerating(false);
    }
  };

  const selectedType = contentTypes.find(t => t.value === type);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Generate Content with AI
        </h3>
        <p className="text-sm text-muted-foreground">
          Create videos, audio, images, or text using AI generation
        </p>
      </div>

      <div className="space-y-2">
        <Label>Content Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {contentTypes.map((contentType) => {
            const Icon = contentType.icon;
            return (
              <button
                key={contentType.value}
                onClick={() => setType(contentType.value as any)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  type === contentType.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-muted-foreground/50'
                )}
              >
                <Icon className={cn('w-6 h-6', type === contentType.value ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-sm font-medium', type === contentType.value ? 'text-primary' : 'text-foreground')}>
                  {contentType.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {contentType.credits} credits
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Prompt</Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Describe the ${type} you want to generate...`}
          rows={4}
          disabled={isGenerating}
        />
        <p className="text-xs text-muted-foreground">
          Be specific and descriptive for best results
        </p>
      </div>

      {type === 'video' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (seconds)</Label>
              <Input
                type="number"
                value={options.duration || 30}
                onChange={(e) => setOptions({ ...options, duration: parseInt(e.target.value) })}
                min={5}
                max={300}
                disabled={isGenerating}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <select
                value={options.aspectRatio || '16:9'}
                onChange={(e) => setOptions({ ...options, aspectRatio: e.target.value as any })}
                className="w-full px-3 py-2 border rounded bg-background"
                disabled={isGenerating}
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="4:5">4:5 (Instagram)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Style</Label>
            <select
              value={options.style || 'realistic'}
              onChange={(e) => setOptions({ ...options, style: e.target.value })}
              className="w-full px-3 py-2 border rounded bg-background"
              disabled={isGenerating}
            >
              <option value="realistic">Realistic</option>
              <option value="animated">Animated</option>
              <option value="cartoon">Cartoon</option>
              <option value="cinematic">Cinematic</option>
              <option value="documentary">Documentary</option>
            </select>
          </div>
        </div>
      )}

      {type === 'audio' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (seconds)</Label>
              <Input
                type="number"
                value={options.duration || 30}
                onChange={(e) => setOptions({ ...options, duration: parseInt(e.target.value) })}
                min={5}
                max={300}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label>Voice</Label>
              <select
                value={options.voice || 'default'}
                onChange={(e) => setOptions({ ...options, voice: e.target.value })}
                className="w-full px-3 py-2 border rounded bg-background"
                disabled={isGenerating}
              >
                <option value="default">Default</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="child">Child</option>
                <option value="elderly">Elderly</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {type === 'image' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Aspect Ratio</Label>
            <select
              value={options.aspectRatio || '16:9'}
              onChange={(e) => setOptions({ ...options, aspectRatio: e.target.value as any })}
              className="w-full px-3 py-2 border rounded bg-background"
              disabled={isGenerating}
            >
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="4:5">4:5 (Instagram)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Style</Label>
            <select
              value={options.style || 'realistic'}
              onChange={(e) => setOptions({ ...options, style: e.target.value })}
              className="w-full px-3 py-2 border rounded bg-background"
              disabled={isGenerating}
            >
              <option value="realistic">Realistic</option>
              <option value="illustration">Illustration</option>
              <option value="3d">3D Render</option>
              <option value="painting">Painting</option>
              <option value="sketch">Sketch</option>
            </select>
          </div>
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        className="w-full gap-2"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : selectedType ? (
          <>
            <selectedType.icon className="w-5 h-5" />
            Generate {selectedType.label} ({selectedType.credits} credits)
          </>
        ) : null}
      </Button>

      <div className="bg-muted border rounded-lg p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Estimated Cost:</span>
          <span className="font-semibold">
            {selectedType?.credits} AI Credits
          </span>
        </div>
      </div>
    </div>
  );
}
