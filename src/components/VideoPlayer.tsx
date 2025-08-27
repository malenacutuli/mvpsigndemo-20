import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Settings, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface Track {
  src: string;
  kind: 'subtitles' | 'captions' | 'descriptions';
  srclang: string;
  label: string;
  default?: boolean;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  tracks?: Track[];
  adAudio?: { src: string; label: string };
  aslVideo?: { src: string; label: string };
  title: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  tracks = [],
  adAudio,
  aslVideo,
  title
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showASL, setShowASL] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [adEnabled, setAdEnabled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedData = () => console.log('Video loaded:', src);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadeddata', handleLoadedData);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [src]);

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
      console.error('Video play error:', error);
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
    <div className={`relative bg-black rounded-lg overflow-hidden shadow-2xl ${isDarkMode ? 'dark' : ''}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-cover"
        onClick={togglePlay}
        aria-label={`Video: ${title}`}
      >
        {tracks.map((track, index) => (
          <track
            key={index}
            kind={track.kind}
            src={track.src}
            srcLang={track.srclang}
            label={track.label}
            default={track.default || (showCaptions && track.kind === 'captions')}
          />
        ))}
      </video>

      {/* ASL Video Overlay */}
      {showASL && aslVideo && (
        <video
          className="absolute bottom-20 right-4 w-48 h-36 rounded-xl shadow-lg border-2 border-white/70"
          src={aslVideo.src}
          muted
          loop
          playsInline
          autoPlay
        />
      )}

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4">
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
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlay}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCaptions(!showCaptions)}
              className={`text-white hover:bg-white/20 ${showCaptions ? 'bg-white/30' : ''}`}
            >
              CC
            </Button>

            {adAudio && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAdEnabled(!adEnabled)}
                className={`text-white hover:bg-white/20 ${adEnabled ? 'bg-white/30' : ''}`}
              >
                <Volume2 className="w-4 h-4 mr-1" />
                AD
              </Button>
            )}

            {aslVideo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowASL(!showASL)}
                className={`text-white hover:bg-white/20 ${showASL ? 'bg-white/30' : ''}`}
              >
                ASL
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="text-white hover:bg-white/20"
            >
              {isDarkMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="absolute top-4 left-4 flex gap-2">
        {showCaptions && (
          <Badge variant="secondary" className="bg-black/70 text-white border-white/30">
            Captions: ON
          </Badge>
        )}
        {adEnabled && (
          <Badge variant="secondary" className="bg-black/70 text-white border-white/30">
            Audio Description: ON
          </Badge>
        )}
        {showASL && (
          <Badge variant="secondary" className="bg-black/70 text-white border-white/30">
            ASL: ON
          </Badge>
        )}
      </div>
    </div>
  );
};