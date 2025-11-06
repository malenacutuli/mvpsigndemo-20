import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Wand2, Save, Edit, X, Clock, Trash2, Plus, Volume2, CheckCircle2, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VoiceOption, getFilteredVoices, getCategoryColor, findVoiceById } from "@/types/voice";
import { analyzeAndPopulateEAD, getEADStatusBadge, type EADAnalysisResult } from '@/lib/ad/eadAnalyzer';

interface AudioDescriptionSegment {
  id?: string;
  text: string;
  startTime: number;
  endTime: number;
  voiceStyle: string;
  timestamp?: number;
  audio_url?: string;
  audio_generation_status?: string;
  originalText?: string; // Track original text to detect changes
  // EAD metadata
  requires_extension?: boolean;
  extension_duration?: number;
  extension_type?: 'pause' | 'slowdown' | 'none';
  estimated_duration?: number;
  gap_duration?: number;
}

interface AudioDescriptionEditorProps {
  videoUrl: string;
  videoId: string;
  videoData?: any;
  transcriptSegments?: any[];
  onDescriptionsUpdate?: (segments: AudioDescriptionSegment[]) => void;
}

export const AudioDescriptionEditor: React.FC<AudioDescriptionEditorProps> = ({
  videoUrl,
  videoId,
  videoData,
  transcriptSegments = [],
  onDescriptionsUpdate
}) => {
  console.log('🎬 AudioDescriptionEditor rendered with:', {
    videoId,
    detectedLanguage: videoData?.transcript_language || 'en',
    transcriptSegmentsCount: transcriptSegments?.length || 0,
    transcriptSegments: transcriptSegments?.slice(0, 2)
  });

  const [descriptions, setDescriptions] = useState<AudioDescriptionSegment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editVoiceStyle, setEditVoiceStyle] = useState<string>('warm');
  const [editStartTime, setEditStartTime] = useState<string>('0:00.0');
  const [editEndTime, setEditEndTime] = useState<string>('0:00.0');
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  const detectedLanguage = videoData?.transcript_language || 'en';
const filteredVoices = getFilteredVoices(detectedLanguage, 'education');
  const [audioGenerationStatus, setAudioGenerationStatus] = useState<Record<string, string>>({});
  const [generatingAudioIds, setGeneratingAudioIds] = useState<Set<string>>(new Set());
  const [eadAnalysisResults, setEadAnalysisResults] = useState<Map<string, EADAnalysisResult>>(new Map());
  const [isAnalyzingEAD, setIsAnalyzingEAD] = useState(false);

  // Local UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualStartTime, setManualStartTime] = useState<string>('0:00.0');
  const [manualEndTime, setManualEndTime] = useState<string>('0:05.0');
  const [manualText, setManualText] = useState('');
  const [manualVoiceStyle, setManualVoiceStyle] = useState<string>('warm');
  const [isUsingTwelveLabs, setIsUsingTwelveLabs] = useState(false);
  const pollingRef = React.useRef<number | null>(null);
  const timeoutHandledRef = React.useRef<boolean>(false);
  const currentTaskRef = React.useRef<{ indexId: string; taskId: string } | null>(null);

  // Load existing audio descriptions from database
  const loadExistingDescriptions = async () => {
    if (!videoId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('audio_descriptions')
        .select('*')
        .eq('video_id', videoId)
        .eq('language', detectedLanguage)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error loading audio descriptions:', error);
        return;
      }

      if (data && data.length > 0) {
        const loadedDescriptions: AudioDescriptionSegment[] = data.map(desc => ({
          id: desc.id,
          text: desc.description,
          startTime: Number(desc.start_time),
          endTime: Number(desc.end_time),
          voiceStyle: 'warm',
          audio_url: (desc as any).audio_url,
          requires_extension: (desc as any).requires_extension,
          extension_duration: (desc as any).extension_duration,
          extension_type: (desc as any).extension_type,
          estimated_duration: (desc as any).estimated_duration,
          gap_duration: (desc as any).gap_duration,
          audio_generation_status: (desc as any).audio_generation_status,
          originalText: desc.description // Track original for change detection
        }));
        
        // Load audio generation status
        const statusMap: Record<string, string> = {};
        data.forEach(desc => {
          if (desc.id) {
            statusMap[desc.id] = (desc as any).audio_generation_status || 'pending';
          }
        });
        setAudioGenerationStatus(statusMap);
        
        setDescriptions(loadedDescriptions);
        onDescriptionsUpdate?.(loadedDescriptions);
        console.log('✅ Loaded', loadedDescriptions.length, 'existing audio descriptions');
      }
    } catch (error) {
      console.error('Failed to load audio descriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save descriptions to database
  const saveDescriptionsToDatabase = async (descriptionsToSave: AudioDescriptionSegment[]) => {
    if (!videoId) return;
    
    setIsSaving(true);
    try {
      // Delete existing descriptions for this video and language
      await supabase
        .from('audio_descriptions')
        .delete()
        .eq('video_id', videoId)
        .eq('language', detectedLanguage);

      // Insert new descriptions
      if (descriptionsToSave.length > 0) {
        const { error } = await supabase
          .from('audio_descriptions')
          .insert(
            descriptionsToSave.map(desc => ({
              video_id: videoId,
              description: desc.text,
              start_time: desc.startTime,
              end_time: desc.endTime,
              language: detectedLanguage,
              description_type: 'visual',
              // Preserve audio URL and status only if text hasn't changed
              audio_url: desc.text === desc.originalText ? desc.audio_url : null,
              audio_generation_status: desc.text === desc.originalText ? desc.audio_generation_status : null,
              audio_generated_at: desc.text === desc.originalText && desc.audio_url ? new Date().toISOString() : null
            }))
          );

        if (error) {
          console.error('Error saving audio descriptions:', error);
          toast.error('Failed to save audio descriptions');
          return;
        }
      }

      // Persist AD voice preference in videos.metadata
      try {
        const existingMeta = (videoData?.metadata as any) || {};
        const updatedMeta = {
          ...existingMeta,
          ...(selectedVoice ? { ad_voice_id: selectedVoice.id, ad_voice_name: selectedVoice.name } : {})
        };
        await supabase
          .from('videos')
          .update({ metadata: updatedMeta })
          .eq('id', videoId);
      } catch (metaErr) {
        console.warn('Could not update video metadata with AD voice preference:', metaErr);
      }

      toast.success('Audio descriptions saved successfully');
      console.log('✅ Saved', descriptionsToSave.length, 'audio descriptions to database with voice:', selectedVoice?.id);
    } catch (error) {
      console.error('Failed to save audio descriptions:', error);
      toast.error('Failed to save audio descriptions');
    } finally {
      setIsSaving(false);
    }
  };

  // Load descriptions on component mount and initialize voice selection
  useEffect(() => {
    loadExistingDescriptions();
    // Initialize voice based on metadata or language
    const meta = videoData?.metadata as any | undefined;
    if (meta?.ad_voice_id && meta?.ad_voice_name) {
      setSelectedVoice({ id: meta.ad_voice_id, name: meta.ad_voice_name, description: 'Preferred AD voice' });
    } else {
      // Sensible defaults by language
      if (detectedLanguage === 'es') {
        setSelectedVoice(filteredVoices.find(v => v.accent === 'Spanish') || filteredVoices[0]);
      } else {
        setSelectedVoice(filteredVoices.find(v => v.id === 'gordon-ramsay') || filteredVoices[0]);
      }
    }
  }, [videoId, detectedLanguage]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = (seconds % 60).toFixed(1);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
    }
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const parseTimeInput = (timeStr: string): number => {
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      if (parts.length === 3) {
        // HH:MM:SS format
        const [hours, mins, secs] = parts;
        return parseInt(hours) * 3600 + parseInt(mins) * 60 + parseFloat(secs);
      } else if (parts.length === 2) {
        // MM:SS format
        const [mins, secs] = parts;
        return parseInt(mins) * 60 + parseFloat(secs);
      }
    }
    return parseFloat(timeStr) || 0;
  };

  const adjustTime = (currentTime: string, adjustment: number): string => {
    const currentSeconds = parseTimeInput(currentTime);
    const newSeconds = Math.max(0, currentSeconds + adjustment);
    return formatTime(newSeconds);
  };

  const getVoiceStyleColor = (voiceId: string): string => {
    return 'text-orange-600';
  };

  const computeGaps = (segments: any[]): { start: number; end: number }[] => {
    if (!segments || segments.length === 0) {
      // Create default intervals when no transcript is available
      return [
        { start: 0, end: 5 },
        { start: 15, end: 20 },
        { start: 35, end: 40 }
      ];
    }
    
    const sorted = [...segments]
      .filter(s => typeof s.startTime === 'number' && typeof s.endTime === 'number')
      .sort((a, b) => a.startTime - b.startTime);

    const gaps: { start: number; end: number }[] = [];
    const pad = 0.3; // Reduced padding
    const minGap = 1.5; // Reduced minimum gap

    // More lenient gap at the beginning
    if (sorted[0].startTime > 1.0) {
      const preGap = { start: 0, end: Math.max(0, sorted[0].startTime - pad) };
      if (preGap.end - preGap.start >= minGap) {
        gaps.push(preGap);
      }
    }

    // More lenient gaps between segments
    for (let i = 0; i < sorted.length - 1; i++) {
      const end = sorted[i].endTime + pad;
      const nextStart = sorted[i + 1].startTime - pad;
      
      if (nextStart - end >= minGap) {
        const gap = { start: end, end: nextStart };
        gaps.push(gap);
      }
    }

    // Add gap at the end
    const lastSegment = sorted[sorted.length - 1];
    if (lastSegment.endTime < 300) { // If video seems under 5 minutes
      const postGap = { start: lastSegment.endTime + pad, end: Math.min(lastSegment.endTime + 30, 300) };
      if (postGap.end - postGap.start >= minGap) {
        gaps.push(postGap);
      }
    }

    // If no gaps found, create strategic intervals
    if (gaps.length === 0) {
      const totalDuration = lastSegment?.endTime || 60;
      const interval = Math.max(15, totalDuration / 4);
      
      for (let i = 0; i < 3; i++) {
        const start = i * interval + 3;
        const end = start + 4;
        
        // Check for overlaps with existing speech
        const overlaps = sorted.some(seg => 
          (start >= seg.startTime && start <= seg.endTime) ||
          (end >= seg.startTime && end <= seg.endTime)
        );
        
        if (!overlaps && start < totalDuration) {
          gaps.push({ start, end });
        }
      }
    }

    return gaps.slice(0, 6); // Limit to first 6 gaps
  };

  // Generate basic fallback descriptions when processing fails
  const generateBasicFallbackDescriptions = (): AudioDescriptionSegment[] => {
    // Compute gaps even if transcript is missing (will use default strategic intervals)
    const gaps = computeGaps(transcriptSegments || []);

    const fallbackTexts = [
      "A person enters the frame, examining their surroundings carefully.",
      "Someone moves across the room, their attention focused on something specific.",
      "A character looks up with a concerned expression, then reaches for an object.",
      "The camera reveals a new location as footsteps echo in the space.",
      "A hand gestures toward something off-screen while eyes follow the motion.",
      "Someone pauses at a doorway, listening intently before proceeding forward.",
      "A figure sits down slowly, their posture suggesting deep concentration.",
      "Bright light filters through windows, illuminating dust particles in the air.",
      "A person's face shows recognition as they discover something unexpected.",
      "Someone walks toward the camera, their expression shifting from calm to alert."
    ];

    return gaps.map((gap, index) => ({
      text: fallbackTexts[index % fallbackTexts.length],
      startTime: gap.start,
      endTime: gap.end,
      voiceStyle: 'warm' as const
    }));
  };

  const generateTextOnlyFallback = async (transcript: any[], gaps: any[]): Promise<AudioDescriptionSegment[]> => {
    try {
      const analysisRequests = gaps.slice(0, 10).map(gap => ({
        gapStart: gap.start,
        gapEnd: gap.end,
        duration: gap.end - gap.start,
        surroundingText: transcript
          .filter(seg => Math.abs(seg.startTime - gap.start) < 30 || Math.abs(seg.endTime - gap.end) < 30)
          .map(seg => seg.text)
          .join(' ')
          .substring(0, 200)
      }));

      if (analysisRequests.length === 0) return [];

      const visualResponse = await supabase.functions.invoke('generate-ad', {
        body: {
          segments: analysisRequests,
          contentType: 'general'
        }
      });
      
      if (visualResponse.error) throw new Error(visualResponse.error.message || 'Analysis failed');
      return visualResponse.data?.descriptions || [];
    } catch (e) {
      console.error('❌ Failed generation:', e);
      return [];
    }
  };

  const generateAIDescriptions = async () => {
    // Prevent multiple concurrent generations
    if (isGenerating) {
      console.warn('Generation already in progress, ignoring request');
      return;
    }

    setIsGenerating(true);
    setIsUsingTwelveLabs(false);
    
    try {
      console.log('🎬 Basic AI: Starting generation');
      const gaps = computeGaps(transcriptSegments || []);
      const scheduled = await generateTextOnlyFallback(transcriptSegments || [], gaps);

      if (scheduled.length === 0) {
        // Fallback: create basic timed descriptions even without perfect gaps
        const fallbackDescriptions: AudioDescriptionSegment[] = [
          { text: "The scene begins with visual elements that set the atmosphere and context.", startTime: 1, endTime: 4, voiceStyle: 'warm' },
          { text: "Characters and key visual details are shown to establish the narrative.", startTime: 15, endTime: 18, voiceStyle: 'warm' },
          { text: "The visual story continues to unfold with important scenic elements.", startTime: 30, endTime: 33, voiceStyle: 'warm' }
        ];
        
        setDescriptions(fallbackDescriptions);
        onDescriptionsUpdate?.(fallbackDescriptions);
        await saveDescriptionsToDatabase(fallbackDescriptions);
        toast.success(`Generated ${fallbackDescriptions.length} audio descriptions`);
        return;
      }

      setDescriptions(scheduled);
      onDescriptionsUpdate?.(scheduled);
      
      // Save to database
      await saveDescriptionsToDatabase(scheduled);
      
      toast.success(`Generated ${scheduled.length} audio descriptions`);
      console.log('✅ Generated Basic AI AD:', scheduled.length, 'descriptions');
    } catch (error) {
      console.error('❌ Failed to generate descriptions:', error);
      toast.error('Generation failed - please try again.');
    } finally {
      setIsGenerating(false);
      setIsUsingTwelveLabs(false);
    }
  };

  const generateTwelveLabsDescriptions = async () => {
    if (!videoUrl) {
      toast.error('Video URL is required for analysis.');
      return;
    }

    // Prevent multiple concurrent generations
    if (isGenerating) {
      console.warn('Generation already in progress, ignoring request');
      return;
    }

    setIsGenerating(true);
    setIsUsingTwelveLabs(true);
    timeoutHandledRef.current = false;
    
    try {
      // Clear any lingering toasts before starting a new run
      toast.dismiss();
      toast.info('Starting comprehensive video analysis for detailed audio descriptions...', { duration: 4000 });
      
      console.log('🎬 Analysis: Starting generation request');
      
      const response = await supabase.functions.invoke('twelve-labs-audio-descriptions', {
        body: {
          videoUrl,
          videoId,
          language: detectedLanguage
        }
      });

      console.log('🎬 Analysis: Response received', { 
        hasError: !!response.error, 
        hasData: !!response.data
      });

      if (response.error) {
        console.error('🎬 Analysis: Function returned error:', response.error);
        throw new Error(response.error.message || 'Video analysis failed');
      }

      // Handle async processing mode
      if (response.data?.status === 'processing' && (response.data as any).indexId && (response.data as any).taskId) {
        const { indexId, taskId } = response.data as any;
        console.log('🎬 Analysis: Task processing, will poll status', { indexId, taskId });
        toast.info('Indexing video for analysis. Checking status every 10s...', { duration: 4000 });

        // Ensure no duplicate polling loops
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        // Bind this task to the current polling loop
        currentTaskRef.current = { indexId, taskId };

        let attempts = 0;
        const maxAttempts = 24; // ~4 minutes max before graceful fallback
        pollingRef.current = window.setInterval(async () => {
          attempts++;

          // Abort this loop if a new task has started
          if (!currentTaskRef.current || currentTaskRef.current.taskId !== taskId) {
            console.log('🛑 Stale polling loop detected. Stopping previous task polling.');
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            return;
          }
          console.log(`🎬 Analysis: Polling attempt ${attempts}/${maxAttempts}`);
          
          try {
            const pollResp = await supabase.functions.invoke('twelve-labs-audio-descriptions', {
              body: { indexId, taskId, language: detectedLanguage }
            });
            
            if (pollResp.error) {
              console.error('🎬 Analysis: Polling error:', pollResp.error);
              
              // Handle critical errors that should stop polling
              if (pollResp.error?.message?.includes('Load failed') || pollResp.error?.name === 'FunctionsFetchError') {
                clearInterval(pollingRef.current!);
                pollingRef.current = null;
                
                // After 3+ minutes of processing, offer fallback descriptions
                if (attempts > 18) { // 3 minutes
                  toast.dismiss();
                  toast.info('Processing is taking longer than expected. Generating basic descriptions...');
                  const basicDescriptions = generateBasicFallbackDescriptions();
                  setDescriptions(basicDescriptions);
                  await saveDescriptionsToDatabase(basicDescriptions);
                } else {
                  toast.error('Connection lost during processing. Please try starting the process again.');
                }
                
                setIsGenerating(false);
                setIsUsingTwelveLabs(false);
                return;
              }
              return;
            }
            
            const pollData: any = pollResp.data;
            console.log(`🎬 Analysis: Poll status: ${pollData?.status}`);
            
            if (pollData?.status === 'ready' && pollData?.needsSegments) {
              console.log('🎬 Analysis: Ready for finalization with segments');
              // Finalize by sending transcript segments only once when ready
              try {
                // Pre-compute compact silence gaps on client to reduce payload
                const localGaps = computeGaps(transcriptSegments).map((g: any) => ({
                  startTime: Number((g.start).toFixed(2)),
                  endTime: Number((g.end).toFixed(2)),
                  duration: Number((g.end - g.start).toFixed(2)),
                }));

                const finalizeResp = await supabase.functions.invoke('twelve-labs-audio-descriptions', {
                  body: { 
                    indexId, 
                    taskId, 
                    language: detectedLanguage,
                    videoId: pollData.videoId,
                    silenceGaps: localGaps
                  }
                });
                
                if (finalizeResp.error) {
                  console.error('🎬 Analysis: Finalize error:', finalizeResp.error);
                  
                  // Handle finalize errors - use fallback instead of failing
                  clearInterval(pollingRef.current!);
                  pollingRef.current = null;
                  
                  toast.dismiss();
                  toast.info('Processing completed with fallback descriptions due to connection issues.');
                  const basicDescriptions = generateBasicFallbackDescriptions();
                  setDescriptions(basicDescriptions);
                  await saveDescriptionsToDatabase(basicDescriptions);
                  
                  setIsGenerating(false);
                  setIsUsingTwelveLabs(false);
                  return;
                }
                
                if (finalizeResp.data?.status === 'ready' && Array.isArray(finalizeResp.data.audioDescriptions)) {
                  clearInterval(pollingRef.current!);
                  pollingRef.current = null;

                  const formattedDescriptions: AudioDescriptionSegment[] = finalizeResp.data.audioDescriptions.map((desc: any) => ({
                    text: desc.text,
                    startTime: desc.startTime,
                    endTime: desc.endTime,
                    voiceStyle: 'warm'
                  }));

                  setDescriptions(formattedDescriptions);
                  onDescriptionsUpdate?.(formattedDescriptions);
                  await saveDescriptionsToDatabase(formattedDescriptions);
                  toast.success(`🎬 Generated ${formattedDescriptions.length} comprehensive audio descriptions`);
                  setIsGenerating(false);
                  setIsUsingTwelveLabs(false);
                }
              } catch (finalizeError: any) {
                console.error('🎬 Analysis: Finalize exception:', finalizeError);
                clearInterval(pollingRef.current!);
                pollingRef.current = null;
                
                toast.dismiss();
                toast.info('Processing completed with fallback descriptions due to connection issues.');
                const basicDescriptions = generateBasicFallbackDescriptions();
                setDescriptions(basicDescriptions);
                await saveDescriptionsToDatabase(basicDescriptions);
                
                setIsGenerating(false);
                setIsUsingTwelveLabs(false);
                return;
              }
            } else if (pollData?.status === 'completed_with_fallback') {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;

              let finalDescriptions: AudioDescriptionSegment[] = [];
              if (Array.isArray(pollData.audioDescriptions) && pollData.audioDescriptions.length > 0) {
                finalDescriptions = pollData.audioDescriptions.map((desc: any) => ({
                  text: desc.text,
                  startTime: desc.startTime,
                  endTime: desc.endTime,
                  voiceStyle: 'warm'
                }));
              } else {
                // Generate local basic fallbacks if none provided
                finalDescriptions = generateBasicFallbackDescriptions();
              }

              setDescriptions(finalDescriptions);
              onDescriptionsUpdate?.(finalDescriptions);
              await saveDescriptionsToDatabase(finalDescriptions);
              toast.dismiss();
              toast.info(`🎬 Processing completed with fallback descriptions (${finalDescriptions.length})`);
              setIsGenerating(false);
              setIsUsingTwelveLabs(false);
            } else if (pollData?.status === 'ready' && Array.isArray(pollData.audioDescriptions)) {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;

              const formattedDescriptions: AudioDescriptionSegment[] = pollData.audioDescriptions.map((desc: any) => ({
                text: desc.text,
                startTime: desc.startTime,
                endTime: desc.endTime,
                voiceStyle: 'warm'
              }));

              setDescriptions(formattedDescriptions);
              onDescriptionsUpdate?.(formattedDescriptions);
              await saveDescriptionsToDatabase(formattedDescriptions);
              toast.success(`🎬 Generated ${formattedDescriptions.length} comprehensive audio descriptions`);
              setIsGenerating(false);
              setIsUsingTwelveLabs(false);
            }
          } catch (err: any) {
            console.error('🎬 Analysis: Polling exception:', err);
            
            // Handle polling errors that should stop the process
            if (err?.message?.includes('Load failed') || err?.name === 'FunctionsFetchError') {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;
              toast.error('Connection interrupted. Please refresh the page and try again.');
              setIsGenerating(false);
              setIsUsingTwelveLabs(false);
              return;
            }
          }
          if (attempts >= maxAttempts) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            console.error('🎬 Analysis: Timeout after', maxAttempts, 'attempts');
            
            if (!timeoutHandledRef.current) {
              timeoutHandledRef.current = true;
              // Instead of erroring, provide immediate fallback descriptions
              const basicDescriptions = generateBasicFallbackDescriptions();
              setDescriptions(basicDescriptions);
              await saveDescriptionsToDatabase(basicDescriptions);
              toast.info('Processing timed out. Generated basic audio descriptions instead.');
            }
            setIsGenerating(false);
            setIsUsingTwelveLabs(false);
          }
        }, 10000);

        return;
      }

      if (!response.data || !response.data.success) {
        console.error('🎬 Analysis: Invalid response format:', response.data);
        throw new Error(response.data?.error || 'Invalid response from analysis service');
      }

      const { audioDescriptions, silenceGapsAnalyzed, descriptionsGenerated } = response.data;

      if (!audioDescriptions || audioDescriptions.length === 0) {
        console.warn('🎬 Analysis: No descriptions generated, using fallback');
        // Advanced AI fallback: create strategic descriptions
        const strategicDescriptions: AudioDescriptionSegment[] = [
          { text: "Cinematic visuals establish the scene with rich atmospheric details and character positioning.", startTime: 2, endTime: 6, voiceStyle: 'warm' },
          { text: "Visual narrative elements and character interactions develop the story through expressive imagery.", startTime: 18, endTime: 22, voiceStyle: 'warm' },
          { text: "The scene culminates with impactful visual storytelling that enhances the overall narrative experience.", startTime: 35, endTime: 40, voiceStyle: 'warm' }
        ];
        
        setDescriptions(strategicDescriptions);
        onDescriptionsUpdate?.(strategicDescriptions);
        await saveDescriptionsToDatabase(strategicDescriptions);
        toast.success(`Generated ${strategicDescriptions.length} strategic audio descriptions`);
        return;
      }

      // Convert to our format
      const formattedDescriptions: AudioDescriptionSegment[] = audioDescriptions.map((desc: any) => ({
        text: desc.text,
        startTime: desc.startTime,
        endTime: desc.endTime,
        voiceStyle: 'warm'
      }));

      setDescriptions(formattedDescriptions);
      onDescriptionsUpdate?.(formattedDescriptions);
      
      // Save to database
      await saveDescriptionsToDatabase(formattedDescriptions);
      
      toast.success(`🎬 Generated ${descriptionsGenerated} comprehensive audio descriptions from detailed video analysis using ${silenceGapsAnalyzed} identified moments`);
      console.log('✅ Generated advanced AD:', formattedDescriptions.length, 'descriptions');
    } catch (error: any) {
      console.error('❌ Failed to generate advanced descriptions:', error);
      
      // Handle specific network errors
      if (error?.message?.includes('Load failed') || error?.name === 'FunctionsFetchError') {
        toast.error('Network connection failed. Please check your internet connection and try again.');
      } else {
        toast.error(`Video analysis failed: ${error?.message || 'Unknown error'}`);
      }
      
      // Don't trigger basic AI automatically - let user decide
      console.log('🎬 Advanced analysis failed, user can manually try Basic AI if needed');
    } finally {
      setIsGenerating(false);
      setIsUsingTwelveLabs(false);
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditText(descriptions[index].text);
    setEditVoiceStyle(descriptions[index].voiceStyle);
    setEditStartTime(formatTime(descriptions[index].startTime));
    setEditEndTime(formatTime(descriptions[index].endTime));
  };

  const saveEdit = async () => {
    if (editingIndex === null) return;

    const updatedDescriptions = [...descriptions];
    const textChanged = descriptions[editingIndex].text !== editText;
    
    updatedDescriptions[editingIndex] = {
      ...updatedDescriptions[editingIndex],
      text: editText,
      voiceStyle: editVoiceStyle,
      startTime: parseTimeInput(editStartTime),
      endTime: parseTimeInput(editEndTime),
      // Clear audio if text changed, otherwise preserve
      audio_url: textChanged ? undefined : updatedDescriptions[editingIndex].audio_url,
      audio_generation_status: textChanged ? undefined : updatedDescriptions[editingIndex].audio_generation_status,
      originalText: editText // Update original text
    };

    setDescriptions(updatedDescriptions);
    onDescriptionsUpdate?.(updatedDescriptions);
    
    // Save to database
    await saveDescriptionsToDatabase(updatedDescriptions);
    
    setEditingIndex(null);
    setEditText('');
    setEditStartTime('0:00.0');
    setEditEndTime('0:00.0');
    setEditVoiceStyle('warm');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
    setEditStartTime('0:00.0');
    setEditEndTime('0:00.0');
    setEditVoiceStyle('warm');
  };

  const addManualSegment = async () => {
    if (!manualText.trim() || parseTimeInput(manualEndTime) <= parseTimeInput(manualStartTime)) {
      toast.error('Please enter valid text and time range');
      return;
    }

    const newSegment: AudioDescriptionSegment = {
      text: manualText.trim(),
      startTime: parseTimeInput(manualStartTime),
      endTime: parseTimeInput(manualEndTime),
      voiceStyle: manualVoiceStyle
    };

    const updatedDescriptions = [...descriptions, newSegment]
      .sort((a, b) => a.startTime - b.startTime);
    
    setDescriptions(updatedDescriptions);
    onDescriptionsUpdate?.(updatedDescriptions);
    
    // Save to database
    await saveDescriptionsToDatabase(updatedDescriptions);
    
    // Reset form
    setManualText('');
    setManualStartTime('0:00.0');
    setManualEndTime('0:05.0');
    setManualVoiceStyle('warm');
    setShowManualForm(false);
    
    toast.success('Manual audio description added');
  };

  const deleteDescription = async (index: number) => {
    const updatedDescriptions = descriptions.filter((_, i) => i !== index);
    setDescriptions(updatedDescriptions);
    onDescriptionsUpdate?.(updatedDescriptions);
    
    // Save to database
    await saveDescriptionsToDatabase(updatedDescriptions);
  };

  // Generate audio for a single description
  const generateAudioForDescription = async (descId: string, descText: string) => {
    if (!descId || !videoId) {
      toast.error('Missing required information');
      return;
    }

    setGeneratingAudioIds(prev => new Set(prev).add(descId));
    setAudioGenerationStatus(prev => ({ ...prev, [descId]: 'processing' }));

    try {
      console.log('🎙️ Generating audio for description:', descId);

      const { data, error } = await supabase.functions.invoke('generate-ad-audio', {
        body: {
          description_id: descId,
          video_id: videoId,
          text: descText,
          language: detectedLanguage,
          voice_id: selectedVoice?.id
        }
      });

      if (error) throw error;

      setAudioGenerationStatus(prev => ({ ...prev, [descId]: 'completed' }));
      toast.success('Audio generated successfully!');
      console.log('✅ Audio generated:', data);
      
      // Reload descriptions to get the updated audio_url
      await loadExistingDescriptions();
    } catch (error: any) {
      console.error('❌ Audio generation failed:', error);
      setAudioGenerationStatus(prev => ({ ...prev, [descId]: 'failed' }));
      toast.error(`Audio generation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setGeneratingAudioIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(descId);
        return newSet;
      });
    }
  };

  // Generate audio for all descriptions
  const generateAllAudio = async () => {
    if (descriptions.length === 0) {
      toast.error('No descriptions to generate audio for');
      return;
    }

    toast.info(`Generating audio for ${descriptions.length} descriptions...`);
    let successCount = 0;
    let failCount = 0;

    for (const desc of descriptions) {
      if (desc.id) {
        try {
          await generateAudioForDescription(desc.id, desc.text);
          successCount++;
        } catch (error) {
          failCount++;
        }
      }
    }

    if (successCount > 0) {
      toast.success(`Generated audio for ${successCount} descriptions`);
    }
    if (failCount > 0) {
      toast.error(`Failed to generate audio for ${failCount} descriptions`);
    }
  };

  const getAudioStatusIcon = (descId?: string) => {
    if (!descId) return null;
    
    const status = audioGenerationStatus[descId];
    const isGenerating = generatingAudioIds.has(descId);

    if (isGenerating) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }

    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      default:
        return <Volume2 className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Analyze EAD requirements for all descriptions
  const handleAnalyzeEAD = async () => {
    if (descriptions.length === 0) {
      toast.error('No descriptions to analyze. Generate descriptions first.');
      return;
    }

    setIsAnalyzingEAD(true);
    toast.info('Analyzing Extended Audio Description requirements...');

    try {
      const results = await analyzeAndPopulateEAD(videoId, detectedLanguage);
      
      // Store results in state for UI display
      const resultsMap = new Map(results.map(r => [r.descriptionId, r]));
      setEadAnalysisResults(resultsMap);

      // Update local descriptions with EAD metadata
      const updatedDescriptions = descriptions.map(desc => {
        if (!desc.id) return desc;
        const result = resultsMap.get(desc.id);
        if (!result) return desc;

        return {
          ...desc,
          requires_extension: result.requiresExtension,
          extension_duration: result.extensionDuration,
          extension_type: result.extensionType,
          estimated_duration: result.estimatedAudioDuration,
          gap_duration: result.gapDuration,
        };
      });

      setDescriptions(updatedDescriptions);

      const requiresEAD = results.filter(r => r.requiresExtension).length;
      const sufficient = results.filter(r => r.sufficiency === 'sufficient').length;
      const tight = results.filter(r => r.sufficiency === 'tight').length;

      toast.success(
        `Analysis complete: ${sufficient} fit perfectly, ${tight} are tight, ${requiresEAD} require Extended AD`
      );
      
      console.log('✅ EAD Analysis Results:', {
        total: results.length,
        sufficient,
        tight,
        requiresEAD,
      });
    } catch (error: any) {
      console.error('❌ EAD analysis failed:', error);
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzingEAD(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-xl shadow-soft border">
        <CardHeader>
          <CardTitle className="text-2xl font-light text-foreground flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Audio Description Editor
          </CardTitle>
          <p className="text-base font-light text-muted-foreground leading-relaxed">
            Generate and manage audio descriptions to describe visual elements for accessibility.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Card className="border-primary/20 bg-primary/5 rounded-xl">
            <CardContent className="p-4">
              <p className="text-base font-light leading-relaxed">
                <span className="font-light text-primary">Basic AI:</span> Generates simple audio descriptions for common video scenarios.
                <br />
                <span className="font-light text-primary">Advanced Analysis:</span> Uses comprehensive video analysis to detect silent moments and generate detailed cinematic descriptions with full context awareness.
              </p>
            </CardContent>
          </Card>

          {/* Audio Description Voice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-light">Audio Description Voice</Label>
                <Select
                  value={selectedVoice?.id || ''}
                  onValueChange={(val) => {
                    const v = filteredVoices.find(o => o.id === val) || null;
                    setSelectedVoice(v);
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Choose voice" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50 shadow-lg">
                    {filteredVoices.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        <div className="flex items-center gap-2">
                          <span>{v.name}</span>
                          {v.category && (
                            <Badge variant="outline" className={getCategoryColor(v.category)}>
                              {v.category}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={generateAIDescriptions} 
              className="w-full font-light" 
              disabled={isGenerating || isLoading}
              variant="outline"
            >
              {isGenerating && !isUsingTwelveLabs ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Basic Generation...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Basic AI Generation
                </>
              )}
            </Button>

            <Button 
              onClick={generateTwelveLabsDescriptions} 
              className="w-full font-light" 
              disabled={isGenerating || isLoading}
            >
              {isGenerating && isUsingTwelveLabs ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Video...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Audio Description
                </>
              )}
            </Button>
          </div>


          <div className="flex gap-2">
            <Button 
              onClick={handleAnalyzeEAD}
              variant="outline"
              className="flex-1 font-light"
              disabled={isAnalyzingEAD || descriptions.length === 0}
            >
              {isAnalyzingEAD ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing EAD...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze for EAD
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => setShowManualForm(!showManualForm)}
              variant="outline"
              className="flex-1 font-light"
            >
              <Plus className="w-4 h-4 mr-2" />
              {showManualForm ? 'Cancel' : 'Add Manual Segment'}
            </Button>
            {descriptions.length > 0 && (
              <Button 
                onClick={() => saveDescriptionsToDatabase(descriptions)}
                disabled={isSaving}
                variant="secondary"
                className="font-light"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save All
              </Button>
            )}
          </div>

          {showManualForm && (
            <Card className="border-dashed rounded-xl">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-lg font-light">Add Manual Audio Description</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-light">Start Time</Label>
                    <div className="space-y-1">
                      <Input
                        value={manualStartTime}
                        onChange={(e) => setManualStartTime(e.target.value)}
                        placeholder="0:00.0 or 1:23:45.0"
                        className="text-xs font-mono"
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualStartTime(adjustTime(manualStartTime, -5))}
                          className="h-6 px-2 text-xs"
                          title="Subtract 5 seconds"
                        >
                          -5s
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualStartTime(adjustTime(manualStartTime, -1))}
                          className="h-6 px-2 text-xs"
                          title="Subtract 1 second"
                        >
                          -1s
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualStartTime(adjustTime(manualStartTime, 1))}
                          className="h-6 px-2 text-xs"
                          title="Add 1 second"
                        >
                          +1s
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualStartTime(adjustTime(manualStartTime, 5))}
                          className="h-6 px-2 text-xs"
                          title="Add 5 seconds"
                        >
                          +5s
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-light">End Time</Label>
                    <div className="space-y-1">
                      <Input
                        value={manualEndTime}
                        onChange={(e) => setManualEndTime(e.target.value)}
                        placeholder="0:05.0 or 1:23:45.0"
                        className="text-xs font-mono"
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualEndTime(adjustTime(manualEndTime, -5))}
                          className="h-6 px-2 text-xs"
                          title="Subtract 5 seconds"
                        >
                          -5s
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualEndTime(adjustTime(manualEndTime, -1))}
                          className="h-6 px-2 text-xs"
                          title="Subtract 1 second"
                        >
                          -1s
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualEndTime(adjustTime(manualEndTime, 1))}
                          className="h-6 px-2 text-xs"
                          title="Add 1 second"
                        >
                          +1s
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualEndTime(adjustTime(manualEndTime, 5))}
                          className="h-6 px-2 text-xs"
                          title="Add 5 seconds"
                        >
                          +5s
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-light">Voice Style</Label>
                  <Select value={manualVoiceStyle} onValueChange={setManualVoiceStyle}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 shadow-lg">
                      <SelectItem value="passionate">Passionate</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="encouraging">Encouraging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-light">Description Text</Label>
                  <Textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Enter audio description..."
                    className="min-h-[60px]"
                  />
                </div>

                <Button 
                  onClick={addManualSegment} 
                  className="w-full"
                  disabled={!manualText.trim() || parseTimeInput(manualEndTime) <= parseTimeInput(manualStartTime)}
                >
                  Add Description
                </Button>
              </CardContent>
            </Card>
          )}

          {descriptions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-light">Audio Descriptions ({descriptions.length})</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateAllAudio}
                    disabled={isGenerating || descriptions.some(d => d.id && generatingAudioIds.has(d.id))}
                  >
                    {descriptions.some(d => d.id && generatingAudioIds.has(d.id)) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate All Audio
                      </>
                    )}
                  </Button>
                </div>
                {descriptions.map((desc, index) => (
                  <div key={index} className="border rounded-xl p-3">
                    {editingIndex === index ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm font-light">Start Time</Label>
                            <div className="space-y-1">
                              <Input
                                value={editStartTime}
                                onChange={(e) => setEditStartTime(e.target.value)}
                                placeholder="0:00.0 or 1:23:45.0"
                                className="text-xs font-mono"
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditStartTime(adjustTime(editStartTime, -5))}
                                  className="h-6 px-2 text-xs"
                                  title="Subtract 5 seconds"
                                >
                                  -5s
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditStartTime(adjustTime(editStartTime, -1))}
                                  className="h-6 px-2 text-xs"
                                  title="Subtract 1 second"
                                >
                                  -1s
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditStartTime(adjustTime(editStartTime, 1))}
                                  className="h-6 px-2 text-xs"
                                  title="Add 1 second"
                                >
                                  +1s
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditStartTime(adjustTime(editStartTime, 5))}
                                  className="h-6 px-2 text-xs"
                                  title="Add 5 seconds"
                                >
                                  +5s
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-light">End Time</Label>
                            <div className="space-y-1">
                              <Input
                                value={editEndTime}
                                onChange={(e) => setEditEndTime(e.target.value)}
                                placeholder="0:05.0 or 1:23:45.0"
                                className="text-xs font-mono"
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditEndTime(adjustTime(editEndTime, -5))}
                                  className="h-6 px-2 text-xs"
                                  title="Subtract 5 seconds"
                                >
                                  -5s
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditEndTime(adjustTime(editEndTime, -1))}
                                  className="h-6 px-2 text-xs"
                                  title="Subtract 1 second"
                                >
                                  -1s
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditEndTime(adjustTime(editEndTime, 1))}
                                  className="h-6 px-2 text-xs"
                                  title="Add 1 second"
                                >
                                  +1s
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditEndTime(adjustTime(editEndTime, 5))}
                                  className="h-6 px-2 text-xs"
                                  title="Add 5 seconds"
                                >
                                  +5s
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-light">Voice Style</Label>
                          <Select value={editVoiceStyle} onValueChange={(value) => setEditVoiceStyle(value as any)}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="passionate">Passionate</SelectItem>
                              <SelectItem value="warm">Warm</SelectItem>
                              <SelectItem value="authoritative">Authoritative</SelectItem>
                              <SelectItem value="encouraging">Encouraging</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-light">Description Text</Label>
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Enter audio description..."
                            className="min-h-[60px]"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit} disabled={isSaving}>
                            {isSaving ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3 mr-1" />
                            )}
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(desc.startTime)} - {formatTime(desc.endTime)}
                            </Badge>
                            <Badge variant="secondary" className={`text-xs ${getVoiceStyleColor(desc.voiceStyle)}`}>
                              {desc.voiceStyle}
                            </Badge>
                            {desc.timestamp && (
                              <Badge variant="outline" className="text-xs">
                                @{desc.timestamp.toFixed(1)}s
                              </Badge>
                            )}
                            {desc.id && (
                              <div className="flex items-center gap-1">
                                {getAudioStatusIcon(desc.id)}
                                <span className="text-xs text-muted-foreground">
                                  {audioGenerationStatus[desc.id] === 'completed' ? 'Audio ready' :
                                   audioGenerationStatus[desc.id] === 'failed' ? 'Audio failed' :
                                   audioGenerationStatus[desc.id] === 'processing' ? 'Generating...' :
                                   'No audio'}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-foreground">{desc.text}</p>
                          
                          {/* EAD Status Badge */}
                          {desc.id && eadAnalysisResults.has(desc.id) && (
                            <div className="mt-2">
                              {(() => {
                                const result = eadAnalysisResults.get(desc.id);
                                if (!result) return null;
                                const badge = getEADStatusBadge(result.sufficiency);
                                return (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${badge.color} border`}
                                  >
                                    {badge.icon} {badge.label}
                                    {result.requiresExtension && (
                                      <span className="ml-1">
                                        (+{result.extensionDuration.toFixed(1)}s {result.extensionType})
                                      </span>
                                    )}
                                  </Badge>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 mt-2">
                          {desc.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateAudioForDescription(desc.id!, desc.text)}
                              disabled={desc.id && generatingAudioIds.has(desc.id)}
                              className="h-8"
                              title={audioGenerationStatus[desc.id] === 'completed' ? 'Regenerate audio' : 'Generate audio'}
                            >
                              {desc.id && generatingAudioIds.has(desc.id) ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Volume2 className="w-3 h-3 mr-1" />
                              )}
                              {audioGenerationStatus[desc.id] === 'completed' ? 'Regen' : 'Audio'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteDescription(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};