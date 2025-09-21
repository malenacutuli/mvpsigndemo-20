import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Play, Eye, AlertCircle, Edit3, AudioLines } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoAnalysisPanelProps {
  assetId: string;
  playbackUrl: string;
  videoElementId?: string;
  videoId?: string; // Add videoId for audio description integration
}

interface AnalysisResult {
  video_id?: string;
  silences?: Array<{
    start: string;
    end: string;
    duration_ms: number;
    max_words_allowed?: number;
    narration: string;
  }>;
}

interface AudioDescriptionSegment {
  id?: string;
  text: string;
  startTime: number;
  endTime: number;
  voiceStyle: string;
  timestamp?: number;
}

// Helper functions
function hhmmssToSeconds(tc: string): number {
  if (!tc) return 0;
  const parts = tc.split(':').map(parseFloat);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function msToNice(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const base = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return ms % 1000 ? `${base}.${String(ms % 1000).padStart(3, '0')}` : base;
}

function wordsAllowed(durationMs: number) {
  const secs = Math.max(0, (durationMs - 300) / 1000);
  return Math.floor((160 / 60) * secs);
}

const DEFAULT_PROMPT = JSON.stringify(
  {
    task: "Extract silent moments and generate ad-style narration that fits each gap.",
    requirements: [
      "Detect all segments with no character dialogue or narration.",
      "Return precise timestamps as HH:MM:SS.mmm for start and end.",
      "Provide duration in milliseconds.",
      "Ensure each narration fits within the gap using ~160 words per minute and keep a 0.3s safety buffer.",
      "Style: creative advertising copywriter, cinematic podcast tone; avoid camera directions and technical terms.",
      "Focus on story, emotions, and sensory detail; keep concise for the gap length.",
      "US English.",
      "Output STRICT JSON only."
    ],
    output_schema: {
      video_id: "string",
      silences: [
        {
          start: "HH:MM:SS.mmm",
          end: "HH:MM:SS.mmm",
          duration_ms: 0,
          max_words_allowed: 0,
          narration: "string"
        }
      ]
    }
  },
  null,
  2
);

export const VideoAnalysisPanel: React.FC<VideoAnalysisPanelProps> = ({ 
  assetId, 
  playbackUrl, 
  videoElementId = "mainVideo",
  videoId
}) => {
  const [status, setStatus] = useState<'idle' | 'indexing' | 'ready' | 'failed'>('idle');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [editedNarrations, setEditedNarrations] = useState<{[index: number]: string}>({});
  const [editedTimestamps, setEditedTimestamps] = useState<{[index: number]: { start: string, end: string }}>({});
  const [showAudioDescriptionDialog, setShowAudioDescriptionDialog] = useState(false);
  const [savingAudioDescriptions, setSavingAudioDescriptions] = useState(false);
  const { toast } = useToast();

  // Check existing mapping on mount
  useEffect(() => {
    checkExistingMapping();
  }, [assetId]);

  const checkExistingMapping = async () => {
    try {
      const { data: mapping } = await supabase
        .from('twelve_labs_mappings')
        .select('*')
        .eq('asset_id', assetId)
        .maybeSingle();

      if (mapping) {
        if (mapping.status === 'ready') {
          setStatus('ready');
        } else if (mapping.status === 'processing') {
          setStatus('indexing');
          startPolling();
        } else if (mapping.status === 'failed') {
          setStatus('failed');
        }
      }
    } catch (error) {
      console.error('Error checking existing mapping:', error);
    }
  };

  const startIndexing = async () => {
    setIndexing(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('video-analysis-start', {
        body: { assetId, playbackUrl }
      });

      if (error) throw error;

      if (data?.reused) {
        setStatus('ready');
        toast({
          title: "Index Found",
          description: "Using existing video index"
        });
      } else {
        setStatus('indexing');
        startPolling();
        toast({
          title: "Indexing Started",
          description: "Video is being indexed for analysis"
        });
      }
    } catch (error: any) {
      console.error('Indexing error:', error);
      setStatus('failed');
      toast({
        title: "Indexing Failed",
        description: error.message || 'Failed to start video indexing',
        variant: "destructive"
      });
    } finally {
      setIndexing(false);
    }
  };

  const startPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('video-analysis-status', {
          body: { assetId }
        });

        if (error) throw error;

        const mapping = data?.mapping;
        if (mapping?.status === 'ready') {
          clearInterval(pollInterval);
          setStatus('ready');
          toast({
            title: "Video Indexed",
            description: "Video is ready for analysis"
          });
        } else if (mapping?.status === 'failed') {
          clearInterval(pollInterval);
          setStatus('failed');
          toast({
            title: "Indexing Failed",
            description: mapping.error_message || 'Video indexing failed',
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(pollInterval);
      }
    }, 3000);

    // Stop polling after 10 minutes
    setTimeout(() => clearInterval(pollInterval), 600000);
  };

  const analyze = async () => {
    setAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('video-analysis-analyze', {
        body: { assetId, prompt }
      });

      if (error) throw error;

      // Parse the response structure from analysis API
      let analysisResult: AnalysisResult;
      if (data?.data && typeof data.data === 'string') {
        // Parse the stringified JSON from analysis service
        const parsedData = JSON.parse(data.data);
        analysisResult = parsedData;
      } else if (data?.silences) {
        // Direct format (fallback)
        analysisResult = data;
      } else {
        throw new Error('Invalid response format');
      }

      setResult(analysisResult);
      toast({
        title: "Analysis Complete",
        description: `Found ${analysisResult?.silences?.length || 0} silent segments`
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || 'Failed to analyze video',
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const seekTo = (tc: string) => {
    const el = document.getElementById(videoElementId) as HTMLVideoElement | null;
    if (!el) return;
    el.currentTime = hhmmssToSeconds(tc);
    el.play().catch(() => {});
  };

  const updateNarration = (index: number, newText: string) => {
    setEditedNarrations(prev => ({
      ...prev,
      [index]: newText
    }));
  };

  const updateTimestamp = (index: number, field: 'start' | 'end', value: string) => {
    setEditedTimestamps(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
  };

  const convertToAudioDescriptions = async () => {
    if (!videoId) {
      toast({
        title: "Error",
        description: "Video ID is required to save audio descriptions",
        variant: "destructive"
      });
      return;
    }

    setSavingAudioDescriptions(true);
    
    try {
      const audioDescriptions: AudioDescriptionSegment[] = rows.map((row, index) => {
        const finalNarration = editedNarrations[index] || row.narration;
        const timestamps = editedTimestamps[index];
        const startTime = timestamps?.start ? hhmmssToSeconds(timestamps.start) : hhmmssToSeconds(row.start);
        const endTime = timestamps?.end ? hhmmssToSeconds(timestamps.end) : hhmmssToSeconds(row.end);
        
        return {
          text: finalNarration,
          startTime,
          endTime,
          voiceStyle: 'warm', // Default voice style
          timestamp: Date.now()
        };
      });

      // Clear existing audio descriptions for this video
      await supabase
        .from('audio_descriptions')
        .delete()
        .eq('video_id', videoId);

      // Insert new audio descriptions
      const { error } = await supabase
        .from('audio_descriptions')
        .insert(
          audioDescriptions.map(desc => ({
            video_id: videoId,
            description: desc.text,
            start_time: desc.startTime,
            end_time: desc.endTime,
            description_type: 'visual'
          }))
        );

      if (error) throw error;

      toast({
        title: "Success",
        description: `Applied ${audioDescriptions.length} audio descriptions to video`
      });
      
      setShowAudioDescriptionDialog(false);
    } catch (error: any) {
      console.error('Error saving audio descriptions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save audio descriptions",
        variant: "destructive"
      });
    } finally {
      setSavingAudioDescriptions(false);
    }
  };

  const rows = useMemo(() => {
    const list = result?.silences || [];
    return list.map((s: any) => ({
      start: s.start,
      end: s.end,
      duration_ms: s.duration_ms ?? 0,
      narration: s.narration || "",
      max_words: s.max_words_allowed ?? wordsAllowed(s.duration_ms ?? 0)
    }));
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Video Analysis</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={status === 'ready' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}>
              {status === 'idle' && 'Not Started'}
              {status === 'indexing' && 'Indexing...'}
              {status === 'ready' && 'Ready'}
              {status === 'failed' && 'Failed'}
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={startIndexing}
            disabled={indexing || status === 'indexing'}
          >
            {indexing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Indexing...
              </>
            ) : status === 'indexing' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Indexing...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                {status === 'ready' ? 'Re-index' : 'Index Video'}
              </>
            )}
          </Button>
          
          <Button
            onClick={analyze}
            disabled={status !== 'ready' || analyzing}
            variant={status === 'ready' ? 'default' : 'secondary'}
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Analyze
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {status === 'indexing' && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Video is being indexed for analysis. This may take a few minutes depending on video length.
          </AlertDescription>
        </Alert>
      )}

      {status === 'failed' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Video indexing failed. Please try again or check if the video URL is accessible.
          </AlertDescription>
        </Alert>
      )}

      {/* Prompt Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analysis Prompt</CardTitle>
          <p className="text-sm text-muted-foreground">
            Customize the analysis prompt to extract specific insights from your video.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-48 font-mono text-sm"
            placeholder="Enter your analysis prompt..."
          />
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Analysis Results</CardTitle>
            {rows.length > 0 && (
              <Button
                onClick={() => setShowAudioDescriptionDialog(true)}
                disabled={!videoId}
                size="sm"
                className="flex items-center gap-2"
              >
                <AudioLines className="w-4 h-4" />
                Use as Audio Description
              </Button>
            )}
          </div>
          {!videoId && rows.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Video ID required to save as audio descriptions
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Run analysis to see silent gaps and narrations.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No silent segments found in this video.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((row, i) => {
                const currentText = editedNarrations[i] || row.narration;
                const wordCount = currentText.trim().split(/\s+/).filter(Boolean).length;
                const tooLong = wordCount > row.max_words;
                
                return (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => seekTo(editedTimestamps[i]?.start || row.start)}
                          className="text-sm"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Play
                        </Button>
                        <div className="flex items-center gap-1 text-sm">
                          <Input
                            type="text"
                            value={editedTimestamps[i]?.start || row.start}
                            onChange={(e) => updateTimestamp(i, 'start', e.target.value)}
                            className="w-24 h-7 text-xs"
                            placeholder="HH:MM:SS"
                          />
                          <span className="text-muted-foreground">→</span>
                          <Input
                            type="text"
                            value={editedTimestamps[i]?.end || row.end}
                            onChange={(e) => updateTimestamp(i, 'end', e.target.value)}
                            className="w-24 h-7 text-xs"
                            placeholder="HH:MM:SS"
                          />
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {msToNice(row.duration_ms)}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Edit3 className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <Textarea
                          value={currentText}
                          onChange={(e) => updateNarration(i, e.target.value)}
                          className="text-sm leading-relaxed min-h-20 resize-none"
                          placeholder="Edit narration..."
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {wordCount} / {row.max_words} words
                        </span>
                        {tooLong && (
                          <Badge variant="destructive" className="text-xs">
                            Too long — trim text
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audio Description Confirmation Dialog */}
      <AlertDialog open={showAudioDescriptionDialog} onOpenChange={setShowAudioDescriptionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Audio Descriptions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will convert your {rows.length} analysis segments into audio descriptions for the video. 
              Any existing audio descriptions will be replaced.
              <br /><br />
              Make sure to review and edit the narrations before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={convertToAudioDescriptions}
              disabled={savingAudioDescriptions}
            >
              {savingAudioDescriptions ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <AudioLines className="w-4 h-4 mr-2" />
                  Apply as Audio Descriptions
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};