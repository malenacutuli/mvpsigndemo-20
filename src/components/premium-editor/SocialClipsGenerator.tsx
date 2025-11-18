import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, Video, Download, Play, RefreshCw, 
  Scissors, TrendingUp, Clock, Loader2,
  CheckCircle, AlertCircle, Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Scene } from '@/lib/premium-editor/scene-manager';

interface SocialClipsGeneratorProps {
  videoId: string;
  videoUrl: string;
  scenes: Scene[];
  twelveLabsIndexId?: string;
  onClipGenerated?: (clip: SocialClip) => void;
}

interface KeyMoment {
  id: string;
  startTime: number;
  endTime: number;
  score: number; // 0-100 viral potential
  reason: string;
  thumbnail: string;
  emotionalTone: 'positive' | 'negative' | 'neutral' | 'exciting';
  hasVisualInterest: boolean;
  hasCompleteThought: boolean;
  transcript: string;
  detectedObjects: string[];
}

interface SocialClip {
  id: string;
  keyMomentId: string;
  startTime: number;
  endTime: number;
  duration: number;
  aspectRatio: '9:16' | '1:1' | '16:9' | '4:5';
  platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'custom';
  title: string;
  description: string;
  viralScore: number;
  
  // Accessibility features
  hasCaptions: boolean;
  hasAudioDescription: boolean;
  hasSignLanguage: boolean;
  captionStyle: 'cwi' | 'standard';
  
  // Processing
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  thumbnailUrl?: string;
}

const ASPECT_RATIOS = [
  { id: '9:16', name: 'Vertical (TikTok, Reels)', icon: '📱', platforms: ['tiktok', 'instagram'] },
  { id: '1:1', name: 'Square (Instagram)', icon: '⬜', platforms: ['instagram'] },
  { id: '16:9', name: 'Landscape (YouTube)', icon: '🖥️', platforms: ['youtube', 'twitter'] },
  { id: '4:5', name: 'Portrait (Instagram Feed)', icon: '📷', platforms: ['instagram'] },
] as const;

const PLATFORM_PRESETS = {
  tiktok: {
    name: 'TikTok',
    aspectRatio: '9:16',
    maxDuration: 60,
    minDuration: 15,
    captionPosition: 'top',
    recommendedLength: 30
  },
  instagram: {
    name: 'Instagram Reels',
    aspectRatio: '9:16',
    maxDuration: 90,
    minDuration: 15,
    captionPosition: 'center',
    recommendedLength: 45
  },
  youtube: {
    name: 'YouTube Shorts',
    aspectRatio: '9:16',
    maxDuration: 60,
    minDuration: 15,
    captionPosition: 'bottom',
    recommendedLength: 45
  },
  twitter: {
    name: 'Twitter/X',
    aspectRatio: '16:9',
    maxDuration: 140,
    minDuration: 5,
    captionPosition: 'bottom',
    recommendedLength: 30
  }
};

