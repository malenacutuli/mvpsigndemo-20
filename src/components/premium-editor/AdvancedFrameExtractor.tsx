import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Image, Key, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  analyzeVideoFrames,
  extractFrameAt,
  extractAllKeyFrames,
  extractDistributedFrames,
  type VideoFrameMetadata,
  type ExtractedFrame
} from '@/lib/advancedFrameExtractor';

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

  const handleAnalyze = async () => {
    if (!videoFile) {
      toast.error('No video file loaded');
      return;
    }

    setAnalyzing(true);
    try {
      const meta = await analyzeVideoFrames(videoFile);
      setMetadata(meta);
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
                {metadata.hasAlpha && (
                  <div className="col-span-2">
                    <Badge variant="outline" className="bg-primary/10">
                      ✓ Alpha Channel Supported
                    </Badge>
                  </div>
                )}
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
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={selectedFrame.dataUrl} 
                    alt={`Frame at ${selectedFrame.timestamp.toFixed(2)}s`}
                    className="w-full h-full object-contain"
                  />
                </div>
                
                {/* Frame Info */}
                <div className="flex items-center justify-between text-sm">
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
