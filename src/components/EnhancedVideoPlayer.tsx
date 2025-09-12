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
  const { identifySpeakers, assignSpeakerColors } = useSpeakerIdentification();

  // Add immediate debugging
  useEffect(() => {
    console.log('🚨 EnhancedVideoPlayer component mounted/updated');
    console.log('📹 Current videoId:', videoId);
    console.log('🌐 Current language:', currentLanguage);
    console.log('💾 loadTranscriptSegments available:', typeof loadTranscriptSegments);
  }, [videoId, currentLanguage, loadTranscriptSegments]);

  const handleTranscriptUpdate = (segments: any[], language: string) => {
    console.log('🔄 ENHANCED PLAYER: handleTranscriptUpdate received', segments.length, 'segments for language', language);
    console.log('🔍 ENHANCED PLAYER: First segment in handleTranscriptUpdate:', segments[0] ? {
      speaker: segments[0].speaker,
      color: segments[0].speakerColor,
      startTime: segments[0].startTime,
      endTime: segments[0].endTime,
      hasVocalIntensity: !!segments[0].vocal_intensity,
      text: segments[0].text.substring(0, 30) + '...'
    } : 'No segments');
    
    setCaptions([...segments]); // Force array recreation
    
    console.log('✅ ENHANCED PLAYER: Updated captions state with', segments.length, 'segments');
    
    if (onTranscriptUpdate) {
      onTranscriptUpdate(segments, language);
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
      console.log('🔄 ENHANCED PLAYER: Loading database content for video:', videoId, 'language:', currentLanguage);
      
      try {
        // Load saved transcript from database
        const segments = await loadTranscriptSegments(currentLanguage);
        console.log('📖 ENHANCED PLAYER: Loaded transcript segments from database:', segments.length, 'segments');
        
        if (segments.length > 0) {
          console.log('🎯 ENHANCED PLAYER: First segment timing check:', segments[0] ? { 
            startTime: segments[0].startTime, 
            endTime: segments[0].endTime,
            text: segments[0].text.substring(0, 30) + '...'
          } : 'No segments');

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
              pitch: segment.pitch === 'high' ? 220 : segment.pitch === 'low' ? 100 : 180,
              volume: 50,
              type: 'dialogue' as const,
              isOffCamera: segment.isOffCamera || false,
              vocal_intensity: (segment as any).vocal_intensity as 'whisper' | 'normal' | 'yell' | 'shout' | undefined,
              intensity_confidence: (segment as any).intensity_confidence,
              auto_styling: (segment as any).auto_styling
            }));
            
            console.log('🎨 ENHANCED PLAYER: Converted to captions format:', captionSegments.length, 'segments');
            
            // 1. Identify speakers and assign colors
            console.log('🎭 ENHANCED PLAYER: Processing speaker identification...');
            captionSegments = identifySpeakers(captionSegments);
            console.log('🎨 ENHANCED PLAYER: After speaker identification:', captionSegments.map(s => ({ speaker: s.speaker, color: s.speakerColor })).slice(0, 3));
            
            // 2. Analyze vocal intensity if needed
            const needsIntensityAnalysis = captionSegments.some(s => !s.vocal_intensity);
            console.log('🔊 ENHANCED PLAYER: Needs intensity analysis:', needsIntensityAnalysis);
            
            if (needsIntensityAnalysis && !isAnalyzingIntensity) {
              console.log('🔊 ENHANCED PLAYER: Starting vocal intensity analysis...');
              try {
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
                console.log('🔊 ENHANCED PLAYER: Vocal intensity analysis completed');
              } catch (error) {
                console.error('❌ ENHANCED PLAYER: Vocal intensity analysis failed:', error);
              }
            }
            
          } catch (error) {
            console.error('❌ ENHANCED PLAYER: Failed to process segments:', error);
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
          
          handleTranscriptUpdate(convertedSegments, currentLanguage);
        } else {
          console.log('⚠️ ENHANCED PLAYER: No saved transcript found for language:', currentLanguage);
          setCaptions([]);
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
      }
    };

    if (videoId && currentLanguage) {
      loadSavedData();
    }
  }, [videoId, currentLanguage, loadTranscriptSegments, identifySpeakers, assignSpeakerColors, analyzeVocalIntensity, isAnalyzingIntensity]);

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

export default EnhancedVideoPlayer;