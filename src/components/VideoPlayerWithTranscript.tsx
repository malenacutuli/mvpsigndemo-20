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
  selectedSignLanguageAvatar?: {
    id: string;
    name: string;
    description: string;
  };
  contentType?: 'recipe' | 'education';
  className?: string;
  isPublic?: boolean;
  videoStatus?: string;
  onLanguageChange?: (language: string) => void;
}

export const VideoPlayerWithTranscript: React.FC<VideoPlayerWithTranscriptProps> = ({
  videoSrc,
  posterSrc,
  title,
  videoId,
  language,
  selectedVoice,
  selectedSignLanguageAvatar,
  contentType = 'education',
  className = "",
  isPublic,
  videoStatus,
  onLanguageChange
}) => {
  // This component is a simple wrapper - the AxessiblePlayer handles all transcript logic
  return (
    <EnhancedVideoPlayer
      videoSrc={videoSrc}
      posterSrc={posterSrc}
      title={title}
      videoId={videoId}
      language={language}
      selectedVoice={selectedVoice}
      selectedSignLanguageAvatar={selectedSignLanguageAvatar}
      contentType={contentType}
      className={className}
      isPublic={isPublic}
      videoStatus={videoStatus}
      onLanguageChange={onLanguageChange}
    />
  );
};