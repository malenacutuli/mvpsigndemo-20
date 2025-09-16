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
  isPublic?: boolean;
  videoStatus?: string;
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
  className = "",
  isPublic,
  videoStatus
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
      selectedASLAvatar={selectedASLAvatar}
      contentType={contentType}
      className={className}
      isPublic={isPublic}
      videoStatus={videoStatus}
    />
  );
};