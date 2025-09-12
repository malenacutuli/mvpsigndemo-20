import React, { useState, useEffect } from 'react';
import { AxessiblePlayer } from './AxessiblePlayer';
import { TranscriptEditor } from './TranscriptEditor';
import { AudioDescriptionEditor } from './AudioDescriptionEditor';
import { CharacterManager } from './CharacterManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CaptionSegment } from './CaptionsWithIntention';
import { useVideoStorage } from '@/hooks/useVideoStorage';
import { useVocalIntensityAnalysis } from '@/hooks/useVocalIntensityAnalysis';
import { useSpeakerIdentification } from '@/hooks/useSpeakerIdentification';

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
  className = ""
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
  const { identifySpeakers, assignSpeakerColors } = useSpeakerIdentification();

  // Add immediate debugging
  useEffect(() => {
    console.log('🚨 EnhancedVideoPlayer component mounted/updated');
    console.log('📹 Current videoId:', videoId);
    console.log('🌐 Current language:', currentLanguage);
    console.log('💾 loadTranscriptSegments available:', typeof loadTranscriptSegments);
  }, [videoId, currentLanguage, loadTranscriptSegments]);

  const handleTranscriptUpdate = (segments: any[], language: string) => {
    console.log('🔄 Transcript updated in EnhancedVideoPlayer:', segments?.length, 'segments');
    console.log('🔍 DEBUGGING: Segments source and data:', segments.map(s => ({
      id: s.id,
      speaker: s.speaker,
      text: s.text?.substring(0, 30) + '...',
      startTime: s.startTime,
      endTime: s.endTime,
      color: s.speakerColor,
      emphasis: s.emphasis,
      pitch: s.pitch,
      source: s.id ? 'database' : 'generated'
    })));
    
    if (!segments || segments.length === 0) {
      console.warn('⚠️ No segments received in handleTranscriptUpdate');
      // Try to force load from database if no segments provided
      const forceLoadDatabase = async () => {
        console.log('🚀 FORCE LOADING from database...');
        try {
          const dbSegments = await loadTranscriptSegments(language);
          console.log('📖 Force loaded from database:', dbSegments.length, 'segments');
          if (dbSegments.length > 0) {
            const convertedSegments = dbSegments.map(seg => ({
              ...seg,
              id: seg.id || `db-${Date.now()}-${Math.random()}`,
              speakerColor: seg.speakerColor || '#3B82F6',
              emphasis: seg.emphasis || 'normal',
              pitch: seg.pitch || 'normal'
            }));
            console.log('🎯 Force converted segments:', convertedSegments.map(s => ({
              speaker: s.speaker,
              emphasis: s.emphasis,
              pitch: s.pitch,
              color: s.speakerColor
            })));
            // Re-call this function with database segments
            handleTranscriptUpdate(convertedSegments, language);
            return;
          }
        } catch (error) {
          console.error('❌ Force load failed:', error);
        }
      };
      forceLoadDatabase();
      return;
    }
    
    // Store original transcript segments
    setTranscriptSegments([...segments]); // Force new array reference
    
    // Load character colors from localStorage for this video
    const savedCharacters = localStorage.getItem(`characters-${videoId}`);
    let characterColors: Record<string, string> = {};
    if (savedCharacters) {
      try {
        const charactersData = JSON.parse(savedCharacters);
        charactersData.forEach((char: any) => {
          characterColors[char.name] = char.color;
        });
      } catch (error) {
        console.error('Failed to parse character colors:', error);
      }
    }
    
    // Convert transcript segments to caption format - PRIORITIZE transcript edits over character colors
    const captionSegments: CaptionSegment[] = segments.map((segment, index) => {
      const startTime = segment.startTime ?? segment.start_time ?? 0;
      const endTime = segment.endTime ?? segment.end_time ?? (startTime + 3);
      const duration = Math.max(endTime - startTime, 0.1);
      
      // Use word-level data if available, otherwise split text into words
      let words: any[] = [];
      
      if ((segment as any).words && Array.isArray((segment as any).words)) {
        // Use existing word-level data with timing and emphasis
        const wordData = (segment as any).words;
        words = wordData.map((wordItem: any, wordIndex: number) => {
          const wordDuration = duration / wordData.length;
          return {
            text: wordItem.text || wordItem,
            startTime: startTime + (wordIndex * wordDuration),
            endTime: startTime + ((wordIndex + 1) * wordDuration),
            // Use word-level emphasis/pitch if available
            emphasis: wordItem.emphasis || segment.emphasis || 'normal' as const,
            pitch: wordItem.pitch || segment.pitch || 'normal' as const,
          };
        });
      } else {
        // Fallback: Split text into words with even timing
        const wordTexts = segment.text.split(' ').filter(word => word.trim());
        words = wordTexts.map((word: string, wordIndex: number, arr: string[]) => {
          const wordDuration = duration / arr.length;
          return {
            text: word.trim(),
            startTime: startTime + (wordIndex * wordDuration),
            endTime: startTime + ((wordIndex + 1) * wordDuration),
            // Use segment-level emphasis/pitch as fallback
            emphasis: segment.emphasis || 'normal' as const,
            pitch: segment.pitch || 'normal' as const,
          };
        });
      }
      
      const speaker = segment.speaker || 'Speaker';
      
      return {
        text: segment.text,
        speaker: speaker as any,
        startTime,
        endTime,
        words,
        // PRIORITY: Apply transcript edit properties first, then fallbacks
        volume: segment.emphasis === 'loud' ? 85 : segment.emphasis === 'quiet' ? 30 : 60,
        pitch: segment.pitch === 'high' ? 220 : segment.pitch === 'low' ? 100 : 180,
        type: segment.speaker === 'soundeffect' ? 'soundeffect' : segment.speaker === 'music' ? 'music' : 'dialogue',
        isOffCamera: segment.isOffCamera || false,
        // PRIORITY: Use transcript segment color first, then character colors, then default
        speakerColor: segment.speakerColor || characterColors[speaker] || '#3B82F6',
        // Add unique key to force re-render
        _updateKey: `${Date.now()}-${index}`
      } as CaptionSegment;
    });
    
    console.log('✅ Generated caption segments for video player:', captionSegments.length);
    console.log('🎨 Caption colors applied:', captionSegments.map(c => ({ 
      speaker: c.speaker, 
      color: c.speakerColor,
      emphasis: c.words[0]?.emphasis,
      pitch: c.words[0]?.pitch 
    })));
    
    // Force state update with timestamp to trigger re-render
    const timestamp = Date.now();
    setCaptions([...captionSegments]); // Force new array reference
    
    console.log('🔄 Updated captions state in EnhancedVideoPlayer:', captionSegments.length, 'segments');
    console.log('🎯 First caption segment details:', captionSegments[0] ? {
      speaker: captionSegments[0].speaker,
      color: captionSegments[0].speakerColor,
      emphasis: captionSegments[0].words[0]?.emphasis,
      pitch: captionSegments[0].words[0]?.pitch,
      text: captionSegments[0].text.substring(0, 50) + '...'
    } : 'No captions');
    setCurrentLanguage(language);
    
    // Create full transcript text for audio description generation
    const fullTranscript = segments
      .sort((a, b) => (a.startTime || 0) - (b.startTime || 0))
      .map(s => s.text)
      .join(' ');
    setTranscriptText(fullTranscript);
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

  const handleCharactersUpdate = (updatedCharacters: any[]) => {
    setCharacters(updatedCharacters);
    console.log('🎨 Characters updated:', updatedCharacters);
    
    // Immediately apply character colors to existing captions AND transcript segments
    if (captions.length > 0 || transcriptSegments.length > 0) {
      const characterColorMap: Record<string, string> = {};
      updatedCharacters.forEach(char => {
        characterColorMap[char.name] = char.color;
      });
      
      // Update captions with new colors
      if (captions.length > 0) {
        const updatedCaptions = captions.map(caption => ({
          ...caption,
          speakerColor: characterColorMap[caption.speaker] || caption.speakerColor
        }));
        setCaptions([...updatedCaptions]);
      }
      
      // Update transcript segments with new colors and re-trigger caption generation
      if (transcriptSegments.length > 0) {
        const updatedTranscriptSegments = transcriptSegments.map(segment => ({
          ...segment,
          speakerColor: characterColorMap[segment.speaker] || segment.speakerColor
        }));
        setTranscriptSegments([...updatedTranscriptSegments]);
        
        // Re-trigger transcript update to regenerate captions with new colors
        handleTranscriptUpdate(updatedTranscriptSegments, currentLanguage);
      }
    }
  };

  const handleAudioDescriptionsUpdate = (descriptions: any[]) => {
    console.log('📢 Audio descriptions updated in EnhancedVideoPlayer:', descriptions.length);
    setAudioDescriptions([...descriptions]);
  };

  // Load saved data on component mount and language changes
  useEffect(() => {
    const loadSavedData = async () => {
      console.log('🔄 Loading database content for video:', videoId, 'language:', currentLanguage);
      
      // Load saved transcript from database
      const segments = await loadTranscriptSegments(currentLanguage);
      console.log('📖 Loaded transcript segments from database:', segments.length, 'segments');
      
      if (segments.length > 0) {
        let captionSegments: CaptionSegment[] = [];
        
        try {
          // Convert database segments to caption format first
          captionSegments = segments.map(segment => ({
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
            speakerColor: segment.speakerColor || '#3B82F6',
            // Convert string pitch to number for vocal analysis
            pitch: segment.pitch === 'high' ? 220 : segment.pitch === 'low' ? 100 : 180,
            volume: 50, // Default volume
            type: 'dialogue' as const,
            isOffCamera: segment.isOffCamera || false,
            // Copy vocal intensity if already analyzed
            vocal_intensity: (segment as any).vocal_intensity as 'whisper' | 'normal' | 'yell' | 'shout' | undefined,
            intensity_confidence: (segment as any).intensity_confidence,
            auto_styling: (segment as any).auto_styling
          }));
          
          // 1. Identify speakers and assign colors
          console.log('🎭 Processing speaker identification...');
          captionSegments = identifySpeakers(captionSegments);
          
          // 2. Analyze vocal intensity if segments don't have it
          const needsIntensityAnalysis = captionSegments.some(s => !s.vocal_intensity);
          if (needsIntensityAnalysis) {
            console.log('🔊 Analyzing vocal intensity for captions...');
            const analyzedSegments = await analyzeVocalIntensity(videoId, captionSegments);
            captionSegments = analyzedSegments.map(analyzed => {
              const originalSegment = captionSegments.find(c => 
                Math.abs(c.startTime - (analyzed.start_time || 0)) < 0.1
              );
              
              return {
                text: analyzed.text,
                speaker: originalSegment?.speaker || 'Speaker',
                startTime: analyzed.start_time || 0,
                endTime: analyzed.end_time || 0,
                words: originalSegment?.words || [],
                speakerColor: originalSegment?.speakerColor || '#3B82F6',
                pitch: originalSegment?.pitch || 180,
                volume: 50,
                type: 'dialogue' as const,
                isOffCamera: false,
                vocal_intensity: analyzed.vocal_intensity as 'whisper' | 'normal' | 'yell' | 'shout' | undefined,
                intensity_confidence: analyzed.intensity_confidence,
                auto_styling: analyzed.auto_styling
              };
            });
          }
          
        } catch (error) {
          console.error('Failed to process segments:', error);
          // Fallback: convert with basic speaker colors
          captionSegments = assignSpeakerColors(segments.map(segment => ({
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
        
        // Convert processed segments to caption format for player
        const convertedSegments = captionSegments.map((seg, index) => ({
          ...seg,
          id: `segment-${Date.now()}-${index}`,
          _updateKey: `${Date.now()}-${Math.random()}` // Force update in player
        }));
        
        console.log('🎯 Converting database segments to captions:', convertedSegments.map(s => ({
          speaker: s.speaker,
          color: s.speakerColor,
          vocalIntensity: s.vocal_intensity,
          pitch: s.pitch,
          text: s.text.substring(0, 30) + '...'
        })));
        
        handleTranscriptUpdate(convertedSegments, currentLanguage);
      } else {
        console.log('⚠️ No saved transcript found for language:', currentLanguage);
        // Clear captions if no saved transcript for this language
        setCaptions([]);
      }
      
      // Load saved audio descriptions from database
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
      
      // Load saved characters (still using localStorage for now)
      const savedCharacters = localStorage.getItem(`characters-${videoId}`);
      if (savedCharacters) {
        try {
          const charactersData = JSON.parse(savedCharacters);
          setCharacters(charactersData);
        } catch (error) {
          console.error('Failed to load saved characters:', error);
        }
      }
    };
    
    loadSavedData();
  }, [videoId, currentLanguage]); // Added currentLanguage dependency

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transcript">Transcript Extraction</TabsTrigger>
          <TabsTrigger value="audio-description">Audio Description</TabsTrigger>
          <TabsTrigger value="characters">Character Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transcript" className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Transcript Extraction & Editing</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Extract speech from the video, edit timing, add emphasis, and manage captions with intention protocol.
            </p>
            <TranscriptEditor
              videoUrl={videoSrc}
              videoId={videoId || 'default'}
              initialLanguage={currentLanguage}
              onTranscriptUpdate={handleTranscriptUpdate}
              onContentGenerated={handleContentGenerated}
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
              currentLanguage={currentLanguage}
              contentType={contentType}
              transcriptSegments={transcriptSegments}
              onDescriptionsUpdate={handleAudioDescriptionsUpdate}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="characters" className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Character Color Assignment</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Assign colors to characters following the Captions with Intention protocol for better accessibility.
            </p>
            <CharacterManager
              videoId={videoId || 'default'}
              onCharactersUpdate={handleCharactersUpdate}
              existingCharacters={characters}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};