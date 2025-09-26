import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Play, Eye, AlertCircle, Edit3, AudioLines, MessageSquare, Download } from 'lucide-react';
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
  analysis_text?: string; // For text-based analysis results
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

// Extract silence segments from narrative text that contains timing patterns like [0s (00:00)-4s (00:04)]
function extractSilencesFromNarrative(text: string): Array<{
  start: string;
  end: string;
  duration_ms: number;
  max_words_allowed?: number;
  narration: string;
}> {
  const silences: Array<{
    start: string;
    end: string;
    duration_ms: number;
    max_words_allowed?: number;
    narration: string;
  }> = [];

  // Regex to match patterns like [0s (00:00)-4s (00:04)] or [4s (00:04)-7s (00:07)]
  const timePattern = /\[(\d+)s \((\d{2}:\d{2})\)-(\d+)s \((\d{2}:\d{2})\)\]/g;
  
  let match;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  let sentenceIndex = 0;

  while ((match = timePattern.exec(text)) !== null) {
    const [fullMatch, startSeconds, startTime, endSeconds, endTime] = match;
    const duration = (parseInt(endSeconds) - parseInt(startSeconds)) * 1000;
    
    // Find the sentence containing this timing pattern and extract surrounding context
    let narration = '';
    for (let i = sentenceIndex; i < sentences.length; i++) {
      if (sentences[i].includes(fullMatch)) {
        // Get this sentence and potentially the next one for context
        narration = sentences[i].replace(fullMatch, '').trim();
        if (i + 1 < sentences.length && narration.length < 50) {
          narration += ' ' + sentences[i + 1].trim();
        }
        sentenceIndex = i + 1;
        break;
      }
    }

    // Clean up narration text
    narration = narration
      .replace(/^[,\s]+/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (narration && duration > 0) {
      silences.push({
        start: `00:${startTime}.000`,
        end: `00:${endTime}.000`,
        duration_ms: duration,
        max_words_allowed: wordsAllowed(duration),
        narration: narration || `Visual elements and ambiance during this ${duration/1000}s segment.`
      });
    }
  }

  console.log(`🔍 Extracted ${silences.length} silence segments from narrative text`);
  return silences;
}

const DEFAULT_SILENCE_PROMPT = JSON.stringify(
  {
    "task": "Extract silent moments and generate storytelling audio description that fits within each gap for the ENTIRE video duration.",
    "requirements": [
      "Detect ALL segments where there is no character dialogue or narration (silence or just background music) throughout the COMPLETE video from start to finish.",
      "Process the ENTIRE video duration - do not stop early, analyze from 00:00:00 to the very end of the video.",
      "Also analyze surrounding dialogue to enrich the context of the scene, so descriptions feel connected to the story.",
      "Return precise timestamps as HH:MM:SS.mmm for start and end.",
      "Provide duration in milliseconds.",
      "Process up to 100 silent segments to ensure comprehensive coverage of the full video length.",
      "Limit to ~160 words per minute, leaving 0.3s safety buffer per gap.",
      "Narration style: cinematic podcast or audiobook storytelling — emotionally engaging, sensory-rich, and narrative-driven.",
      "Do NOT describe cameras, angles, or technical details.",
      "Blend dialogue meaning and visual action into the narration when dialogue is present nearby.",
      "Make the listener 'see with their ears' — describe emotions, atmospheres, and story flow.",
      "If characters are known (e.g., David Beckham, Kevin Hart), name them and tie their actions to the overall story/emotion.",
      "Ensure each narration fits strictly within its silent segment timing.",
      "CRITICAL: Analyze the complete video from beginning to end - do not truncate or stop analysis early.",
      "Output STRICT JSON only."
    ],
    "output_schema": {
      "video_id": "string",
      "total_video_duration_analyzed": "HH:MM:SS.mmm",
      "silences": [
        {
          "start": "HH:MM:SS.mmm",
          "end": "HH:MM:SS.mmm",
          "duration_ms": 0,
          "max_words_allowed": 0,
          "narration": "string"
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
  const [silencePrompt, setSilencePrompt] = useState(DEFAULT_SILENCE_PROMPT);
  const [customPrompt, setCustomPrompt] = useState('');
  const [silenceResult, setSilenceResult] = useState<AnalysisResult | null>(null);
  const [insightResult, setInsightResult] = useState<AnalysisResult | null>(null);
  const [analyzingSilence, setAnalyzingSilence] = useState(false);
  const [analyzingInsight, setAnalyzingInsight] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [editedNarrations, setEditedNarrations] = useState<{[index: number]: string}>({});
  const [editedTimestamps, setEditedTimestamps] = useState<{[index: number]: { start: string, end: string }}>({});
  const [showAudioDescriptionDialog, setShowAudioDescriptionDialog] = useState(false);
  const [savingAudioDescriptions, setSavingAudioDescriptions] = useState(false);
  const [loadingCachedResults, setLoadingCachedResults] = useState(false);
  const [silenceResultsFromCache, setSilenceResultsFromCache] = useState(false);
  const [insightResultsFromCache, setInsightResultsFromCache] = useState(false);
  const [savingSilenceResults, setSavingSilenceResults] = useState(false);
  const [savingInsightResults, setSavingInsightResults] = useState(false);
  const [hasUnsavedSilenceChanges, setHasUnsavedSilenceChanges] = useState(false);
  const [hasUnsavedInsightChanges, setHasUnsavedInsightChanges] = useState(false);
  const { toast } = useToast();

  // Check existing mapping on mount
  useEffect(() => {
    checkExistingMapping();
    loadExistingResults();
  }, [assetId]);

  // Reload results when prompts change
  useEffect(() => {
    if (assetId) {
      loadExistingResults();
    }
  }, [silencePrompt, customPrompt]);

  const loadExistingResults = async () => {
    if (!assetId) return;
    
    setLoadingCachedResults(true);
    try {
      // Load silence analysis results
      const { data: silenceData } = await supabase
        .from('video_analysis_results')
        .select('*')
        .eq('asset_id', assetId)
        .eq('prompt', silencePrompt)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (silenceData) {
        setSilenceResult(silenceData.result as AnalysisResult);
        setSilenceResultsFromCache(true);
        setHasUnsavedSilenceChanges(false);
        console.log('✅ Loaded cached silence analysis results');
      } else {
        setSilenceResult(null);
        setSilenceResultsFromCache(false);
      }

      // Load insight analysis results if custom prompt exists
      if (customPrompt.trim()) {
        const { data: insightData } = await supabase
          .from('video_analysis_results')
          .select('*')
          .eq('asset_id', assetId)
          .eq('prompt', customPrompt)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (insightData) {
          setInsightResult(insightData.result as AnalysisResult);
          setInsightResultsFromCache(true);
          console.log('✅ Loaded cached insight analysis results');
        } else {
          setInsightResult(null);
          setInsightResultsFromCache(false);
        }
      }
    } catch (error) {
      console.error('Error loading cached results:', error);
    } finally {
      setLoadingCachedResults(false);
    }
  };

  const saveAnalysisResults = async (analysisResult: AnalysisResult, prompt: string) => {
    if (!assetId || !analysisResult) return;

    try {
      // Save to database - cast to JSON type
      const { error } = await supabase
        .from('video_analysis_results')
        .insert({
          asset_id: assetId,
          result: analysisResult as any, // Cast to match database JSON type
          prompt: prompt,
          language: 'en'
        });

      if (error) {
        console.error('Error saving analysis results:', error);
      } else {
        console.log('✅ Analysis results saved to database');
      }
    } catch (error) {
      console.error('Error saving analysis results:', error);
    }
  };

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
    setSilenceResult(null);
    setInsightResult(null);
    
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

  const analyzeSilences = async () => {
    setAnalyzingSilence(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('video-analysis-analyze', {
        body: { assetId, prompt: silencePrompt }
      });

      if (error) throw error;

      // Parse the response structure from analysis API
      let analysisResult: AnalysisResult;
      
      // Debug: log raw response shape
      console.log('🧪 Silence analysis raw response:', data);

      const tryParseJson = (val: any) => {
        if (typeof val !== 'string') return null;
        const cleaned = val
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '');
        try { return JSON.parse(cleaned); } catch { return null; }
      };
      
      if (data?.silences) {
        // Direct format from edge function
        analysisResult = data;
      } else if (typeof data === 'string') {
        const parsed = tryParseJson(data);
        analysisResult = parsed || { video_id: assetId, analysis_text: data, silences: [] };
      } else if (data?.data && typeof data.data === 'string') {
        // Try to parse JSON string first
        const parsedData = tryParseJson(data.data);
        if (parsedData) {
          analysisResult = parsedData;
        } else {
          // If JSON parsing fails, try to extract silence segments from narrative text
          const extractedSilences = extractSilencesFromNarrative(data.data);
          analysisResult = { 
            video_id: data.video_id || assetId, 
            analysis_text: data.data, 
            silences: extractedSilences.length > 0 ? extractedSilences : []
          };
          
          if (extractedSilences.length === 0) {
            console.warn('⚠️ No silence segments found in narrative text. API may not be following JSON format instructions.');
          }
        }
      } else if (data?.data && typeof data.data === 'object' && data.data.silences) {
        // Nested object with silences
        analysisResult = data.data;
      } else if (typeof data === 'object') {
        // Look for common fields that may contain JSON string output
        const candidate: any = (data as any).output || (data as any).text || (data as any).content || (data as any).message || (data as any).result;
        if (typeof candidate === 'string') {
          const parsed = tryParseJson(candidate);
          analysisResult = parsed || { video_id: (data as any).video_id || assetId, analysis_text: candidate, silences: [] };
        } else {
          // Last resort: accept object, even without silences
          analysisResult = {
            video_id: (data as any).video_id || assetId,
            analysis_text: JSON.stringify(data),
            silences: Array.isArray((data as any).silences) ? (data as any).silences : []
          };
        }
      } else {
        throw new Error('Invalid response format');
      }

      setSilenceResult(analysisResult);
      setSilenceResultsFromCache(false);
      setHasUnsavedSilenceChanges(false);
      
      // Save results to database for future use
      await saveAnalysisResults(analysisResult, silencePrompt);
      
      toast({
        title: "Silence Analysis Complete",
        description: `Found ${analysisResult?.silences?.length || 0} silent segments`
      });
    } catch (error: any) {
      console.error('Silence analysis error:', error);
      // Try to surface upstream error details from the Edge Function
      let description = error?.message || 'Failed to analyze video for silent segments';
      try {
        const ctxBody = (error as any)?.context?.body;
        if (ctxBody) {
          // The edge function forwards upstream errors as JSON: { error, status, body }
          const parsed = typeof ctxBody === 'string' ? JSON.parse(ctxBody) : ctxBody;
          const upstream = parsed?.error || parsed?.body || parsed;
          description = typeof upstream === 'string' ? upstream : JSON.stringify(upstream);
        }
      } catch (_) {
        // Fallback to default description
      }
      toast({
        title: "Silence Analysis Failed",
        description,
        variant: "destructive"
      });
    } finally {
      setAnalyzingSilence(false);
    }
  };

  const analyzeInsights = async () => {
    if (!customPrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a custom analysis prompt",
        variant: "destructive"
      });
      return;
    }

    setAnalyzingInsight(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('video-analysis-analyze', {
        body: { assetId, prompt: customPrompt }
      });

      if (error) throw error;

      // Parse the response structure from analysis API
      let analysisResult: AnalysisResult;
      
      if (data?.data && typeof data.data === 'string') {
        // For custom prompts, treat as text-based analysis result
        analysisResult = {
          video_id: data.video_id || assetId,
          analysis_text: data.data,
          silences: []
        };
      } else if (data?.data) {
        // Handle non-string data
        analysisResult = data.data;
      } else {
        throw new Error('Invalid response format');
      }

      setInsightResult(analysisResult);
      setInsightResultsFromCache(false);
      setHasUnsavedInsightChanges(false);
      
      // Save results to database for future use
      await saveAnalysisResults(analysisResult, customPrompt);
      
      toast({
        title: "Insight Analysis Complete",
        description: "Generated custom analysis insights"
      });
    } catch (error: any) {
      console.error('Insight analysis error:', error);
      toast({
        title: "Insight Analysis Failed",
        description: error.message || 'Failed to analyze video with custom prompt',
        variant: "destructive"
      });
    } finally {
      setAnalyzingInsight(false);
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
    setHasUnsavedSilenceChanges(true);
  };

  const updateTimestamp = (index: number, field: 'start' | 'end', value: string) => {
    setEditedTimestamps(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
    setHasUnsavedSilenceChanges(true);
  };

  const saveSilenceResults = async () => {
    if (!silenceResult || !assetId) return;

    setSavingSilenceResults(true);
    try {
      // Create updated result with edited narrations and timestamps
      const updatedResult = {
        ...silenceResult,
        silences: silenceResult.silences?.map((silence, index) => ({
          ...silence,
          narration: editedNarrations[index] || silence.narration,
          start: editedTimestamps[index]?.start || silence.start,
          end: editedTimestamps[index]?.end || silence.end,
        }))
      };

      // Delete existing result for this video/prompt combination
      await supabase
        .from('video_analysis_results')
        .delete()
        .eq('asset_id', assetId)
        .eq('prompt', silencePrompt);

      // Save updated result
      const { error } = await supabase
        .from('video_analysis_results')
        .insert({
          asset_id: assetId,
          result: updatedResult as any,
          prompt: silencePrompt,
          language: 'en'
        });

      if (error) throw error;

      // Update local state
      setSilenceResult(updatedResult);
      setHasUnsavedSilenceChanges(false);

      toast({
        title: "Analysis Saved",
        description: "Your edited analysis results have been saved successfully"
      });

      console.log('✅ Edited silence analysis results saved to database');
    } catch (error: any) {
      console.error('Error saving edited results:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save edited results",
        variant: "destructive"
      });
    } finally {
      setSavingSilenceResults(false);
    }
  };

  const saveInsightResults = async () => {
    if (!insightResult || !assetId || !customPrompt.trim()) return;

    setSavingInsightResults(true);
    try {
      // Delete existing result for this video/prompt combination
      await supabase
        .from('video_analysis_results')
        .delete()
        .eq('asset_id', assetId)
        .eq('prompt', customPrompt);

      // Save updated result
      const { error } = await supabase
        .from('video_analysis_results')
        .insert({
          asset_id: assetId,
          result: insightResult as any,
          prompt: customPrompt,
          language: 'en'
        });

      if (error) throw error;

      setHasUnsavedInsightChanges(false);

      toast({
        title: "Insight Analysis Saved",
        description: "Your custom analysis insights have been saved successfully"
      });

      console.log('✅ Insight analysis results saved to database');
    } catch (error: any) {
      console.error('Error saving insight results:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save insight results",
        variant: "destructive"
      });
    } finally {
      setSavingInsightResults(false);
    }
  };

  const downloadSilenceAnalysis = () => {
    if (!silenceResult) return;

    const analysisData = {
      video_id: assetId,
      analysis_type: "Silent Gaps and Narrations",
      generated_at: new Date().toISOString(),
      total_segments: silenceRows.length,
      segments: silenceRows.map((row, index) => ({
        segment_number: index + 1,
        start_time: editedTimestamps[index]?.start || row.start,
        end_time: editedTimestamps[index]?.end || row.end,
        duration: msToNice(row.duration_ms),
        narration: editedNarrations[index] || row.narration,
        word_count: (editedNarrations[index] || row.narration).trim().split(/\s+/).filter(Boolean).length,
        max_words_allowed: row.max_words
      }))
    };

    const blob = new Blob([JSON.stringify(analysisData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `silence-analysis-${assetId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Complete",
      description: "Silent gaps analysis has been downloaded as JSON file"
    });
  };

  const downloadCustomAnalysis = () => {
    if (!insightResult) return;

    const analysisData = {
      video_id: assetId,
      analysis_type: "Custom Analysis Insights",
      generated_at: new Date().toISOString(),
      prompt: customPrompt,
      analysis_result: insightResult.analysis_text || "No text analysis available",
      raw_data: insightResult
    };

    const blob = new Blob([JSON.stringify(analysisData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-analysis-${assetId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Complete",
      description: "Custom analysis insights have been downloaded as JSON file"
    });
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
      const audioDescriptions: AudioDescriptionSegment[] = silenceRows.map((row, index) => {
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

  const silenceRows = useMemo(() => {
    const list = silenceResult?.silences || [];
    return list.map((s: any) => ({
      start: s.start,
      end: s.end,
      duration_ms: s.duration_ms ?? 0,
      narration: s.narration || "",
      max_words: s.max_words_allowed ?? wordsAllowed(s.duration_ms ?? 0)
    }));
  }, [silenceResult]);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card className="shadow-soft border-border">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-light text-foreground mb-2">Video Analysis</h2>
              <p className="text-muted-foreground font-light leading-relaxed max-w-2xl">
                Analyze video content for silent gaps and generate storytelling audio descriptions using AI.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Badge variant={status === 'ready' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}>
                  {status === 'idle' && 'Ready to Index'}
                  {status === 'indexing' && 'Indexing...'}
                  {status === 'ready' && 'Ready'}
                  {status === 'failed' && 'Failed'}
                </Badge>
                {loadingCachedResults && (
                  <Badge variant="outline">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Loading Cache...
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex-shrink-0 ml-6">
              <Button
                onClick={startIndexing}
                disabled={indexing || status === 'indexing'}
                size="sm"
                variant="outline"
                className="shadow-sm"
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
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Silent Gaps and Narrations Section */}
      <Card className="shadow-soft border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-light text-foreground flex items-center gap-2">
            Silent Gaps and Narrations
            {hasUnsavedSilenceChanges && (
              <Badge variant="secondary" className="text-xs font-normal">
                Unsaved Changes
              </Badge>
            )}
          </CardTitle>
          <Card className="border-primary/20 bg-primary/5 mt-3">
            <CardContent className="p-4">
              <p className="text-sm font-light leading-relaxed">
                Customize the prompt to adjust how silent gaps are detected and described. Will analyze the complete video duration (up to 1 hour) and process up to 100 silent moments for comprehensive coverage.
              </p>
            </CardContent>
          </Card>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Button
              onClick={analyzeSilences}
              disabled={status !== 'ready' || analyzingSilence}
              size="sm"
            >
              {analyzingSilence ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
            {silenceRows.length > 0 && (
              <Button
                onClick={saveSilenceResults}
                disabled={savingSilenceResults}
                size="sm"
                variant={hasUnsavedSilenceChanges ? "secondary" : "outline"}
              >
                {savingSilenceResults ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Edit3 className="w-4 h-4 mr-1" />
                )}
                {hasUnsavedSilenceChanges ? "Save Changes" : "Save Analysis"}
              </Button>
            )}
            {silenceRows.length > 0 && (
              <>
                <Button
                  onClick={() => setShowAudioDescriptionDialog(true)}
                  disabled={!videoId}
                  size="sm"
                  variant="outline"
                >
                  <AudioLines className="w-4 h-4 mr-1" />
                  Use as Audio Description
                </Button>
                <Button
                  onClick={downloadSilenceAnalysis}
                  size="sm"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download Analysis
                </Button>
              </>
            )}
          </div>
          {!videoId && silenceRows.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Video ID required to save as audio descriptions
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Analysis Prompt</label>
            <Textarea
              value={silencePrompt}
              onChange={(e) => setSilencePrompt(e.target.value)}
              className="min-h-40 font-mono text-xs bg-muted/30 border-border leading-relaxed"
              placeholder="Enter analysis prompt..."
            />
          </div>

          {!silenceResult ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Run analysis to see silent gaps and narrations.</p>
              <p className="text-xs mt-2">Use the accessibility controls in the video player to toggle these features on or off based on your preferences.</p>
            </div>
          ) : silenceRows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No silent segments found in this video.</p>
              <p className="text-xs mt-2">Use the accessibility controls in the video player to toggle these features on or off based on your preferences.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {silenceRows.map((row, i) => {
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

      {/* Custom Analysis Insights Section */}
      <Card className="shadow-soft border-border">
        <CardHeader>
          <CardTitle className="text-lg font-light text-foreground flex items-center gap-2">
            Custom Analysis Insights
            {hasUnsavedInsightChanges && (
              <Badge variant="secondary" className="text-xs font-normal">
                Unsaved Changes
              </Badge>
            )}
          </CardTitle>
          <Card className="border-primary/20 bg-primary/5 mt-3">
            <CardContent className="p-4">
              <p className="text-sm font-light leading-relaxed">
                Enter a custom prompt to extract specific insights from your video content (e.g., generate hashtags, identify themes, extract key quotes, summarize main points).
              </p>
            </CardContent>
          </Card>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Button
              onClick={analyzeInsights}
              disabled={status !== 'ready' || analyzingInsight || !customPrompt.trim()}
              size="sm"
            >
              {analyzingInsight ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Analyze with Prompt
                </>
              )}
            </Button>
            {insightResult && (
              <>
                <Button
                  onClick={saveInsightResults}
                  disabled={savingInsightResults}
                  size="sm"
                  variant={hasUnsavedInsightChanges ? "secondary" : "outline"}
                >
                  {savingInsightResults ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Edit3 className="w-4 h-4 mr-1" />
                  )}
                  {hasUnsavedInsightChanges ? "Save Changes" : "Save Analysis"}
                </Button>
                <Button
                  onClick={downloadCustomAnalysis}
                  size="sm"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download Analysis
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Custom Analysis Prompt</label>
            <p className="text-muted-foreground font-light leading-relaxed">
              Enter a custom prompt to extract specific insights from your video (e.g., generate hashtags, identify themes, extract key quotes, etc.)
            </p>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="min-h-32 leading-relaxed"
              placeholder="e.g. Generate 10 relevant hashtags for this video, or Summarize the main points discussed, or Extract all product mentions..."
            />
          </div>
          
          {!insightResult ? (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Enter a custom prompt above and click "Analyze" to generate insights.</p>
            </div>
          ) : insightResult.analysis_text ? (
            <div className="space-y-4">
              <div className="p-6 bg-muted/30 rounded-lg border border-border">
                <h4 className="font-medium mb-4 text-foreground">Analysis Result</h4>
                <div className="text-foreground font-light leading-relaxed whitespace-pre-wrap">
                  {insightResult.analysis_text}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No insights generated. Try adjusting your prompt.</p>
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
              This will convert your {silenceRows.length} analysis segments into audio descriptions for the video. 
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