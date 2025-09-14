import React, { useState, useEffect } from 'react';
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
  const { loadTranscriptSegments, loadAudioDescriptions } = useVideoStorage(videoId);
  const { analyzeVocalIntensity, isAnalyzing: isAnalyzingIntensity } = useVocalIntensityAnalysis();
  const { analyzeSpeakers, isAnalyzing: isAnalyzingSpeakers } = useAdvancedSpeakerAnalysis();

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
      handleTranscriptUpdate(convertedSegments, detectedLang);
    }
  }, [captions.length, transcriptSegments.length]);

  // Add immediate debugging
  useEffect(() => {
    console.log('🚨 EnhancedVideoPlayer component mounted/updated');
    console.log('📹 Current videoId:', videoId);
    console.log('🌐 Current language:', currentLanguage);
    console.log('💾 loadTranscriptSegments available:', typeof loadTranscriptSegments);
  }, [videoId, currentLanguage, loadTranscriptSegments]);

  const handleTranscriptUpdate = (segments: any[], detectedLang?: string) => {
    console.log('🔄 ENHANCED PLAYER: handleTranscriptUpdate received', segments.length, 'segments for language', detectedLang || 'auto-detect');
    
    // Auto-detect language if not provided
    const autoDetectedLang = detectedLang || detectLanguageFromCaptions(segments);
    
    // Update current language if auto-detected language is different
    if (autoDetectedLang !== currentLanguage) {
      console.log('🌐 Language auto-detected:', autoDetectedLang, 'changing from:', currentLanguage);
      setCurrentLanguage(autoDetectedLang);
    }
    
    console.log('🔍 ENHANCED PLAYER: First segment in handleTranscriptUpdate:', segments[0] ? {
      speaker: segments[0].speaker,
      color: segments[0].speakerColor,
      startTime: segments[0].startTime,
      endTime: segments[0].endTime,
      hasVocalIntensity: !!segments[0].vocal_intensity,
      text: segments[0].text.substring(0, 30) + '...'
    } : 'No segments');
    
    // Keep captions for the player UI and also persist raw segments for AD scheduler
    setCaptions([...segments]); // Force array recreation
    setTranscriptSegments([...segments]);
    
    console.log('✅ ENHANCED PLAYER: Updated captions and transcriptSegments with', segments.length, 'segments, detected language:', autoDetectedLang);
    
    if (onTranscriptUpdate) {
      onTranscriptUpdate(segments, autoDetectedLang);
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
        handleTranscriptUpdate(refreshed, currentLanguage);
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
      
      // Prevent multiple simultaneous loads
      const loadingKey = `loading_${videoId}_${currentLanguage}`;
      if (sessionStorage.getItem(loadingKey)) {
        console.log('⚠️ Already loading data for this video/language combination');
        return;
      }
      sessionStorage.setItem(loadingKey, 'true');
      
      try {
        // Try to load saved transcript from database with current language first
        let segments = await loadTranscriptSegments(currentLanguage);
        console.log('📖 ENHANCED PLAYER: Loaded transcript segments from database:', segments.length, 'segments for language:', currentLanguage);
        
        // If no segments found and currentLanguage is not 'en', try loading with 'en'
        if (segments.length === 0 && currentLanguage !== 'en') {
          console.log('🔄 ENHANCED PLAYER: No segments found for', currentLanguage, ', trying fallback to "en"');
          segments = await loadTranscriptSegments('en');
          console.log('📖 ENHANCED PLAYER: Fallback loaded:', segments.length, 'segments for language: en');
          
          // If we found segments with 'en', update the current language
          if (segments.length > 0) {
            console.log('✅ ENHANCED PLAYER: Found transcript in English, updating current language');
            setCurrentLanguage('en');
          }
        }
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
            
            // 1. Advanced speaker identification - use AssemblyAI if possible
            console.log('🎭 ENHANCED PLAYER: Processing advanced speaker identification...');
            try {
              captionSegments = await performAdvancedSpeakerAnalysis(captionSegments, videoSrc, videoId);
              console.log('🎨 ENHANCED PLAYER: After advanced speaker analysis:', captionSegments.map(s => ({ speaker: s.speaker, color: s.speakerColor })).slice(0, 3));
            } catch (error) {
              console.warn('⚠️ Advanced speaker analysis failed, falling back to color stabilization:', error);
              captionSegments = stabilizeSpeakerColors(captionSegments);
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
          
          // Auto-detect language and update transcript
          const detectedLang = detectLanguageFromCaptions(convertedSegments);
          console.log('🌐 Auto-detected language from transcript:', detectedLang);
          
          handleTranscriptUpdate(convertedSegments, detectedLang);
        } else {
          console.log('⚠️ ENHANCED PLAYER: No saved transcript found for language:', currentLanguage);
          
          // Check if there are generated captions available and convert them to transcripts
          if (captions.length > 0) {
            console.log('🔄 Converting existing captions to transcript segments:', captions.length);
            const detectedLang = detectLanguageFromCaptions(captions);
            handleTranscriptUpdate(captions, detectedLang);
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
        
        // Load saved characters
        const savedCharacters = localStorage.getItem(`characters-${videoId}`);
        if (savedCharacters) {
          try {
            const charactersData = JSON.parse(savedCharacters);
            setCharacters(charactersData);
          } catch (error) {
            console.error('Failed to load saved characters:', error);
          }
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
              existingSpeakers={[...new Set([
                ...transcriptSegments.map(s => s.speaker).filter(Boolean),
                ...captions.map(c => c.speaker).filter(Boolean)
              ])].sort()}
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