export function SocialClipsGenerator({
  videoId,
  videoUrl,
  scenes,
  twelveLabsIndexId,
  onClipGenerated
}: SocialClipsGeneratorProps) {
  // State
  const [keyMoments, setKeyMoments] = useState<KeyMoment[]>([]);
  const [socialClips, setSocialClips] = useState<SocialClip[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof PLATFORM_PRESETS>('tiktok');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<'9:16' | '1:1' | '16:9' | '4:5'>('9:16');
  const [minDuration, setMinDuration] = useState(15);
  const [maxDuration, setMaxDuration] = useState(60);
  const [minViralScore, setMinViralScore] = useState(60);
  
  // Accessibility options
  const [includeCaptions, setIncludeCaptions] = useState(true);
  const [useCWI, setUseCWI] = useState(true);
  const [includeAudioDescription, setIncludeAudioDescription] = useState(false);
  const [includeSignLanguage, setIncludeSignLanguage] = useState(false);

  // Auto-load existing clips
  useEffect(() => {
    loadExistingClips();
  }, [videoId]);

  // Update aspect ratio when platform changes
  useEffect(() => {
    const preset = PLATFORM_PRESETS[selectedPlatform];
    setSelectedAspectRatio(preset.aspectRatio as any);
    setMaxDuration(preset.maxDuration);
    setMinDuration(preset.minDuration);
  }, [selectedPlatform]);

  // === KEY MOMENT DETECTION ===
  
  const detectKeyMoments = async () => {
    if (!twelveLabsIndexId) {
      // Fallback: use scene-based detection
      await detectKeyMomentsFromScenes();
      return;
    }

    setIsDetecting(true);
    
    try {
      toast.info('Analyzing video with Axess Video Analysis...');
      
      // Call Axess Video Analysis to get key moments
      const { data: moments, error } = await supabase.functions.invoke('twelve-labs-key-moments', {
        body: {
          indexId: twelveLabsIndexId,
          minDuration,
          maxDuration,
          minViralScore
        }
      });

      if (error) throw error;

      // Enhance moments with AI viral analysis
      const enhancedMoments = await Promise.all(
        moments.map(async (moment: any) => {
          const analysis = await analyzeViralPotential(moment);
          
          return {
            id: `moment-${moment.start}-${moment.end}`,
            startTime: moment.start,
            endTime: moment.end,
            score: analysis.score,
            reason: analysis.reason,
            thumbnail: moment.thumbnail || await generateThumbnail(moment.start),
            emotionalTone: analysis.emotionalTone,
            hasVisualInterest: analysis.hasVisualInterest,
            hasCompleteThought: analysis.hasCompleteThought,
            transcript: moment.transcript || getTranscriptForRange(moment.start, moment.end),
            detectedObjects: moment.objects || []
          };
        })
      );

      // Sort by viral score
      enhancedMoments.sort((a, b) => b.score - a.score);
      
      setKeyMoments(enhancedMoments);
      toast.success(`Found ${enhancedMoments.length} potential viral moments!`);
      
    } catch (error) {
      console.error('Key moment detection failed:', error);
      toast.error('Failed to detect key moments. Trying scene-based detection...');
      await detectKeyMomentsFromScenes();
    } finally {
      setIsDetecting(false);
    }
  };

  // Fallback: Scene-based detection
  const detectKeyMomentsFromScenes = async () => {
    try {
      const validScenes = scenes.filter(scene => {
        const duration = scene.endTime - scene.startTime;
        return duration >= minDuration && duration <= maxDuration;
      });

      const moments: KeyMoment[] = await Promise.all(
        validScenes.map(async (scene) => {
          const analysis = await analyzeViralPotential({
            start: scene.startTime,
            end: scene.endTime,
            transcript: scene.text
          });

          return {
            id: `scene-${scene.id}`,
            startTime: scene.startTime,
            endTime: scene.endTime,
            score: analysis.score,
            reason: analysis.reason,
            thumbnail: await generateThumbnail(scene.startTime),
            emotionalTone: analysis.emotionalTone,
            hasVisualInterest: true,
            hasCompleteThought: true,
            transcript: scene.text,
            detectedObjects: []
          };
        })
      );

      moments.sort((a, b) => b.score - a.score);
      setKeyMoments(moments.filter(m => m.score >= minViralScore));
      
      toast.success(`Found ${moments.length} moments from scenes`);
    } catch (error) {
      console.error('Scene-based detection failed:', error);
      toast.error('Failed to analyze scenes');
    }
  };

  // AI Viral Potential Analysis
  const analyzeViralPotential = async (moment: any): Promise<{
    score: number;
    reason: string;
    emotionalTone: 'positive' | 'negative' | 'neutral' | 'exciting';
    hasVisualInterest: boolean;
    hasCompleteThought: boolean;
  }> => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-viral-potential', {
        body: {
          transcript: moment.transcript,
          duration: moment.end - moment.start,
          hasVisualElements: moment.objects?.length > 0
        }
      });

      if (error) throw error;
      return data;
      
    } catch (error) {
      console.error('Viral analysis failed:', error);
      
      // Fallback: Simple heuristic
      const duration = moment.end - moment.start;
      const hasText = moment.transcript?.length > 50;
      const isGoodLength = duration >= 15 && duration <= 45;
      
      let score = 50;
      if (hasText) score += 20;
      if (isGoodLength) score += 15;
      if (moment.objects?.length > 0) score += 15;
      
      return {
        score,
        reason: 'Good length and content',
        emotionalTone: 'neutral',
        hasVisualInterest: true,
        hasCompleteThought: hasText
      };
    }
  };

  const generateThumbnail = async (timeInSeconds: number): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-thumbnail', {
        body: {
          videoUrl,
          timeInSeconds
        }
      });

      if (error) throw error;
      return data.thumbnailUrl;
      
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      return '/placeholder.svg';
    }
  };

  const getTranscriptForRange = (startTime: number, endTime: number): string => {
    return scenes
      .filter(s => s.startTime >= startTime && s.endTime <= endTime)
      .map(s => s.text)
      .join(' ');
  };

  // === CLIP GENERATION ===
  
  const generateClipFromMoment = async (moment: KeyMoment) => {
    const clipId = `clip-${Date.now()}`;
    
    // Create clip object
    const clip: SocialClip = {
      id: clipId,
      keyMomentId: moment.id,
      startTime: moment.startTime,
      endTime: moment.endTime,
      duration: moment.endTime - moment.startTime,
      aspectRatio: selectedAspectRatio,
      platform: selectedPlatform,
      title: moment.transcript.substring(0, 50) + '...',
      description: moment.reason,
      viralScore: moment.score,
      hasCaptions: includeCaptions,
      hasAudioDescription: includeAudioDescription,
      hasSignLanguage: includeSignLanguage,
      captionStyle: useCWI ? 'cwi' : 'standard',
      status: 'pending',
      progress: 0
    };

    setSocialClips(prev => [clip, ...prev]);
    
    try {
      // Process clip
      await processClip(clip);
      
    } catch (error) {
      console.error('Clip generation failed:', error);
      
      // Update status to failed
      setSocialClips(prev => prev.map(c => 
        c.id === clipId ? { ...c, status: 'failed' } : c
      ));
      
      toast.error('Failed to generate clip');
    }
  };

  const processClip = async (clip: SocialClip) => {
    // Update status to processing
    setSocialClips(prev => prev.map(c => 
      c.id === clip.id ? { ...c, status: 'processing', progress: 10 } : c
    ));

    toast.info(`Generating ${selectedPlatform} clip...`);

    try {
      // Get scenes for this clip
      const clipScenes = scenes.filter(s => 
        s.startTime >= clip.startTime && s.endTime <= clip.endTime
      );

      // Prepare accessibility features
      const captions = includeCaptions ? clipScenes.map(s => ({
        startTime: s.startTime - clip.startTime,
        endTime: s.endTime - clip.startTime,
        text: s.text,
        speaker: s.speaker,
        speakerColor: useCWI ? s.speakerColor : '#FFFFFF',
        words: s.words
      })) : [];

      const audioDescriptions = includeAudioDescription 
        ? clipScenes.flatMap(s => s.audioDescriptions || [])
        : [];

      // Update progress
      setSocialClips(prev => prev.map(c => 
        c.id === clip.id ? { ...c, progress: 30 } : c
      ));

      // Call export API
      const { data, error } = await supabase.functions.invoke('export-social-clip', {
        body: {
          videoId,
          videoUrl,
          startTime: clip.startTime,
          endTime: clip.endTime,
          aspectRatio: clip.aspectRatio,
          platform: clip.platform,
          captions,
          audioDescriptions,
          includeSignLanguage: clip.hasSignLanguage,
          captionStyle: clip.captionStyle
        }
      });

      if (error) throw error;

      // Update progress
      setSocialClips(prev => prev.map(c => 
        c.id === clip.id ? { ...c, progress: 70 } : c
      ));

      // Poll for completion (if async)
      if (data.processId) {
        await pollClipStatus(clip.id, data.processId);
      } else {
        // Direct result
        setSocialClips(prev => prev.map(c => 
          c.id === clip.id 
            ? { 
                ...c, 
                status: 'completed', 
                progress: 100, 
                outputUrl: data.downloadUrl,
                thumbnailUrl: data.thumbnailUrl
              } 
            : c
        ));
        
        toast.success('Social clip ready!');
        onClipGenerated?.(clip);
      }

    } catch (error) {
      throw error;
    }
  };

  const pollClipStatus = async (clipId: string, processId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('export-status', {
          body: { processId }
        });

        if (error) throw error;

        if (data.status === 'complete') {
          setSocialClips(prev => prev.map(c => 
            c.id === clipId 
              ? { 
                  ...c, 
                  status: 'completed', 
                  progress: 100,
                  outputUrl: data.downloadUrl,
                  thumbnailUrl: data.thumbnailUrl
                } 
              : c
          ));
          
          toast.success('Social clip ready!');
          return;
        }

        if (data.status === 'failed') {
          throw new Error(data.error || 'Export failed');
        }

        // Update progress
        const progress = Math.min(90, 30 + (attempts * 2));
        setSocialClips(prev => prev.map(c => 
          c.id === clipId ? { ...c, progress } : c
        ));

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          throw new Error('Export timeout');
        }
        
      } catch (error) {
        setSocialClips(prev => prev.map(c => 
          c.id === clipId ? { ...c, status: 'failed' } : c
        ));
        throw error;
      }
    };

    poll();
  };

  const loadExistingClips = async () => {
    try {
      const { data, error } = await supabase
        .from('social_clips')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const clips: SocialClip[] = (data || []).map((c: any) => ({
        id: c.id,
        keyMomentId: c.key_moment_id,
        startTime: c.start_time,
        endTime: c.end_time,
        duration: c.duration,
        aspectRatio: c.aspect_ratio,
        platform: c.platform,
        title: c.title,
        description: c.description,
        viralScore: c.viral_score,
        hasCaptions: c.has_captions,
        hasAudioDescription: c.has_audio_description,
        hasSignLanguage: c.has_sign_language,
        captionStyle: c.caption_style,
        status: 'completed',
        progress: 100,
        outputUrl: c.output_url,
        thumbnailUrl: c.thumbnail_url
      }));

      setSocialClips(clips);
      
    } catch (error) {
      console.error('Failed to load existing clips:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // RENDER
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Scissors className="w-5 h-5" />
          Social Clips Generator
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered viral clip detection with accessibility features
        </p>
      </div>

      <Tabs defaultValue="detect" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none px-4">
          <TabsTrigger value="detect">Detect Moments</TabsTrigger>
          <TabsTrigger value="clips">
            Generated Clips
            {socialClips.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {socialClips.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* DETECT TAB */}
        <TabsContent value="detect" className="flex-1 flex flex-col m-0">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detection Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Platform Selection */}
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select 
                      value={selectedPlatform} 
                      onValueChange={(v) => setSelectedPlatform(v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PLATFORM_PRESETS).map(([key, preset]) => (
                          <SelectItem key={key} value={key}>
                            {preset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duration Range */}
                  <div className="space-y-2">
                    <Label>Clip Duration: {minDuration}s - {maxDuration}s</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Min</Label>
                        <Slider
                          value={[minDuration]}
                          onValueChange={([v]) => setMinDuration(v)}
                          min={5}
                          max={30}
                          step={5}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Max</Label>
                        <Slider
                          value={[maxDuration]}
                          onValueChange={([v]) => setMaxDuration(v)}
                          min={15}
                          max={180}
                          step={15}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Viral Score Threshold */}
                  <div className="space-y-2">
                    <Label>Min Viral Score: {minViralScore}%</Label>
                    <Slider
                      value={[minViralScore]}
                      onValueChange={([v]) => setMinViralScore(v)}
                      min={0}
                      max={100}
                      step={10}
                    />
                  </div>

                  {/* Accessibility Options */}
                  <div className="space-y-3 pt-3 border-t">
                    <Label>Accessibility Features</Label>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="captions" className="text-sm font-normal">
                        Include Captions
                      </Label>
                      <Switch
                        id="captions"
                        checked={includeCaptions}
                        onCheckedChange={setIncludeCaptions}
                      />
                    </div>

                    {includeCaptions && (
                      <div className="flex items-center justify-between ml-6">
                        <Label htmlFor="cwi" className="text-sm font-normal">
                          Use CWI Colors
                        </Label>
                        <Switch
                          id="cwi"
                          checked={useCWI}
                          onCheckedChange={setUseCWI}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Label htmlFor="ad" className="text-sm font-normal">
                        Audio Description
                      </Label>
                      <Switch
                        id="ad"
                        checked={includeAudioDescription}
                        onCheckedChange={setIncludeAudioDescription}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="asl" className="text-sm font-normal">
                        Sign Language
                      </Label>
                      <Switch
                        id="asl"
                        checked={includeSignLanguage}
                        onCheckedChange={setIncludeSignLanguage}
                      />
                    </div>
                  </div>

                  {/* Detect Button */}
                  <Button
                    onClick={detectKeyMoments}
                    disabled={isDetecting}
                    className="w-full"
                    size="lg"
                  >
                    {isDetecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing Video...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Detect Viral Moments
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Key Moments */}
              {keyMoments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Key Moments ({keyMoments.length})</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={detectKeyMoments}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {keyMoments.map((moment) => (
                    <Card key={moment.id}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Thumbnail */}
                          <div className="relative w-32 h-20 flex-shrink-0 rounded overflow-hidden bg-muted">
                            <img
                              src={moment.thumbnail}
                              alt="Moment thumbnail"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-1 right-1">
                              <Badge variant="secondary" className="text-xs">
                                {formatTime(moment.startTime)} - {formatTime(moment.endTime)}
                              </Badge>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium line-clamp-2 mb-1">
                                  {moment.transcript}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {moment.reason}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-2">
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3 text-green-500" />
                                  <span className="text-sm font-medium">{moment.score}%</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              <Badge 
                                variant="secondary" 
                                className={
                                  moment.emotionalTone === 'exciting' ? 'bg-orange-100 text-orange-800' :
                                  moment.emotionalTone === 'positive' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }
                              >
                                {moment.emotionalTone}
                              </Badge>
                              
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {(moment.endTime - moment.startTime).toFixed(0)}s
                              </Badge>

                              {moment.hasVisualInterest && (
                                <Badge variant="outline" className="text-xs">
                                  <Eye className="w-3 h-3 mr-1" />
                                  Visual
                                </Badge>
                              )}
                            </div>

                            <Button
                              size="sm"
                              onClick={() => generateClipFromMoment(moment)}
                              disabled={socialClips.some(c => c.keyMomentId === moment.id && c.status === 'processing')}
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Generate Clip
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!isDetecting && keyMoments.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">No moments detected yet</p>
                    <p className="text-sm text-muted-foreground">
                      Click "Detect Viral Moments" to analyze your video
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* CLIPS TAB */}
        <TabsContent value="clips" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {socialClips.length > 0 ? (
                socialClips.map((clip) => (
                  <Card key={clip.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Thumbnail */}
                        <div className="relative w-32 h-20 flex-shrink-0 rounded overflow-hidden bg-muted">
                          {clip.thumbnailUrl && (
                            <img
                              src={clip.thumbnailUrl}
                              alt="Clip thumbnail"
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute top-1 left-1">
                            <Badge variant="secondary" className="text-xs">
                              {clip.platform}
                            </Badge>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="mb-2">
                            <p className="text-sm font-medium line-clamp-1 mb-1">
                              {clip.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{clip.duration.toFixed(0)}s</span>
                              <span>•</span>
                              <span>{clip.aspectRatio}</span>
                              <span>•</span>
                              <span>Viral: {clip.viralScore}%</span>
                            </div>
                          </div>

                          {/* Accessibility badges */}
                          <div className="flex items-center gap-1 mb-3">
                            {clip.hasCaptions && (
                              <Badge variant="outline" className="text-xs">
                                Captions
                              </Badge>
                            )}
                            {clip.hasAudioDescription && (
                              <Badge variant="outline" className="text-xs">
                                AD
                              </Badge>
                            )}
                            {clip.hasSignLanguage && (
                              <Badge variant="outline" className="text-xs">
                                ASL
                              </Badge>
                            )}
                          </div>

                          {/* Status */}
                          {clip.status === 'processing' && (
                            <div className="space-y-1 mb-3">
                              <div className="flex items-center justify-between text-xs">
                                <span>Processing...</span>
                                <span>{clip.progress}%</span>
                              </div>
                              <Progress value={clip.progress} />
                            </div>
                          )}

                          {clip.status === 'failed' && (
                            <div className="flex items-center gap-2 text-xs text-destructive mb-3">
                              <AlertCircle className="w-4 h-4" />
                              <span>Generation failed</span>
                            </div>
                          )}

                          {clip.status === 'completed' && (
                            <div className="flex items-center gap-2 text-xs text-green-600 mb-3">
                              <CheckCircle className="w-4 h-4" />
                              <span>Ready to download</span>
                            </div>
                          )}

                          {/* Actions */}
                          {clip.outputUrl && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(clip.outputUrl, '_blank')}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = clip.outputUrl!;
                                  link.download = `${clip.platform}-clip-${clip.id}.mp4`;
                                  link.click();
                                  toast.success('Download started');
                                }}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">No clips generated yet</p>
                    <p className="text-sm text-muted-foreground">
                      Detect key moments and generate social clips
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
