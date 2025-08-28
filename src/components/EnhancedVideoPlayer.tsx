import React from 'react';
import { AxessiblePlayer } from './AxessiblePlayer';

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
  // This component is a simple wrapper - the AxessiblePlayer handles all logic
  return (
    <AxessiblePlayer
      videoSrc={videoSrc}
      posterSrc={posterSrc}
      title={title}
      videoId={videoId}
      selectedVoice={selectedVoice}
      selectedASLAvatar={selectedASLAvatar}
      contentType={contentType}
      className={className}
    />
  );
};