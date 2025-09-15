import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Settings, FileText, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CaptionsWithIntention } from './CaptionsWithIntention';
import { AudioDescription } from './AudioDescription';
import { ASLAvatar } from './ASLAvatar';
import type { CaptionSegment } from './CaptionsWithIntention';
import { supabase } from '@/integrations/supabase/client';

interface EmbedPlayerProps {
  videoSrc: string;
  posterSrc?: string;
  title: string;
  videoId: string;
  embedToken?: string;
  captions?: CaptionSegment[];
  audioDescriptions?: any[];
  characters?: any[];
  contentType?: 'recipe' | 'education';
  settings?: {
    autoplay?: boolean;
    controls?: boolean;
    width?: string;
    height?: string;
  };
}

export const EmbedPlayer: React.FC<EmbedPlayerProps> = ({
  videoSrc,
  posterSrc,
  title,
  videoId,
  embedToken,
  captions = [],
  audioDescriptions = [],
  characters = [],
  contentType = 'education',
  settings = { autoplay: false, controls: true }
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
  const [showSettings, setShowSettings] = useState(false);

  // Disable any native text tracks so only overlay captions are shown
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const disableTracks = () => {
      try {
        const list = v.textTracks;
        if (list && list.length) {
          for (let i = 0; i < list.length; i++) list[i].mode = 'disabled';
        }
        const tracks = v.querySelectorAll('track');
        tracks.forEach(t => t.removeAttribute('default'));
      } catch (e) {
        console.warn('EMBED: Could not disable native text tracks:', e);
      }
    };
    disableTracks();
    v.addEventListener('loadedmetadata', disableTracks);
    v.addEventListener('loadeddata', disableTracks);
    return () => {
      v.removeEventListener('loadedmetadata', disableTracks);
      v.removeEventListener('loadeddata', disableTracks);
    };
  }, [videoSrc]);

  // Analytics tracking
  const [viewStartTime, setViewStartTime] = useState<number | null>(null);
  const [totalWatchTime, setTotalWatchTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);

    // Track view start
    const handlePlay = () => {
      setViewStartTime(Date.now());
      trackEmbedView();
    };

    const handlePause = () => {
      if (viewStartTime) {
        const watchDuration = (Date.now() - viewStartTime) / 1000;
        setTotalWatchTime(prev => prev + watchDuration);
        setViewStartTime(null);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Auto-track on page unload
    const handleBeforeUnload = () => {
      if (viewStartTime) {
        const watchDuration = (Date.now() - viewStartTime) / 1000;
        const finalWatchTime = totalWatchTime + watchDuration;
        trackEmbedAnalytics(finalWatchTime);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [viewStartTime, totalWatchTime]);

  const trackEmbedView = async () => {
    try {
      const referrerDomain = document.referrer ? new URL(document.referrer).hostname : 'direct';
      
      await supabase.from('embed_analytics').insert({
        video_id: videoId,
        embed_token: embedToken,
        referrer_domain: referrerDomain,
        user_agent: navigator.userAgent,
        view_count: 1
      });
    } catch (error) {
      console.error('Failed to track embed view:', error);
    }
  };

  const trackEmbedAnalytics = async (watchDuration: number) => {
    try {
      const referrerDomain = document.referrer ? new URL(document.referrer).hostname : 'direct';
      
      await supabase.from('embed_analytics').insert({
        video_id: videoId,
        embed_token: embedToken,
        referrer_domain: referrerDomain,
        user_agent: navigator.userAgent,
        duration_watched: watchDuration,
        view_count: 1
      });
    } catch (error) {
      console.error('Failed to track embed analytics:', error);
    }
  };

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
      }
    } catch (error) {
      console.error('Play error:', error);
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

  // Apply embed settings
  const showControls = settings.controls !== false;

  return (
    <div 
      className="relative bg-black rounded-lg overflow-hidden shadow-2xl w-full"
      style={{ 
        width: settings.width || '100%',
        height: settings.height || 'auto'
      }}
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
        autoPlay={settings.autoplay}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

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
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pb-2 pt-8 px-2">
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
            <div className="flex justify-between text-xs text-white mt-1">
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
                className="text-white hover:text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                  className="text-white hover:text-white hover:bg-white/20"
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCaptions(!showCaptions)}
                title="Toggle captions"
                className={`text-white hover:text-white hover:bg-white/20 ${showCaptions ? 'bg-white/20' : ''}`}
              >
                <FileText className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                title="Accessibility settings"
                className="text-white hover:text-white hover:bg-white/20"
              >
                <Settings className="w-4 h-4" />
              </Button>

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
                className="text-white hover:text-white hover:bg-white/20"
              >
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-0 right-0 w-64 h-full bg-black/95 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Accessibility</h3>
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

            <div className="pt-4 border-t border-white/20 text-xs">
              <p className="text-white/70">Embedded player</p>
              <p className="text-white/70">Powered by Axessible</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};