import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Repeat, Upload, FileText } from 'lucide-react';
import { generateContent, repurposeContent, publishContent, writeContent, pollJobStatus } from '@/lib/premiumAITools';
import type { GenerateOptions, RepurposeOptions, PublishOptions, WriteOptions, AIGenerationJob } from '@/types/premium-ai-tools';

interface PremiumAIToolsPanelProps {
  versionId: string;
}

export const PremiumAIToolsPanel: React.FC<PremiumAIToolsPanelProps> = ({ versionId }) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJob, setCurrentJob] = useState<AIGenerationJob | null>(null);

  // Generate state
  const [generateType, setGenerateType] = useState<GenerateOptions['type']>('video');
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generateAspectRatio, setGenerateAspectRatio] = useState<GenerateOptions['aspectRatio']>('16:9');

  // Repurpose state
  const [repurposeFormat, setRepurposeFormat] = useState<RepurposeOptions['outputFormat']>('short');
  const [repurposePlatform, setRepurposePlatform] = useState<RepurposeOptions['platform']>('youtube');
  const [includeSubtitles, setIncludeSubtitles] = useState(true);

  // Publish state
  const [publishPlatform, setPublishPlatform] = useState<PublishOptions['platform']>('youtube');
  const [publishTitle, setPublishTitle] = useState('');
  const [publishDescription, setPublishDescription] = useState('');
  const [publishVisibility, setPublishVisibility] = useState<PublishOptions['visibility']>('public');

  // Write state
  const [writeType, setWriteType] = useState<WriteOptions['type']>('script');
  const [writeTone, setWriteTone] = useState<WriteOptions['tone']>('professional');
  const [writeLength, setWriteLength] = useState<WriteOptions['length']>('medium');

  const handleGenerate = async () => {
    if (!generatePrompt.trim()) {
      toast({
        title: 'Prompt Required',
        description: 'Please enter a prompt for generation',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const options: GenerateOptions = {
        type: generateType,
        prompt: generatePrompt,
        aspectRatio: generateAspectRatio,
      };

      const response = await generateContent(versionId, options);
      
      if (response.success && response.data?.jobId) {
        toast({
          title: 'Generation Started',
          description: 'Your content is being generated...',
        });

        const stopPolling = pollJobStatus(response.data.jobId, (job) => {
          setCurrentJob(job);
          if (job.status === 'completed') {
            toast({
              title: 'Generation Complete',
              description: 'Your content has been generated successfully',
            });
            setIsProcessing(false);
          } else if (job.status === 'failed') {
            toast({
              title: 'Generation Failed',
              description: job.error_message || 'An error occurred',
              variant: 'destructive',
            });
            setIsProcessing(false);
          }
        });

        return () => stopPolling();
      }
    } catch (error) {
      toast({
        title: 'Generation Error',
        description: error instanceof Error ? error.message : 'Failed to generate content',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRepurpose = async () => {
    setIsProcessing(true);
    try {
      const options: RepurposeOptions = {
        outputFormat: repurposeFormat,
        platform: repurposePlatform,
        includeSubtitles,
        includeCaptions: true,
      };

      const response = await repurposeContent(versionId, options);
      
      if (response.success) {
        toast({
          title: 'Repurpose Started',
          description: 'Your content is being repurposed...',
        });
      }
    } catch (error) {
      toast({
        title: 'Repurpose Error',
        description: error instanceof Error ? error.message : 'Failed to repurpose content',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async () => {
    if (!publishTitle.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for publishing',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const options: PublishOptions = {
        platform: publishPlatform,
        title: publishTitle,
        description: publishDescription,
        visibility: publishVisibility,
      };

      const response = await publishContent(versionId, options);
      
      if (response.success) {
        toast({
          title: 'Publish Started',
          description: 'Your content is being published...',
        });
      }
    } catch (error) {
      toast({
        title: 'Publish Error',
        description: error instanceof Error ? error.message : 'Failed to publish content',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWrite = async () => {
    setIsProcessing(true);
    try {
      const options: WriteOptions = {
        type: writeType,
        tone: writeTone,
        length: writeLength,
      };

      const response = await writeContent(versionId, options);
      
      if (response.success && response.data?.text) {
        toast({
          title: 'Content Generated',
          description: 'AI-generated content is ready',
        });
        // Show the generated text in a modal or copy to clipboard
      }
    } catch (error) {
      toast({
        title: 'Write Error',
        description: error instanceof Error ? error.message : 'Failed to write content',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-4">
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="repurpose" className="flex items-center gap-2">
            <Repeat className="w-4 h-4" />
            Repurpose
          </TabsTrigger>
          <TabsTrigger value="publish" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Publish
          </TabsTrigger>
          <TabsTrigger value="write" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Write
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={generateType} onValueChange={(v) => setGenerateType(v as GenerateOptions['type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder="Describe what you want to generate..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Aspect Ratio</Label>
            <Select value={generateAspectRatio} onValueChange={(v) => setGenerateAspectRatio(v as GenerateOptions['aspectRatio'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                <SelectItem value="1:1">1:1 (Square)</SelectItem>
                <SelectItem value="4:5">4:5 (Instagram)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleGenerate} disabled={isProcessing} className="w-full">
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Content
          </Button>
        </TabsContent>

        <TabsContent value="repurpose" className="space-y-4">
          <div className="space-y-2">
            <Label>Output Format</Label>
            <Select value={repurposeFormat} onValueChange={(v) => setRepurposeFormat(v as RepurposeOptions['outputFormat'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="reel">Reel</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="post">Post</SelectItem>
                <SelectItem value="tweet">Tweet</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={repurposePlatform} onValueChange={(v) => setRepurposePlatform(v as RepurposeOptions['platform'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeSubtitles}
              onChange={(e) => setIncludeSubtitles(e.target.checked)}
              className="w-4 h-4"
            />
            <Label>Include Subtitles</Label>
          </div>

          <Button onClick={handleRepurpose} disabled={isProcessing} className="w-full">
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Repeat className="w-4 h-4 mr-2" />}
            Repurpose Content
          </Button>
        </TabsContent>

        <TabsContent value="publish" className="space-y-4">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={publishPlatform} onValueChange={(v) => setPublishPlatform(v as PublishOptions['platform'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="vimeo">Vimeo</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={publishTitle}
              onChange={(e) => setPublishTitle(e.target.value)}
              placeholder="Enter video title..."
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={publishDescription}
              onChange={(e) => setPublishDescription(e.target.value)}
              placeholder="Enter video description..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={publishVisibility} onValueChange={(v) => setPublishVisibility(v as PublishOptions['visibility'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="unlisted">Unlisted</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handlePublish} disabled={isProcessing} className="w-full">
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Publish Video
          </Button>
        </TabsContent>

        <TabsContent value="write" className="space-y-4">
          <div className="space-y-2">
            <Label>Content Type</Label>
            <Select value={writeType} onValueChange={(v) => setWriteType(v as WriteOptions['type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="script">Script</SelectItem>
                <SelectItem value="description">Description</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="tags">Tags</SelectItem>
                <SelectItem value="captions">Captions</SelectItem>
                <SelectItem value="blog">Blog Post</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tone</Label>
            <Select value={writeTone} onValueChange={(v) => setWriteTone(v as WriteOptions['tone'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="humorous">Humorous</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Length</Label>
            <Select value={writeLength} onValueChange={(v) => setWriteLength(v as WriteOptions['length'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="long">Long</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleWrite} disabled={isProcessing} className="w-full">
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Generate Text
          </Button>
        </TabsContent>
      </Tabs>

      {currentJob && (
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="text-sm font-medium">Job Status: {currentJob.status}</div>
          {currentJob.error_message && (
            <div className="text-sm text-destructive mt-1">{currentJob.error_message}</div>
          )}
        </div>
      )}
    </Card>
  );
};
