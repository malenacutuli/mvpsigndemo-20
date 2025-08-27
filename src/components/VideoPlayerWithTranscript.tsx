import React, { useState, useEffect } from 'react';
import { AxessiblePlayer } from './AxessiblePlayer';
import { TranscriptEditor } from './TranscriptEditor';
import type { CaptionSegment } from './CaptionsWithIntention';

interface VideoPlayerWithTranscriptProps {
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

export const VideoPlayerWithTranscript: React.FC<VideoPlayerWithTranscriptProps> = ({
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
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const handleTranscriptUpdate = (segments: any[], language: string) => {
    // Convert transcript segments to caption format
    const captionSegments: CaptionSegment[] = segments.map(segment => {
      const words = segment.text.split(' ').map((word: string, index: number, arr: string[]) => {
        const duration = segment.endTime - segment.startTime;
        const wordDuration = duration / arr.length;
        return {
          text: word,
          startTime: segment.startTime + (index * wordDuration),
          endTime: segment.startTime + ((index + 1) * wordDuration),
          emphasis: 'normal' as const,
          pitch: 'normal' as const,
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
    
    setCaptions(captionSegments);
    setCurrentLanguage(language);
  };

  const handleContentGenerated = (content: {
    captions: any[];
    audioDescription: any[];
    dubbing: any;
  }) => {
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
          className="w-full aspect-video"
        />
      </div>
      
      {/* Transcript Editor - Takes up 1/3 of the width on large screens */}
      <div className="lg:col-span-1">
        <TranscriptEditor
          videoUrl={videoSrc}
          videoId={videoId}
          onTranscriptUpdate={handleTranscriptUpdate}
          onContentGenerated={handleContentGenerated}
        />
      </div>
    </div>
  );
};