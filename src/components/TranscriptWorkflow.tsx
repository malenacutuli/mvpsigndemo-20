import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Save, Edit, Play, Download, CheckCircle, Users, Volume2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CaptionSegment } from './CaptionsWithIntention';
import { CharacterManager } from './CharacterManager';
import { WordLevelEditor } from './WordLevelEditor';
import { AudioDescriptionEditor } from './AudioDescriptionEditor';

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker: string;
  speakerColor: string;
  emphasis: 'normal' | 'loud' | 'quiet' | 'yelling';
  pitch: 'normal' | 'high' | 'low';
  words?: Array<{
    text: string;
    emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling';
    pitch?: 'high' | 'low' | 'normal';
  }>;
}

interface TranscriptWorkflowProps {
  videoId: string;
  videoUrl: string;
  videoLanguage?: string; // Add video language prop
  onTranscriptReady: (segments: CaptionSegment[]) => void;
  onWorkflowComplete: () => void;
  onCharactersUpdate?: (characters: any[]) => void;
  onAudioDescriptionsUpdate?: (descriptions: any[]) => void;
}

export const TranscriptWorkflow: React.FC<TranscriptWorkflowProps> = ({
  videoId,
  videoUrl,
  videoLanguage,
  onTranscriptReady,
  onWorkflowComplete,
  onCharactersUpdate,
  onAudioDescriptionsUpdate
}) => {
  const [currentStep, setCurrentStep] = useState<'loading' | 'extract' | 'edit' | 'save' | 'complete'>('loading');
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingLock, setSavingLock] = useState(false); // Prevent concurrent saves
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wordEditingId, setWordEditingId] = useState<string | null>(null);
  const [extractionComplete, setExtractionComplete] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [characters, setCharacters] = useState<any[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string>(videoLanguage || 'en'); // Initialize with video language
  const [extractionMethod, setExtractionMethod] = useState<'whisper' | 'twelvelabs'>('twelvelabs');
  const { toast } = useToast();

  useEffect(() => {
    // Load existing transcript, audio descriptions, and characters if available
    console.log('🔄 TranscriptWorkflow - Loading existing video data for:', videoId);
    console.log('🔄 TranscriptWorkflow - Video language:', videoLanguage);
    
    // Reset state when switching videos
    setSegments([]);
    setCurrentStep('loading');
    setExtractionComplete(false);
    setEditingId(null);
    setWordEditingId(null);
    setCharacters([]);
    setAudioDescriptions([]);
    setDetectedLanguage(videoLanguage || 'en');
    setIsLoadingExisting(true);
    
    // Load existing data for this video
    loadExistingTranscript();
  }, [videoId, videoLanguage]); // Re-run when videoId OR videoLanguage changes

  useEffect(() => {
    // Auto-convert segments to captions when they're loaded/updated
    if (segments.length > 0 && !isSaving) {
      console.log('🔄 Auto-converting segments to captions:', segments.length, 'segments');
      
      const captionSegments: CaptionSegment[] = segments.map(seg => {
        // Use existing word-level data if available, otherwise generate from segment
        const words = seg.words && seg.words.length > 0 
          ? seg.words.map((word, i) => ({
              text: word.text,
              startTime: seg.startTime + (i * (seg.endTime - seg.startTime) / seg.words!.length),
              endTime: seg.startTime + ((i + 1) * (seg.endTime - seg.startTime) / seg.words!.length),
              emphasis: word.emphasis || 'normal',
              pitch: word.pitch || 'normal',
            }))
          : seg.text.split(' ').map((word, i) => ({
              text: word,
              startTime: seg.startTime + (i * (seg.endTime - seg.startTime) / seg.text.split(' ').length),
              endTime: seg.startTime + ((i + 1) * (seg.endTime - seg.startTime) / seg.text.split(' ').length),
              emphasis: seg.emphasis || 'normal',
              pitch: seg.pitch || 'normal',
            }));

        return {
          text: seg.text,
          speaker: seg.speaker,
          startTime: seg.startTime,
          endTime: seg.endTime,
          words: words,
          volume: seg.emphasis === 'loud' ? 80 : seg.emphasis === 'yelling' ? 100 : seg.emphasis === 'quiet' ? 30 : 50,
          pitch: seg.pitch === 'high' ? 200 : seg.pitch === 'low' ? 120 : 160,
          type: 'dialogue',
          isOffCamera: false,
          speakerColor: seg.speakerColor,
        };
      });
      onTranscriptReady(captionSegments);
    }
  }, [segments, isSaving]);

  // Save transcript changes when component unmounts or video changes
  useEffect(() => {
    return () => {
      if (segments.length > 0 && !isSaving) {
        console.log('🔄 Saving transcript on component cleanup');
        saveTranscript(false);
      }
    };
  }, [videoId]);

  const loadExistingTranscript = async () => {
    try {
      console.log('🔍 TranscriptWorkflow - Starting dual-source loading for video:', videoId);
      console.log('🔍 TranscriptWorkflow - Detected language:', detectedLanguage);
      
      let loadedSegments: TranscriptSegment[] = [];
      let dataSource = 'none';
      
      // FIRST: Try loading from database for the specific language
      console.log('🗄️ Attempting to load from database for language:', detectedLanguage);
      let { data: dbData, error: dbError } = await supabase
        .from('transcript_segments')
        .select('*')  
        .eq('video_id', videoId)
        .eq('language', detectedLanguage)
        .order('start_time', { ascending: true });
      
      // If no results, try alternative language formats (english vs en)
      if ((!dbData || dbData.length === 0) && !dbError) {
        console.log('🔄 Trying alternative language formats...');
        const altLanguage = detectedLanguage === 'en' ? 'english' : 
                           detectedLanguage === 'english' ? 'en' : detectedLanguage;
        
        const altResult = await supabase
          .from('transcript_segments')
          .select('*')
          .eq('video_id', videoId)
          .eq('language', altLanguage)
          .order('start_time', { ascending: true });
          
        if (altResult.data && altResult.data.length > 0) {
          console.log(`✅ Found transcript with alternative language: ${altLanguage}`);
          dbData = altResult.data;
          dbError = altResult.error;
        }
      }
      
      if (dbError) {
        console.error('❌ Database load error:', dbError);
      } else if (dbData && dbData.length > 0) {
        console.log('✅ Found database data:', dbData.length, 'segments');
        dataSource = 'database';
        
        loadedSegments = dbData.map((seg, index) => ({
          id: seg.id,
          text: seg.text,
          startTime: Number(seg.start_time),
          endTime: Number(seg.end_time),
          speaker: seg.speaker || `Speaker ${(index % 3) + 1}`,
          speakerColor: seg.speaker_color || getSpeakerColor(index),
          emphasis: (seg.emphasis as 'normal' | 'loud' | 'quiet' | 'yelling') || 'normal',
          pitch: (seg.pitch as 'normal' | 'high' | 'low') || 'normal',
        }));
        
        if (dbData[0]?.language) {
          setDetectedLanguage(dbData[0].language);
        }
      }
      
      // FALLBACK: Try loading from localStorage if database failed
      if (loadedSegments.length === 0) {
        console.log('🗃️ Database empty, trying localStorage...');
        
        // Try new format first, then fallback to old formats
        let localData = null;
        const keys = [
          `transcript:${videoId}:${detectedLanguage}`,  // New atomic format
          `transcript_${videoId}_${detectedLanguage}`,   // Legacy format
          `transcript_${videoId}_latest`,
          `transcript_${videoId}_en`,
          `transcript_${videoId}_english`
        ];
        
        for (const key of keys) {
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.segments && parsed.segments.length > 0) {
                console.log('✅ Found localStorage data in key:', key, parsed.segments.length, 'segments');
                localData = parsed;
                dataSource = 'localStorage';
                break;
              }
            } catch (e) {
              console.error('❌ Failed to parse localStorage key:', key, e);
            }
          }
        }
        
        if (localData) {
          loadedSegments = localData.segments.map((seg: any, index: number) => ({
            id: seg.id || `segment-${index}`,
            text: seg.text,
            startTime: Number(seg.startTime),
            endTime: Number(seg.endTime),
            speaker: seg.speaker || `Speaker ${(index % 3) + 1}`,
            speakerColor: seg.speakerColor || getSpeakerColor(index),
            emphasis: seg.emphasis || 'normal',
            pitch: seg.pitch || 'normal',
          }));
          
          if (localData.language) {
            setDetectedLanguage(localData.language);
          }
        }
      }
      
      console.log('📊 TranscriptWorkflow - Loading summary:', {
        source: dataSource,
        segmentCount: loadedSegments.length,
        language: detectedLanguage,
        firstSegment: loadedSegments[0] ? {
          text: loadedSegments[0].text?.substring(0, 50) + '...',
          startTime: loadedSegments[0].startTime,
          speaker: loadedSegments[0].speaker
        } : null
      });

      if (loadedSegments.length > 0) {
        setSegments(loadedSegments);
        setCurrentStep('edit');
        setExtractionComplete(true);
        setIsLoadingExisting(false);
        
        console.log('✅ TranscriptWorkflow - Loaded transcript from', dataSource, ':', loadedSegments.length, 'segments');
        console.log('✅ TranscriptWorkflow - Current step set to: edit');
        
        // If loaded from localStorage but not in database, try to save to database
        if (dataSource === 'localStorage') {
          console.log('🔄 Found localStorage data, attempting to sync to database...');
          setTimeout(async () => {
            try {
              await saveTranscript();
              console.log('✅ Successfully synced localStorage data to database');
            } catch (error) {
              console.error('❌ Failed to sync to database:', error);
            }
          }, 1000);
        }
      } else {
        setCurrentStep('extract');
        setIsLoadingExisting(false);
        console.log('ℹ️ TranscriptWorkflow - No transcript found in database or localStorage for video:', videoId);
        console.log('ℹ️ TranscriptWorkflow - Current step set to: extract');
      }
    } catch (error) {
      console.error('❌ TranscriptWorkflow - Failed to load existing transcript:', error);
      setCurrentStep('extract');
      setIsLoadingExisting(false);
    }
  };

  const getSpeakerColor = (index: number) => {
    const colors = ['#E5E517', '#17E5E5', '#E51717', '#E58017', '#17E517', '#E517E5'];
    return colors[index % colors.length];
  };

  const extractTranscript = async () => {
    setIsExtracting(true);
    try {
      console.log(`🎤 Starting ${extractionMethod} transcript extraction for:`, videoUrl);
      
      let data, error;
      
      if (extractionMethod === 'twelvelabs') {
        // Use Extended Analysis for advanced analysis
        console.log('🎬 Using Extended Analysis for advanced video analysis');
        console.log('🎬 Extended Analysis extraction started for video:', videoId);
        console.log('🎬 Extended Analysis request payload:', { videoUrl, videoId, language: detectedLanguage === 'auto' ? undefined : detectedLanguage });
        
        // Show user that Extended Analysis is starting
        toast({
          title: "Starting Extended Analysis",
          description: "Using advanced AI analysis for speaker identification and audio descriptions",
          variant: "default",
        });
        
        const response = await supabase.functions.invoke('twelve-labs-analysis', {
          body: { 
            videoUrl,
            videoId,
            language: detectedLanguage === 'auto' ? undefined : detectedLanguage
          }
        });
        
        console.log('🎬 Extended Analysis response:', { data: response.data, error: response.error });
        data = response.data;
        error = response.error;
        
        // More detailed error checking
        if (response.error) {
          console.error('🚨 Supabase function error:', response.error);
          error = response.error;
          data = null;
        }
        
        // Check if the response contains an error (even with 200 status)
        if (data?.error || data?.errorType === 'twelve_labs_error') {
          console.error('🎬 Extended Analysis API error:', data.error);
          console.error('🎬 Error details:', data.details);
          error = new Error(data.error || 'Extended Analysis failed');
          data = null;
        }
        
        // Success case
        if (data && !error && data.segments) {
          console.log('✅ Extended Analysis successful, segments received:', data.segments.length);
          toast({
            title: "Extended Analysis Complete",
            description: `Successfully analyzed video with ${data.segments.length} segments`,
            variant: "default",
          });
        }
        
        // Store audio descriptions from Extended Analysis if successful
        if (data?.audioDescriptions) {
          setAudioDescriptions(data.audioDescriptions);
          if (onAudioDescriptionsUpdate) {
            onAudioDescriptionsUpdate(data.audioDescriptions);
          }
        }
      }
      
      // If Extended Analysis failed or we're using Whisper, use Whisper extraction
      if (extractionMethod === 'whisper' || (extractionMethod === 'twelvelabs' && (error || !data))) {
        if (extractionMethod === 'twelvelabs' && (error || !data)) {
          console.warn('⚠️ Extended Analysis failed, falling back to Whisper. Error:', error);
          console.warn('⚠️ Extended Analysis response data:', data);
          setExtractionMethod('whisper'); // Update the state to reflect fallback
          
          // Show user notification about fallback
          toast({
            title: "Switched to Fast Mode",
            description: `Extended analysis failed: ${error?.message || 'Unknown error'}. Using fast transcription instead.`,
            variant: "destructive",
          });
        }
        
        console.log('🚀 Starting Whisper transcription...');
        // Use existing Whisper transcription
        console.log('📋 Request details:', {
          videoId,
          videoUrl: videoUrl.substring(0, 100) + '...',
          language: detectedLanguage,
          rangeBytes: 200000000
        });
        
        const response = await supabase.functions.invoke('transcribe', {
          body: { 
            videoUrl,
            videoId, // Pass videoId for database saving
            rangeBytes: 200000000,
            fullTranscript: true,
            forceReExtract: true, // Always force re-extract when user clicks the button
            language: detectedLanguage === 'auto' ? undefined : detectedLanguage
          }
        });
        
        data = response.data;
        error = response.error;
      }

      console.log('🔍 Transcribe response:', {
        success: !error,
        error: error?.message,
        dataKeys: data ? Object.keys(data) : [],
        hasSegments: !!data?.segments,
        hasWords: !!data?.words,
        language: data?.language
      });

      if (error) {
        console.error('❌ Transcription API error:', {
          message: error.message,
          code: error.code,
          details: error.details || error
        });
        throw new Error(`Transcription failed: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        throw new Error('No transcription data received');
      }

      console.log('✅ Extraction complete:', data);

      // Detect and store language
      const language = data.language || 'en';
      setDetectedLanguage(language);
      console.log('🌐 Detected language:', language);

      // Debug: Log the structure of the received data
      console.log('🔍 Data structure analysis:', {
        hasSegments: !!data.segments,
        segmentsLength: data.segments?.length || 0,
        hasWords: !!data.words,
        wordsLength: data.words?.length || 0,
        hasText: !!data.text,
        textLength: data.text?.length || 0,
        language: language,
        allKeys: Object.keys(data || {})
      });

      // Process the response to create segments
      let transcriptSegments: TranscriptSegment[] = [];
      
      if (data.segments && Array.isArray(data.segments)) {
        // Use segments if available (better structure)
        transcriptSegments = data.segments.map((seg: any, index: number) => ({
          id: `segment-${index}`,
          text: seg.text || '',
          startTime: Number(seg.start) || 0,
          endTime: Number(seg.end) || 0,
          speaker: seg.speaker || `Speaker ${(index % 3) + 1}`,
          speakerColor: seg.speakerColor || getSpeakerColor(index),
          emphasis: 'normal' as const,
          pitch: 'normal' as const,
        }));
      } else if (data.words && Array.isArray(data.words)) {
        // Fallback to words processing
        const words = data.words;
        let currentSegment = { words: [] as any[], startTime: 0, endTime: 0 };
        
        words.forEach((word: any) => {
          if (currentSegment.words.length === 0) {
            currentSegment.startTime = Number(word.start) || 0;
          }
          
          currentSegment.words.push(word);
          currentSegment.endTime = Number(word.end) || 0;
          
          // End segment on punctuation or after 8-10 words
          const isEndOfSentence = word.word?.match(/[.!?]/) || currentSegment.words.length >= 10;
          if (isEndOfSentence) {
            transcriptSegments.push({
              id: `segment-${transcriptSegments.length}`,
              text: currentSegment.words.map(w => w.word || '').join(' '),
              startTime: currentSegment.startTime,
              endTime: currentSegment.endTime,
              speaker: `Speaker ${(transcriptSegments.length % 3) + 1}`,
              speakerColor: getSpeakerColor(transcriptSegments.length),
              emphasis: 'normal' as const,
              pitch: 'normal' as const,
            });
            currentSegment = { words: [], startTime: 0, endTime: 0 };
          }
        });

        // Handle remaining words
        if (currentSegment.words.length > 0) {
          transcriptSegments.push({
            id: `segment-${transcriptSegments.length}`,
            text: currentSegment.words.map(w => w.word || '').join(' '),
            startTime: currentSegment.startTime,
            endTime: currentSegment.endTime,
            speaker: `Speaker ${(transcriptSegments.length % 3) + 1}`,
            speakerColor: getSpeakerColor(transcriptSegments.length),
            emphasis: 'normal' as const,
            pitch: 'normal' as const,
          });
        }
      } else if (data.text) {
        // Fallback to simple text
        transcriptSegments = [{
          id: 'segment-0',
          text: data.text,
          startTime: 0,
          endTime: 30, // Default duration
          speaker: 'Speaker 1',
          speakerColor: getSpeakerColor(0),
          emphasis: 'normal' as const,
          pitch: 'normal' as const,
        }];
      }

      setSegments(transcriptSegments);
      setExtractionComplete(true);
      
      toast({
        title: "Transcript extracted",
        description: `${transcriptSegments.length} segments extracted successfully. Saving...`
      });

      // Immediately trigger auto-save
      try {
        await saveTranscript(false);
        setCurrentStep('edit');
        toast({
          title: "Transcript saved",
          description: `Successfully saved ${transcriptSegments.length} segments to database`
        });
      } catch (saveError) {
        console.error('❌ Auto-save failed:', saveError);
        setCurrentStep('edit'); // Still allow editing even if save failed
        toast({
          title: "Save failed",
          description: "Transcript extracted but failed to save. You can try saving manually.",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('❌ Extraction error:', error);
      toast({
        title: "Extraction failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const updateSegment = (id: string, field: string, value: any) => {
    setSegments(prev => {
      const updated = prev.map(seg => 
        seg.id === id ? { ...seg, [field]: value } : seg
      );
      
      // Don't auto-save changes to avoid concurrent save conflicts
      // Manual save will handle all changes
      console.log('✏️ Segment updated, manual save required');
      
      return updated;
    });
  };

  const updateSegmentWords = (segmentId: string, wordsData: Array<{text: string; emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling'; pitch?: 'high' | 'low' | 'normal'}>) => {
    setSegments(prev => {
      const updated = prev.map(seg => 
        seg.id === segmentId ? { 
          ...seg, 
          words: wordsData,
          text: wordsData.map(w => w.text).join(' ') // Update text from words
        } : seg
      );
      
      console.log('✏️ Segment words updated, manual save required');
      return updated;
    });
  };

  const handleCharactersUpdate = (updatedCharacters: any[]) => {
    setCharacters(updatedCharacters);
    onCharactersUpdate?.(updatedCharacters);
    
    // Apply character properties to transcript segments with improved matching
    const updatedSegments = segments.map(seg => {
      // Try multiple matching strategies
      const character = updatedCharacters.find(char => 
        // Exact name match
        char.name.toLowerCase() === seg.speaker.toLowerCase() ||
        // Color match (for existing assignments)
        char.color === seg.speakerColor ||
        // Generic speaker name match (Speaker 1 -> first character, etc.)
        (seg.speaker.match(/^speaker\s*(\d+)$/i) && 
         updatedCharacters.indexOf(char) === parseInt(seg.speaker.match(/\d+/)?.[0] || '0') - 1)
      );
      
      if (character) {
        console.log(`🎭 CHAR UPDATE: Applying "${character.name}" (${character.color}) to segment "${seg.speaker}"`);
        return {
          ...seg,
          speaker: character.name, // Update speaker name to character name
          speakerColor: character.color,
          emphasis: character.emphasis || seg.emphasis,
          pitch: character.pitch || seg.pitch
        };
      }
      return seg;
    });
    
    setSegments(updatedSegments);
    
    // Show update summary
    const appliedCount = updatedSegments.filter(s => 
      updatedCharacters.some(c => c.name === s.speaker)
    ).length;
    
    if (appliedCount > 0) {
      console.log(`✅ CHAR UPDATE: Applied character settings to ${appliedCount} segments`);
    }
  };

  const handleAudioDescriptionsUpdate = (descriptions: any[]) => {
    setAudioDescriptions(descriptions);
    onAudioDescriptionsUpdate?.(descriptions);
    console.log('🔄 Audio descriptions updated and passed to parent');
  };

  const saveTranscript = async (complete: boolean = false) => {
    if (!segments.length || isSaving) {
      console.log('❌ Cannot save: no segments or already saving');
      return;
    }

    setIsSaving(true);
    setSavingLock(true);
    console.log('💾 Starting atomic transcript save process...', { 
      segmentCount: segments.length,
      language: detectedLanguage 
    });

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ User not authenticated:', userError);
        toast({
          title: "Authentication required",
          description: "Please log in to save transcripts",
          variant: "destructive"
        });
        return;
      }

      // Create checksum for change detection
      const segmentData = segments.map((s, idx) => ({
        idx,
        startTime: s.startTime,
        endTime: s.endTime,
        text: s.text,
        speaker: s.speaker || 'Speaker',
        speakerColor: s.speakerColor || '#3B82F6',
        emphasis: s.emphasis || 'normal',
        pitch: s.pitch || 'normal',
        confidence: 0.95,
        segmentType: 'dialogue',
        isOffCamera: false
      }));

      const checksum = btoa(JSON.stringify(segmentData));

      // Save to single localStorage key
      const localKey = `transcript:${videoId}:${detectedLanguage}`;
      localStorage.setItem(localKey, JSON.stringify({
        segments: segmentData,
        language: detectedLanguage,
        videoId,
        ts: Date.now()
      }));
      console.log(`✅ Saved to localStorage: ${localKey}`);

      // Atomic database save using RPC
      console.log('🔄 Attempting atomic database save...');
      
      const { error } = await supabase.rpc('upsert_transcript_segments', {
        p_video_id: videoId,
        p_language: detectedLanguage,
        p_created_by: user.id,
        p_segments: segmentData,
        p_checksum: checksum
      });

      if (error) {
        console.error('❌ Database save failed:', error);
        toast({
          title: "Save partially completed",
          description: "Database save failed, but transcript saved locally",
          variant: "destructive"
        });
      } else {
        console.log('✅ Successfully saved to database via atomic RPC');
        toast({
          title: "✅ Transcript saved!",
          description: `${segmentData.length} segments saved successfully`
        });
      }

      // Mark workflow as complete only if explicitly requested
      if (complete) {
        setCurrentStep('complete');
        onWorkflowComplete();
      }
      
    } catch (error) {
      console.error('❌ Transcript save failed:', error);
      toast({
        title: "❌ Save failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      setSavingLock(false);
    }
  };

  const exportTranscript = () => {
    const text = segments.map(seg => 
      `[${seg.startTime.toFixed(1)}s - ${seg.endTime.toFixed(1)}s] ${seg.speaker}: ${seg.text}`
    ).join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${videoId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStepBadgeVariant = (step: string) => {
    if (currentStep === step) return 'default';
    if ((step === 'extract' && extractionComplete) || 
        (step === 'edit' && currentStep === 'complete') ||
        (step === 'save' && currentStep === 'complete')) return 'secondary';
    return 'outline';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Transcript Workflow
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant={getStepBadgeVariant('extract')}>1. Extract</Badge>
          <Badge variant={getStepBadgeVariant('edit')}>2. Edit</Badge>
          <Badge variant={getStepBadgeVariant('save')}>3. Save</Badge>
          <Badge variant={currentStep === 'complete' ? 'default' : 'outline'}>4. Complete</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {currentStep === 'loading' && (
          <div className="text-center space-y-4 py-8">
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">
              Loading existing transcript...
            </p>
          </div>
        )}

        {currentStep === 'extract' && (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              No existing transcript found. Extract transcript from your video with detailed timing information.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Extraction Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={extractionMethod === 'whisper' ? 'default' : 'outline'}
                    onClick={() => setExtractionMethod('whisper')}
                    className="text-sm"
                  >
                    Fast Transcription
                  </Button>
                  <Button 
                    variant={extractionMethod === 'twelvelabs' ? 'default' : 'outline'}
                    onClick={() => setExtractionMethod('twelvelabs')}
                    className="text-sm"
                  >
                    Advanced Analysis
                  </Button>
                </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {extractionMethod === 'twelvelabs' 
                      ? 'Advanced AI analysis with speaker identification, visual descriptions & creative audio descriptions'
                      : 'Fast transcription with basic speaker detection'
                    }
                  </p>
              </div>
              
              <Button 
                onClick={extractTranscript}
                disabled={isExtracting || !videoUrl}
                size="lg"
                className="w-full"
              >
                {isExtracting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {extractionMethod === 'twelvelabs' ? 'Analyzing with AI...' : 'Extracting transcript...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    {extractionMethod === 'twelvelabs' ? 'Start AI Analysis' : 'Extract Transcript'}
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'edit' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Info className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Debug Info: Current step = {currentStep}, Segments = {segments.length}
                </span>
              </div>
            </div>
            
            <Tabs defaultValue="transcript" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transcript" className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Transcript ({segments.length})
              </TabsTrigger>
              <TabsTrigger value="characters" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Characters
              </TabsTrigger>
              <TabsTrigger value="audio-desc" className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Audio Descriptions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transcript" className="mt-4">
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Existing transcript loaded ({segments.length} segments)
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        console.log('🔄 Re-extract button clicked, switching to extract mode');
                        setCurrentStep('extract');
                      }}
                      className="text-xs"
                    >
                      Re-extract with {extractionMethod === 'twelvelabs' ? 'Advanced Analysis' : 'Fast Transcription'}
                    </Button>
                  </div>
                  <p className="text-green-600 text-xs mt-1">
                    Your saved transcript is ready for editing. Click "Re-extract" to use {extractionMethod === 'twelvelabs' ? 'advanced analysis for full video processing' : 'fast transcription for quick results'}.
                  </p>
                </div>

                {/* Character Color Attribution Section */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                  <h3 className="text-sm font-medium text-purple-700 mb-3 flex items-center gap-2">
                    🎨 Character Color Attribution
                  </h3>
                  <p className="text-xs text-purple-600 mb-3">
                    Assign colors to characters following the Captions with Intention protocol
                  </p>
                  
                  {/* Speaker Assignment */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-purple-700 mb-2 flex items-center gap-2">
                      🔗 Speaker Assignment
                    </h4>
                    <p className="text-xs text-purple-600 mb-2">
                      Connect your transcript speakers to characters. This updates the video captions immediately.
                    </p>
                    
                    {(() => {
                      const uniqueSpeakers = [...new Set(segments.map(s => s.speaker).filter(Boolean))];
                      return uniqueSpeakers.length > 0 ? (
                        <div className="grid gap-2">
                          {uniqueSpeakers.map(speaker => (
                            <div key={speaker} className="flex items-center gap-3 p-2 bg-white rounded border">
                              <Badge 
                                className="min-w-20 justify-center"
                                style={{ 
                                  backgroundColor: segments.find(s => s.speaker === speaker)?.speakerColor || '#999',
                                  color: '#000'
                                }}
                              >
                                {speaker}
                              </Badge>
                              <span className="text-muted-foreground">→</span>
                              <Select 
                                value={segments.find(s => s.speaker === speaker)?.speaker || "unassigned"}
                                onValueChange={(characterName) => {
                                  // Update all segments with this speaker
                                  if (characterName !== "unassigned") {
                                    const updatedSegments = segments.map(seg => 
                                      seg.speaker === speaker 
                                        ? { ...seg, speaker: characterName }
                                        : seg
                                    );
                                    setSegments(updatedSegments);
                                    
                                    // Save the changes immediately
                                    saveTranscript(false);
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 w-32">
                                  <SelectValue placeholder="Assign to..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {characters.map(char => (
                                    <SelectItem key={char.id} value={char.name}>
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-3 h-3 rounded-full border"
                                          style={{ backgroundColor: char.color }}
                                        />
                                        {char.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No speakers detected in transcript</p>
                      );
                    })()}
                  </div>

                  {/* Color Guidelines */}
                  <div className="bg-white rounded border p-3">
                    <h4 className="text-sm font-medium mb-2">Color Guidelines:</h4>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        </div>
                        <span>• Main characters use the 6 primary spectrum colors</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
                          <div className="w-3 h-3 bg-teal-400 rounded-full"></div>
                          <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
                        </div>
                        <span>• Supporting characters use colors between main character colors</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                          <div className="w-3 h-3 bg-slate-300 rounded-full"></div>
                          <div className="w-3 h-3 bg-neutral-300 rounded-full"></div>
                        </div>
                        <span>• Minor characters use pastel tones from the center of the color wheel</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                        </div>
                        <span>• Hero and Villain should be positioned opposite on the spectrum</span>
                      </div>
                      <div>• <em>Off-camera dialogue is displayed in italic</em></div>
                    </div>
                  </div>
                </div>
                
                {/* Transcript Analysis Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">📊 Transcript Analysis Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-blue-600 font-medium">Speakers:</span>
                      <div className="mt-1">
                        {(() => {
                          const speakers = [...new Set(segments.map(s => s.speaker))];
                          const speakerColorConsistency = speakers.map(speaker => {
                            const colors = [...new Set(segments.filter(s => s.speaker === speaker).map(s => s.speakerColor))];
                            return { speaker, colors: colors.length };
                          });
                          return speakerColorConsistency.map(({ speaker, colors }) => (
                            <div key={speaker} className="flex items-center gap-1">
                              <span>{speaker}</span>
                              {colors > 1 && <span className="text-red-600">⚠️ {colors} colors</span>}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Vocal Intensity:</span>
                      <div className="mt-1">
                        {(() => {
                          const withIntensity = segments.filter(s => (s as any).vocal_intensity);
                          const intensityCount = {
                            whisper: withIntensity.filter(s => (s as any).vocal_intensity === 'whisper').length,
                            normal: withIntensity.filter(s => (s as any).vocal_intensity === 'normal').length,
                            yell: withIntensity.filter(s => (s as any).vocal_intensity === 'yell').length,
                            shout: withIntensity.filter(s => (s as any).vocal_intensity === 'shout').length,
                          };
                          return (
                            <div>
                              <div>Analyzed: {withIntensity.length}/{segments.length}</div>
                              {intensityCount.whisper > 0 && <div>🤫 Whisper: {intensityCount.whisper}</div>}
                              {intensityCount.yell > 0 && <div>📢 Yell: {intensityCount.yell}</div>}
                              {intensityCount.shout > 0 && <div>🗣️ Shout: {intensityCount.shout}</div>}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Manual Overrides:</span>
                      <div className="mt-1">
                        {(() => {
                          const withEmphasis = segments.filter(s => s.emphasis && s.emphasis !== 'normal');
                          const withPitch = segments.filter(s => s.pitch && s.pitch !== 'normal');
                          return (
                            <div>
                              <div>Emphasis: {withEmphasis.length}</div>
                              <div>Pitch: {withPitch.length}</div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                
                 <div className="flex justify-between items-center">
                   <h3 className="font-semibold">Edit Transcript Details</h3>
                   <div className="flex gap-2">
                     {/* Speaker Consistency Analyzer */}
                     <Button 
                       variant="outline" 
                       size="sm" 
                       onClick={() => {
                         // Analyze speaker consistency
                         const speakerGroups: Record<string, { colors: Set<string>, segments: any[] }> = {};
                         segments.forEach(segment => {
                           if (!speakerGroups[segment.speaker]) {
                             speakerGroups[segment.speaker] = { colors: new Set(), segments: [] };
                           }
                           speakerGroups[segment.speaker].colors.add(segment.speakerColor);
                           speakerGroups[segment.speaker].segments.push(segment);
                         });
                         
                         // Find inconsistencies
                         const inconsistencies = Object.entries(speakerGroups)
                           .filter(([_, data]) => data.colors.size > 1);
                         
                         if (inconsistencies.length > 0) {
                           const message = inconsistencies.map(([speaker, data]) => 
                             `${speaker}: ${data.colors.size} different colors`
                           ).join(', ');
                           
                           if (confirm(`Found inconsistencies: ${message}. Fix by using most common color for each speaker?`)) {
                             const updatedSegments = segments.map(segment => {
                               const group = speakerGroups[segment.speaker];
                               if (group.colors.size > 1) {
                                 // Use most common color for this speaker
                                 const colorCounts: Record<string, number> = {};
                                 group.segments.forEach(s => {
                                   colorCounts[s.speakerColor] = (colorCounts[s.speakerColor] || 0) + 1;
                                 });
                                 const mostCommonColor = Object.entries(colorCounts)
                                   .sort(([,a], [,b]) => b - a)[0][0];
                                 return { ...segment, speakerColor: mostCommonColor };
                               }
                               return segment;
                             });
                             setSegments(updatedSegments);
                           }
                         } else {
                           alert('✅ All speakers have consistent colors!');
                         }
                       }}
                       className="text-xs"
                     >
                       🔍 Check Consistency
                     </Button>
                     
                     <Button variant="outline" size="sm" onClick={exportTranscript}>
                       <Download className="w-4 h-4 mr-2" />
                       Export
                     </Button>
                    {segments.length > 0 ? (
                      <Button onClick={() => saveTranscript(true)} disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save & Continue
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => {
                          setCurrentStep('complete');
                          onWorkflowComplete();
                        }}
                        variant="outline"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Workflow
                      </Button>
                    )}
                  </div>
                </div>
                
                {segments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No transcript segments found. Use the Re-extract button above to generate a transcript.</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    <p className="text-sm text-muted-foreground mb-2">
                      Click the edit icon (✏️) for segment-level editing or the word icon (W) for word-by-word editing:
                    </p>
                    {segments.map((segment, index) => (
                      <Card key={segment.id} className="p-4">
                        <div className="grid gap-3">
                           <div className="flex items-center gap-2 flex-wrap">
                             <Badge style={{ backgroundColor: segment.speakerColor, color: '#000' }}>
                               {segment.speaker}
                             </Badge>
                             <span className="text-sm text-muted-foreground">
                               {segment.startTime.toFixed(1)}s - {segment.endTime.toFixed(1)}s
                             </span>
                             <span className="text-xs text-muted-foreground">
                               #{index + 1}
                             </span>
                             
                             {/* Vocal Intensity Indicators */}
                             {(segment as any).vocal_intensity && (
                               <Badge 
                                 variant={(segment as any).vocal_intensity === 'whisper' ? 'secondary' : 
                                         (segment as any).vocal_intensity === 'yell' ? 'default' : 
                                         (segment as any).vocal_intensity === 'shout' ? 'destructive' : 'outline'}
                                 className="text-xs"
                               >
                                 🎤 {(segment as any).vocal_intensity}
                               </Badge>
                             )}
                             
                             {/* Manual Styling Indicators */}
                             {segment.emphasis && segment.emphasis !== 'normal' && (
                               <Badge variant="outline" className="text-xs bg-blue-50">
                                 {segment.emphasis === 'quiet' ? '🤫' : 
                                  segment.emphasis === 'loud' ? '📢' : 
                                  segment.emphasis === 'yelling' ? '🗣️' : ''}
                                 {segment.emphasis}
                               </Badge>
                             )}
                             
                             {segment.pitch && segment.pitch !== 'normal' && (
                               <Badge variant="outline" className="text-xs bg-green-50">
                                 {segment.pitch === 'low' ? '🔽' : '🔼'} {segment.pitch}
                               </Badge>
                             )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log(`✏️ Edit button clicked for segment ${index + 1}:`, segment.text.substring(0, 50));
                                setEditingId(editingId === segment.id ? null : segment.id);
                                setWordEditingId(null); // Close word editing when opening segment editing
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log(`📝 Word edit button clicked for segment ${index + 1}`);
                                setWordEditingId(wordEditingId === segment.id ? null : segment.id);
                                setEditingId(null); // Close segment editing when opening word editing
                              }}
                              title="Edit word-by-word (Captions with Intention)"
                            >
                              <span className="text-xs font-bold">W</span>
                            </Button>
                          </div>
                          
                           {editingId === segment.id ? (
                            <div className="grid gap-3">
                              <Textarea
                                value={segment.text}
                                onChange={(e) => updateSegment(segment.id, 'text', e.target.value)}
                                rows={2}
                                placeholder="Edit transcript text..."
                              />
                              
                              {/* Speaker Identity & Color Management */}
                              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <h4 className="text-sm font-medium text-blue-700 mb-2">👤 Speaker Identity</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-muted-foreground">Character Name</label>
                                    <Input
                                      value={segment.speaker}
                                      onChange={(e) => updateSegment(segment.id, 'speaker', e.target.value)}
                                      placeholder="e.g., Sarah, Host, Expert"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Character Color (Captions with Intention Protocol)</label>
                                    <div className="space-y-2">
                                      {/* Primary Spectrum Colors - Main Characters */}
                                      <div>
                                        <div className="text-xs text-muted-foreground mb-1">Main Characters (Primary Spectrum):</div>
                                        <div className="flex flex-wrap gap-1">
                                          {[
                                            { color: '#EF4444', name: 'Red (Hero/Leader)' },
                                            { color: '#F97316', name: 'Orange (Energy)' },
                                            { color: '#EAB308', name: 'Yellow (Joy/Wisdom)' },
                                            { color: '#22C55E', name: 'Green (Growth/Nature)' },
                                            { color: '#3B82F6', name: 'Blue (Calm/Trust)' },
                                            { color: '#8B5CF6', name: 'Purple (Mystery/Magic)' }
                                          ].map(({ color, name }) => (
                                            <button
                                              key={color}
                                              type="button"
                                              className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                                                segment.speakerColor === color ? 'border-gray-800 ring-2 ring-offset-1' : 'border-gray-300'
                                              }`}
                                              style={{ backgroundColor: color }}
                                              onClick={() => updateSegment(segment.id, 'speakerColor', color)}
                                              title={name}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                      
                                      {/* Supporting Character Colors */}
                                      <div>
                                        <div className="text-xs text-muted-foreground mb-1">Supporting Characters (Intermediate Colors):</div>
                                        <div className="flex flex-wrap gap-1">
                                          {[
                                            { color: '#EC4899', name: 'Pink (Between Red/Purple)' },
                                            { color: '#14B8A6', name: 'Teal (Between Blue/Green)' },
                                            { color: '#6366F1', name: 'Indigo (Between Blue/Purple)' },
                                            { color: '#F59E0B', name: 'Amber (Between Orange/Yellow)' },
                                            { color: '#10B981', name: 'Emerald (Between Green/Blue)' },
                                            { color: '#DC2626', name: 'Dark Red (Villain - Opposite)' }
                                          ].map(({ color, name }) => (
                                            <button
                                              key={color}
                                              type="button"
                                              className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                                                segment.speakerColor === color ? 'border-gray-800 ring-2 ring-offset-1' : 'border-gray-300'
                                              }`}
                                              style={{ backgroundColor: color }}
                                              onClick={() => updateSegment(segment.id, 'speakerColor', color)}
                                              title={name}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                      
                                      {/* Minor Character Colors - Pastels */}
                                      <div>
                                        <div className="text-xs text-muted-foreground mb-1">Minor Characters (Pastel Tones):</div>
                                        <div className="flex flex-wrap gap-1">
                                          {[
                                            { color: '#D1D5DB', name: 'Light Gray' },
                                            { color: '#CBD5E1', name: 'Slate Gray' },
                                            { color: '#D4D4D8', name: 'Neutral Gray' },
                                            { color: '#E5E7EB', name: 'Cool Gray' },
                                            { color: '#F3F4F6', name: 'Warm Gray' },
                                            { color: '#9CA3AF', name: 'Medium Gray' }
                                          ].map(({ color, name }) => (
                                            <button
                                              key={color}
                                              type="button"
                                              className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                                                segment.speakerColor === color ? 'border-gray-800 ring-2 ring-offset-1' : 'border-gray-300'
                                              }`}
                                              style={{ backgroundColor: color }}
                                              onClick={() => updateSegment(segment.id, 'speakerColor', color)}
                                              title={name}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                      
                                      {/* Custom Color Picker and Lock Button */}
                                      <div className="flex gap-2 items-center pt-2 border-t">
                                        <input
                                          type="color"
                                          value={segment.speakerColor}
                                          onChange={(e) => updateSegment(segment.id, 'speakerColor', e.target.value)}
                                          className="w-12 h-8 rounded border"
                                          title="Custom color picker"
                                        />
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            // Lock this color to all segments with same speaker
                                            const updatedSegments = segments.map(s => 
                                              s.speaker === segment.speaker 
                                                ? { ...s, speakerColor: segment.speakerColor }
                                                : s
                                            );
                                            setSegments(updatedSegments);
                                          }}
                                          className="text-xs px-2"
                                        >
                                          🔒 Lock to All {segment.speaker}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Vocal Intensity Analysis */}
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                <h4 className="text-sm font-medium text-yellow-700 mb-2">🎤 Vocal Intensity Analysis</h4>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-xs text-muted-foreground">AI Detected</label>
                                    <div className="text-sm font-medium">
                                      {(segment as any).vocal_intensity ? (
                                        <Badge variant={(segment as any).vocal_intensity === 'whisper' ? 'secondary' : 
                                               (segment as any).vocal_intensity === 'yell' ? 'default' : 
                                               (segment as any).vocal_intensity === 'shout' ? 'destructive' : 'outline'}>
                                          {(segment as any).vocal_intensity}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">Not analyzed</span>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Confidence</label>
                                    <div className="text-sm">
                                      {(segment as any).intensity_confidence 
                                        ? `${Math.round((segment as any).intensity_confidence * 100)}%`
                                        : 'N/A'}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Manual Override</label>
                                    <Select 
                                      value={segment.emphasis} 
                                      onValueChange={(value) => updateSegment(segment.id, 'emphasis', value)}
                                    >
                                      <SelectTrigger className="h-7">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="quiet">🤫 Quiet/Whisper</SelectItem>
                                        <SelectItem value="normal">😐 Normal</SelectItem>
                                        <SelectItem value="loud">📢 Loud</SelectItem>
                                        <SelectItem value="yelling">🗣️ Yelling (Bold)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>

                              {/* Captions with Intention Styling Rules */}
                              <div className="bg-green-50 border border-green-200 rounded p-3">
                                <h4 className="text-sm font-medium text-green-700 mb-2">🎨 Captions with Intention Rules</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-muted-foreground">Voice Pitch</label>
                                    <Select value={segment.pitch} onValueChange={(value) => updateSegment(segment.id, 'pitch', value)}>
                                      <SelectTrigger className="h-7">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="low">🔽 Low (Heavier, Wider)</SelectItem>
                                        <SelectItem value="normal">➡️ Normal</SelectItem>
                                        <SelectItem value="high">🔼 High (Lighter, Narrower)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Visual Preview</label>
                                    <div className="text-sm p-1 bg-white rounded border text-center">
                                      <span 
                                        style={{
                                          fontSize: segment.emphasis === 'quiet' ? '0.8em' : 
                                                   segment.emphasis === 'loud' ? '1.2em' :
                                                   segment.emphasis === 'yelling' ? '1.4em' : '1em',
                                          fontWeight: segment.emphasis === 'yelling' ? 'bold' : 
                                                     segment.pitch === 'low' ? '600' :
                                                     segment.pitch === 'high' ? '300' : 'normal',
                                          fontStretch: segment.pitch === 'low' ? '110%' :
                                                      segment.pitch === 'high' ? '90%' : 'normal'
                                        }}
                                      >
                                        Sample Text
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-green-600 mt-2">
                                  Rules: Whisper = smaller, Yell/Loud = bigger + bold, Low pitch = heavier + wider, High pitch = lighter + narrower
                                </div>
                              </div>
                            </div>
                          ) : wordEditingId === segment.id ? (
                            <div className="space-y-3">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h4 className="text-sm font-medium text-blue-700 mb-2">
                                  📝 Captions with Intention - Word-by-Word Editor
                                </h4>
                                <p className="text-xs text-blue-600">
                                  Click on individual words to adjust their emphasis and pitch for better accessibility.
                                </p>
                              </div>
                              <WordLevelEditor
                                initialText={segment.text}
                                onWordsChange={(words) => updateSegmentWords(segment.id, words)}
                                className="border rounded-lg p-3"
                              />
                            </div>
                          ) : (
                            <p className="text-sm bg-muted/30 p-2 rounded">{segment.text}</p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="characters" className="mt-4">
              <CharacterManager
                videoId={videoId}
                onCharactersUpdate={handleCharactersUpdate}
                existingCharacters={characters}
                language={videoLanguage} // Pass video language for voice filtering
                existingSpeakers={[...new Set(segments.map(s => s.speaker).filter(Boolean))]}
              />
            </TabsContent>

            <TabsContent value="audio-desc" className="mt-4">
              {audioDescriptions.length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">AI-Generated Audio Descriptions</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {audioDescriptions.length} creative descriptions generated by AI
                  </p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {audioDescriptions.slice(0, 3).map((desc, i) => (
                      <div key={i} className="text-xs p-2 bg-background rounded border">
                        <span className="font-mono text-muted-foreground">
                          {Math.round(desc.startTime)}s:
                        </span> {desc.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <AudioDescriptionEditor
                videoUrl={videoUrl}
                videoId={videoId}
                videoData={{ transcript_language: detectedLanguage }}
                transcriptSegments={segments}
                onDescriptionsUpdate={handleAudioDescriptionsUpdate}
              />
            </TabsContent>
          </Tabs>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-green-700">Transcript Ready!</h3>
              <p className="text-muted-foreground">
                Your transcript has been saved with all accessibility features enabled
              </p>
            </div>
            <Button onClick={onWorkflowComplete} size="lg">
              <Play className="w-4 h-4 mr-2" />
              Continue to Video Player
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};