import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useAdvancedSpeakerAnalysis } from '@/hooks/useAdvancedSpeakerAnalysis';
import { getSpeakerColor as getSpeakerColorFromPalette } from '@/lib/cwiPalette';
import { injectSyllables } from '@/lib/syllables';

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
  const { t } = useTranslation();
  console.log('🚨 ENHANCED VIDEO PLAYER LOADED - videoId:', videoId, 'language:', language);
  
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [transcriptSegments, setTranscriptSegments] = useState<any[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState(
    language === 'auto' ? 'en' : (language || 'en')
  );
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [characters, setCharacters] = useState<any[]>([]);
  const [speakerMappings, setSpeakerMappings] = useState<Record<string, string>>({});
  const [translatedCaptions, setTranslatedCaptions] = useState<CaptionSegment[] | null>(null);
  const { loadTranscriptSegments, loadAudioDescriptions, loadCharacters, loadSpeakerMappings, saveTranscriptSegments } = useVideoStorage(videoId);
  const { analyzeSpeakers, isAnalyzing: isAnalyzingSpeakers } = useAdvancedSpeakerAnalysis();
  const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([]);
  
  // Stabilize language to prevent flickering
  const stableLanguageRef = useRef(currentLanguage);
  const languageChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLanguageSet = useRef(false);
  
  // Debounced language setter
  const debouncedSetLanguage = (newLang: string) => {
    if (languageChangeTimerRef.current) {
      clearTimeout(languageChangeTimerRef.current);
    }
    languageChangeTimerRef.current = setTimeout(() => {
      if (stableLanguageRef.current !== newLang && initialLanguageSet.current) {
        console.log('🌐 Language change:', stableLanguageRef.current, '→', newLang);
        setCurrentLanguage(newLang);
        stableLanguageRef.current = newLang;
        onLanguageChange?.(newLang);
      }
    }, 300);
  };
  
  // Set initial language once and prevent auto-switching
  useEffect(() => {
    if (!initialLanguageSet.current) {
      const initialLang = language === 'auto' ? 'en' : (language || 'en');
      stableLanguageRef.current = initialLang;
      setCurrentLanguage(initialLang);
      initialLanguageSet.current = true;
      console.log('🎯 Initial language locked:', initialLang);
    }
  }, []);
  
  // Load audio descriptions from database with cached audio URLs
  useEffect(() => {
    const loadAudioDescriptionsFromDB = async () => {
      if (!videoId) return;
      
      const { data, error } = await supabase
        .from('audio_descriptions')
        .select('*')
        .eq('video_id', videoId)
        .eq('language', currentLanguage)
        .eq('audio_generation_status', 'completed') // Only load completed audio
        .order('start_time');
      
      if (!error && data) {
        console.log(`🎵 Loaded ${data.length} audio descriptions with cached audio for language: ${currentLanguage}`);
        setAudioDescriptions(data);
      }
    };
    
    loadAudioDescriptionsFromDB();
  }, [videoId, currentLanguage]);
  
  // Stable list of detected speakers from transcript segments only (avoid flicker)
  // FIX 1: Use ASR labels instead of display names to prevent dropdown flickering
  const stableDetectedSpeakers = useMemo(() => {
    const labels = transcriptSegments
      .map((s: any) => s.speakerAsrLabel || s.speaker_asr_label || null)
      .filter(Boolean)
      .map((l: string) => `Speaker ${String(l).replace(/^Speaker\s+/, '')}`);
    return Array.from(new Set(labels)).sort();
  }, [transcriptSegments]);
  // Single neutral color until character is explicitly identified
  const DEFAULT_NEUTRAL = '#22E3D0'; // Light blue for unidentified speakers
  
  // Phase 1C: Add data refresh trigger
  const [dataVersion, setDataVersion] = useState(0);
  const forceRefresh = () => setDataVersion(v => v + 1);
  
  // Stability guard: track segment colors to prevent micro-flickers during DB writes
  const colorStabilityRef = useRef<Map<string, { color: string; timestamp: number }>>(new Map());
  const STABILITY_WINDOW_MS = 2000; // 2 seconds
  
  // Pure color resolver - simple precedence rule
  const resolveSpeakerColor = useMemo(() => {
    return function(seg: { 
      speaker?: string; 
      character_id?: string | null; 
      speakerColor?: string;
      startTime?: number;
      endTime?: number;
    }): string {
      const segmentKey = `${seg.startTime?.toFixed(2) || '0'}-${seg.endTime?.toFixed(2) || '0'}`;
      const now = Date.now();
      
      // Simple rule: character_id set → use speaker_color, else → neutral
      const resolvedColor = seg.character_id && seg.speakerColor 
        ? seg.speakerColor 
        : DEFAULT_NEUTRAL;
      
      // Stability guard: prevent flickers during DB writes
      const cached = colorStabilityRef.current.get(segmentKey);
      
      if (cached) {
        const age = now - cached.timestamp;
        
        // If we had a character color but now resolving to neutral, and it's within stability window
        if (cached.color !== DEFAULT_NEUTRAL && 
            resolvedColor === DEFAULT_NEUTRAL && 
            age < STABILITY_WINDOW_MS) {
          console.log('🛡️ Stability guard: retaining', cached.color, 'for', segmentKey);
          return cached.color;
        }
      }
      
      // Update cache with new color
      if (!cached || cached.color !== resolvedColor) {
        colorStabilityRef.current.set(segmentKey, { color: resolvedColor, timestamp: now });
      }
      
      return resolvedColor;
    };
  }, []);
  
  const resolveDisplayName = (seg: any): string => {
    // Prioritize character names, avoid generic "Speaker"
    if ((seg as any).character_id && seg.speaker) {
      return seg.speaker;
    }
    if (seg.speaker && seg.speaker !== 'Speaker') {
      return seg.speaker;
    }
    return (seg as any).speakerAsrLabel || seg.speaker_asr_label || 'Speaker';
  };

  const stabilizeSpeakerColors = (segments: CaptionSegment[]): CaptionSegment[] => {
    return segments.map(segment => ({
      ...segment,
      speaker: resolveDisplayName(segment),
      speakerColor: resolveSpeakerColor(segment)
    }));
  };

  // Fallback speaker color assignment for error cases
  const applyFallbackSpeakerColors = (segments: CaptionSegment[]): CaptionSegment[] => {
    return segments.map(seg => ({
      ...seg,
      speakerColor: resolveSpeakerColor(seg) // Use resolver instead of palette
    }));
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

      // Build speaker timeline for dominance-based assignment
      const speakerTimeline = (data.segments as Array<any>).map(seg => ({
        startTime: seg.startTime,
        endTime: seg.endTime,
        speaker: seg.speaker,
        color: speakerByName.get(seg.speaker)?.color
      }));

      const updatedSegments: CaptionSegment[] = [];
      
      for (const segment of segments) {
        // Calculate per-speaker overlap
        const overlapMap = new Map<string, number>();
        let totalOverlap = 0;
        
        for (const diar of speakerTimeline) {
          const ov = computeOverlap(segment.startTime, segment.endTime, diar.startTime, diar.endTime);
          if (ov > 0) {
            overlapMap.set(diar.speaker, (overlapMap.get(diar.speaker) || 0) + ov);
            totalOverlap += ov;
          }
        }
        
        // Find dominant speaker (≥60% overlap)
        let dominantSpeaker: string | null = null;
        let maxOverlap = 0;
        
        for (const [speaker, overlap] of overlapMap.entries()) {
          const dominance = totalOverlap > 0 ? overlap / totalOverlap : 0;
          if (dominance >= 0.6 && overlap > maxOverlap) {
            dominantSpeaker = speaker;
            maxOverlap = overlap;
          }
        }
        
        // Assign speaker if dominant, otherwise keep original
        if (dominantSpeaker) {
          const meta = speakerByName.get(dominantSpeaker);
          updatedSegments.push({
            ...segment,
            speaker: meta?.name || dominantSpeaker,
            speakerColor: meta?.color || segment.speakerColor
          });
        } else {
          // No dominant speaker (multi-speaker segment)
          // Keep original assignment or use first overlapping speaker
          const firstSpeaker = Array.from(overlapMap.keys())[0];
          if (firstSpeaker) {
            const meta = speakerByName.get(firstSpeaker);
            updatedSegments.push({
              ...segment,
              speaker: meta?.name || firstSpeaker,
              speakerColor: meta?.color || segment.speakerColor
            });
          } else {
            updatedSegments.push(segment);
          }
        }
      }

      console.log('✅ ENHANCED PLAYER: Applied speaker assignments with 60% dominance to', updatedSegments.length, 'segments');
      sessionStorage.setItem(diarKey, 'done');
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
          speaker: caption.speaker || (caption as any).speakerAsrLabel || 'Unknown',
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

  // Listen for transcript-segments-updated events from TranscriptEditor
  useEffect(() => {
    const handler = async (e: CustomEvent) => {
      if (e.detail?.videoId !== videoId) return;
      
      console.log('🔄 ENHANCED VIDEO PLAYER: Received transcript update event, refreshing captions...');
      
      // Re-load segments from DB with updated character colors
      const segments = await loadTranscriptSegments(currentLanguage);
      
      // ✅ RUNTIME SAFETY: Verify words match text, rebuild if stale
      const normalizeText = (t: string) => 
        t.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
      
      const captionSegments = segments.map((seg: any) => {
        let finalWords = seg.words;
        
        // Check if words array is stale
        if (finalWords && finalWords.length > 0) {
          const wordsText = finalWords.map((w: any) => w.text).join(' ');
          const mismatch = normalizeText(wordsText) !== normalizeText(seg.text);
          
          if (mismatch) {
            console.warn(`⚠️ Words array stale for segment at ${seg.startTime}s. Regenerating from text.`);
            // Rebuild words using same heuristic as TranscriptEditor
            const tokens = seg.text.match(/\S+/g) || [];
            const duration = seg.endTime - seg.startTime;
            const timePerWord = duration / Math.max(tokens.length, 1);
            
            finalWords = tokens.map((token: string, i: number) => ({
              text: token,
              startTime: seg.startTime + (i * timePerWord),
              endTime: seg.startTime + ((i + 1) * timePerWord),
              emphasis: 'normal',
              pitch: 'normal'
            }));
          }
        }
        
        return {
          id: seg.id,
          text: seg.text,
          startTime: seg.startTime,
          endTime: seg.endTime,
          speaker: seg.speaker,
          speakerColor: seg.speakerColor,
          emphasis: seg.emphasis,
          pitch: seg.pitch,
          words: finalWords,
          speakerAsrLabel: seg.speakerAsrLabel,
          character_id: seg.character_id
        };
      });
      
      const stabilized = stabilizeSpeakerColors(captionSegments);
      setCaptions(stabilized);
      
      console.log('✅ ENHANCED VIDEO PLAYER: Captions refreshed with updated character assignments');
    };
    
    window.addEventListener('transcript-segments-updated', handler as EventListener);
    return () => window.removeEventListener('transcript-segments-updated', handler as EventListener);
  }, [videoId, currentLanguage, loadTranscriptSegments]);

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
      
      // Store mappings in state for pure color resolution
      // NOTE: useVideoStorage already handles localStorage fallback - don't duplicate writes
      if (savedMappings && Object.keys(savedMappings).length > 0) {
        setSpeakerMappings(savedMappings);
        console.log('💾 ENHANCED PLAYER: Loaded speaker mappings:', savedMappings);
      } else {
        setSpeakerMappings({});
      }
      
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
      const charById: Record<string, any> = {};
      (availableChars || []).forEach((c: any) => {
        if (c?.id) charById[c.id] = c;
        if (c?.name) charByName[c.name] = c;
      });
      
      // Helper to detect UUID format
      const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
      
      applied = segments.map(s => {
        // Check if saved mapping value is a UUID (character ID) or name
        const mappedValue = savedMappings?.[s.speaker];
        const targetChar = mappedValue 
          ? (isUUID(mappedValue) ? charById[mappedValue] : charByName[mappedValue])
          : charByName[s.speaker]; // fallback to direct name match
        
        if (targetChar) {
          return {
            ...s,
            speaker: targetChar.name,
            speakerColor: targetChar.color || s.speakerColor,
            character_id: targetChar.id,
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

    // ✅ PHASE 2: Character-length-based word synthesis for realistic timing
    const synthesizeWords = (text: string, start: number, end: number): Array<{text: string, startTime: number, endTime: number, emphasis: 'normal', pitch: 'normal'}> => {
      const tokens: string[] = text.match(/\S+/g) || [];
      if (!tokens.length) return [];
      
      // Calculate character-based weights (longer words take more time)
      const totalChars: number = tokens.reduce((sum: number, t: string) => sum + t.length, 0);
      const duration: number = end - start;
      
      let currentTime: number = start;
      return tokens.map((token: string) => {
        const charWeight: number = token.length / totalChars;
        const wordDuration: number = duration * charWeight;
        const wordEnd: number = Math.min(end, currentTime + wordDuration);
        
        const result = {
          text: token,
          startTime: currentTime,
          endTime: wordEnd,
          emphasis: 'normal' as const,
          pitch: 'normal' as const,
        };
        
        currentTime = wordEnd;
        return result;
      });
    };
    
    applied = applied.map((seg: any) => {
      if (!seg.words || seg.words.length === 0) {
        console.log(`🔧 Synthesizing words for segment at ${seg.startTime}s (no provider timings)`);
        return {
          ...seg,
          words: synthesizeWords(seg.text, seg.startTime, seg.endTime)
        };
      }
      return seg;
    });

    // Word timing normalization: Ensure all words have start/end times
    // CRITICAL: Anchor first word to segment.startTime for CWI sync
    applied = applied.map((segment: any) => {
      if (!segment.words || segment.words.length === 0) {
        return segment;
      }

      const segmentDuration = segment.endTime - segment.startTime;
      const avgWordDuration = segmentDuration / segment.words.length;

      const normalizedWords = segment.words.map((word: any, index: number) => {
        const wordText = typeof word === 'string' ? word : word.text;
        const hasValidTiming = word.startTime !== undefined && 
                               word.endTime !== undefined && 
                               word.startTime >= segment.startTime &&
                               word.endTime <= segment.endTime;

        // PHASE 1: Trust AssemblyAI timings - only force alignment if truly invalid
        if (index === 0) {
          const firstWordStart = hasValidTiming ? word.startTime : segment.startTime;
          const firstWordEnd = hasValidTiming ? word.endTime : segment.startTime + avgWordDuration;
          
          // Only align if timing is completely broken (>500ms outside segment bounds)
          const isCompletelyInvalid = 
            !hasValidTiming ||
            firstWordStart < segment.startTime - 0.5 ||  // More than 500ms before segment
            firstWordEnd > segment.endTime + 0.5;         // More than 500ms after segment
          
          return {
            text: wordText,
            startTime: isCompletelyInvalid ? segment.startTime : firstWordStart,
            endTime: isCompletelyInvalid ? (segment.startTime + avgWordDuration) : firstWordEnd,
            emphasis: word.emphasis || 'normal',
            pitch: word.pitch || 'normal',
            syllables: word.syllables || undefined
          };
        }

        // Preserve valid timing for other words
        if (hasValidTiming) {
          return {
            text: wordText,
            startTime: word.startTime,
            endTime: word.endTime,
            emphasis: word.emphasis || 'normal',
            pitch: word.pitch || 'normal',
            syllables: word.syllables || undefined
          };
        }

        // Synthesize timing for missing data
        const wordStart = segment.startTime + (index * avgWordDuration);
        const wordEnd = Math.min(segment.endTime, wordStart + avgWordDuration);
        
        return {
          text: wordText,
          startTime: wordStart,
          endTime: wordEnd,
          emphasis: word.emphasis || 'normal',
          pitch: word.pitch || 'normal',
          syllables: word.syllables || undefined
        };
      });

      return {
        ...segment,
        words: normalizedWords
      };
    });

    console.log('✅ ENHANCED PLAYER: Word timing normalized. First segment words:', applied[0]?.words?.slice(0, 3));

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
        const converted: CaptionSegment[] = segments.map((seg: any) => {
          // Trust what the DB view already decided (character name or "Speaker A/B/C")
          const speaker = seg.speaker || seg.speakerAsrLabel || 'Unknown';
          const speakerColor = resolveSpeakerColor(seg); // Use resolver for consistency
          
          return {
            text: seg.text || '',
            speaker,
            speakerColor,
            startTime: Number(seg.start_time || seg.startTime || 0),
            endTime: Number(seg.end_time || seg.endTime || 0),
            words: (seg.words as any) || [],
            pitch: typeof seg.pitch === 'number' ? seg.pitch : undefined,
            isOffCamera: seg.is_off_camera || seg.isOffCamera || false,
          };
        });
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
        
        // Query for audio descriptions - only for current language
        const { data, error } = await supabase
          .from('audio_descriptions')
          .select('*')
          .eq('video_id', videoId)
          .eq('language', currentLanguage || 'en')
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
        }
      } catch (error) {
        console.error('❌ Failed to load audio descriptions:', error);
      }
    };

    loadAudioDescriptions();
  }, [videoId, currentLanguage]);

  // Helper to check available languages
  const checkAvailableLanguages = async (videoId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('transcript_segments_clean')
      .select('language')
      .eq('video_id', videoId)
      .limit(200);

    if (error) {
      console.warn('checkAvailableLanguages error:', error);
      return [];
    }
    return [...new Set((data || []).map((d: any) => d.language).filter(Boolean))];
  };

  // Load saved data on component mount and language changes
  useEffect(() => {
    const loadSavedData = async () => {
      console.log('🔄 ENHANCED PLAYER: Loading database content for video:', videoId, 'language:', currentLanguage, 'version:', dataVersion);
      
      // Prevent multiple simultaneous loads
      const loadingKey = `loading_${videoId}_${currentLanguage}_${dataVersion}`;
      if (sessionStorage.getItem(loadingKey)) {
        console.log('⚠️ Already loading data for this video/language combination');
        return;
      }
      sessionStorage.setItem(loadingKey, 'true');
      
      try {
        let targetLanguage = currentLanguage;

        // 1) If no language was chosen yet (or 'auto'), we can detect one.
        if (!targetLanguage || targetLanguage === 'auto') {
          // Prefer the video's declared/original language prop first, else English.
          targetLanguage = language || 'en';
          setCurrentLanguage(targetLanguage);
        } else {
          // 2) If caller selected a language, verify it exists for this video.
          const available = await checkAvailableLanguages(videoId);
          console.log('📋 Available languages for video:', available);

          if (!available.includes(targetLanguage)) {
            console.warn(`⚠️ Language '${targetLanguage}' not available. Falling back.`);
            targetLanguage = available[0] || (language || 'en');
            setCurrentLanguage(targetLanguage);
          }
        }

        console.log('🌍 Loading captions/audio-description for language:', targetLanguage);
        
        // Load characters from database first
        const charactersFromDB = await loadCharacters();
        console.log('🎭 Loaded characters from database:', charactersFromDB?.length || 0);
        
        // Load transcript segments with the correct target language
        let segments = await loadTranscriptSegments(targetLanguage);
        console.log('📖 ENHANCED PLAYER: Loaded transcript segments:', segments.length, 'segments for language:', targetLanguage);
        
        // Apply character assignments to segments missing character_id
        if (charactersFromDB && charactersFromDB.length > 0 && segments.length > 0) {
          const speakerCharMap: Record<string, any> = {};
          charactersFromDB.forEach(char => {
            speakerCharMap[char.name.toLowerCase()] = char;
          });
          
          let appliedCount = 0;
          segments = segments.map(seg => {
            if (!seg.character_id && seg.speaker) {
              const matchedChar = speakerCharMap[seg.speaker.toLowerCase()];
              if (matchedChar) {
                appliedCount++;
                return {
                  ...seg,
                  character_id: matchedChar.id,
                  speakerColor: matchedChar.color
                };
              }
            }
            return seg;
          });
          
          if (appliedCount > 0) {
            console.log(`✅ Applied ${appliedCount} character assignments to segments`);
          }
        }
        
        // Database load summary
        console.log('📊 Database load summary:', {
          totalSegments: segments.length,
          segmentsWithWords: segments.filter(s => s.words && Array.isArray(s.words) && s.words.length > 0).length,
          segmentsWithCharacters: segments.filter(s => s.character_id).length,
          charactersLoaded: charactersFromDB?.length || 0
        });
        
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
                // Natural word timing: shorter baseline + variance by word length (NO offsets)
                const getWordDuration = (word: string) => {
                  const len = word.length;
                  if (len <= 3) return 0.08; // 80ms for short words
                  if (len <= 6) return 0.12; // 120ms for medium words
                  return 0.18; // 180ms for long words
                };
                
                const totalDuration = tokens.reduce((sum, t) => sum + getWordDuration(t), 0);
                const minDuration = Math.max(1, totalDuration);
                if (!isFinite(end) || end <= start || (end - start) < minDuration) {
                  end = start + minDuration;
                }
                
                let currentTime = start; // Use exact DB start time
                words = tokens.map((t, i) => {
                  const duration = getWordDuration(t);
                  const wordStart = currentTime;
                  const wordEnd = currentTime + duration;
                  currentTime = wordEnd;
                  return {
                    text: t,
                    startTime: wordStart,
                    endTime: wordEnd,
                  };
                });
                
                if (segIdx < 3) {
                  console.log(`🔄 SYNC: fallback synthesized ${tokenCount} words for segment ${segIdx} (exact timing)`);
                }
              }

              // Check if we're using provider timings or need to distribute
              // ✅ Enhanced validation: ensure non-zero duration and valid times
              const hasProviderTimings = words.length > 0 && words.every((w: any) => 
                typeof w.startTime === 'number' && 
                typeof w.endTime === 'number' &&
                w.endTime > w.startTime &&  // ✅ Ensure non-zero duration
                w.startTime >= 0 &&         // ✅ Ensure valid start time
                w.endTime > 0               // ✅ Ensure valid end time
              );
              
              if (hasProviderTimings && segIdx < 3) {
                console.log(`✅ SYNC: using provider word timings for segment ${segIdx} (${words.length} words)`);
              }
              
              // If words exist but missing timings, distribute with natural variance
              const needsDistribution = words.length > 0 && !hasProviderTimings;
              if (needsDistribution) {
                const getWordDuration = (wordOrText: any) => {
                  const text = typeof wordOrText === 'string' ? wordOrText : (wordOrText.text || '');
                  const len = text.length;
                  if (len <= 3) return 0.08;
                  if (len <= 6) return 0.12;
                  return 0.18;
                };
                
                let currentTime = start; // Use exact DB start time
                words = words.map((w: any, i: number) => {
                  const duration = getWordDuration(w);
                  // Always use calculated timings when needsDistribution is true
                  // Don't preserve invalid zero-duration values from database
                  const wordStart = currentTime;
                  const wordEnd = currentTime + duration;
                  currentTime = wordEnd;
                  return {
                    text: typeof w === 'string' ? w : w.text,
                    startTime: wordStart,
                    endTime: wordEnd,
                    emphasis: typeof w === 'object' ? w.emphasis : undefined,
                    pitch: typeof w === 'object' ? w.pitch : undefined
                  };
                });
                end = Math.max(end, words[words.length - 1].endTime);
                
                if (segIdx < 3) {
                  console.log(`🔄 SYNC: distributed timings for segment ${segIdx} (exact timing)`);
                }
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

              // Trust what the DB view already decided (character name or "Speaker A/B/C")
              const speaker = (segment as any).speaker || 'Unknown';

              // Inject syllables for words ≥6 characters
              let wordsWithSyllables = words && words.length > 0 ? injectSyllables(words) : words;

              // Precompute charEnd for syllables if not already present
              if (wordsWithSyllables) {
                for (const w of wordsWithSyllables) {
                  if (Array.isArray(w.syllables) && w.syllables.length > 1) {
                    // If your pipeline didn't set charEnd, derive from text lengths
                    let offset = 0;
                    for (const syl of w.syllables) {
                      if (typeof syl.charEnd !== 'number') {
                        offset += (syl.text || '').length;
                        (syl as any).charEnd = offset;
                      }
                    }
                  }
                }
              }

              // Use DB timings exactly - no offsets
              const finalStart = start;
              const finalEnd = end;

              return {
                text: segment.text,
                speaker,
                startTime: finalStart,
                endTime: finalEnd,
                words: wordsWithSyllables,
                speakerColor: resolveSpeakerColor(segment), // Always use resolver
                pitch: segment.pitch === 'high' ? 220 : segment.pitch === 'low' ? 100 : 180,
                volume: 50,
                type: 'dialogue' as const,
                isOffCamera: segment.isOffCamera || false,
                vocal_intensity: (segment as any).vocal_intensity as 'whisper' | 'normal' | 'yell' | 'shout' | undefined,
                intensity_confidence: (segment as any).intensity_confidence,
                auto_styling: (segment as any).auto_styling,
                idx: segment.idx // Preserve idx for correct database upserts
              };
            });
            
            console.log('🎨 ENHANCED PLAYER: Converted to captions format:', captionSegments.length, 'segments');
            
            // Normalization summary
            console.log('📊 Normalization summary:', {
              segmentsProcessed: captionSegments.length,
              wordsGenerated: captionSegments.filter(s => s.words?.length > 0).length,
              charactersApplied: captionSegments.filter(s => s.speakerColor && s.speakerColor !== '#22E3D0').length
            });
            
            // Check if we need to persist normalized data
            const needsWordsPersistence = segments.some(seg => 
              !seg.words || 
              !Array.isArray(seg.words) ||
              seg.words.length === 0 ||
              seg.words.some((w: any) => !w.startTime || !w.endTime || w.startTime === w.endTime)
            );
            
            const needsCharacterPersistence = segments.some(seg => 
              !seg.character_id && seg.speaker && charactersFromDB?.some(c => c.name.toLowerCase() === seg.speaker.toLowerCase())
            );
            
            if ((needsWordsPersistence || needsCharacterPersistence) && saveTranscriptSegments) {
              console.log('💾 Persisting normalized data to database...', {
                needsWords: needsWordsPersistence,
                needsCharacters: needsCharacterPersistence
              });
              
              try {
                // Prepare segments for persistence with proper word timings
                const segmentsToSave = captionSegments.map((cap, idx) => {
                  const originalSeg = segments[idx];
                  const speakerCharMap: Record<string, any> = {};
                  if (charactersFromDB) {
                    charactersFromDB.forEach(char => {
                      speakerCharMap[char.name.toLowerCase()] = char;
                    });
                  }
                  
                  const matchedChar = cap.speaker ? speakerCharMap[cap.speaker.toLowerCase()] : null;
                  
                  return {
                    ...originalSeg,
                    startTime: cap.startTime,
                    endTime: cap.endTime,
                    start_ms: Math.round(cap.startTime * 1000),
                    end_ms: Math.round(cap.endTime * 1000),
                    character_id: matchedChar?.id || originalSeg.character_id,
                    words: cap.words?.map(w => ({
                      text: w.text,
                      start_ms: Math.round(w.startTime * 1000),
                      end_ms: Math.round(w.endTime * 1000),
                      startTime: w.startTime,
                      endTime: w.endTime,
                      emphasis: w.emphasis === 'whisper' ? 'quiet' : w.emphasis,
                      pitch: w.pitch,
                      syllables: w.syllables
                    }))
                  };
                });
                
                await saveTranscriptSegments(segmentsToSave, targetLanguage);
                console.log('✅ Normalized data persisted successfully');
              } catch (err) {
                console.error('❌ Failed to persist normalized data:', err);
              }
            }
            
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
            
          } catch (error) {
            console.error('❌ ENHANCED PLAYER: Failed to process segments:', error);
            // Fallback: convert with basic speaker colors
            captionSegments = applyFallbackSpeakerColors(segments.map(segment => ({
              text: segment.text,
              speaker: segment.speaker || (segment as any).speakerAsrLabel || 'Unknown',
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
          
          setCaptions(convertedSegments);
          setTranscriptSegments(convertedSegments);
          
          // Phase 5: Diagnostic logging for 10-14s range
          const diagnosticSegments = convertedSegments.filter(s => s.startTime >= 10 && s.endTime <= 14);
          if (diagnosticSegments.length > 0) {
            console.groupCollapsed('🔍 DIAGNOSTIC: Segments 10-14s');
            diagnosticSegments.forEach(seg => {
              console.log({
                idx: (seg as any).idx,
                startTime: seg.startTime,
                endTime: seg.endTime,
                text: seg.text,
                speaker: seg.speaker,
                speakerColor: seg.speakerColor,
                hasCharacterId: !!(seg as any).character_id,
                hasSyllables: seg.words?.some((w: any) => w.syllables?.length > 1)
              });
            });
            console.groupEnd();
          }
          
          console.log('🎯 ENHANCED PLAYER: Final converted segments:', convertedSegments.length);
          console.log('🎯 ENHANCED PLAYER: Sample caption data:', convertedSegments.slice(0, 2).map(s => ({
            speaker: s.speaker,
            color: s.speakerColor,
            startTime: s.startTime,
            endTime: s.endTime,
            vocalIntensity: s.vocal_intensity,
            text: s.text.substring(0, 30) + '...'
          })));
          
          // Phase 1A: Check if syllables were added and persist them
          const syllablesWereAdded = captionSegments.some(seg => 
            seg.words?.some((w: any) => w.syllables && w.syllables.length > 1)
          );
          
          if (syllablesWereAdded) {
            console.log('💾 ENHANCED PLAYER: Syllables detected, persisting to database...');
            try {
              await saveTranscriptSegments(captionSegments.map(seg => ({
                text: seg.text,
                startTime: seg.startTime,
                endTime: seg.endTime,
                speaker: seg.speaker,
                speakerColor: seg.speakerColor,
                words: seg.words as any,
                characterId: (seg as any).character_id,
                idx: (seg as any).idx // Use preserved idx instead of indexOf
              })), currentLanguage);
              console.log('✅ Syllables persisted to database successfully');
              // Clear persistence flag to allow re-save
              sessionStorage.removeItem(`words_persisted_${videoId}_${currentLanguage}`);
            } catch (error) {
              console.error('❌ Failed to persist syllables:', error);
            }
          }

          // Persist synthesized/normalized word timings to DB once so all devices get word-by-word
          try {
            const persistKey = `words_persisted_${videoId}_${currentLanguage}`;
            const missingWords = captionSegments.some(seg => !seg.words || seg.words.length === 0 || !seg.words.every((w: any) => typeof w.startTime === 'number' && typeof w.endTime === 'number'));
            
            if (missingWords && !sessionStorage.getItem(persistKey)) {
              console.log('💾 ENHANCED PLAYER: Persisting synthesized word timings to database...');
              
              const tryFetchExisting = async () => {
                for (let i = 0; i < 3; i++) {
                  const { data } = await supabase
                    .from('v_transcript_segments_resolved' as any)
                    .select('id, idx, start_time, end_time, display_speaker, display_color')
                    .eq('video_id', videoId)
                    .eq('language', currentLanguage)
                    .order('idx');
                  if (data?.length) return data as any[];
                  await new Promise(r => setTimeout(r, 300));
                }
                return [];
              };

              const rows = await tryFetchExisting();

              if (rows.length > 0) {
                // If anything exists in the view, assume edge function saved correctly - DO NOT persist locally
                console.log('✅ Skipping local persistence; segments already exist in view.');
                sessionStorage.setItem(persistKey, 'true');
                return;
              }
              
              // No segments exist - safe to save synthesized timings
              console.log('💾 No existing segments found, saving synthesized word timings');
              await saveTranscriptSegments(convertedSegments as any, currentLanguage);
              sessionStorage.setItem(persistKey, 'true');
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
  }, [videoId, currentLanguage, dataVersion, loadTranscriptSegments]); // Phase 1C: Include dataVersion

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
            {t('videoDetail.tabs.transcript')}
          </TabsTrigger>
          <TabsTrigger 
            value="audio-description"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-light"
          >
            {t('videoDetail.tabs.audioDescription')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="transcript" className="space-y-6">
          <Card className="shadow-soft border-border rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl md:text-4xl font-light text-foreground">{t('videoDetail.transcriptTab.title')}</CardTitle>
              <p className="text-base font-light text-muted-foreground leading-relaxed">
                {t('videoDetail.transcriptTab.description')}
              </p>
              <div className="bg-muted/50 border border-border rounded-xl p-4 mt-4">
                <p className="text-base font-light text-muted-foreground leading-relaxed">
                  <strong>{t('videoDetail.transcriptTab.autoEnhanced')}</strong> {t('videoDetail.transcriptTab.autoEnhancedDesc')}
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
          <Card className="shadow-soft border-border rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-light text-foreground">{t('videoDetail.transcriptTab.speakerTitle')}</CardTitle>
              <p className="text-base font-light text-muted-foreground leading-relaxed">
                {t('videoDetail.transcriptTab.speakerDesc')}
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
          
          <Card className="shadow-soft border-border rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl md:text-4xl font-light text-foreground">{t('videoDetail.audioDescEditor.title')}</CardTitle>
              <p className="text-base font-light text-muted-foreground leading-relaxed">
                {t('videoDetail.audioDescEditor.description')}
              </p>
            </CardHeader>
            <CardContent>
              <AudioDescriptionEditor
                videoUrl={videoSrc}
                videoId={videoId || 'default'}
                videoData={React.useMemo(() => ({ 
                  transcript_language: stableLanguageRef.current || currentLanguage 
                }), [currentLanguage])}
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