import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Settings, FileText, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CaptionsWithIntention } from './CaptionsWithIntention';
import { AudioDescription } from './AudioDescription';
import { ASLAvatar } from './ASLAvatar';
import { AccessibilityGrader } from './AccessibilityGrader';
import type { CaptionSegment } from './CaptionsWithIntention';

interface CleanAxessiblePlayerProps {
  videoSrc: string;
  posterSrc?: string;
  title: string;
  className?: string;
  contentType?: 'recipe' | 'education';
  captions?: CaptionSegment[];
  videoId?: string;
  audioDescriptions?: any[];
  characters?: any[];
}

export const CleanAxessiblePlayer: React.FC<CleanAxessiblePlayerProps> = ({
  videoSrc,
  posterSrc,
  title,
  className = "",
  contentType = 'education',
  captions = [],
  videoId,
  audioDescriptions = [],
  characters = [],
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
  const [isStalled, setIsStalled] = useState(false);
  const stalledTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        preload="metadata"
        onError={(e) => {
          console.error('Video loading error:', e);
          setVideoError(`Failed to load video. Please check the file.`);
          setVideoLoading(false);
          setIsStalled(false);
        }}
        onLoadStart={() => {
          setVideoLoading(true);
          setVideoError(null);
          setIsStalled(false);
        }}
        onCanPlay={() => {
          setVideoLoading(false);
          setIsStalled(false);
          // Clear any stalled timeout when video can play
          if (stalledTimeoutRef.current) {
            clearTimeout(stalledTimeoutRef.current);
            stalledTimeoutRef.current = null;
          }
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setVideoLoading(false);
          setIsStalled(false);
          setVideoError(null);
          // Clear stalled timeout when playing
          if (stalledTimeoutRef.current) {
            clearTimeout(stalledTimeoutRef.current);
            stalledTimeoutRef.current = null;
          }
        }}
        onPause={() => {
          setIsPlaying(false);
        }}
        onStalled={() => {
          console.warn('Video playback stalled');
          setIsStalled(true);
          
          // Only show error after 5 seconds of stalling
          stalledTimeoutRef.current = setTimeout(() => {
            setVideoError('Video loading stalled. Please wait or try refreshing.');
            setVideoLoading(false);
          }, 5000);
        }}
        onWaiting={() => {
          // Show buffering indicator but don't error immediately
          setIsStalled(true);
        }}
        onCanPlayThrough={() => {
          // Video has enough data to play through
          setIsStalled(false);
          setVideoLoading(false);
          if (stalledTimeoutRef.current) {
            clearTimeout(stalledTimeoutRef.current);
            stalledTimeoutRef.current = null;
          }
        }}
      />

      {/* Video Error/Loading Overlay */}
      {(videoError || videoLoading || isStalled) && (
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
                    setIsStalled(false);
                    if (stalledTimeoutRef.current) {
                      clearTimeout(stalledTimeoutRef.current);
                      stalledTimeoutRef.current = null;
                    }
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
            ) : isStalled ? (
              <>
                <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                <div className="text-sm">Buffering video...</div>
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
          selectedVoice={{ id: 'Laura', name: 'Laura', description: 'Default voice' }}
          dynamicDescriptions={audioDescriptions}
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

      {/* Full Accessibility Panel */}
      {showSettings && (
        <div className="absolute top-0 right-0 w-80 h-full bg-black/95 backdrop-blur-sm overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Accessibility Panel</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(false)}
                className="text-white hover:bg-white/20"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-6 text-white">
              {/* Quick Toggles */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Quick Controls</h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between">
                    <span>Captions with Intention</span>
                    <input
                      type="checkbox"
                      checked={showCaptions}
                      onChange={(e) => setShowCaptions(e.target.checked)}
                      className="rounded"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span>Audio Description</span>
                    <input
                      type="checkbox"
                      checked={showAudioDescription}
                      onChange={(e) => setShowAudioDescription(e.target.checked)}
                      className="rounded"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span>Sign Language Avatar</span>
                    <input
                      type="checkbox"
                      checked={showASL}
                      onChange={(e) => setShowASL(e.target.checked)}
                      className="rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Accessibility Grader */}
              <div className="border-t border-white/20 pt-4">
                <AccessibilityGrader
                  videoId={videoId}
                  hasTranscript={captions.length > 0}
                  hasAudioDescription={audioDescriptions.length > 0}
                  hasCaptions={captions.length > 0}
                  hasASL={true}
                  hasKeyboardNav={true}
                  language="en"
                  onFixIssue={(issue) => {
                    switch (issue) {
                      case 'generateCaptions':
                        setShowCaptions(true);
                        break;
                      case 'generateAudioDescription':
                        setShowAudioDescription(true);
                        break;
                      case 'enableScreenReader':
                        // Enable screen reader features
                        break;
                      case 'enableKeyboard':
                        // Enable keyboard navigation
                        break;
                      default:
                        console.log('Fix issue:', issue);
                    }
                  }}
                />
              </div>

              {/* Audio Description Generator */}
              <div className="border-t border-white/20 pt-4">
                <h4 className="font-medium text-sm mb-2">Dynamic Audio Description</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAudioDescription(true);
                    // Generate dynamic audio descriptions
                    console.log('🎧 Generating dynamic audio descriptions...');
                  }}
                  className="w-full text-white border-white/30 hover:bg-white/10"
                >
                  Generate AI Descriptions
                </Button>
              </div>

              {/* Character Management */}
              <div className="border-t border-white/20 pt-4">
                <h4 className="font-medium text-sm mb-2">Character Colors</h4>
                <div className="space-y-2">
                  {characters.length > 0 ? (
                    characters.map((char, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span>{char.name}</span>
                        <div 
                          className="w-4 h-4 rounded border border-white/30"
                          style={{ backgroundColor: char.color }}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-400">
                      No characters defined - using default colors
                    </div>
                  )}
                </div>
              </div>

              {/* Video Information */}
              <div className="border-t border-white/20 pt-4">
                <div className="text-sm space-y-1">
                  <div>Captions: {captions.length} segments</div>
                  <div>Audio Descriptions: {audioDescriptions.length}</div>
                  <div>Duration: {formatTime(duration)}</div>
                  <div>Status: {captions.length ? 'Accessible' : 'Needs captions'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};