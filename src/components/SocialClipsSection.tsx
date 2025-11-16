import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Sparkles, 
  Loader2, 
  Smartphone, 
  Play, 
  Download, 
  Trash2,
  Scissors,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  generateSocialClipWithRetry, 
  formatCaptionsForLambda, 
  getVideoUrl, 
  generateClipId,
  VideoProcessingError 
} from '@/services/videoProcessing';
import { SegmentTimeline } from '@/components/video-editor/SegmentTimeline';
import { WaveformTimeline } from '@/components/video-editor/WaveformTimeline';

interface SocialClipsSectionProps {
  video: any;
  videoDuration: number;
}

interface SelectedSegment {
  id: string;
  startTime: number;
  endTime: number;
  speaker: string;
  speakerColor: string;
  text: string;
  isIncluded: boolean;
}

// Platform configurations
const platforms = [
  {
    key: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: '#000000',
    aspectRatio: '9:16',
    durations: [15, 30, 60],
    resolution: '1080x1920'
  },
  {
    key: 'instagram_reel',
    name: 'Instagram Reel',
    icon: '📸',
    color: '#E4405F',
    aspectRatio: '9:16',
    durations: [15, 30, 60, 90],
    resolution: '1080x1920'
  },
  {
    key: 'youtube_short',
    name: 'YouTube Short',
    icon: '📺',
    color: '#FF0000',
    aspectRatio: '9:16',
    durations: [15, 60],
    resolution: '1080x1920'
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: '#0077B5',
    aspectRatio: '1:1',
    durations: [30, 60, 90],
    resolution: '1080x1080'
  }
];

