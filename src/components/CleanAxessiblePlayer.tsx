import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Settings, FileText, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CaptionsWithIntention } from './CaptionsWithIntention';
import { AudioDescription } from './AudioDescription';
import { ASLAvatar } from './ASLAvatar';
import type { CaptionSegment } from './CaptionsWithIntention';

interface CleanAxessiblePlayerProps {
  videoSrc: string;
  posterSrc?: string;
  title: string;
  className?: string;
  contentType?: 'recipe' | 'education';
  captions?: CaptionSegment[];
  videoId?: string;
}

export const CleanAxessiblePlayer: React.FC<CleanAxessiblePlayerProps> = ({
  videoSrc,
  posterSrc,
  title,
  className = "",
  contentType = 'education',
  captions = [],
  videoId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // Accessibility toggles
  const [showCaptions, setShowCaptions] = useState(true);
  const [showAudioDescription, setShowAudioDescription] = useState(false);
  const [showASL, setShowASL] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Video loading states
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);

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

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        await video.play();
        setIsPlaying(true);
        setVideoError(null);
      }
    } catch (error) {
      console.error('Play error:', error);
      setVideoError('Unable to play video. Please try again.');
      setIsPlaying(false);
    }
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
      onMouseLeave={() => setShowControls(true)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={posterSrc}
        className="w-full h-full object-cover"
        onClick={togglePlay}
        aria-label={`Video: ${title}`}
        crossOrigin="anonymous"
        preload="auto"
        onError={(e) => {
          console.error('Video loading error:', e);
          setVideoError(`Failed to load video. Please check the file.`);
          setVideoLoading(false);
        }}
        onLoadStart={() => {
          setVideoLoading(true);
          setVideoError(null);
        }}
        onCanPlay={() => {
          setVideoLoading(false);
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setVideoLoading(false);
        }}
        onPause={() => {
          setIsPlaying(false);
        }}
        onStalled={() => {
          console.warn('Video playback stalled');
          setVideoError('Video loading stalled. Please wait or try refreshing.');
        }}
      />

      {/* Video Error/Loading Overlay */}
      {(videoError || videoLoading) && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center text-white p-4 max-w-md">
            {videoError ? (
              <>
                <div className="text-red-400 mb-2">⚠️ Video Error</div>
                <div className="text-sm mb-4">{videoError}</div>
                <Button 
                  onClick={() => {
                    setVideoError(null);
                    setVideoLoading(true);
                    if (videoRef.current) {
                      videoRef.current.load();
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className="text-white border-white hover:bg-white hover:text-black"
                >
                  Retry
                </Button>
              </>
            ) : (
              <>
                <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                <div className="text-sm">Loading video...</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ASL Avatar Overlay */}
      {showASL && (
        <ASLAvatar
          contentType={contentType}
          currentCaption={captions.find(seg => 
            currentTime >= seg.startTime && currentTime <= seg.endTime
          )}
        />
      )}

      {/* Captions with Intention */}
      {showCaptions && (
        <CaptionsWithIntention 
          captions={captions}
          currentTime={currentTime}
          isVisible={showCaptions}
          screenHeight={window?.innerHeight || 1080}
        />
      )}

      {/* Audio Description */}
      {showAudioDescription && (
        <AudioDescription
          currentTime={currentTime}
          isPlaying={isPlaying}
          contentType={contentType}
        />
      )}

      {/* Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pb-2 pt-8 px-2 transition-opacity duration-300 ${
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
          {/* Left - Playback Controls */}
          <div className="flex items-center gap-3">
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
                className="w-16"
                aria-label="Volume"
              />
            </div>
          </div>

          {/* Right - Accessibility Controls */}
          <div className="flex items-center gap-2">
            {/* Captions Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCaptions(!showCaptions)}
              title="Toggle captions with intention"
              className={`text-primary-foreground hover:text-primary hover:bg-primary/20 ${showCaptions ? 'bg-accent/20 text-accent-foreground' : ''}`}
            >
              <FileText className="w-4 h-4" />
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              title="Accessibility settings"
              className="text-primary-foreground hover:text-primary hover:bg-primary/20"
            >
              <Settings className="w-4 h-4" />
            </Button>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const container = videoRef.current?.closest('div');
                if (container && document.fullscreenEnabled) {
                  if (!document.fullscreenElement) {
                    container.requestFullscreen().catch(console.error);
                  } else {
                    document.exitFullscreen().catch(console.error);
                  }
                }
              }}
              title="Fullscreen"
              className="text-primary-foreground hover:text-primary hover:bg-primary/20"
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Simple Settings Panel */}
      {showSettings && (
        <div className="absolute top-0 right-0 w-64 h-full bg-black/95 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Settings</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(false)}
              className="text-white hover:bg-white/20"
            >
              ✕
            </Button>
          </div>
          
          <div className="space-y-4 text-white">
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showCaptions}
                  onChange={(e) => setShowCaptions(e.target.checked)}
                  className="rounded"
                />
                <span>Captions with Intention</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showAudioDescription}
                  onChange={(e) => setShowAudioDescription(e.target.checked)}
                  className="rounded"
                />
                <span>Audio Description</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showASL}
                  onChange={(e) => setShowASL(e.target.checked)}
                  className="rounded"
                />
                <span>Sign Language Avatar</span>
              </label>
            </div>

            <div className="pt-4 border-t border-white/20">
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Captions: {captions.length} segments</div>
                <div>Duration: {formatTime(duration)}</div>
                <div>Status: {captions.length ? 'Ready' : 'No captions'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};