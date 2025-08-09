import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, HandHelping, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CaptionsWithIntention } from './CaptionsWithIntention';
import { AccessibilityControls } from './AccessibilityControls';
import { AudioDescription } from './AudioDescription';
import { supabase } from "@/integrations/supabase/client";
import type { CaptionSegment } from './CaptionsWithIntention';

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
  const [showAudioDescription, setShowAudioDescription] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [generatedCaptions, setGeneratedCaptions] = useState<CaptionSegment[] | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [dynamicADEnabled, setDynamicADEnabled] = useState(false);
  const [generatedAD, setGeneratedAD] = useState<Array<{ text: string; startTime: number; endTime: number; voiceStyle: 'passionate' | 'warm' | 'authoritative' | 'encouraging' }> | null>(null);
  const [isGeneratingAD, setIsGeneratingAD] = useState(false);
  const [generateADError, setGenerateADError] = useState<string | null>(null);

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

  const handleGenerateCaptions = async () => {
    try {
      setIsTranscribing(true);
      setTranscribeError(null);
      const { data, error } = await supabase.functions.invoke('transcribe', {
        body: { videoUrl: videoSrc, rangeBytes: 15000000 }
      });
      if (error) throw new Error(error.message || 'Transcription failed');
      const segments = (data && (data as any).segments) || [];
      const mapped: CaptionSegment[] = segments.map((seg: any) => {
        const start = Number(seg.start ?? 0);
        const end = Number(seg.end ?? (start + 2));
        const txt: string = String(seg.text ?? '').trim();
        const wordsRaw = txt.length ? txt.split(/\s+/) : [];
        const dur = Math.max(end - start, 0.001);
        const step = wordsRaw.length ? dur / wordsRaw.length : dur;
        const words = wordsRaw.map((w: string, i: number) => ({
          text: w,
          startTime: start + i * step,
          endTime: Math.min(end, start + (i + 1) * step),
          emphasis: 'normal' as const,
          pitch: 'normal' as const,
        }));
        return {
          text: txt,
          speaker: 'teacher',
          startTime: start,
          endTime: end,
          words,
        } as CaptionSegment;
      });
      setGeneratedCaptions(mapped);
    } catch (e: any) {
      setTranscribeError(e.message || 'Failed to generate captions');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Toggle and generate Dynamic Audio Description from AI
  const handleToggleDynamicAD = async () => {
    const enable = !dynamicADEnabled;
    setDynamicADEnabled(enable);

    if (enable && !generatedAD) {
      if (!generatedCaptions || generatedCaptions.length === 0) {
        setGenerateADError('Generate AI captions first.');
        return;
      }
      try {
        setIsGeneratingAD(true);
        setGenerateADError(null);
        const payload = {
          contentType,
          segments: generatedCaptions.map(seg => ({
            text: seg.text,
            startTime: seg.startTime,
            endTime: seg.endTime,
          })),
        };
        const { data, error } = await supabase.functions.invoke('generate-ad', { body: payload });
        if (error) throw new Error(error.message || 'AD generation failed');
        const descs = (data as any)?.descriptions || [];
        setGeneratedAD(descs);
      } catch (e: any) {
        setGenerateADError(e.message || 'Failed to generate AD');
        setDynamicADEnabled(false);
      } finally {
        setIsGeneratingAD(false);
      }
    }
  };

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
            <div className="absolute inset-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex flex-col items-center justify-center backdrop-blur-sm">
              {/* Enhanced ASL Avatar with realistic animations */}
              {contentType === 'recipe' ? (
                selectedASLAvatar?.id === 'chef-avatar' ? (
                  <div className="text-center relative">
                    {/* Chef Avatar with cooking gestures */}
                    <div className="relative w-20 h-20 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-full flex items-center justify-center mb-2 border-2 border-orange-400/50">
                      <div className="absolute inset-0 bg-orange-400/20 rounded-full animate-pulse"></div>
                      <span className="text-3xl relative z-10">👨‍🍳</span>
                      {/* Cooking gesture indicators */}
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center animate-bounce">
                        <span className="text-xs">🍳</span>
                      </div>
                    </div>
                    <div className="text-xs text-orange-300 font-semibold">Chef Marcel</div>
                    <div className="text-xs text-white/80">Culinary ASL Expert</div>
                    
                    {/* Live cooking signs indicator */}
                    <div className="mt-2 flex items-center justify-center gap-1">
                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-orange-300">Signing: "PASTA"</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center relative">
                    <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full flex items-center justify-center mb-2 border-2 border-blue-400/50">
                      <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-pulse"></div>
                      <span className="text-3xl relative z-10">👩‍🏫</span>
                    </div>
                    <div className="text-xs text-blue-300 font-semibold">Chef Isabella</div>
                    <div className="text-xs text-white/80">Food Expert ASL</div>
                  </div>
                )
              ) : (
                selectedASLAvatar?.id === 'superhero-captain' ? (
                  <div className="text-center relative">
                    {/* Captain Wonder with superhero powers */}
                    <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600/40 to-cyan-500/40 rounded-full flex items-center justify-center mb-2 border-2 border-blue-400/60">
                      <div className="absolute inset-0 bg-blue-400/30 rounded-full animate-pulse"></div>
                      <span className="text-3xl relative z-10">🦸‍♂️</span>
                      {/* Power indicator */}
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-spin">
                        <span className="text-xs">⚡</span>
                      </div>
                    </div>
                    <div className="text-xs text-blue-300 font-semibold">Captain Wonder</div>
                    <div className="text-xs text-white/80">Science Hero ASL</div>
                    
                    {/* Live educational signs */}
                    <div className="mt-2 flex items-center justify-center gap-1">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-300">Signing: "GRAVITY"</span>
                    </div>
                  </div>
                ) : selectedASLAvatar?.id === 'superhero-star' ? (
                  <div className="text-center relative">
                    <div className="relative w-20 h-20 bg-gradient-to-br from-yellow-500/40 to-orange-500/40 rounded-full flex items-center justify-center mb-2 border-2 border-yellow-400/60">
                      <div className="absolute inset-0 bg-yellow-400/30 rounded-full animate-pulse"></div>
                      <span className="text-3xl relative z-10">🌟</span>
                      {/* Magic sparkles */}
                      <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center animate-ping">
                        <span className="text-xs">✨</span>
                      </div>
                    </div>
                    <div className="text-xs text-yellow-300 font-semibold">Star Guardian</div>
                    <div className="text-xs text-white/80">Magic Learning ASL</div>
                  </div>
                ) : (
                  <div className="text-center relative">
                    <div className="relative w-20 h-20 bg-gradient-to-br from-green-500/40 to-emerald-500/40 rounded-full flex items-center justify-center mb-2 border-2 border-green-400/60">
                      <div className="absolute inset-0 bg-green-400/30 rounded-full animate-pulse"></div>
                      <span className="text-3xl relative z-10">👩‍🏫</span>
                    </div>
                    <div className="text-xs text-green-300 font-semibold">Teacher Maya</div>
                    <div className="text-xs text-white/80">Educational ASL</div>
                  </div>
                )
              )}
              
              {/* Enhanced Signing Animation with realistic movements */}
              <div className="absolute bottom-1 right-1 flex items-center gap-1">
                <HandHelping className="w-4 h-4 text-primary animate-bounce" />
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
              
              {/* Live signing indicator */}
              <div className="absolute top-1 left-1 bg-red-500/90 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                LIVE
              </div>
              
              {/* Signing accuracy indicator */}
              <div className="absolute top-1 right-1 bg-green-500/80 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                99.2%
              </div>
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
          captionsOverride={generatedCaptions ?? undefined}
        />
      )}

      {/* Audio Description */}
      {showAudioDescription && (
        <AudioDescription
          currentTime={currentTime}
          isPlaying={isPlaying}
          contentType={contentType}
          selectedVoice={selectedVoice}
          dynamicDescriptions={dynamicADEnabled && generatedAD ? generatedAD : undefined}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateCaptions}
              aria-label="Generate captions from audio"
              className="text-primary-foreground hover:text-primary hover:bg-primary/20"
              disabled={isTranscribing}
            >
              <Mic className="w-4 h-4 mr-1" />
              {isTranscribing ? 'Transcribing…' : 'AI CC'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleDynamicAD}
              aria-label={dynamicADEnabled ? 'Disable Dynamic Audio Description' : 'Enable Dynamic Audio Description'}
              className={`text-primary-foreground hover:text-primary hover:bg-primary/20 ${dynamicADEnabled ? 'bg-primary/30 text-primary' : ''}`}
              disabled={isGeneratingAD || !generatedCaptions}
            >
              <Volume2 className="w-4 h-4 mr-1" />
              {isGeneratingAD ? 'AD…' : (dynamicADEnabled ? 'Dynamic AD On' : 'Dynamic AD')}
            </Button>
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