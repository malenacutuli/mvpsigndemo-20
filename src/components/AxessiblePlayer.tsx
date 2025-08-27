import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, HandHelping, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CaptionsWithIntention } from './CaptionsWithIntention';
import { AccessibilityControls } from './AccessibilityControls';
import { AudioDescription } from './AudioDescription';
import { ASLAvatar } from './ASLAvatar';
import { AccessibilityGrader } from './AccessibilityGrader';
import { TranscriptionManager } from './TranscriptionManager';
import { VideoDubbingManager } from './VideoDubbingManager';
import { KeyboardAccessibilityManager } from './KeyboardAccessibilityManager';
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
  initialCaptions?: CaptionSegment[];
  videoId?: string; // Add video ID for database operations
}

export const AxessiblePlayer: React.FC<AxessiblePlayerProps> = ({
  videoSrc,
  posterSrc,
  title,
  className = "",
  selectedVoice,
  selectedASLAvatar,
  contentType = 'recipe',
  initialCaptions,
  videoId,
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
  const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false);
  const [keyboardNavEnabled, setKeyboardNavEnabled] = useState(true);

  const activeCaption = useMemo(() => {
    if (!generatedCaptions || generatedCaptions.length === 0) return null;
    return (
      generatedCaptions.find(
        (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime
      ) || null
    );
  }, [generatedCaptions, currentTime]);

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

  // If initial captions are provided, hydrate once
  useEffect(() => {
    if (initialCaptions && (!generatedCaptions || generatedCaptions.length === 0)) {
      setGeneratedCaptions(initialCaptions);
    }
  }, [initialCaptions]);

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

  const handleFixAccessibilityIssue = (issue: string) => {
    switch (issue) {
      case 'generateCaptions':
        handleGenerateCaptions();
        break;
      case 'generateAudioDescription':
        handleToggleDynamicAD();
        break;
      case 'enableASL':
        setShowASL(true);
        break;
      case 'enableKeyboard':
        setKeyboardNavEnabled(true);
        break;
      default:
        console.log('Fix issue:', issue);
    }
  };

  const handleTranscriptUpdate = (segments: any[]) => {
    // Convert segments to caption format if needed
    const captionSegments: CaptionSegment[] = segments.map(segment => {
      const words = segment.text.split(' ').map((word: string, index: number, arr: string[]) => {
        const duration = segment.end_time - segment.start_time;
        const wordDuration = duration / arr.length;
        return {
          text: word,
          startTime: segment.start_time + (index * wordDuration),
          endTime: segment.start_time + ((index + 1) * wordDuration),
          emphasis: 'normal' as const,
          pitch: 'normal' as const,
        };
      });
      
      return {
        text: segment.text,
        speaker: segment.speaker || 'narrator' as any,
        startTime: segment.start_time,
        endTime: segment.end_time,
        words,
      };
    });
    
    setGeneratedCaptions(captionSegments);
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

      {/* ASL Avatar Overlay */}
      {showASL && (
        <ASLAvatar
          contentType={contentType}
          selectedASLAvatar={selectedASLAvatar}
          currentCaption={activeCaption}
        />
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
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 transition-opacity duration-300 ${
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
              onClick={() => setShowAccessibilityPanel(!showAccessibilityPanel)}
              aria-label="Accessibility Panel"
              className="text-primary-foreground hover:text-primary hover:bg-primary/20"
            >
              <Settings className="w-4 h-4" />
            </Button>
            
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

      {/* Accessibility Panel */}
      {showAccessibilityPanel && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/95 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Accessibility Panel</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAccessibilityPanel(false)}
                className="text-white hover:bg-white/20"
              >
                ✕
              </Button>
            </div>
            
            <Tabs defaultValue="grader" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-muted/20">
                <TabsTrigger value="grader">Grader</TabsTrigger>
                <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
                <TabsTrigger value="dubbing">Dubbing</TabsTrigger>
                <TabsTrigger value="keyboard">Keyboard</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="grader" className="mt-4">
                <AccessibilityGrader
                  videoId={videoId}
                  hasTranscript={!!generatedCaptions?.length}
                  hasAudioDescription={showAudioDescription}
                  hasCaptions={showCaptions}
                  hasASL={showASL}
                  hasKeyboardNav={keyboardNavEnabled}
                  language={contentType === 'education' ? 'es' : 'en'}
                  onFixIssue={handleFixAccessibilityIssue}
                />
              </TabsContent>
              
              <TabsContent value="transcripts" className="mt-4">
                <TranscriptionManager
                  videoId={videoId}
                  videoUrl={videoSrc}
                  onTranscriptUpdate={handleTranscriptUpdate}
                  contentType={contentType}
                />
              </TabsContent>
              
              <TabsContent value="dubbing" className="mt-4">
                <VideoDubbingManager
                  videoId={videoId}
                  videoUrl={videoSrc}
                  originalLanguage={contentType === 'education' ? 'es' : 'en'}
                />
              </TabsContent>
              
              <TabsContent value="keyboard" className="mt-4">
                <KeyboardAccessibilityManager
                  onKeyboardModeChange={setKeyboardNavEnabled}
                />
              </TabsContent>
              
              <TabsContent value="settings" className="mt-4">
                <div className="space-y-4 text-white">
                  <h3 className="text-lg font-medium">Player Settings</h3>
                  <div className="grid gap-4">
                    <div className="p-4 border border-muted rounded-lg">
                      <h4 className="font-medium mb-2">Video Information</h4>
                      <div className="text-sm space-y-1 text-muted-foreground">
                        <div>Title: {title}</div>
                        <div>Type: {contentType}</div>
                        <div>Duration: {formatTime(duration)}</div>
                      </div>
                    </div>
                    
                    <div className="p-4 border border-muted rounded-lg">
                      <h4 className="font-medium mb-2">Accessibility Features</h4>
                      <div className="text-sm space-y-1 text-muted-foreground">
                        <div>Captions: {showCaptions ? 'Enabled' : 'Disabled'}</div>
                        <div>Audio Description: {showAudioDescription ? 'Enabled' : 'Disabled'}</div>
                        <div>ASL Avatar: {showASL ? 'Enabled' : 'Disabled'}</div>
                        <div>Keyboard Navigation: {keyboardNavEnabled ? 'Enabled' : 'Disabled'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
};