export const SocialClipsSection: React.FC<SocialClipsSectionProps> = ({ 
  video, 
  videoDuration 
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [clipMode, setClipMode] = useState<'auto' | 'manual'>('auto');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [captionStyle, setCaptionStyle] = useState('viral');
  const [cropMode, setCropMode] = useState('center');
  
  const [autoHighlights, setAutoHighlights] = useState<any[]>([]);
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [generatedClips, setGeneratedClips] = useState<any[]>([]);
  const [hasGeneratedClips, setHasGeneratedClips] = useState(false);
  
  // Multi-segment selection state
  const [editMode, setEditMode] = useState<'simple' | 'segments'>('simple');
  const [segments, setSegments] = useState<SelectedSegment[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<Set<string>>(new Set());
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);

  const selectedPlatformConfig = platforms.find(p => p.key === selectedPlatform)!;
  
  const duration = endTime - startTime;
  const isValidDuration = selectedPlatformConfig.durations.some(d => 
    Math.abs(duration - d) < 5 // Within 5 seconds of target
  );

  useEffect(() => {
    loadGeneratedClips();
  }, [video.id]);

  // Fetch transcript segments for multi-segment mode
  useEffect(() => {
    async function fetchTranscriptSegments() {
      const { data, error } = await supabase
        .from('transcript_segments')
        .select('id, start_time, end_time, speaker, speaker_color, text')
        .eq('video_id', video.id)
        .order('start_time', { ascending: true });

      if (data) {
        const mappedSegments = data.map(seg => ({
          id: seg.id,
          startTime: seg.start_time,
          endTime: seg.end_time,
          speaker: seg.speaker || 'Unknown',
          speakerColor: seg.speaker_color || '#FFFFFF',
          text: seg.text,
          isIncluded: true
        }));
        setSegments(mappedSegments);
        setSelectedSegments(new Set(mappedSegments.map(s => s.id)));
      }
    }

    if (video.id && editMode === 'segments') {
      fetchTranscriptSegments();
    }
  }, [video.id, editMode]);

  const loadGeneratedClips = async () => {
    const { data, error } = await supabase
      .from('social_clips')
      .select('*')
      .eq('video_id', video.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setGeneratedClips(data);
      setHasGeneratedClips(data.length > 0);
    }
  };

  const detectHighlights = async () => {
    setIsDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-highlights', {
        body: {
          videoId: video.id,
          platform: selectedPlatform,
          count: 5
        }
      });

      if (error) throw error;

      setAutoHighlights(data.highlights);
      toast.success(`Found ${data.highlights.length} great moments!`);
    } catch (error: any) {
      console.error('Detection error:', error);
      toast.error('Failed to detect highlights', {
        description: error.message
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleGenerateClip = async () => {
    let clipStartTime: number;
    let clipEndTime: number;
    let captionsToUse: any;

    // Determine clip times and captions based on mode
    if (clipMode === 'auto') {
      const highlight = autoHighlights.find(h => h.id === selectedHighlight);
      if (!highlight) {
        toast.error('Please select a highlight');
        return;
      }
      clipStartTime = highlight.start_time;
      clipEndTime = highlight.end_time;
    } else if (editMode === 'segments') {
      // Multi-segment mode: use selected segments
      const selectedSegs = segments.filter(s => selectedSegments.has(s.id));
      
      if (selectedSegs.length === 0) {
        toast.error('Please select at least one segment');
        return;
      }

      clipStartTime = Math.min(...selectedSegs.map(s => s.startTime));
      clipEndTime = Math.max(...selectedSegs.map(s => s.endTime));
    } else {
      // Simple manual mode
      clipStartTime = startTime;
      clipEndTime = endTime;
    }

    setIsGenerating(true);
    
    const toastId = toast.loading('Preparing your clip...', {
      description: 'Fetching video and captions'
    });

    try {
      // 1. Get video URL
      const videoUrl = video.url || getVideoUrl(video.storage_path);
      if (!videoUrl) {
        throw new Error('Video URL not found');
      }

      // 2. Fetch or use transcript segments with speaker colors
      toast.loading('Loading captions with speaker colors...', { id: toastId });
      
      let segmentsData;
      
      if (editMode === 'segments') {
        // Use already-selected segments
        segmentsData = segments
          .filter(s => selectedSegments.has(s.id))
          .map(s => ({
            text: s.text,
            start_time: s.startTime,
            end_time: s.endTime,
            speaker: s.speaker,
            speaker_color: s.speakerColor
          }));
      } else {
        // Fetch segments for simple/auto modes
        const { data, error: segmentsError } = await supabase
          .from('transcript_segments_clean')
          .select('text, start_time, end_time, speaker, speaker_color, words')
          .eq('video_id', video.id)
          .eq('language', 'en')
          .gte('start_time', clipStartTime - 1)
          .lte('end_time', clipEndTime + 1)
          .order('start_time');

        if (segmentsError) throw segmentsError;
        segmentsData = data || [];
      }

      // 3. Format captions for Lambda
      const captions = formatCaptionsForLambda(segmentsData, clipStartTime, clipEndTime);
      
      console.log('Formatted captions for Lambda:', {
        segmentCount: segmentsData?.length,
        captionGroups: captions.length,
        totalWords: captions.reduce((sum, seg) => sum + seg.words.length, 0),
        editMode,
        selectedSegmentCount: editMode === 'segments' ? selectedSegments.size : null
      });

      // 4. Create database record
      toast.loading('Creating clip record...', { id: toastId });
      
      const clipId = generateClipId();
      const clipTitle = clipMode === 'auto' && selectedHighlight
        ? autoHighlights.find(h => h.id === selectedHighlight)?.title || `${selectedPlatform} clip`
        : `${selectedPlatform} clip`;
      
      const { data: clipRecord, error: clipError } = await supabase
        .from('social_clips')
        .insert({
          video_id: video.id,
          highlight_id: selectedHighlight,
          platform: selectedPlatform,
          title: clipTitle,
          start_time: clipStartTime,
          end_time: clipEndTime,
          duration: clipEndTime - clipStartTime,
          aspect_ratio: selectedPlatformConfig.aspectRatio,
          resolution: selectedPlatformConfig.resolution,
          caption_style: captionStyle,
          crop_mode: cropMode,
          status: 'processing',
          processing_started_at: new Date().toISOString(),
          metadata: {
            has_captions: captions.length > 0,
            caption_groups: captions.length,
            total_words: captions.reduce((sum, seg) => sum + seg.words.length, 0),
            editMode,
            selectedSegmentCount: editMode === 'segments' ? selectedSegments.size : null
          }
        })
        .select()
        .single();

      if (clipError) throw clipError;

      // 5. Call Lambda to process video
      toast.loading('Processing video with AWS Lambda...', { 
        id: toastId,
        description: 'This typically takes 30-60 seconds'
      });

      const lambdaResponse = await generateSocialClipWithRetry({
        videoUrl,
        startTime: clipStartTime,
        endTime: clipEndTime,
        platform: selectedPlatform as any,
        clipId,
        captions
      });

      // 6. Update database with Lambda response
      toast.loading('Finalizing clip...', { id: toastId });
      
      const { error: updateError } = await supabase
        .from('social_clips')
        .update({
          clip_url: lambdaResponse.clipUrl,
          file_size_bytes: lambdaResponse.fileSize,
          status: 'completed',
          processing_completed_at: new Date().toISOString(),
          storage_path: lambdaResponse.clipUrl
        })
        .eq('id', clipRecord.id);

      if (updateError) throw updateError;

      toast.success('Clip generated successfully!', {
        id: toastId,
        description: `${Math.round(clipEndTime - clipStartTime)}s ${selectedPlatformConfig.name} clip is ready`,
        action: {
          label: 'Download',
          onClick: () => window.open(lambdaResponse.clipUrl, '_blank')
        }
      });

      // Reload clips list
      await loadGeneratedClips();
      
    } catch (error: any) {
      console.error('Generation error:', error);
      
      const errorMessage = error instanceof VideoProcessingError 
        ? error.getUserMessage()
        : error.message || 'An unexpected error occurred';
      
      toast.error('Failed to generate clip', {
        id: toastId,
        description: errorMessage
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteClip = async (clipId: string) => {
    try {
      const { error } = await supabase
        .from('social_clips')
        .delete()
        .eq('id', clipId);

      if (error) throw error;

      toast.success('Clip deleted');
      await loadGeneratedClips();
    } catch (error: any) {
      toast.error('Failed to delete clip', {
        description: error.message
      });
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5" />
              Create Social Media Clips
            </CardTitle>
            <CardDescription>
              Generate vertical video clips optimized for TikTok, Instagram Reels, and YouTube Shorts
            </CardDescription>
          </div>
          {hasGeneratedClips && (
            <Badge variant="outline" className="font-light">{generatedClips.length} clips created</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Platform Selector */}
        <div>
          <Label className="text-base font-light mb-3 block text-foreground">1. Choose Platform</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {platforms.map((platform) => (
              <Card
                key={platform.key}
                className={cn(
                  "rounded-2xl cursor-pointer transition-all hover:shadow-md",
                  selectedPlatform === platform.key && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedPlatform(platform.key)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">{platform.icon}</div>
                  <p className="font-light text-sm text-foreground">{platform.name}</p>
                  <p className="text-xs font-light text-muted-foreground mt-1">
                    {platform.durations.join('s, ')}s
                  </p>
                  <Badge variant="secondary" className="mt-2 text-xs font-light">
                    {platform.aspectRatio}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Clip Selection Method */}
        <div>
          <Label className="text-base font-light mb-3 block text-foreground">2. Select Clip</Label>
          <Tabs value={clipMode} onValueChange={(v) => setClipMode(v as 'auto' | 'manual')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="auto" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Auto-Detect Best Moments
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Scissors className="w-4 h-4" />
                Manual Selection
              </TabsTrigger>
            </TabsList>

            <TabsContent value="auto" className="space-y-4 mt-4">
              {!autoHighlights.length ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Let AI find the most engaging moments in your video
                    </p>
                    <Button onClick={detectHighlights} disabled={isDetecting}>
                      {isDetecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing Video...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Find Best Moments
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {autoHighlights.map((highlight) => (
                    <Card 
                      key={highlight.id}
                      className={cn(
                        "cursor-pointer transition-all",
                        selectedHighlight === highlight.id && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedHighlight(highlight.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-light text-sm line-clamp-1 text-foreground">{highlight.title}</h4>
                          <Badge variant="secondary" className="font-light">
                            Score: {highlight.engagement_score}/10
                          </Badge>
                        </div>
                        <p className="text-sm font-light text-muted-foreground line-clamp-2 mb-2">
                          {highlight.description}
                        </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{formatTime(highlight.start_time)} → {formatTime(highlight.end_time)}</span>
                              <span>•</span>
                              <span>{Math.round(highlight.end_time - highlight.start_time)}s</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              {/* Edit Mode Toggle */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={editMode === 'simple' ? 'default' : 'outline'}
                  onClick={() => setEditMode('simple')}
                  size="sm"
                >
                  Simple Trim
                </Button>
                <Button
                  variant={editMode === 'segments' ? 'default' : 'outline'}
                  onClick={() => setEditMode('segments')}
                  size="sm"
                >
                  Multi-Segment
                </Button>
              </div>

              {/* Conditional Rendering */}
              {editMode === 'simple' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-sm">Start Time (seconds)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max={videoDuration}
                        value={startTime}
                        onChange={(e) => setStartTime(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm">End Time (seconds)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min={startTime}
                        max={videoDuration}
                        value={endTime}
                        onChange={(e) => setEndTime(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm">Duration</Label>
                      <Input
                        value={`${duration.toFixed(1)}s`}
                        disabled
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Slider
                      value={[startTime, endTime]}
                      onValueChange={([start, end]) => {
                        setStartTime(start);
                        setEndTime(end);
                      }}
                      min={0}
                      max={videoDuration}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0:00</span>
                      <span>{formatTime(videoDuration)}</span>
                    </div>
                  </div>

                  {!isValidDuration && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Invalid Duration</AlertTitle>
                      <AlertDescription>
                        {selectedPlatformConfig.name} supports: {selectedPlatformConfig.durations.join('s, ')}s clips
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <WaveformTimeline
                    videoUrl={getVideoUrl(video.storage_path)}
                    duration={video.duration_seconds || videoDuration}
                    segments={segments}
                    selectedSegments={selectedSegments}
                    onSegmentClick={(segmentId) => {
                      setSelectedSegments(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(segmentId)) {
                          newSet.delete(segmentId);
                        } else {
                          newSet.add(segmentId);
                        }
                        return newSet;
                      });
                    }}
                    onTimeUpdate={(time) => {
                      setCurrentPlaybackTime(time);
                    }}
                  />
                  
                  <SegmentTimeline
                    segments={segments}
                    selectedSegments={selectedSegments}
                    onToggleSegment={(id) => {
                      setSelectedSegments(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(id)) {
                          newSet.delete(id);
                        } else {
                          newSet.add(id);
                        }
                        return newSet;
                      });
                    }}
                    onToggleSpeaker={(speaker) => {
                      const speakerSegmentIds = segments
                        .filter(s => s.speaker === speaker)
                        .map(s => s.id);

                      const allSelected = speakerSegmentIds.every(id => selectedSegments.has(id));

                      setSelectedSegments(prev => {
                        const newSet = new Set(prev);
                        speakerSegmentIds.forEach(id => {
                          if (allSelected) {
                            newSet.delete(id);
                          } else {
                            newSet.add(id);
                          }
                        });
                        return newSet;
                      });
                    }}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Style Options */}
        <div>
          <Label className="text-base font-light mb-3 block text-foreground">3. Customize Style</Label>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Caption Style</Label>
              <Select value={captionStyle} onValueChange={setCaptionStyle}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viral">Viral (TikTok Style)</SelectItem>
                  <SelectItem value="modern">Modern & Clean</SelectItem>
                  <SelectItem value="bold">Bold & High Contrast</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Crop Mode</Label>
              <Select value={cropMode} onValueChange={setCropMode}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Center Crop (Fast)</SelectItem>
                  <SelectItem value="smart">Smart Crop (AI)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerateClip}
          disabled={
            isGenerating || 
            (clipMode === 'auto' && !selectedHighlight) || 
            (clipMode === 'manual' && editMode === 'simple' && !isValidDuration) ||
            (clipMode === 'manual' && editMode === 'segments' && selectedSegments.size === 0)
          }
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Clip...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate {selectedPlatformConfig.name} Clip
            </>
          )}
        </Button>

        {/* Generated Clips List */}
        {generatedClips.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="font-light text-foreground mb-3">Generated Clips ({generatedClips.length})</h3>
            <div className="grid gap-3">
              {generatedClips.map((clip) => (
                <Card key={clip.id} className="rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-light text-sm line-clamp-1 text-foreground">{clip.title}</h4>
                          <Badge className="font-light">{clip.platform.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(clip.duration || (clip.end_time - clip.start_time))}s • {clip.resolution} • {clip.aspect_ratio}
                          {clip.status === 'processing' && ' • Processing...'}
                          {clip.status === 'failed' && ' • Failed'}
                        </p>
                        <div className="flex gap-2 mt-3">
                          {(clip.status === 'completed' || clip.status === 'ready') && clip.clip_url && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(clip.clip_url, '_blank')}
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Preview
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = clip.clip_url;
                                  a.download = `${clip.title}.mp4`;
                                  a.click();
                                }}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                            </>
                          )}
                          {clip.status === 'processing' && (
                            <Badge variant="secondary" className="font-light">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Processing...
                            </Badge>
                          )}
                          {clip.status === 'failed' && (
                            <Badge variant="destructive" className="font-light">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeleteClip(clip.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
