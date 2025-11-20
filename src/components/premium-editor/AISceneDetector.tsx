import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, Film, Clock, TrendingUp, Download } from 'lucide-react';
import { toast } from 'sonner';
import { analyzeVideoScenes, type DetectedScene, type SceneAnalysisResult } from '@/lib/aiSceneDetection';
import type { ExtractedFrame } from '@/lib/advancedFrameExtractor';

interface AISceneDetectorProps {
  frames: ExtractedFrame[];
  videoDuration: number;
}

export function AISceneDetector({ frames, videoDuration }: AISceneDetectorProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SceneAnalysisResult | null>(null);
  const [selectedScene, setSelectedScene] = useState<DetectedScene | null>(null);

  const handleAnalyze = async () => {
    if (frames.length === 0) {
      toast.error('No frames available for analysis');
      return;
    }

    setAnalyzing(true);
    try {
      // Prepare frame data
      const frameData = frames.map(f => ({
        dataUrl: f.dataUrl,
        timestamp: f.timestamp
      }));

      const result = await analyzeVideoScenes(frameData, videoDuration);
      setAnalysis(result);

      toast.success('Scene analysis complete', {
        description: `Found ${result.totalScenes} scenes and ${result.suggestedClips.length} highlights`
      });
    } catch (error: any) {
      console.error('Analysis failed:', error);
      toast.error('AI analysis failed', {
        description: error.message
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExportScene = (scene: DetectedScene) => {
    toast.info('Scene export', {
      description: `${scene.startTime.toFixed(1)}s - ${scene.endTime.toFixed(1)}s`
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const getSceneTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'scene_change': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'action': 'bg-red-500/10 text-red-600 border-red-500/20',
      'dialogue': 'bg-green-500/10 text-green-600 border-green-500/20',
      'highlight': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    };
    return colors[type] || 'bg-muted';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'high': 'bg-red-500/10 text-red-600',
      'medium': 'bg-yellow-500/10 text-yellow-600',
      'low': 'bg-green-500/10 text-green-600'
    };
    return colors[priority] || 'bg-muted';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Scene Detection
          </CardTitle>
          <CardDescription>
            Analyze video with AI to detect scenes and suggest highlights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!analysis ? (
            <>
              <Alert>
                <Film className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  AI will analyze {frames.length} frames to detect scene changes, 
                  action moments, and suggest highlight clips worth extracting.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleAnalyze}
                disabled={analyzing || frames.length === 0}
                className="w-full"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze Scenes with AI
                  </>
                )}
              </Button>

              {analyzing && (
                <div className="space-y-2">
                  <Progress value={50} className="h-2" />
                  <div className="text-xs text-muted-foreground text-center">
                    This may take 10-30 seconds...
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {/* Video Summary */}
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Video Summary
                </div>
                <div className="text-sm">{analysis.videoSummary}</div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Scenes Detected</div>
                  <div className="text-2xl font-bold">{analysis.totalScenes}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Suggested Clips</div>
                  <div className="text-2xl font-bold">{analysis.suggestedClips.length}</div>
                </div>
              </div>

              {/* Suggested Highlights */}
              {analysis.suggestedClips.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <div className="text-sm font-medium">Suggested Highlight Clips</div>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 pr-4">
                      {analysis.suggestedClips.map((clip, idx) => (
                        <Card key={idx} className="p-3 hover:bg-muted/50 transition-colors">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={getPriorityColor(clip.priority)}>
                                    {clip.priority}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({(clip.endTime - clip.startTime).toFixed(1)}s)
                                  </span>
                                </div>
                                <div className="text-sm">{clip.reason}</div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toast.info('Clip export coming soon')}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Detected Scenes */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  <div className="text-sm font-medium">Detected Scenes</div>
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {analysis.scenes.map((scene) => (
                      <Card
                        key={scene.id}
                        className={`p-3 cursor-pointer transition-all ${
                          selectedScene?.id === scene.id
                            ? 'ring-2 ring-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedScene(scene)}
                      >
                        <div className="flex gap-3">
                          {scene.thumbnailUrl && (
                            <div className="flex-shrink-0 w-20 h-12 rounded overflow-hidden bg-muted">
                              <img
                                src={scene.thumbnailUrl}
                                alt="Scene thumbnail"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-xs ${getSceneTypeColor(scene.type)}`}
                              >
                                {scene.type.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {(scene.confidence * 100).toFixed(0)}% confident
                              </Badge>
                            </div>
                            <div className="text-sm truncate">{scene.description}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Re-analyze Button */}
              <Button
                onClick={handleAnalyze}
                variant="outline"
                className="w-full"
                disabled={analyzing}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Re-analyze
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
