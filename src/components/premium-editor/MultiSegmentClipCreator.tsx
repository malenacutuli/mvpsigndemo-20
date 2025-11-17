import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Scissors, Play, X } from 'lucide-react';
import { useMultiSegmentStitching } from '@/hooks/useMultiSegmentStitching';
import { useCaptionTemplates } from '@/hooks/useCaptionTemplates';
import { useToast } from '@/hooks/use-toast';

interface MultiSegmentClipCreatorProps {
  videoId: string;
  segments: Array<{
    id: string;
    start_time: number;
    end_time: number;
    text: string;
  }>;
}

export function MultiSegmentClipCreator({ videoId, segments }: MultiSegmentClipCreatorProps) {
  const [platform, setPlatform] = useState('tiktok');
  const [title, setTitle] = useState('');
  const [captionTemplateId, setCaptionTemplateId] = useState<string>();

  const { data: templates = [] } = useCaptionTemplates();
  const { toast } = useToast();
  
  const {
    selectedSegments,
    totalDuration,
    toggleSegment,
    clearSelection,
    generateClip
  } = useMultiSegmentStitching(videoId);

  const handleGenerate = async () => {
    if (selectedSegments.length === 0) {
      toast({
        title: 'No segments selected',
        description: 'Please select at least one segment',
        variant: 'destructive'
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for the clip',
        variant: 'destructive'
      });
      return;
    }

    try {
      await generateClip.mutateAsync({ platform, title, captionTemplateId });
      
      toast({
        title: 'Clip generation started',
        description: 'Your clip is being processed in the background'
      });

      setTitle('');
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate clip',
        variant: 'destructive'
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="w-5 h-5" />
          Multi-Segment Clip Creator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Segment Selection */}
        <div>
          <Label>Select Segments</Label>
          <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
            {segments.map(segment => {
              const isSelected = selectedSegments.some(s => s.segmentId === segment.id);
              return (
                <div
                  key={segment.id}
                  onClick={() => toggleSegment({
                    segmentId: segment.id,
                    startTime: segment.start_time,
                    endTime: segment.end_time,
                    text: segment.text
                  })}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1">{segment.text}</p>
                    <Badge variant="secondary" className="shrink-0">
                      {formatTime(segment.start_time)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Segments Summary */}
        {selectedSegments.length > 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {selectedSegments.length} segments selected
              </span>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Total duration: {formatTime(totalDuration)}
            </p>
          </div>
        )}

        {/* Clip Configuration */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="clip-title">Clip Title</Label>
            <Input
              id="clip-title"
              placeholder="Enter clip title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiktok">TikTok (9:16)</SelectItem>
                <SelectItem value="instagram_reel">Instagram Reel (9:16)</SelectItem>
                <SelectItem value="youtube_shorts">YouTube Shorts (9:16)</SelectItem>
                <SelectItem value="youtube">YouTube (16:9)</SelectItem>
                <SelectItem value="twitter">Twitter (16:9)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="caption-template">Caption Style (Optional)</Label>
            <Select value={captionTemplateId} onValueChange={setCaptionTemplateId}>
              <SelectTrigger id="caption-template">
                <SelectValue placeholder="Select caption template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No captions</SelectItem>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          className="w-full"
          onClick={handleGenerate}
          disabled={selectedSegments.length === 0 || !title.trim() || generateClip.isPending}
        >
          <Play className="w-4 h-4 mr-2" />
          {generateClip.isPending ? 'Generating...' : 'Generate Clip'}
        </Button>
      </CardContent>
    </Card>
  );
}
