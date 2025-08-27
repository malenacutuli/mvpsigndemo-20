import React, { useState, useEffect } from 'react';
import { AxessiblePlayer } from './AxessiblePlayer';
import { TranscriptEditor } from './TranscriptEditor';
import { AudioDescriptionEditor } from './AudioDescriptionEditor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { CaptionSegment } from './CaptionsWithIntention';

interface EnhancedVideoPlayerProps {
  videoSrc: string;
  posterSrc?: string;
  title: string;
  videoId: string;
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
  selectedVoice,
  selectedASLAvatar,
  contentType = 'education',
  className = ""
}) => {
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [transcriptSegments, setTranscriptSegments] = useState<any[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [transcriptText, setTranscriptText] = useState<string>('');

  const handleTranscriptUpdate = (segments: any[], language: string) => {
    console.log('Transcript updated:', segments);
    
    // Store original transcript segments for audio description generation
    setTranscriptSegments(segments);
    
    // Convert transcript segments to caption format with enhanced timing and styling
    const captionSegments: CaptionSegment[] = segments.map(segment => {
      const words = segment.text.split(' ').map((word: string, index: number, arr: string[]) => {
        const duration = segment.endTime - segment.startTime;
        const wordDuration = duration / arr.length;
        return {
          text: word,
          startTime: segment.startTime + (index * wordDuration),
          endTime: segment.startTime + ((index + 1) * wordDuration),
          emphasis: segment.emphasis || 'normal' as const,
          pitch: segment.pitch || 'normal' as const,
        };
      });
      
      return {
        text: segment.text,
        speaker: segment.speaker || 'narrator' as any,
        startTime: segment.startTime,
        endTime: segment.endTime,
        words,
      };
    });
    
    // Create transcript text for dubbing
    const fullTranscript = segments.map(s => s.text).join(' ');
    setTranscriptText(fullTranscript);
    
    setCaptions(captionSegments);
    setCurrentLanguage(language);
    console.log('Updated captions with enhanced timing:', captionSegments);
    console.log('Updated transcript text for dubbing:', fullTranscript);
  };

  const handleDescriptionsUpdate = (descriptions: any[]) => {
    console.log('Audio descriptions updated:', descriptions);
    setAudioDescriptions(descriptions);
  };

  const handleContentGenerated = (content: {
    captions: any[];
    audioDescription: any[];
    dubbing: any;
  }) => {
    console.log('Content generated:', content);
    if (content.captions) {
      setCaptions(content.captions);
    }
    if (content.audioDescription) {
      setAudioDescriptions(content.audioDescription);
    }
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Video Player - Takes up 2/3 of the width on large screens */}
      <div className="lg:col-span-2">
        <AxessiblePlayer
          videoSrc={videoSrc}
          posterSrc={posterSrc}
          title={title}
          videoId={videoId}
          selectedVoice={selectedVoice}
          selectedASLAvatar={selectedASLAvatar}
          contentType={contentType}
          initialCaptions={captions}
          dynamicDescriptions={audioDescriptions}
          className="w-full aspect-video"
        />
      </div>
      
      {/* Enhanced Content Editors - Takes up 1/3 of the width on large screens */}
      <div className="lg:col-span-1">
        <Tabs defaultValue="transcript" className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transcript">Transcript & Captions</TabsTrigger>
            <TabsTrigger value="audio-description">Audio Description</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transcript" className="mt-4 h-full">
            <TranscriptEditor
              videoUrl={videoSrc}
              videoId={videoId}
              onTranscriptUpdate={handleTranscriptUpdate}
              onContentGenerated={handleContentGenerated}
            />
          </TabsContent>
          
          <TabsContent value="audio-description" className="mt-4 h-full">
            <AudioDescriptionEditor
              videoUrl={videoSrc}
        videoId={videoId}
        currentLanguage={currentLanguage}
        contentType={contentType}
        transcriptSegments={transcriptSegments}
        onDescriptionsUpdate={handleDescriptionsUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};