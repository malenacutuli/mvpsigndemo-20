import React, { useState, useEffect } from 'react';
import { EnhancedVideoPlayer } from './EnhancedVideoPlayer';
import { TranscriptEditor } from './TranscriptEditor';
import type { CaptionSegment } from './CaptionsWithIntention';

interface VideoPlayerWithTranscriptProps {
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

export const VideoPlayerWithTranscript: React.FC<VideoPlayerWithTranscriptProps> = ({
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
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const handleTranscriptUpdate = (segments: any[], language: string) => {
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
    
    setCaptions(captionSegments);
    setCurrentLanguage(language);
    console.log('Updated captions with enhanced timing:', captionSegments);
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
    <EnhancedVideoPlayer
      videoSrc={videoSrc}
      posterSrc={posterSrc}
      title={title}
      videoId={videoId}
      language={language}
      selectedVoice={selectedVoice}
      selectedASLAvatar={selectedASLAvatar}
      contentType={contentType}
      className={className}
    />
  );
};