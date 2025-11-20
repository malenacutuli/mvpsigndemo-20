import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Image, Key, Download, ChevronLeft, ChevronRight, Sparkles, Wand2, Info, Volume2, FileText, Crop, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  analyzeVideoFrames,
  extractFrameAt,
  extractAllKeyFrames,
  extractDistributedFrames,
  type VideoFrameMetadata,
  type ExtractedFrame
} from '@/lib/advancedFrameExtractor';
import { extractSubtitles } from '@/lib/subtitleExtractor';
import { editImageWithAI, AI_EDIT_PRESETS, type AIEditPreset } from '@/lib/aiImageEditor';
import { FrameCropTool } from './FrameCropTool';
import { ExportQualitySettings, type ExportSettings } from './ExportQualitySettings';
import { SubtitleEditor } from './SubtitleEditor';
import { VideoExporter } from './VideoExporter';
import { AISceneDetector } from './AISceneDetector';
import { PremiumAIToolsPanel } from './PremiumAIToolsPanel';
import { VideoTimeline } from './VideoTimeline';
import { SceneManager } from './SceneManager';
import { CaptionEditor } from './CaptionEditor';
import { AudioEditor } from './AudioEditor';

interface AdvancedFrameExtractorProps {
  videoFile: File | null;
  onFrameExtracted?: (frame: ExtractedFrame) => void;
}

