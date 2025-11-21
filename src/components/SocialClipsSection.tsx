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
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Loader2, 
  Smartphone, 
  Play, 
  Download, 
  Trash2,
  Scissors,
  AlertCircle,
  CheckCircle,
  Link2,
  Share2,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { processMultiSegmentClip } from '@/services/multiSegmentProcessor';
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
  const [actualDuration, setActualDuration] = useState(videoDuration || 0);
  const [isCalculatingDuration, setIsCalculatingDuration] = useState(videoDuration === 0);
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  
  // Transcript state
  const [hasTranscript, setHasTranscript] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(true);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
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
  
  // Enhanced UI state
  const [processingStage, setProcessingStage] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [lastGeneratedClip, setLastGeneratedClip] = useState<any>(null);

  // Calculate duration if missing
  useEffect(() => {
    if (videoDuration === 0 && video.storage_path) {
      const calculateDuration = async () => {
        try {
          setIsCalculatingDuration(true);
          const { data: videoData } = await supabase.storage
            .from('videos')
            .getPublicUrl(video.storage_path);
          
          const videoElement = document.createElement('video');
          videoElement.src = videoData.publicUrl;
          
          videoElement.addEventListener('loadedmetadata', async () => {
            const duration = Math.floor(videoElement.duration);
            setActualDuration(duration);
            setEndTime(Math.min(30, duration));
            
            // Update database
            await supabase
              .from('videos')
              .update({ duration_seconds: duration })
              .eq('id', video.id);
            
            setIsCalculatingDuration(false);
            console.log('✅ Duration calculated and saved:', duration);
          });

          videoElement.addEventListener('error', () => {
            setIsCalculatingDuration(false);
            toast.error('Could not calculate video duration', {
              description: 'Please try refreshing the page'
            });
          });
        } catch (error) {
          console.error('Failed to calculate duration:', error);
          setIsCalculatingDuration(false);
        }
      };
      
      calculateDuration();
    } else {
      setActualDuration(videoDuration);
    }
  }, [videoDuration, video.id, video.storage_path]);
  const [error, setError] = useState<string | null>(null);

  const selectedPlatformConfig = platforms.find(p => p.key === selectedPlatform)!;
  
  const duration = endTime - startTime;
  const isValidDuration = selectedPlatformConfig.durations.some(d => 
    Math.abs(duration - d) < 5 // Within 5 seconds of target
  );

  // Check for transcript on mount
  useEffect(() => {
    async function checkTranscript() {
      setTranscriptLoading(true);
      const { data, error, count } = await supabase
        .from('transcript_segments')
        .select('id', { count: 'exact', head: true })
        .eq('video_id', video.id);
      
      if (error) {
        console.error('❌ Error checking transcript:', error);
        setHasTranscript(false);
      } else {
        setHasTranscript((count || 0) > 0);
        console.log(`✅ Found ${count} transcript segments for video ${video.id}`);
      }
      setTranscriptLoading(false);
    }
    
    if (video.id) {
      checkTranscript();
    }
  }, [video.id]);

  useEffect(() => {
    loadGeneratedClips();
  }, [video.id]);

  // Fetch transcript segments for multi-segment mode
  useEffect(() => {
    async function fetchTranscriptSegments() {
      if (!video.id || editMode !== 'segments') return;
      
      console.log('🔍 Fetching transcript segments for video:', video.id);
      setSegmentsLoading(true);
      
      try {
        const { data, error, count } = await supabase
          .from('transcript_segments')
          .select('id, start_time, end_time, speaker, speaker_color, text, words', { count: 'exact' })
          .eq('video_id', video.id)
          .order('start_time', { ascending: true });
        
        if (error) {
          console.error('❌ Error fetching segments:', error);
          throw error;
        }
        
        console.log(`✅ Loaded ${count} segments`);
        
        if (!data || data.length === 0) {
          console.warn('⚠️ No transcript segments found for this video');
          setSegments([]);
          setSelectedSegments(new Set());
          return;
        }
        
        // Transform to editor format
        const mappedSegments = data.map(seg => ({
          id: seg.id,
          startTime: seg.start_time,
          endTime: seg.end_time,
          speaker: seg.speaker || 'Unknown Speaker',
          speakerColor: seg.speaker_color || '#FFFFFF',
          text: seg.text || '',
          isIncluded: true,
          words: seg.words || []
        }));
        
        setSegments(mappedSegments);
        setSelectedSegments(new Set(mappedSegments.map(s => s.id)));
        
        console.log('✅ Segments loaded and selected:', {
          total: mappedSegments.length,
          speakers: [...new Set(mappedSegments.map(s => s.speaker))],
          totalDuration: mappedSegments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
        });
        
      } catch (error) {
        console.error('❌ Failed to fetch segments:', error);
        toast.error('Failed to load segments', {
          description: 'Could not load transcript segments. Please try refreshing.'
        });
      } finally {
        setSegmentsLoading(false);
      }
    }
    
    fetchTranscriptSegments();
  }, [video.id, editMode]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in inputs
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      
      // Space: Play/Pause (only in segments mode)
      if (e.key === ' ' && editMode === 'segments') {
        e.preventDefault();
        // Waveform handles play/pause internally
      }
      
      // Ctrl/Cmd + A: Select all segments
      if (e.key === 'a' && (e.ctrlKey || e.metaKey) && editMode === 'segments') {
        e.preventDefault();
        setSelectedSegments(new Set(segments.map(s => s.id)));
        toast.success('All segments selected');
      }
      
      // Ctrl/Cmd + D: Deselect all segments
      if (e.key === 'd' && (e.ctrlKey || e.metaKey) && editMode === 'segments') {
        e.preventDefault();
        setSelectedSegments(new Set());
        toast.success('All segments deselected');
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [editMode, segments]);

  // Remove duplicate segment fetching
  useEffect(() => {
    if (video.id && editMode === 'segments' && segments.length === 0) {
      // Segments already loaded by the main useEffect above
      console.log('📌 Segments mode activated, segments already loaded');
    }
  }, [video.id, editMode, segments]);

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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      toast.error('Authentication required', {
        description: 'Please sign in to generate clips.'
      });
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    const toastId = 'clip-generation';
    
    try {
      let clipStartTime: number;
      let clipEndTime: number;
      let segmentIds: string[] | undefined;

      if (clipMode === 'auto') {
        const highlight = autoHighlights.find(h => h.id === selectedHighlight);
        if (!highlight) {
          toast.error('Please select a highlight');
          return;
        }
        clipStartTime = highlight.start_time;
        clipEndTime = highlight.end_time;
      } else if (editMode === 'segments') {
        // Multi-segment mode
        const selectedSegs = segments.filter(s => selectedSegments.has(s.id));
        
        if (selectedSegs.length === 0) {
          toast.error('Please select at least one segment');
          return;
        }

        clipStartTime = Math.min(...selectedSegs.map(s => s.startTime));
        clipEndTime = Math.max(...selectedSegs.map(s => s.endTime));
        segmentIds = Array.from(selectedSegments);
        
        console.log('🎬 Multi-segment clip:', {
          segments: selectedSegs.length,
          startTime: clipStartTime,
          endTime: clipEndTime,
          totalDuration: clipEndTime - clipStartTime
        });
      } else {
        // Simple mode
        clipStartTime = startTime;
        clipEndTime = endTime;
        
        console.log('🎬 Simple clip:', {
          startTime: clipStartTime,
          endTime: clipEndTime,
          duration: clipEndTime - clipStartTime
        });
      }

      // Validate duration
      const duration = clipEndTime - clipStartTime;
      if (duration < 5) {
        throw new Error('Clip must be at least 5 seconds long');
      }
      if (duration > 180) {
        throw new Error('Clip cannot be longer than 3 minutes');
      }

      toast.loading('Preparing clip generation...', { id: toastId });

      // CRITICAL: Create database record for social clip
      const platform = platforms.find(p => p.key === selectedPlatform);
      if (!platform) throw new Error('Invalid platform selected');

      const clipData = {
        video_id: video.id,
        platform: selectedPlatform,
        title: `${platform.name} Clip - ${new Date().toLocaleDateString()}`,
        caption_template_id: null,
        source_segments: editMode === 'segments' 
          ? segments.filter(s => selectedSegments.has(s.id)).map(s => ({
              segment_id: s.id,
              start_time: s.startTime,
              end_time: s.endTime,
              text: s.text
            }))
          : [{
              segment_id: null,
              start_time: clipStartTime,
              end_time: clipEndTime,
              text: ''
            }],
        start_time: clipStartTime,
        end_time: clipEndTime,
        duration,
        status: 'pending',
        aspect_ratio: platform.aspectRatio,
        resolution: platform.resolution,
        caption_style: captionStyle,
        crop_mode: cropMode,
        highlight_id: selectedHighlight || null
      };

      const { data: clip, error: clipError } = await supabase
        .from('social_clips')
        .insert(clipData)
        .select()
        .single();

      if (clipError) throw clipError;
      if (!clip) throw new Error('Failed to create clip record');

      console.log('✅ Clip record created:', clip.id);
      toast.loading('Processing video...', { id: toastId });

      // CRITICAL: Process clip in browser with status updates
      const segmentsData = editMode === 'segments' 
        ? segments.filter(s => selectedSegments.has(s.id)).map(s => ({
            segmentId: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
            text: s.text
          }))
        : [{
            segmentId: null as any,
            startTime: clipStartTime,
            endTime: clipEndTime,
            text: ''
          }];

      await processMultiSegmentClip(clip.id, video.id, segmentsData, null);

      // Fetch the updated clip to get the clip URL
      const { data: updatedClip } = await supabase
        .from('social_clips')
        .select('*')
        .eq('id', clip.id)
        .single();

      if (updatedClip?.clip_url) {
        setLastGeneratedClip({
          id: updatedClip.id,
          clip_url: updatedClip.clip_url,
          platform: selectedPlatform
        });
      }

      toast.success('Clip generated successfully!', {
        id: toastId,
        description: 'Your clip is ready'
      });

      // Refresh clips list
      await loadGeneratedClips();

    } catch (err: any) {
      console.error('❌ Clip generation error:', err);
      
      const errorMessage = err.message || 'Video processing failed. Please try again.';
      setError(errorMessage);
      
      toast.error('Processing failed', {
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
        {/* Duration Calculation Loading */}
        {isCalculatingDuration && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Calculating video duration...
            </AlertDescription>
          </Alert>
        )}

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
                        max={actualDuration}
                        value={startTime}
                        onChange={(e) => setStartTime(Number(e.target.value))}
                        className="mt-1"
                        disabled={isCalculatingDuration}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm">End Time (seconds)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min={startTime}
                        max={actualDuration}
                        value={endTime}
                        onChange={(e) => setEndTime(Number(e.target.value))}
                        className="mt-1"
                        disabled={isCalculatingDuration}
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
                      max={actualDuration}
                      step={0.1}
                      className="w-full"
                      disabled={isCalculatingDuration}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0:00</span>
                      <span>{formatTime(actualDuration)}</span>
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
                  {/* Transcript Loading States */}
                  {transcriptLoading && (
                    <Alert>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <AlertDescription>Checking for transcript...</AlertDescription>
                    </Alert>
                  )}
                  
                  {!transcriptLoading && !hasTranscript && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No Transcript Available</AlertTitle>
                      <AlertDescription>
                        This video needs to be transcribed first to use multi-segment editing.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {!transcriptLoading && hasTranscript && segmentsLoading && (
                    <Alert>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <AlertDescription>Loading transcript segments...</AlertDescription>
                    </Alert>
                  )}
                  
                  {!transcriptLoading && hasTranscript && !segmentsLoading && segments.length === 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No Segments Found</AlertTitle>
                      <AlertDescription>
                        Transcript exists but no segments were loaded. This may be a database error.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {!transcriptLoading && hasTranscript && !segmentsLoading && segments.length > 0 && (
                    <>
                      {/* Video Preview */}
                      <Card className="p-4">
                        <h3 className="text-sm font-medium mb-3">Video Preview</h3>
                        <video
                          src={supabase.storage.from('videos').getPublicUrl(video.storage_path).data.publicUrl}
                          className="w-full max-h-[400px] rounded-lg bg-black"
                          controls
                          controlsList="nodownload"
                        />
                      </Card>

                      <WaveformTimeline
                        videoUrl={supabase.storage.from('videos').getPublicUrl(video.storage_path).data.publicUrl}
                        duration={actualDuration}
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
                    </>
                  )}
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

        {/* Progress Indicator */}
        {isGenerating && (
          <Card className="p-4 border-primary">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <h4 className="font-medium">Processing Your Clip...</h4>
                  <p className="text-sm text-muted-foreground">
                    This usually takes 30-60 seconds
                  </p>
                </div>
              </div>
              
              <Progress value={processingProgress} className="h-2" />
              
              <div className="text-xs text-muted-foreground">
                {processingStage === 'Preparing' && '⏳ Step 1/4: Preparing video...'}
                {processingStage === 'Loading captions' && '📝 Step 2/4: Loading captions...'}
                {processingStage === 'Creating clip record' && '💾 Step 3/4: Creating clip record...'}
                {processingStage === 'Processing video' && '🎬 Step 4/4: Processing video...'}
                {processingStage === 'Finalizing' && '✨ Finalizing your clip...'}
              </div>
            </div>
          </Card>
        )}

        {/* Success State */}
        {lastGeneratedClip && !isGenerating && (
          <Card className="p-4 border-green-500 bg-green-50 dark:bg-green-950">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  Clip Generated Successfully!
                </h4>
              </div>
              
              {lastGeneratedClip.clip_url && (
                <>
                  <video 
                    src={lastGeneratedClip.clip_url} 
                    controls 
                    className="w-full rounded-lg border"
                  />
                  
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => window.open(lastGeneratedClip.clip_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(lastGeneratedClip.clip_url);
                        toast.success('Link copied to clipboard!');
                      }}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLastGeneratedClip(null)}
                    >
                      Create Another
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Error Alert */}
        {error && !isGenerating && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Processing Failed</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    handleGenerateClip();
                  }}
                >
                  Try Again
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Generate Button */}
        <Button 
          onClick={handleGenerateClip}
          disabled={
            isGenerating || 
            isCalculatingDuration ||
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
