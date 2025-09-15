import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AxessiblePlayer } from './AxessiblePlayer';
import { TranscriptEditor } from './TranscriptEditor';
import { AudioDescriptionEditor } from './AudioDescriptionEditor';
import { CharacterManager } from './CharacterManager';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CaptionSegment } from './CaptionsWithIntention';
import { useVideoStorage } from '@/hooks/useVideoStorage';
import { useVocalIntensityAnalysis } from '@/hooks/useVocalIntensityAnalysis';
import { useAdvancedSpeakerAnalysis } from '@/hooks/useAdvancedSpeakerAnalysis';

interface EnhancedVideoPlayerProps {
  videoSrc: string;
  posterSrc?: string;
  title: string;
  videoId: string;
  language?: string;
  selectedVoice?: {
    id: string;
    name: string;
    description: string;
  };
  selectedASLAvatar?: {
    id: string;
    name: string;
    description: string;
  };
  contentType?: 'recipe' | 'education';
  className?: string;
  onTranscriptUpdate?: (segments: CaptionSegment[], language: string) => void;
}

export const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
  videoSrc,
  posterSrc,
  title,
  videoId,
  language,
  selectedVoice,
  selectedASLAvatar,
  contentType = 'education',
  className = "",
  onTranscriptUpdate
}) => {
  console.log('🚨 ENHANCED VIDEO PLAYER LOADED - videoId:', videoId, 'language:', language);
  
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [transcriptSegments, setTranscriptSegments] = useState<any[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState(language || 'en');
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [characters, setCharacters] = useState<any[]>([]);
  const { loadTranscriptSegments, loadTranscriptSegmentsFresh, loadAudioDescriptions, loadCharacters, loadSpeakerMappings, saveTranscriptSegments } = useVideoStorage(videoId);
  const { analyzeVocalIntensity, isAnalyzing: isAnalyzingIntensity } = useVocalIntensityAnalysis();
  const { analyzeSpeakers, isAnalyzing: isAnalyzingSpeakers } = useAdvancedSpeakerAnalysis();
  const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([]);
  
  // Add loading cache ref for managing duplicate loads
  const loadingCacheRef = useRef(new Map<string, any>());
  
  // Stable list of detected speakers from transcript segments only (avoid flicker)
  const stableDetectedSpeakers = useMemo(() => {
    const unique = Array.from(new Set(transcriptSegments.map((s: any) => s?.speaker).filter(Boolean))).sort();
    return unique;
  }, [transcriptSegments]);
  // Stable speaker color assignment function
  const stabilizeSpeakerColors = (segments: CaptionSegment[]): CaptionSegment[] => {
    // Create consistent speaker color mapping based on speaker names
    const speakerColorMap = new Map<string, string>();
    const availableColors = [
      '#E5E517', // CI Main Yellow
      '#17E5E5', // CI Main Blue  
      '#E51717', // CI Main Red
      '#E58017', // CI Main Orange
      '#17E517', // CI Main Green
      '#E517E5', // CI Main Pink
      '#E85C2E', // CI Support Orange
      '#47C2EB', // CI Support Blue I
      '#EBC247', // CI Support Yellow
      '#5E82ED', // CI Support Blue II
      '#C2EB47', // CI Support Green I
      '#8C6BED'  // CI Support Purple I
    ];
    
    let colorIndex = 0;
    
    // First pass: identify unique speakers and assign consistent colors
    segments.forEach(segment => {
      const speakerName = segment.speaker || 'Speaker';
      if (!speakerColorMap.has(speakerName)) {
        speakerColorMap.set(speakerName, availableColors[colorIndex % availableColors.length]);
        colorIndex++;
      }
    });
    
    // Second pass: apply consistent colors to all segments
    return segments.map(segment => ({
      ...segment,
      speakerColor: speakerColorMap.get(segment.speaker || 'Speaker') || availableColors[0]
    }));
  };

  // Fallback speaker color assignment for error cases
  const applyFallbackSpeakerColors = (segments: CaptionSegment[]): CaptionSegment[] => {
    const colors = ['#E5E517', '#17E5E5', '#E51717', '#E58017'];
    let colorIndex = 0;
    let lastEndTime = 0;
    
    return segments.map((segment, index) => {
      // Change speaker on significant pauses
      if (index > 0 && segment.startTime - lastEndTime > 1.5) {
        colorIndex = (colorIndex + 1) % colors.length;
      }
      
      lastEndTime = segment.endTime;
      
      return {
        ...segment,
        speaker: `Speaker ${colorIndex + 1}`,
        speakerColor: colors[colorIndex]
      };
    });
  };

  // Helper to compute overlap of two intervals (moved outside function for cleaner scope)
  const computeOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) => 
    Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));

  // Enhanced speaker identification using AssemblyAI edge function
  const performAdvancedSpeakerAnalysis = async (segments: CaptionSegment[], videoUrl?: string, videoId?: string): Promise<CaptionSegment[]> => {
    if (!segments || segments.length === 0) return segments;
    if (!videoUrl || !videoId) return stabilizeSpeakerColors(segments);

    console.log('🎭 ENHANCED PLAYER: Starting AssemblyAI speaker diarization...');

    // Prevent repeated diarization runs in a single session to avoid UI flicker
    const diarKey = `diarized_${videoId}_${currentLanguage}`;
    if (sessionStorage.getItem(diarKey) === 'done') {
      console.log('🛑 Skipping diarization (already done this session)');
      return stabilizeSpeakerColors(segments);
    }

    try {
      // Use the speaker-diarization edge function directly
      const { data, error } = await supabase.functions.invoke('speaker-diarization', {
        body: { 
          videoUrl,
          videoId,
          force_reanalysis: false // Use cached results if available
        }
      });

      if (error) throw error;
      
      if (!data?.success || !data?.speakers || !data?.segments) {
        console.warn('⚠️ No speaker data returned from diarization');
        return stabilizeSpeakerColors(segments);
      }

      console.log('🎯 ENHANCED PLAYER: AssemblyAI identified', data.speakers.length, 'speakers');
      
      // Map by speaker name for color lookup
      const speakerByName = new Map<string, { name: string; color: string }>();
      data.speakers.forEach((s: any) => speakerByName.set(s.name, { name: s.name, color: s.color }));

      const updatedSegments = segments.map(segment => {
        let bestName = segment.speaker;
        let bestColor = segment.speakerColor;
        let bestOv = 0;

        for (const diar of data.segments as Array<any>) {
          const ov = computeOverlap(segment.startTime, segment.endTime, diar.startTime, diar.endTime);
          if (ov > bestOv) {
            bestOv = ov;
            const meta = speakerByName.get(diar.speaker);
            bestName = meta?.name || diar.speaker || bestName;
            bestColor = meta?.color || bestColor;
          }
        }

        return { ...segment, speaker: bestName, speakerColor: bestColor };
      });

      console.log('✅ ENHANCED PLAYER: Applied speaker assignments to', updatedSegments.length, 'segments');
      return updatedSegments;
      
    } catch (error) {
      console.error('❌ AssemblyAI speaker analysis failed:', error);
      return stabilizeSpeakerColors(segments);
    }
  };

  // Auto-detect language from captions text
  const detectLanguageFromCaptions = (captions: any[]): string => {
    if (!captions || captions.length === 0) return 'en';
    
    const combinedText = captions.map(cap => cap.text || '').join(' ').toLowerCase();
    
    // Spanish detection patterns
    if (combinedText.includes('imagina') || 
        combinedText.includes('verano') || 
        combinedText.includes('corazón') ||
        combinedText.includes('más') ||
        combinedText.includes('tu') && combinedText.includes('el ')) {
      return 'es';
    }
    
    // French detection patterns
    if (combinedText.includes('bonjour') || 
        combinedText.includes('merci') || 
        combinedText.includes('votre') ||
        combinedText.includes('avec')) {
      return 'fr';
    }
    
    // Default to English
    return 'en';
  };

  // Watch for captions changes and convert them to transcript segments if no saved transcripts exist
  useEffect(() => {
    const convertCaptions = async () => {
      if (captions.length > 0 && transcriptSegments.length === 0) {
        console.log('🔄 Converting generated captions to transcript segments:', captions.length);
        console.log('📋 First caption for conversion:', captions[0]);
        
        const detectedLang = detectLanguageFromCaptions(captions);
        console.log('🌐 Auto-detected language from captions:', detectedLang);
        
        // Convert captions to transcript segment format
        const convertedSegments = captions.map(caption => ({
          ...caption,
          startTime: caption.startTime || 0,
          endTime: caption.endTime || 0,
          text: caption.text || '',
          speaker: caption.speaker || 'Speaker',
          speakerColor: caption.speakerColor || '#3B82F6'
        }));
        
        console.log('✅ Converted segments for AudioDescriptionEditor:', convertedSegments.length);
        await handleTranscriptUpdate(convertedSegments, detectedLang);
      }
    };
    
    convertCaptions();
  }, [captions.length, transcriptSegments.length]);

  // Add immediate debugging and state change watchers
  useEffect(() => {
    console.log('🚨 EnhancedVideoPlayer component mounted/updated');
    console.log('📹 Current videoId:', videoId);
    console.log('🌐 Current language:', currentLanguage);
    console.log('💾 loadTranscriptSegments available:', typeof loadTranscriptSegments);
  }, [videoId, currentLanguage, loadTranscriptSegments]);

  // Re-apply character mappings once characters load/change
  useEffect(() => {
    const applyMappings = async () => {
      if (captions.length > 0) {
        console.log('🎨 Re-applying character mappings due to characters update:', characters.length);
        await handleTranscriptUpdate(captions, currentLanguage);
      }
    };
    
    applyMappings();
  }, [characters]);

  // Re-apply when speaker mappings in database change (e.g., saved from Character Manager)
  useEffect(() => {
    const handleMappingsUpdate = async () => {
      if (captions.length > 0) {
        console.log('🗂️ Detected potential speaker-mapping change, re-applying from database');
        await handleTranscriptUpdate(captions, currentLanguage);
      }
    };
    
    // Listen for character updates that might affect mappings
    handleMappingsUpdate();
  }, [characters, videoId, currentLanguage]);

  // Force clear all cached data and refresh on mount
  useEffect(() => {
    const clearCacheAndRefresh = () => {
      console.log('🔄 Clearing all cached transcript data on component mount...');
      
      // Clear all transcript-related session storage
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.includes(videoId) && (key.includes('transcript') || key.includes('loading') || key.includes('intensity') || key.includes('words'))) {
          sessionStorage.removeItem(key);
          console.log('🗑️ Cleared cached key:', key);
        }
      });
      
      // Clear loading cache
      loadingCacheRef.current.clear();
      
      console.log('✅ Cache cleared for fresh transcript load');
    };
    
    clearCacheAndRefresh();
  }, [videoId]);

  // Clear cache and reload transcript when user saves changes
  const forceRefreshTranscript = async () => {
    console.log('🔄 Force refreshing transcript data...');
    
    // Clear all caches
    const keysToRemove = [
      `transcript_segments_${videoId}_${currentLanguage}`,
      `loading_${videoId}_${currentLanguage}`,
      `words_persisted_${videoId}_${currentLanguage}`,
      `intensity_analyzed_${videoId}_${currentLanguage}`
    ];
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      loadingCacheRef.current.delete(key);
    });
    
    // Force reload from database
    try {
      const freshSegments = await loadTranscriptSegmentsFresh(currentLanguage);
      if (freshSegments.length > 0) {
        const finalCaptions = freshSegments.map(segment => ({
          ...segment,
          startTime: Number(segment.startTime) || 0,
          endTime: Number(segment.endTime) || 0,
          text: segment.text || '',
          speaker: segment.speaker || 'Speaker',
          speakerColor: segment.speakerColor || '#3B82F6',
          words: (segment.words || []).map(word => ({
            text: word.text || '',
            startTime: Number(word.startTime) || 0,
            endTime: Number(word.endTime) || 0,
            emphasis: word.emphasis as 'loud' | 'quiet' | 'normal' | undefined,
            pitch: word.pitch as 'high' | 'low' | 'normal' | undefined
          }))
        })) as any[];
        
        setCaptions(finalCaptions);
        setTranscriptSegments(finalCaptions);
        console.log('✅ Force refresh completed with', finalCaptions.length, 'segments');
      }
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
    }
  };

  // Listen for explicit transcript save events to refresh data (avoid noisy storage listeners)
  useEffect(() => {
    const handleTranscriptSaved = (e: Event) => {
      try {
        const detail = (e as CustomEvent<any>).detail || {};
        if (detail?.videoId !== videoId) return;
        console.log('📢 Received transcript-saved event, refreshing...');
        if (detail.language && detail.language !== currentLanguage) {
          setCurrentLanguage(detail.language);
        }
        setTimeout(forceRefreshTranscript, 50);
      } catch {}
    };
    
    window.addEventListener('transcript-saved', handleTranscriptSaved as EventListener);
    return () => {
      window.removeEventListener('transcript-saved', handleTranscriptSaved as EventListener);
    };
  }, [videoId, currentLanguage]);

  const handleTranscriptUpdate = async (segments: any[], detectedLang?: string) => {
    console.log('🔄 ENHANCED PLAYER: handleTranscriptUpdate received', segments.length, 'segments for language', detectedLang || 'auto-detect');
    
  // Auto-detect language if not provided, but prefer explicit prop
  const autoDetectedLang = detectedLang || detectLanguageFromCaptions(segments);
  const preferredLang = language || autoDetectedLang;
  
  // Update current language if preferred language is different
  if (preferredLang !== currentLanguage) {
    console.log('🌐 Language resolved:', preferredLang, 'changing from:', currentLanguage);
    setCurrentLanguage(preferredLang);
  }
    
    console.log('🔍 ENHANCED PLAYER: First segment in handleTranscriptUpdate:', segments[0] ? {
      speaker: segments[0].speaker,
      color: segments[0].speakerColor,
      startTime: segments[0].startTime,
      endTime: segments[0].endTime,
      hasVocalIntensity: !!segments[0].vocal_intensity,
      text: segments[0].text.substring(0, 30) + '...'
    } : 'No segments');
    
    // Apply Character Manager mappings (names, colors, off-camera) as the single source of truth
    let applied = segments;
    try {
      const savedMappings = await loadSpeakerMappings(currentLanguage);
      // Ensure characters are available on first render
      let availableChars = characters;
      if (!availableChars || availableChars.length === 0) {
        try {
          const loaded = await loadCharacters();
          if (loaded && loaded.length > 0) {
            availableChars = loaded;
            setCharacters(loaded);
            // Keep localStorage in sync for AxessiblePlayer's final mapping gate
            const vid = videoId || 'default';
            localStorage.setItem(`characters-${vid}`, JSON.stringify(loaded));
            localStorage.setItem(`characters_${vid}`, JSON.stringify(loaded));
          }
        } catch (e) {
          console.warn('⚠️ ENHANCED PLAYER: loadCharacters failed inside handleTranscriptUpdate', e);
        }
      }
      const charByName: Record<string, any> = {};
      (availableChars || []).forEach((c: any) => { if (c?.name) charByName[c.name] = c; });
      
      applied = segments.map(s => {
        // If the segment speaker maps to a character, apply name, color, and off-camera
        const mappedCharacterName = savedMappings?.[s.speaker];
        const directCharacter = charByName[s.speaker]; // if already renamed previously
        const targetChar = mappedCharacterName ? charByName[mappedCharacterName] : directCharacter;
        
        if (targetChar) {
          return {
            ...s,
            speaker: targetChar.name,
            speakerColor: targetChar.color || s.speakerColor,
            isOffCamera: (typeof targetChar.isOffCamera === 'boolean' ? targetChar.isOffCamera : s.isOffCamera)
          };
        }
        
        // Otherwise keep original but still try to honor Character Manager color if names already match
        return {
          ...s,
          speakerColor: (charByName[s.speaker]?.color) || s.speakerColor
        };
      });
    } catch (e) {
      console.warn('⚠️ ENHANCED PLAYER: Failed to apply character mappings from database, using raw segments', e);
      applied = segments;
    }

    // Keep captions for the player UI and also persist raw segments for AD scheduler
    setCaptions([...applied]);
    setTranscriptSegments([...applied]);
    
    console.log('✅ ENHANCED PLAYER: Updated captions and transcriptSegments with', applied.length, 'segments, detected language:', preferredLang);
    
    if (onTranscriptUpdate) {
      onTranscriptUpdate(applied, preferredLang);
    }
  };

  const handleContentGenerated = (content: {
    captions: any[];
    audioDescription: any[];
  }) => {
    if (content.captions) {
      setCaptions(content.captions);
    }
    if (content.audioDescription) {
      setAudioDescriptions(content.audioDescription);
    }
  };

  const handleCharactersUpdate = async (updatedCharacters: any[]) => {
    setCharacters(updatedCharacters);
    console.log('🎨 Characters updated:', updatedCharacters);
    
    // Re-load transcript segments from DB in case speaker names/colors were remapped
    try {
      const refreshed = await loadTranscriptSegments(currentLanguage);
      if (refreshed && refreshed.length > 0) {
        setTranscriptSegments(refreshed);
        await handleTranscriptUpdate(refreshed, currentLanguage);
      }
    } catch (e) {
      console.warn('⚠️ Failed to refresh transcript after character update, falling back to local updates', e);
    }
    
    // Also immediately apply character colors to current in-memory captions for instant feedback
    if (captions.length > 0) {
      const characterColorMap: Record<string, string> = {};
      updatedCharacters.forEach(char => { characterColorMap[char.name] = char.color; });
      const updatedCaptions = captions.map(caption => ({
        ...caption,
        speakerColor: characterColorMap[caption.speaker] || caption.speakerColor
      }));
      setCaptions([...updatedCaptions]);
    }
  };

  const handleAudioDescriptionsUpdate = (descriptions: any[]) => {
    console.log('📢 Audio descriptions updated in EnhancedVideoPlayer:', descriptions.length);
    setAudioDescriptions([...descriptions]);
  };

  // Load saved audio descriptions from database
  useEffect(() => {
    if (!videoId) return;

    const loadAudioDescriptions = async () => {
      try {
        // Query for both 'es' and 'spanish' language values to handle inconsistency
        const { data, error } = await supabase
          .from('audio_descriptions')
          .select('*')
          .eq('video_id', videoId)
          .in('language', [currentLanguage || 'en', 'spanish', 'es'])
          .order('start_time');

        if (error) {
          console.error('Error loading audio descriptions:', error);
          return;
        }

        if (data && data.length > 0) {
          const formattedDescriptions = data.map(desc => ({
            text: desc.description,
            startTime: desc.start_time,
            endTime: desc.end_time,  
            voiceStyle: 'warm' as const,
            timestamp: desc.start_time
          }));
          setAudioDescriptions(formattedDescriptions);
          console.log('📢 Loaded audio descriptions from database:', formattedDescriptions.length, 'descriptions');
        } else {
          console.log('📢 No audio descriptions found for video:', videoId, 'language:', currentLanguage);
        }
      } catch (error) {
        console.error('Failed to load audio descriptions:', error);
      }
    };

    loadAudioDescriptions();
  }, [videoId, currentLanguage]);

  // Load saved data on component mount and language changes
  useEffect(() => {
    const loadSavedData = async () => {
      console.log('🔄 ENHANCED PLAYER: Loading database content for video:', videoId, 'language:', currentLanguage);
      
      // Clear any stale session storage that might prevent fresh loads
      const keysToRemove = [
        `loading_${videoId}_${currentLanguage}`,
        `words_persisted_${videoId}_${currentLanguage}`,
        `intensity_analyzed_${videoId}_${currentLanguage}`
      ];
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      try {
        // Try to load saved transcript from database with current language first
        let segments = await loadTranscriptSegments(currentLanguage);
        console.log('📖 ENHANCED PLAYER: Loaded transcript segments from database:', segments.length, 'segments for language:', currentLanguage);
        
        if (segments.length === 0) {
          console.log('⚠️ ENHANCED PLAYER: No segments found, clearing captions to prevent stale display');
          setCaptions([]);
          setTranscriptSegments([]);
          return;
        }
        
        setTranscriptSegments(segments);
        
        if (segments.length > 0) {
          console.log('🎯 ENHANCED PLAYER: Processing', segments.length, 'segments for video player');
          console.log('🔍 First segment check:', segments[0] ? { 
            startTime: segments[0].startTime, 
            endTime: segments[0].endTime,
            speaker: segments[0].speaker,
            color: segments[0].speakerColor,
            text: segments[0].text.substring(0, 30) + '...'
          } : 'No segments');

          // Apply character mappings directly without complex processing
          const finalCaptions = segments.map(segment => ({
            ...segment,
            // Ensure all required caption properties exist
            startTime: Number(segment.startTime) || 0,
            endTime: Number(segment.endTime) || 0,
            text: segment.text || '',
            speaker: segment.speaker || 'Speaker',
            speakerColor: segment.speakerColor || '#3B82F6',
            words: (segment.words || []).map(word => ({
              text: word.text || '',
              startTime: Number(word.startTime) || 0,
              endTime: Number(word.endTime) || 0,
              emphasis: word.emphasis as 'loud' | 'quiet' | 'normal' | undefined,
              pitch: word.pitch as 'high' | 'low' | 'normal' | undefined
            }))
          })) as any[];
          
          console.log('✅ ENHANCED PLAYER: Final captions ready:', finalCaptions.length, 'segments');
          console.log('🎨 Sample caption colors:', finalCaptions.slice(0, 3).map(c => ({ 
            speaker: c.speaker, 
            color: c.speakerColor 
          })));
          
          // Set captions for the player
          setCaptions(finalCaptions);
          
          // Auto-detect language and update transcript
          const detectedLang = detectLanguageFromCaptions(finalCaptions);
          await handleTranscriptUpdate(finalCaptions, detectedLang);
        }
        
        // Load saved audio descriptions
        const descriptions = await loadAudioDescriptions(currentLanguage);
        if (descriptions.length > 0) {
          const convertedDescriptions = descriptions.map(desc => ({
            id: desc.id || `ad-${Date.now()}-${Math.random()}`,
            text: desc.description,
            startTime: desc.startTime,
            endTime: desc.endTime,
            voiceStyle: 'warm' as const
          }));
          setAudioDescriptions(convertedDescriptions);
        } else {
          setAudioDescriptions([]);
        }
        
        // Load saved characters
        try {
          const chars = await loadCharacters();
          if (chars && chars.length > 0) {
            setCharacters(chars);
            console.log('👥 Loaded characters from DB:', chars.length);
          }
        } catch (err) {
          console.error('Failed to load characters:', err);
        }
        
      } catch (error) {
        console.error('❌ ENHANCED PLAYER: Error loading saved data:', error);
        setCaptions([]);
      }
    };

    if (videoId && currentLanguage) {
      loadSavedData();
    }
  }, [videoId, currentLanguage, loadTranscriptSegments, loadAudioDescriptions, loadCharacters]);

  return (
    <div className="space-y-6">
      <AxessiblePlayer
        videoSrc={videoSrc}
        posterSrc={posterSrc}
        title={title}
        videoId={videoId}
        selectedVoice={selectedVoice}
        selectedASLAvatar={selectedASLAvatar}
        contentType={contentType}
        className={className}
        initialCaptions={captions}
        dynamicDescriptions={audioDescriptions}
        onTranscriptUpdate={handleTranscriptUpdate}
      />
      
      {/* Content Generation and Management Controls */}
      <Tabs defaultValue="transcript" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transcript">Transcript & Analysis</TabsTrigger>
          <TabsTrigger value="audio-description">Audio Description</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transcript" className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Transcript Extraction & AI Analysis</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Extract speech from the video with automatic speaker identification and vocal intensity analysis. Captions are automatically enhanced for accessibility.
            </p>
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Auto-Enhanced:</strong> Speaker identification and vocal intensity analysis run automatically when you generate or load transcripts. Results are applied directly to captions for better accessibility.
              </p>
            </div>
            <TranscriptEditor
              videoUrl={videoSrc}
              videoId={videoId || 'default'}
              initialLanguage={currentLanguage}
              onTranscriptUpdate={handleTranscriptUpdate}
              onContentGenerated={handleContentGenerated}
            />
          </div>

          {/* Integrated Speaker & Character Management inside Transcript tab */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Speaker & Character Management</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Manage character colors and connect speakers to characters. Changes update captions immediately and follow the Captions with Intention protocol.
            </p>
            <CharacterManager
              videoId={videoId || 'default'}
              onCharactersUpdate={handleCharactersUpdate}
              existingCharacters={characters}
              language={currentLanguage}
              existingSpeakers={stableDetectedSpeakers}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="audio-description" className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Audio Description Generation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate AI-powered audio descriptions for visual elements in the video.
            </p>
            <AudioDescriptionEditor
              videoUrl={videoSrc}
              videoId={videoId || 'default'}
              videoData={{ transcript_language: currentLanguage }}
              transcriptSegments={transcriptSegments}
              onDescriptionsUpdate={handleAudioDescriptionsUpdate}
            />
          </div>
        </TabsContent>
        
      </Tabs>
    </div>
  );
};

export default EnhancedVideoPlayer;