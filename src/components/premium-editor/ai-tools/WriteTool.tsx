'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AIService } from '@/lib/premium/aiService';
import { WriteOptions } from '@/types/premium-ai-tools';
import { Loader2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WriteToolProps {
  projectId: string;
  context: string;
  onJobComplete?: () => void;
  disabled?: boolean;
}

export function WriteTool({ projectId, context, onJobComplete, disabled = false }: WriteToolProps) {
  const [type, setType] = useState<'script' | 'description' | 'title' | 'tags' | 'captions' | 'blog'>('description');
  const [tone, setTone] = useState<'professional' | 'casual' | 'friendly' | 'formal' | 'humorous'>('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [keywords, setKeywords] = useState('');
  const [options, setOptions] = useState({
    includeEmojis: false,
    seoOptimized: true
  });
  const [output, setOutput] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [copied, setCopied] = useState(false);

  const contentTypes = [
    { value: 'script', label: 'Video Script' },
    { value: 'description', label: 'Description' },
    { value: 'title', label: 'Title' },
    { value: 'tags', label: 'Tags/Keywords' },
    { value: 'captions', label: 'Social Captions' },
    { value: 'blog', label: 'Blog Post' }
  ];

  const handleWrite = async () => {
    try {
      setIsWriting(true);
      setOutput('');

      const writeOptions: WriteOptions = {
        type,
        tone,
        length,
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        includeEmojis: options.includeEmojis,
        seoOptimized: options.seoOptimized
      };

      const result = await AIService.write(projectId, context, writeOptions);
      setOutput(result);
      onJobComplete?.();
    } catch (error: any) {
      console.error('Failed to write:', error);
      
      // Provide specific error messages
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        toast.error('AI writing service is not available yet. Please wait for deployment to complete.');
      } else if (error.message?.includes('401') || error.message?.includes('403')) {
        toast.error('Authentication error. Please refresh the page and try again.');
      } else if (error.message?.includes('projectId')) {
        toast.error('Invalid project. Please reload the editor.');
      } else {
        toast.error(error.message || 'Failed to generate content');
      }
    } finally {
      setIsWriting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">
          AI Content Writer
        </h3>
        <p className="text-sm text-muted-foreground">
          Generate titles, descriptions, scripts, and more with AI
        </p>
      </div>

      {/* Content type */}
      <div className="space-y-2">
        <Label>Content Type</Label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="w-full px-3 py-2 border rounded bg-background"
          disabled={isWriting}
        >
          {contentTypes.map((ct) => (
            <option key={ct.value} value={ct.value}>
              {ct.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tone */}
      <div className="space-y-2">
        <Label>Tone</Label>
        <div className="grid grid-cols-3 gap-2">
          {['professional', 'casual', 'friendly', 'formal', 'humorous'].map((t) => (
            <button
              key={t}
              onClick={() => setTone(t as any)}
              className={cn(
                'px-3 py-2 rounded border-2 text-sm font-medium transition-all',
                tone === t
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-background hover:border-border/80'
              )}
              disabled={isWriting}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Length */}
      <div className="space-y-2">
        <Label>Length</Label>
        <div className="grid grid-cols-3 gap-2">
          {['short', 'medium', 'long'].map((l) => (
            <button
              key={l}
              onClick={() => setLength(l as any)}
              className={cn(
                'px-3 py-2 rounded border-2 text-sm font-medium transition-all',
                length === l
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-background hover:border-border/80'
              )}
              disabled={isWriting}
            >
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        <Label>Keywords (comma-separated)</Label>
        <Textarea
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="e.g., marketing, social media, video editing"
          rows={2}
          disabled={isWriting}
        />
      </div>

      {/* Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Include Emojis</Label>
            <p className="text-xs text-muted-foreground">Add relevant emojis</p>
          </div>
          <Switch
            checked={options.includeEmojis}
            onCheckedChange={(checked) => setOptions({ ...options, includeEmojis: checked })}
            disabled={isWriting}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>SEO Optimized</Label>
            <p className="text-xs text-muted-foreground">Optimize for search engines</p>
          </div>
          <Switch
            checked={options.seoOptimized}
            onCheckedChange={(checked) => setOptions({ ...options, seoOptimized: checked })}
            disabled={isWriting}
          />
        </div>
      </div>

      {/* Write button */}
      <Button 
        onClick={handleWrite} 
        disabled={disabled || isWriting}
        className="w-full gap-2"
        size="lg"
      >
        {isWriting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Writing...
          </>
        ) : (
          'Generate Content (1 credit)'
        )}
      </Button>

      {/* Output */}
      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Generated Content</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div className="bg-muted border rounded-lg p-4">
            <p className="text-sm whitespace-pre-wrap">{output}</p>
          </div>
        </div>
      )}
    </div>
  );
}
