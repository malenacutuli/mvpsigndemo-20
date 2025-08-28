import React, { useState, useEffect } from 'react';
import { AxessiblePlayer } from './AxessiblePlayer';
import { TranscriptEditor } from './TranscriptEditor';
import { AudioDescriptionEditor } from './AudioDescriptionEditor';
import { CharacterManager } from './CharacterManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CaptionSegment } from './CaptionsWithIntention';

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
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [transcriptSegments, setTranscriptSegments] = useState<any[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState(language || 'en');
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [characters, setCharacters] = useState<any[]>([]);

  const handleTranscriptUpdate = (segments: any[], language: string) => {
    console.log('🔄 Transcript updated in EnhancedVideoPlayer:', segments?.length, 'segments');
    console.log('📊 Received segments data:', segments.map(s => ({
      speaker: s.speaker,
      text: s.text?.substring(0, 30) + '...',
      startTime: s.startTime,
      endTime: s.endTime,
      color: s.speakerColor,
      emphasis: s.emphasis,
      pitch: s.pitch
    })));
    
    if (!segments || segments.length === 0) {
      console.warn('⚠️ No segments received in handleTranscriptUpdate');
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
      
      const words = segment.text.split(' ').filter(word => word.trim()).map((word: string, wordIndex: number, arr: string[]) => {
        const wordDuration = duration / arr.length;
        return {
          text: word.trim(),
          startTime: startTime + (wordIndex * wordDuration),
          endTime: startTime + ((wordIndex + 1) * wordDuration),
          // PRIORITY: Use segment-level emphasis/pitch from transcript edits
          emphasis: segment.emphasis || 'normal' as const,
          pitch: segment.pitch || 'normal' as const,
        };
      });
      
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

  // Load saved data on component mount
  useEffect(() => {
    // Load saved transcript
    const savedTranscript = localStorage.getItem(`transcript_${videoId}_${currentLanguage}`);
    if (savedTranscript) {
      try {
        const transcriptData = JSON.parse(savedTranscript);
        handleTranscriptUpdate(transcriptData.segments, currentLanguage);
      } catch (error) {
        console.error('Failed to load saved transcript:', error);
      }
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
    
    // Load saved audio descriptions
    const savedAD = localStorage.getItem(`audioDescription_${videoId}_${currentLanguage}`);
    if (savedAD) {
      try {
        const adData = JSON.parse(savedAD);
        setAudioDescriptions(adData.segments);
      } catch (error) {
        console.error('Failed to load saved audio descriptions:', error);
      }
    }
  }, [videoId]);

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