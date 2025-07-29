import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, HandHelping, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CaptionsWithIntention } from './CaptionsWithIntention';
import { AccessibilityControls } from './AccessibilityControls';
import { AudioDescription } from './AudioDescription';

interface VoiceOption {
  id: string;
  name: string;
  description: string;
}

interface ASLOption {
  id: string;
  name: string;
  description: string;
}

interface AxessiblePlayerProps {
  videoSrc: string;
  posterSrc?: string;
  title: string;
  className?: string;
  selectedVoice?: VoiceOption;
  selectedASLAvatar?: ASLOption;
  contentType?: 'recipe' | 'education';
}

export const AxessiblePlayer: React.FC<AxessiblePlayerProps> = ({
  videoSrc,
  posterSrc,
  title,
  className = "",
  selectedVoice,
  selectedASLAvatar,
  contentType = 'recipe'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showASL, setShowASL] = useState(false);
  const [showAudioDescription, setShowAudioDescription] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = (value[0] / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0] / 100;
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className={`relative bg-black rounded-lg overflow-hidden shadow-2xl ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(true)} // Keep controls visible for accessibility
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={posterSrc}
        className="w-full h-full object-cover"
        onClick={togglePlay}
        aria-label={`Video: ${title}`}
      />

      {/* Enhanced ASL Avatar Overlay */}
      {showASL && (
        <div className="absolute top-4 right-4 w-40 h-40 bg-black/20 rounded-xl border-2 border-primary/30 backdrop-blur-sm overflow-hidden">
          <div className="w-full h-full relative">
            {/* Avatar Character Display */}
            <div className="absolute inset-2 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex flex-col items-center justify-center">
              {contentType === 'recipe' ? (
                selectedASLAvatar?.id === 'chef-avatar' ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-cwi-main-orange/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-2xl">👨‍🍳</span>
                    </div>
                    <div className="text-xs text-white font-medium">Chef Avatar</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-cwi-main-blue/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-2xl">👩‍🏫</span>
                    </div>
                    <div className="text-xs text-white font-medium">Food Expert</div>
                  </div>
                )
              ) : (
                selectedASLAvatar?.id === 'superhero-captain' ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-cwi-main-yellow/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-2xl">🦸‍♂️</span>
                    </div>
                    <div className="text-xs text-white font-medium">Captain Wonder</div>
                  </div>
                ) : selectedASLAvatar?.id === 'superhero-star' ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-cwi-main-purple/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-2xl">🌟</span>
                    </div>
                    <div className="text-xs text-white font-medium">Star Guardian</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-cwi-main-green/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-2xl">👩‍🏫</span>
                    </div>
                    <div className="text-xs text-white font-medium">Teacher Maya</div>
                  </div>
                )
              )}
              
              {/* Signing Animation Indicator */}
              <div className="absolute bottom-1 right-1">
                <HandHelping className="w-4 h-4 text-primary animate-pulse" />
              </div>
            </div>
            
            {/* Live indicator */}
            <div className="absolute top-1 left-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
              LIVE
            </div>
          </div>
        </div>
      )}

      {/* Captions with Intention */}
      {showCaptions && (
        <CaptionsWithIntention 
          currentTime={currentTime}
          isPlaying={isPlaying}
          contentType={contentType}
        />
      )}

      {/* Audio Description */}
      {showAudioDescription && (
        <AudioDescription
          currentTime={currentTime}
          isPlaying={isPlaying}
          contentType={contentType}
          selectedVoice={selectedVoice}
        />
      )}

      {/* Control Overlay */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div className="mb-4">
          <Slider
            value={[progressPercentage]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="w-full"
            aria-label="Video progress"
          />
          <div className="flex justify-between text-xs text-primary-foreground mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause video" : "Play video"}
              className="text-primary-foreground hover:text-primary hover:bg-primary/20"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="text-primary-foreground hover:text-primary hover:bg-primary/20"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={handleVolumeChange}
                max={100}
                className="w-20"
                aria-label="Volume"
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <AccessibilityControls
              showCaptions={showCaptions}
              showASL={showASL}
              showAudioDescription={showAudioDescription}
              onToggleCaptions={setShowCaptions}
              onToggleASL={setShowASL}
              onToggleAudioDescription={setShowAudioDescription}
            />
            
            <Button
              variant="ghost"
              size="sm"
              aria-label="Full screen"
              className="text-primary-foreground hover:text-primary hover:bg-primary/20"
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};