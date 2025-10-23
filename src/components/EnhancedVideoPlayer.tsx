import React, { useState, useEffect, useMemo } from 'react';
import { AxessiblePlayer } from './AxessiblePlayer';
import { TranscriptEditor } from './TranscriptEditor';
import { AudioDescriptionEditor } from './AudioDescriptionEditor';
import { VideoAnalysisPanel } from './VideoAnalysisPanel';
import { CharacterManager } from './CharacterManager';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  selectedSignLanguageAvatar?: {
    id: string;
    name: string;
    description: string;
  };
  contentType?: 'recipe' | 'education';
  className?: string;
  onTranscriptUpdate?: (segments: CaptionSegment[], language: string) => void;
  isPublic?: boolean;
  videoStatus?: string;
  onLanguageChange?: (language: string) => void;
}

export const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
  videoSrc,
  posterSrc,
  title,
  videoId,
  language,
  selectedVoice,
  selectedSignLanguageAvatar,
  contentType = 'education',
  className = "",
  onTranscriptUpdate,
  isPublic,
  videoStatus,
  onLanguageChange
}) => {
  console.log('🚨 ENHANCED VIDEO PLAYER LOADED - videoId:', videoId, 'language:', language);
  
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [transcriptSegments, setTranscriptSegments] = useState<any[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState(language || 'en');
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [characters, setCharacters] = useState<any[]>([]);
  const [translatedCaptions, setTranslatedCaptions] = useState<CaptionSegment[] | null>(null);
  const { loadTranscriptSegments, loadAudioDescriptions, loadCharacters, loadSpeakerMappings, saveTranscriptSegments } = useVideoStorage(videoId);
  const { analyzeVocalIntensity, isAnalyzing: isAnalyzingIntensity } = useVocalIntensityAnalysis();
  const { analyzeSpeakers, isAnalyzing: isAnalyzingSpeakers } = useAdvancedSpeakerAnalysis();
  const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([]);
  
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

    console.log('🎯 Starting speaker diarization with priority cascade (Deepgram → Twelve Labs → OpenAI → AssemblyAI)...');

    // Prevent repeated diarization runs in a single session to avoid UI flicker
    const diarKey = `diarized_${videoId}_${currentLanguage}`;
    if (sessionStorage.getItem(diarKey) === 'done') {
      console.log('🛑 Skipping diarization (already done this session)');
      return stabilizeSpeakerColors(segments);
    }

    try {
      // ✅ Use unified function with full provider cascade
      const { data, error } = await supabase.functions.invoke('speaker-diarization-unified', {
        body: { 
          videoUrl,
          videoId,
          force_reanalysis: false
        }
      });

      if (error || !data?.success) {
        console.warn('⚠️ All speaker diarization providers failed, using color stabilization');
        return stabilizeSpeakerColors(segments);
      }
      
      if (!data?.speakers || !data?.segments) {
        console.warn('⚠️ No speaker data returned from diarization');
        return stabilizeSpeakerColors(segments);
      }

      console.log(`✅ Speaker diarization succeeded using: ${data.provider_used?.toUpperCase()}`);
      console.log(`🎯 ENHANCED PLAYER: Identified ${data.speakers.length} speakers via ${data.provider_used}`);
      
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
    
    // Spanish detection patterns - expanded with more common words
    if (combinedText.includes('hola') || 
        combinedText.includes('siento') || 
        combinedText.includes('pero') ||
        combinedText.includes('con') ||
        combinedText.includes('que') ||
        combinedText.includes('una') ||
        combinedText.includes('algo') ||
        combinedText.includes('muy') ||
        combinedText.includes('imagina') || 
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

  const handleTranscriptUpdate = async (segments: any[], detectedLang?: string) => {
    console.log('🔄 ENHANCED PLAYER: handleTranscriptUpdate received', segments.length, 'segments for language', detectedLang || 'current');
    
  // ONLY use detectedLang if explicitly provided - don't auto-detect to avoid discarding user's language choice
  const preferredLang = detectedLang || language || currentLanguage;
  
  console.log('🌐 Language resolution debug:', {
    propLanguage: language,
    detectedLang,
    preferredLang,
    currentLanguage,
    willUpdate: preferredLang !== currentLanguage
  });
  
  // Only update language if explicitly provided (not auto-detected)
  if (detectedLang && detectedLang !== currentLanguage) {
    console.log('🌐 Language explicitly changed to:', detectedLang, 'from:', currentLanguage);
    setCurrentLanguage(detectedLang);
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

      // Fallback: synthesize ephemeral characters from savedMappings if DB has none
      if ((!availableChars || availableChars.length === 0) && savedMappings && Object.keys(savedMappings).length > 0) {
        const targetNames = Array.from(new Set(Object.values(savedMappings).filter(Boolean)));
        const palette = ['#E5E517','#17E5E5','#E51717','#E58017','#17E517','#E517E5','#E85C2E','#47C2EB','#EBC247','#5E82ED','#C2EB47','#8C6BED'];
        const ephemeral = targetNames.map((name, idx) => ({ name, color: palette[idx % palette.length], type: 'main' }));
        availableChars = ephemeral as any[];
        setCharacters(ephemeral);
        const colorMap: Record<string,string> = {};
        ephemeral.forEach(c => { colorMap[c.name] = c.color; });
        localStorage.setItem('character-colors', JSON.stringify(colorMap));
        console.log('🧪 ENHANCED PLAYER: Using ephemeral characters from speaker_mappings:', ephemeral);
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
    dubbing: any;
  }) => {
    console.log('📝 Content generated:', content);
    if (content.captions) {
      setCaptions(content.captions);
    }
    // Audio descriptions are now handled only in the Audio Description tab
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

  const handleTranslatedContentUpdate = (content: any) => {
    console.log('🌍 ENHANCED PLAYER: Translated content received:', content.language, 'captions:', content.captions?.length || 0);
    if (content.captions && content.captions.length > 0) {
      setTranslatedCaptions(content.captions);
      setCaptions(content.captions);
    }
    if (content.audioDescription && content.audioDescription.length > 0) {
      setAudioDescriptions(content.audioDescription);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    console.log('🌍 ENHANCED PLAYER: Language changed to:', newLanguage);
    setCurrentLanguage(newLanguage);
    
    if (newLanguage === (language || 'en')) {
      console.log('↩️ Restoring original captions - reloading from database');
      setTranslatedCaptions(null);
      
      // Reload original language captions from database
      const segments = await loadTranscriptSegments(newLanguage);
      if (segments && segments.length > 0) {
        const converted: CaptionSegment[] = segments.map((seg: any) => ({
          text: seg.text || '',
          speaker: seg.speaker || 'Speaker',
          speakerColor: seg.speakerColor || seg.speaker_color || '#3B82F6',
          startTime: Number(seg.start_time || seg.startTime || 0),
          endTime: Number(seg.end_time || seg.endTime || 0),
          words: (seg.words as any) || [],
          pitch: typeof seg.pitch === 'number' ? seg.pitch : undefined,
          isOffCamera: seg.is_off_camera || seg.isOffCamera || false,
        }));
        setCaptions(converted);
        console.log('✅ Restored', converted.length, 'original captions for language:', newLanguage);
      }
    }
    
    if (onLanguageChange) {
      onLanguageChange(newLanguage);
    }
  };

  // Load saved audio descriptions from database
  useEffect(() => {
    if (!videoId) return;

    const loadAudioDescriptions = async () => {
      try {
        console.log('🔄 Loading audio descriptions for video:', videoId, 'language:', currentLanguage);
        
        // Query for audio descriptions with broader language matching
        const { data, error } = await supabase
          .from('audio_descriptions')
          .select('*')
          .eq('video_id', videoId)
          .in('language', [currentLanguage || 'en', 'spanish', 'es', 'en']) // Always include 'en' as fallback
          .order('start_time');

        if (error) {
          console.error('❌ Error loading audio descriptions:', error);
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
          console.log('✅ Loaded audio descriptions from database:', formattedDescriptions.length, 'descriptions for published video');
        } else {
          console.log('📢 No audio descriptions found for video:', videoId, 'language:', currentLanguage);
          // Try loading any audio descriptions regardless of language as fallback
          try {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('audio_descriptions')
              .select('*')
              .eq('video_id', videoId)
              .order('start_time')
              .limit(50);
              
            if (!fallbackError && fallbackData && fallbackData.length > 0) {
              const fallbackDescriptions = fallbackData.map(desc => ({
                text: desc.description,
                startTime: desc.start_time,
                endTime: desc.end_time,  
                voiceStyle: 'warm' as const,
                timestamp: desc.start_time
              }));
              setAudioDescriptions(fallbackDescriptions);
              console.log('✅ Loaded fallback audio descriptions:', fallbackDescriptions.length, 'descriptions');
            }
          } catch (fallbackError) {
            console.error('❌ Fallback audio description loading failed:', fallbackError);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load audio descriptions:', error);
      }
    };

    loadAudioDescriptions();
  }, [videoId, currentLanguage]);

  // Load saved data on component mount and language changes
  useEffect(() => {
    const loadSavedData = async () => {
      console.log('🔄 ENHANCED PLAYER: Loading database content for video:', videoId, 'language:', currentLanguage);
      
      // Prevent multiple simultaneous loads
      const loadingKey = `loading_${videoId}_${currentLanguage}`;
      if (sessionStorage.getItem(loadingKey)) {
        console.log('⚠️ Already loading data for this video/language combination');
        return;
      }
      sessionStorage.setItem(loadingKey, 'true');
      
      try {
        // Only auto-detect language if user hasn't explicitly chosen one
        let detectedLanguage = currentLanguage;
        if (!language && (!currentLanguage || currentLanguage === 'auto')) {
          // Only auto-detect if no explicit language preference
          const { data: availableTranscripts } = await supabase
            .from('transcript_segments')
            .select('language')
            .eq('video_id', videoId)
            .limit(5);
          
          if (availableTranscripts && availableTranscripts.length > 0) {
            const uniqueLanguages = [...new Set(availableTranscripts.map((t: any) => t.language))];
            // Prefer 'en' if available, otherwise take first
            detectedLanguage = uniqueLanguages.includes('en') ? 'en' : uniqueLanguages[0];
            console.log('🌐 Auto-detected language (no preference):', detectedLanguage);
            setCurrentLanguage(detectedLanguage);
          }
        } else {
          // User has explicit preference - RESPECT IT
          detectedLanguage = language || currentLanguage;
          console.log('✅ Using explicit language preference:', detectedLanguage);
          setCurrentLanguage(detectedLanguage);
        }
        
        // Load transcript segments with the determined language
        const segments = await loadTranscriptSegments(detectedLanguage);
        console.log('📖 ENHANCED PLAYER: Loaded transcript segments:', segments.length, 'segments for language:', detectedLanguage);
        setTranscriptSegments(segments);
        
        if (segments.length > 0) {
          console.log('🎯 ENHANCED PLAYER: First segment timing check:', segments[0] ? { 
            startTime: segments[0].startTime, 
            endTime: segments[0].endTime,
            text: segments[0].text.substring(0, 30) + '...'
          } : 'No segments');

          let captionSegments: CaptionSegment[] = [];
          
          try {
            // Convert database segments to caption format first, fixing missing timings and word timestamps
            captionSegments = segments.map((segment, segIdx) => {
              const rawWords = (segment.words || []).filter((w: any) => w && typeof w.text === 'string');
              // Compute segment-level times with robust fallbacks
              let start = Number(segment.startTime) || 0;
              let end = Number(segment.endTime) || 0;

              const firstWordWithTime = rawWords.find((w: any) => typeof w.startTime === 'number');
              const lastWordWithTime = [...rawWords].reverse().find((w: any) => typeof w.endTime === 'number');

              if ((start === 0 || !isFinite(start)) && firstWordWithTime) start = firstWordWithTime.startTime;
              if ((end === 0 || !isFinite(end)) && lastWordWithTime) end = lastWordWithTime.endTime;

              // If end still invalid or <= start, assign a minimal duration (will be refined below)
              if (!isFinite(end) || end <= start) {
                end = start + Math.max(1, rawWords.length * 0.3);
              }

              // Build words with guaranteed timings
              let words = rawWords.map((word: any) => ({ ...word }));

              // Fallback: if no word array present, synthesize it by splitting the text
              if ((!words || words.length === 0) && typeof segment.text === 'string' && segment.text.trim().length > 0) {
                const tokens = segment.text.trim().split(/\s+/).filter(Boolean);
                const tokenCount = tokens.length;
                // Ensure duration is enough; if invalid or too short, expand proportionally
                const minPerWord = 0.18; // ~180ms per word baseline
                const minDuration = Math.max(1, tokenCount * minPerWord);
                if (!isFinite(end) || end <= start || (end - start) < minDuration) {
                  end = start + minDuration;
                }
                const step = (end - start) / Math.max(1, tokenCount);
                words = tokens.map((t, i) => ({
                  text: t,
                  startTime: start + i * step,
                  endTime: start + (i + 1) * step,
                }));
                // Debug once per synthesized segment
                if (segIdx < 5) {
                  console.log(`🧩 ENHANCED PLAYER: Synthesized ${tokenCount} words for segment ${segIdx}`);
                }
              }

              // If words exist but missing timings, distribute uniformly
              const needsDistribution = words.length > 0 && !words.every((w: any) => typeof w.startTime === 'number' && typeof w.endTime === 'number');
              if (words.length > 0 && needsDistribution) {
                const total = Math.max(end - start, Math.max(1, words.length * 0.3));
                const step = total / words.length;
                words = words.map((w: any, i: number) => ({
                  text: w.text,
                  startTime: typeof w.startTime === 'number' ? w.startTime : start + i * step,
                  endTime: typeof w.endTime === 'number' ? w.endTime : start + (i + 1) * step,
                  emphasis: w.emphasis,
                  pitch: w.pitch
                }));
                // Ensure segment end matches last word end
                end = words[words.length - 1].endTime;
              }

              // Normalize relative word timings to absolute timeline if needed
              if (words && words.length > 0) {
                const maxWordEnd = Math.max(...words.map((w: any) => Number(w.endTime) || 0));
                const minWordStart = Math.min(...words.map((w: any) => (typeof w.startTime === 'number' ? w.startTime : Number(w.startTime) || 0)));
                const segDur = end - start;
                const looksRelative = maxWordEnd <= (segDur + 0.05) && minWordStart >= -0.05 && start >= 0;
                if (looksRelative) {
                  words = words.map((w: any) => ({
                    ...w,
                    startTime: start + ((typeof w.startTime === 'number' ? w.startTime : Number(w.startTime) || 0)),
                    endTime: start + ((typeof w.endTime === 'number' ? w.endTime : Number(w.endTime) || 0)),
                  }));
                  end = Math.max(end, start + maxWordEnd);
                  if (segIdx < 5) {
                    console.log(`🛠️ ENHANCED PLAYER: Normalized relative word timings for segment ${segIdx} (offset ${start.toFixed(2)}s)`);
                  }
                }
              }

              return {
                text: segment.text,
                speaker: segment.speaker || 'Speaker',
                startTime: start,
                endTime: end,
                words,
                speakerColor: segment.speakerColor || '#3B82F6',
                pitch: segment.pitch === 'high' ? 220 : segment.pitch === 'low' ? 100 : 180,
                volume: 50,
                type: 'dialogue' as const,
                isOffCamera: segment.isOffCamera || false,
                vocal_intensity: (segment as any).vocal_intensity as 'whisper' | 'normal' | 'yell' | 'shout' | undefined,
                intensity_confidence: (segment as any).intensity_confidence,
                auto_styling: (segment as any).auto_styling
              };
            });
            
            console.log('🎨 ENHANCED PLAYER: Converted to captions format:', captionSegments.length, 'segments');
            
            // 1. Advanced speaker identification - only if we don't already have trusted speakers from DB
            const isGenericSpeaker = (name?: string) => {
              if (!name) return true;
              const n = name.toLowerCase().trim();
              return n === 'speaker' || /^speaker\s*\d+$/.test(n) || n === 'unknown';
            };
            const trustedCount = captionSegments.filter(s => !isGenericSpeaker(s.speaker)).length;
            const hasTrustedSpeakers = trustedCount >= Math.max(1, Math.floor(captionSegments.length * 0.5));

            if (!hasTrustedSpeakers) {
              console.log('🎭 ENHANCED PLAYER: Processing advanced speaker identification (no trusted speakers detected)...');
              try {
                captionSegments = await performAdvancedSpeakerAnalysis(captionSegments, videoSrc, videoId);
                console.log('🎨 ENHANCED PLAYER: After advanced speaker analysis:', captionSegments.map(s => ({ speaker: s.speaker, color: s.speakerColor })).slice(0, 3));
              } catch (error) {
                console.warn('⚠️ Advanced speaker analysis failed, keeping original speakers/colors:', error);
                // On failure, do NOT override with generic colors; keep DB-derived values
              }
            } else {
              console.log('🛑 Skipping diarization: using saved transcript speakers/colors');
            }
            
            // 2. Analyze vocal intensity ONCE if needed with improved audio handling
            const needsIntensityAnalysis = captionSegments.some(s => !s.vocal_intensity);
            const hasIntensityKey = `intensity_analyzed_${videoId}_${currentLanguage}`;
            const alreadyAnalyzed = sessionStorage.getItem(hasIntensityKey);
            
            console.log('🔊 ENHANCED PLAYER: Needs intensity analysis:', needsIntensityAnalysis, 'Already analyzed:', !!alreadyAnalyzed);
            
            if (needsIntensityAnalysis && !isAnalyzingIntensity && !alreadyAnalyzed) {
              console.log('🔊 ENHANCED PLAYER: Starting enhanced vocal intensity analysis with audio extraction...');
              sessionStorage.setItem(hasIntensityKey, 'true'); // Prevent duplicate calls
              try {
                // Enhanced analysis with video URL for better audio processing
                const { data, error } = await supabase.functions.invoke('analyze-vocal-intensity', {
                  body: {
                    video_id: videoId,
                    video_url: videoSrc, // Provide video URL for audio extraction
                    segments: captionSegments.map(seg => ({
                      text: seg.text,
                      start_time: seg.startTime,
                      end_time: seg.endTime,
                      speaker: seg.speaker
                    }))
                  }
                });

                if (error) throw error;

                if (data?.success && data?.analyzed_segments) {
                  captionSegments = captionSegments.map((segment, idx) => {
                    const analyzedSegment = data.analyzed_segments[idx];
                    if (analyzedSegment) {
                      return {
                        ...segment,
                        vocal_intensity: analyzedSegment.vocal_intensity as 'whisper' | 'normal' | 'yell' | 'shout' | undefined,
                        intensity_confidence: analyzedSegment.intensity_confidence || 0.5,
                        auto_styling: analyzedSegment.auto_styling
                      };
                    }
                    return segment;
                  });
                  console.log('🔊 ENHANCED PLAYER: Enhanced vocal intensity analysis completed for', data.analyzed_segments.length, 'segments');
                } else {
                  console.warn('⚠️ Vocal intensity analysis returned no data');
                }
              } catch (error) {
                console.error('❌ ENHANCED PLAYER: Enhanced vocal intensity analysis failed:', error);
                sessionStorage.removeItem(hasIntensityKey); // Allow retry on failure
                
                // Fallback: basic text-based analysis
                captionSegments = captionSegments.map(segment => {
                  const text = segment.text.toLowerCase();
                  let intensity: 'whisper' | 'normal' | 'yell' | 'shout' = 'normal';
                  let confidence = 0.3;
                  
                  if (text.includes('!!!') || text === text.toUpperCase()) {
                    intensity = 'shout';
                    confidence = 0.7;
                  } else if (text.includes('!!') || /[!?]{2,}/.test(text)) {
                    intensity = 'yell';
                    confidence = 0.6;
                  } else if (text.includes('...') || text.includes('*whisper')) {
                    intensity = 'whisper';
                    confidence = 0.5;
                  }
                  
                  return {
                    ...segment,
                    vocal_intensity: intensity,
                    intensity_confidence: confidence,
                    auto_styling: {}
                  };
                });
              }
            }
            
          } catch (error) {
            console.error('❌ ENHANCED PLAYER: Failed to process segments:', error);
            // Fallback: convert with basic speaker colors
            captionSegments = applyFallbackSpeakerColors(segments.map(segment => ({
              text: segment.text,
              speaker: segment.speaker || 'Speaker',
              startTime: segment.startTime,
              endTime: segment.endTime,
              words: (segment.words || []).map(word => ({
                text: word.text,
                startTime: word.startTime || 0,
                endTime: word.endTime || 0,
                emphasis: word.emphasis,
                pitch: word.pitch
              })),
              speakerColor: segment.speakerColor,
              pitch: segment.pitch === 'high' ? 220 : segment.pitch === 'low' ? 100 : 180,
              volume: 50,
              type: 'dialogue' as const,
              isOffCamera: segment.isOffCamera || false
            })));
          }

          // Convert processed segments for player
          const convertedSegments = captionSegments.map((seg, index) => ({
            ...seg,
            id: `segment-${Date.now()}-${index}`,
            _updateKey: `${Date.now()}-${Math.random()}`
          }));
          
          console.log('🎯 ENHANCED PLAYER: Final converted segments:', convertedSegments.length);
          console.log('🎯 ENHANCED PLAYER: Sample caption data:', convertedSegments.slice(0, 2).map(s => ({
            speaker: s.speaker,
            color: s.speakerColor,
            startTime: s.startTime,
            endTime: s.endTime,
            vocalIntensity: s.vocal_intensity,
            text: s.text.substring(0, 30) + '...'
          })));
          
          // Persist synthesized/normalized word timings to DB once so all devices get word-by-word
          try {
            const persistKey = `words_persisted_${videoId}_${currentLanguage}`;
            const missingWords = captionSegments.some(seg => !seg.words || seg.words.length === 0 || !seg.words.every((w: any) => typeof w.startTime === 'number' && typeof w.endTime === 'number'));
            
            if (missingWords && !sessionStorage.getItem(persistKey)) {
              console.log('💾 ENHANCED PLAYER: Persisting synthesized word timings to database...');
              
              // Fetch existing character_id values from database
              const { data: dbSegments } = await supabase
                .from('transcript_segments')
                .select('idx, start_time, end_time, character_id')
                .eq('video_id', videoId)
                .eq('language', currentLanguage)
                .order('start_time');
              
              if (!dbSegments || dbSegments.length === 0) {
                console.warn('⚠️ No existing segments in database, saving without character_id preservation');
                await saveTranscriptSegments(convertedSegments as any, currentLanguage);
                sessionStorage.setItem(persistKey, 'true');
                return;
              }
              
              // Match segments by time proximity to preserve character_id
              const segmentsWithCharIds = convertedSegments.map((seg, index) => {
                // Find closest database segment by start_time
                const closest = dbSegments.reduce((prev, curr) => {
                  const prevDiff = Math.abs(prev.start_time - seg.startTime);
                  const currDiff = Math.abs(curr.start_time - seg.startTime);
                  return currDiff < prevDiff ? curr : prev;
                });
                
                // Only use character_id if time match is within 0.5 seconds
                const timeDiff = Math.abs(closest.start_time - seg.startTime);
                const characterId = timeDiff < 0.5 ? closest.character_id : null;
                
                return {
                  ...seg,
                  idx: index,
                  characterId: characterId
                };
              });
              
              await saveTranscriptSegments(segmentsWithCharIds as any, currentLanguage);
              sessionStorage.setItem(persistKey, 'true');
              console.log('✅ ENHANCED PLAYER: Persisted word timings with character_id preservation');
            }
          } catch (e) {
            console.warn('⚠️ ENHANCED PLAYER: Could not persist word timings (possibly offline/anon):', e);
          }
          
          // Auto-detect language and update transcript
           const detectedLang = detectLanguageFromCaptions(convertedSegments);
           console.log('🌐 Auto-detected language from transcript:', detectedLang);
           
           // Remove conflicting erroneous segment: ~30s, speaker "Both", text contains "Vegas" and "baby"
           const filteredSegments = convertedSegments.filter(seg => {
             const startsNear30 = seg.startTime >= 29 && seg.startTime <= 31;
             const textMatch = /vegas.*baby/i.test(seg.text || '');
             const speakerMatch = (seg.speaker || '').toLowerCase() === 'both';
             return !(startsNear30 && textMatch && speakerMatch);
           });
           if (filteredSegments.length !== convertedSegments.length) {
             console.log('🧹 Removed conflicting "Vegas, Baby" segment near 30s (speaker: Both)');
           }
           
           await handleTranscriptUpdate(filteredSegments, detectedLang);
        } else {
          console.log('⚠️ ENHANCED PLAYER: No saved transcript found for language:', currentLanguage);
          
          // Check if there are generated captions available and convert them to transcripts
          if (captions.length > 0) {
            console.log('🔄 Converting existing captions to transcript segments:', captions.length);
            const detectedLang = detectLanguageFromCaptions(captions);
            await handleTranscriptUpdate(captions, detectedLang);
          } else {
            setCaptions([]);
            setTranscriptSegments([]);
          }
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
        
        // Load saved characters from DB (fallback to localStorage if unauthenticated handled in hook)
        try {
          const chars = await loadCharacters();
          if (chars && chars.length > 0) {
            setCharacters(chars);
            console.log('👥 Loaded characters from DB:', chars.length);
          } else {
            // Legacy/local fallback
            const savedCharacters = localStorage.getItem(`characters-${videoId}`) || localStorage.getItem(`characters_${videoId}`);
            if (savedCharacters) {
              const charactersData = JSON.parse(savedCharacters);
              setCharacters(charactersData);
              console.log('👥 Loaded characters from localStorage:', charactersData.length);
            }
          }
        } catch (err) {
          console.error('Failed to load characters:', err);
        }
        
      } catch (error) {
        console.error('❌ ENHANCED PLAYER: Error loading saved data:', error);
        setCaptions([]);
      } finally {
        sessionStorage.removeItem(loadingKey); // Allow future loads
      }
    };

    if (videoId && currentLanguage) {
      loadSavedData();
    }
  }, [videoId, currentLanguage, loadTranscriptSegments, analyzeVocalIntensity, isAnalyzingIntensity]);

  return (
    <div className="space-y-6">
      <AxessiblePlayer
        videoSrc={videoSrc}
        posterSrc={posterSrc}
        title={title}
        videoId={videoId}
        selectedVoice={selectedVoice}
        selectedSignLanguageAvatar={selectedSignLanguageAvatar}
        contentType={contentType}
        className={className}
        initialCaptions={translatedCaptions || captions}
        dynamicDescriptions={audioDescriptions}
        onTranscriptUpdate={handleTranscriptUpdate}
        isPublic={isPublic}
        videoStatus={videoStatus}
        originalLanguage={language || 'en'}
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
        onTranslatedContentUpdate={handleTranslatedContentUpdate}
      />
      
      {/* Content Generation and Management Controls */}
      <Tabs defaultValue="transcript" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/30">
          <TabsTrigger 
            value="transcript" 
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-light"
          >
            Transcript Extraction & Character Management
          </TabsTrigger>
          <TabsTrigger 
            value="audio-description"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-light"
          >
            Audio Description and Video Analysis
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="transcript" className="space-y-6">
          <Card className="shadow-soft border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-light text-foreground">Transcript Extraction & Character Management</CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Extract speech from the video with automatic speaker identification and vocal intensity analysis. Captions are automatically enhanced for accessibility.
              </p>
              <div className="bg-accent/50 border border-accent-foreground/20 rounded-lg p-4 mt-4">
                <p className="text-sm text-accent-foreground">
                  <strong>Auto-Enhanced:</strong> Speaker identification and vocal intensity analysis run automatically when you generate or load transcripts. Results are applied directly to captions for better accessibility.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <TranscriptEditor
                videoUrl={videoSrc}
                videoId={videoId || 'default'}
                initialLanguage={currentLanguage}
                onTranscriptUpdate={handleTranscriptUpdate}
                onContentGenerated={handleContentGenerated}
                onLanguageChange={(lang) => {
                  setCurrentLanguage(lang);
                  onLanguageChange?.(lang);
                }}
              />
            </CardContent>
          </Card>

          {/* Integrated Speaker & Character Management inside Transcript tab */}
          <Card className="shadow-soft border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-light text-foreground">Speaker & Character Management</CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Manage character colors and connect speakers to characters. Changes update captions immediately and follow the Captions with Intention protocol.
              </p>
            </CardHeader>
            <CardContent>
              <CharacterManager
                videoId={videoId || 'default'}
                onCharactersUpdate={handleCharactersUpdate}
                existingCharacters={characters}
                language={currentLanguage}
                existingSpeakers={stableDetectedSpeakers}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="audio-description" className="space-y-6">
          {/* Video Analysis Panel */}
          <Card className="shadow-soft border-border">
            <CardContent className="p-6">
              <VideoAnalysisPanel
                assetId={videoId || 'default'}
                playbackUrl={videoSrc}
                videoElementId="video-player"
                videoId={videoId}
              />
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-light text-foreground">Audio Description Generation</CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enable audio descriptions for visual elements in the video.
              </p>
            </CardHeader>
            <CardContent>
              <AudioDescriptionEditor
                videoUrl={videoSrc}
                videoId={videoId || 'default'}
                videoData={{ transcript_language: currentLanguage }}
                transcriptSegments={transcriptSegments}
                onDescriptionsUpdate={handleAudioDescriptionsUpdate}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>
    </div>
  );
};

export default EnhancedVideoPlayer;