export function AdvancedFrameExtractor({ videoFile, onFrameExtracted }: AdvancedFrameExtractorProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [metadata, setMetadata] = useState<VideoFrameMetadata | null>(null);
  const [extractedFrames, setExtractedFrames] = useState<ExtractedFrame[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [aiEditing, setAiEditing] = useState(false);
  const [aiPreset, setAiPreset] = useState<AIEditPreset>('enhance');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCropTool, setShowCropTool] = useState(false);
  const [exportSettings, setExportSettings] = useState<ExportSettings | null>(null);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [timelineScenes, setTimelineScenes] = useState<any[]>([]);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [captions, setCaptions] = useState<any[]>([]);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);

  const handleAnalyze = async () => {
    if (!videoFile) {
      toast.error('No video file loaded');
      return;
    }

    setAnalyzing(true);
    try {
      const meta = await analyzeVideoFrames(videoFile);
      setMetadata(meta);
      
      // Extract subtitles
      try {
        const subs = await extractSubtitles(videoFile);
        setSubtitles(subs);
      } catch (error) {
        console.log('No subtitles found or extraction failed');
      }
      
      toast.success('Video analyzed', {
        description: `Found ${meta.totalKeyFrames} key frames in ${meta.duration.toFixed(1)}s video`
      });
    } catch (error: any) {
      console.error('Failed to analyze video:', error);
      toast.error('Analysis failed', {
        description: error.message
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExtractKeyFrames = async () => {
    if (!videoFile || !metadata) {
      toast.error('Analyze video first');
      return;
    }

    setExtracting(true);
    setExtractedFrames([]);
    
    try {
      const frames = await extractAllKeyFrames(videoFile, {
        keyFramesOnly: true,
        preserveAlpha: metadata.hasAlpha,
        maxFrames: 20, // Limit to 20 key frames
        quality: 0.9,
        maxWidth: 1280,
        maxHeight: 720
      });
      
      setExtractedFrames(frames);
      setSelectedFrameIndex(0);
      
      toast.success(`Extracted ${frames.length} key frames`, {
        description: 'Scroll through frames below'
      });
    } catch (error: any) {
      console.error('Failed to extract frames:', error);
      toast.error('Frame extraction failed', {
        description: error.message
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleExtractDistributed = async () => {
    if (!videoFile || !metadata) {
      toast.error('Analyze video first');
      return;
    }

    setExtracting(true);
    setExtractedFrames([]);
    
    try {
      const frames = await extractDistributedFrames(videoFile, 8, {
        keyFramesOnly: true,
        preserveAlpha: metadata.hasAlpha,
        quality: 0.9,
        maxWidth: 1280,
        maxHeight: 720
      });
      
      setExtractedFrames(frames);
      setSelectedFrameIndex(0);
      
      toast.success(`Extracted ${frames.length} evenly distributed frames`);
    } catch (error: any) {
      console.error('Failed to extract frames:', error);
      toast.error('Frame extraction failed', {
        description: error.message
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleDownloadFrame = (frame: ExtractedFrame) => {
    const a = document.createElement('a');
    a.href = frame.dataUrl;
    a.download = `frame-${frame.timestamp.toFixed(2)}s.${frame.hasAlpha ? 'png' : 'jpg'}`;
    a.click();
    
    toast.success('Frame downloaded');
  };

  const handlePreviousFrame = () => {
    if (selectedFrameIndex > 0) {
      setSelectedFrameIndex(selectedFrameIndex - 1);
    }
  };

  const handleNextFrame = () => {
    if (selectedFrameIndex < extractedFrames.length - 1) {
      setSelectedFrameIndex(selectedFrameIndex + 1);
    }
  };

  const handleAIEdit = async (useCustomPrompt: boolean = false) => {
    const frame = extractedFrames[selectedFrameIndex];
    if (!frame) {
      toast.error('No frame selected');
      return;
    }

    setAiEditing(true);
    try {
      const prompt = useCustomPrompt ? customPrompt : AI_EDIT_PRESETS[aiPreset];
      
      if (!prompt.trim()) {
        toast.error('Please enter a prompt');
        return;
      }

      const result = await editImageWithAI({
        prompt,
        imageUrl: frame.dataUrl
      });

      // Replace the frame with AI-edited version
      const updatedFrames = [...extractedFrames];
      updatedFrames[selectedFrameIndex] = {
        ...frame,
        dataUrl: result.imageUrl,
        blob: await (await fetch(result.imageUrl)).blob()
      };
      setExtractedFrames(updatedFrames);

      toast.success('AI editing complete', {
        description: `Applied: ${prompt.slice(0, 50)}...`
      });
    } catch (error: any) {
      console.error('AI editing failed:', error);
      toast.error('AI editing failed', {
        description: error.message
      });
    } finally {
      setAiEditing(false);
    }
  };

  const handleCropApply = async (croppedImageUrl: string, rotation: number) => {
    const frame = extractedFrames[selectedFrameIndex];
    if (!frame) return;

    try {
      // Update frame with cropped/rotated version
      const updatedFrames = [...extractedFrames];
      updatedFrames[selectedFrameIndex] = {
        ...frame,
        dataUrl: croppedImageUrl,
        blob: await (await fetch(croppedImageUrl)).blob()
      };
      setExtractedFrames(updatedFrames);
      setShowCropTool(false);

      toast.success('Transformations applied');
    } catch (error: any) {
      console.error('Failed to apply crop:', error);
      toast.error('Failed to apply crop');
    }
  };

  const selectedFrame = extractedFrames[selectedFrameIndex];

  return (
    <div className="space-y-4">
      {/* Analysis Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Advanced Frame Extraction
          </CardTitle>
          <CardDescription>
            Extract key frames with alpha channel support and efficient navigation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!metadata ? (
            <Button 
              onClick={handleAnalyze} 
              disabled={!videoFile || analyzing}
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Video'
              )}
            </Button>
          ) : (
            <>
              {/* Metadata Display */}
              <div className="space-y-4">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-6 text-xs">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="tracks">Tracks</TabsTrigger>
                    <TabsTrigger value="ai">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI
                    </TabsTrigger>
                    <TabsTrigger value="subtitles">
                      <FileText className="w-3 h-3 mr-1" />
                      Subs
                    </TabsTrigger>
                    <TabsTrigger value="export">
                      <SettingsIcon className="w-3 h-3 mr-1" />
                      Export
                    </TabsTrigger>
                    <TabsTrigger value="tools">
                      <Wand2 className="w-3 h-3 mr-1" />
                      Tools
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-3 mt-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <div className="text-muted-foreground">Codec</div>
                        <Badge variant="secondary">{metadata.codec}</Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground">Resolution</div>
                        <div className="font-medium">{metadata.width}x{metadata.height}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground">Frame Rate</div>
                        <div className="font-medium">{metadata.fps.toFixed(2)} fps</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground">Duration</div>
                        <div className="font-medium">{metadata.duration.toFixed(2)}s</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground">Total Frames</div>
                        <div className="font-medium">{metadata.totalFrames}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground">Key Frames</div>
                        <div className="font-medium flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          {metadata.totalKeyFrames}
                        </div>
                      </div>
                      {metadata.bitrate && (
                        <div className="space-y-1">
                          <div className="text-muted-foreground">Bitrate</div>
                          <div className="font-medium">{(metadata.bitrate / 1_000_000).toFixed(2)} Mbps</div>
                        </div>
                      )}
                      {metadata.hasAlpha && (
                        <div className="col-span-2">
                          <Badge variant="outline" className="bg-primary/10">
                            ✓ Alpha Channel
                          </Badge>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="tracks" className="mt-3">
                    {metadata.tracks && metadata.tracks.length > 0 && (
                      <div className="space-y-2">
                        {metadata.tracks.map((track, idx) => (
                          <Card key={idx} className="p-3 bg-muted/30">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {track.type === 'video' && <Image className="w-4 h-4 text-primary" />}
                                {track.type === 'audio' && <Volume2 className="w-4 h-4 text-accent" />}
                                {track.type === 'subtitle' && <FileText className="w-4 h-4 text-muted-foreground" />}
                              </div>
                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {track.type}
                                  </Badge>
                                  <span className="text-xs font-medium">{track.codec}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                  {track.bitrate && (
                                    <div>Bitrate: {(track.bitrate / 1000).toFixed(0)} kbps</div>
                                  )}
                                  {track.sampleRate && (
                                    <div>Sample Rate: {(track.sampleRate / 1000).toFixed(1)} kHz</div>
                                  )}
                                </div>
                                {track.disposition && (
                                  <div className="flex gap-1 flex-wrap mt-1">
                                    {track.disposition.default && (
                                      <Badge variant="outline" className="text-xs">Default</Badge>
                                    )}
                                    {track.disposition.forced && (
                                      <Badge variant="outline" className="text-xs">Forced</Badge>
                                    )}
                                    {track.disposition.hearingImpaired && (
                                      <Badge variant="outline" className="text-xs">SDH</Badge>
                                    )}
                                    {track.disposition.visuallyImpaired && (
                                      <Badge variant="outline" className="text-xs">Audio Description</Badge>
                                    )}
                                    {track.disposition.commentary && (
                                      <Badge variant="outline" className="text-xs">Commentary</Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="ai" className="mt-3">
                    <AISceneDetector
                      frames={extractedFrames}
                      videoDuration={metadata.duration}
                    />
                  </TabsContent>

                  <TabsContent value="subtitles" className="mt-3">
                    <SubtitleEditor 
                      tracks={subtitles}
                      videoDuration={metadata.duration}
                      onTracksChange={setSubtitles}
                    />
                  </TabsContent>

                  <TabsContent value="export" className="mt-3">
                    <div className="space-y-4">
                      <ExportQualitySettings
                        videoDuration={metadata.duration}
                        hasAlpha={metadata.hasAlpha}
                        hasHDR={metadata.hdr}
                        onSettingsChange={setExportSettings}
                      />
                      
                      <VideoExporter
                        videoFile={videoFile}
                        exportSettings={exportSettings}
                        videoDuration={metadata.duration}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="tools" className="mt-3">
                    <PremiumAIToolsPanel versionId={videoFile?.name || 'demo-version'} />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Extraction Actions */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleExtractKeyFrames}
                  disabled={extracting}
                  variant="default"
                  className="flex-1"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Extract Key Frames
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleExtractDistributed}
                  disabled={extracting}
                  variant="outline"
                  className="flex-1"
                >
                  Extract 8 Frames
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Video Timeline & Playback */}
      {metadata && videoFile && (
        <VideoTimeline
          videoUrl={URL.createObjectURL(videoFile)}
          duration={metadata.duration}
          scenes={timelineScenes}
          onTimeUpdate={setCurrentPlaybackTime}
          onSceneSelect={(sceneId) => {
            console.log('Scene selected:', sceneId);
          }}
        />
      )}

      {/* Scene Manager */}
      {metadata && (
        <SceneManager
          scenes={timelineScenes}
          onScenesChange={setTimelineScenes}
          onSceneSelect={(sceneId) => {
            const scene = timelineScenes.find(s => s.id === sceneId);
            if (scene) {
              setCurrentPlaybackTime(scene.startTime);
            }
          }}
          videoDuration={metadata.duration}
        />
      )}

      {/* Caption Editor */}
      {metadata && (
        <CaptionEditor
          captions={captions}
          onCaptionsChange={setCaptions}
          currentTime={currentPlaybackTime}
          videoDuration={metadata.duration}
        />
      )}

      {/* Audio Editor */}
      {metadata && (
        <AudioEditor
          videoFile={videoFile}
          audioTracks={audioTracks}
          onAudioTracksChange={setAudioTracks}
          currentTime={currentPlaybackTime}
          videoDuration={metadata.duration}
        />
      )}

      {/* Extracted Frames Display */}
      {extractedFrames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Extracted Frames ({extractedFrames.length})</span>
              {selectedFrame && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handlePreviousFrame}
                    disabled={selectedFrameIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-normal">
                    {selectedFrameIndex + 1} / {extractedFrames.length}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleNextFrame}
                    disabled={selectedFrameIndex === extractedFrames.length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Frame Display */}
            {selectedFrame && (
              <div className="space-y-2">
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="crop">
                      <Crop className="w-3 h-3 mr-1" />
                      Crop/Rotate
                    </TabsTrigger>
                    <TabsTrigger value="ai">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Edit
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="preview" className="mt-3">
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={selectedFrame.dataUrl} 
                        alt={`Frame at ${selectedFrame.timestamp.toFixed(2)}s`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="crop" className="mt-3">
                    <FrameCropTool
                      imageUrl={selectedFrame.dataUrl}
                      imageWidth={selectedFrame.width}
                      imageHeight={selectedFrame.height}
                      onApply={handleCropApply}
                    />
                  </TabsContent>

                  <TabsContent value="ai" className="mt-3">
                    <Card className="bg-muted/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          AI Frame Editor
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Enhance or transform frames with AI
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Preset Selection */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Quick Presets</label>
                          <div className="flex gap-2">
                            <Select value={aiPreset} onValueChange={(value) => setAiPreset(value as AIEditPreset)}>
                              <SelectTrigger className="flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="enhance">✨ Enhance</SelectItem>
                                <SelectItem value="artistic">🎨 Artistic</SelectItem>
                                <SelectItem value="cinematic">🎬 Cinematic</SelectItem>
                                <SelectItem value="vintage">📷 Vintage</SelectItem>
                                <SelectItem value="bw">⚫ Black & White</SelectItem>
                                <SelectItem value="blur_background">🌫️ Blur BG</SelectItem>
                                <SelectItem value="remove_noise">✨ Denoise</SelectItem>
                                <SelectItem value="dramatic">⚡ Dramatic</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={() => handleAIEdit(false)}
                              disabled={aiEditing}
                              size="sm"
                            >
                              {aiEditing ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Wand2 className="w-4 h-4 mr-2" />
                                  Apply
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Custom Prompt */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Custom Prompt</label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g., Make it look like a watercolor painting"
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              disabled={aiEditing}
                              className="flex-1 text-sm"
                            />
                            <Button
                              onClick={() => handleAIEdit(true)}
                              disabled={aiEditing || !customPrompt.trim()}
                              size="sm"
                              variant="secondary"
                            >
                              <Sparkles className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
                
                {/* Frame Info */}
                <div className="flex items-center justify-between text-sm pt-2">
                  <div className="flex gap-3">
                    <span className="text-muted-foreground">
                      Time: <span className="font-medium text-foreground">{selectedFrame.timestamp.toFixed(2)}s</span>
                    </span>
                    <span className="text-muted-foreground">
                      Size: <span className="font-medium text-foreground">{selectedFrame.width}x{selectedFrame.height}</span>
                    </span>
                    {selectedFrame.isKeyFrame && (
                      <Badge variant="outline" className="bg-primary/10">
                        <Key className="w-3 h-3 mr-1" />
                        Key Frame
                      </Badge>
                    )}
                    {selectedFrame.hasAlpha && (
                      <Badge variant="outline" className="bg-secondary/10">
                        Alpha
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownloadFrame(selectedFrame)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            )}

            {/* Thumbnail Grid */}
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {extractedFrames.map((frame, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedFrameIndex(index)}
                    className={`relative flex-shrink-0 w-32 aspect-video rounded overflow-hidden border-2 transition-all ${
                      selectedFrameIndex === index 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img 
                      src={frame.dataUrl}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {frame.isKeyFrame && (
                      <div className="absolute top-1 right-1">
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          <Key className="w-2 h-2" />
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 py-0.5 text-center">
                      {frame.timestamp.toFixed(1)}s
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
