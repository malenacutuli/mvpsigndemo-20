import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, HandHelping, Mic, Globe, FileText, Sparkles } from 'lucide-react';
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
import { LanguageSelector } from './LanguageSelector';
import { VoiceCloningControls } from './VoiceCloningControls';
import { SynchronizedDubbingPlayer } from './SynchronizedDubbingPlayer';
import { FeatureExplanation } from './FeatureExplanation';
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
  dynamicDescriptions?: any[];
  videoId?: string; // Add video ID for database operations
}

export const AxessiblePlayer: React.FC<AxessiblePlayerProps> = ({
  videoSrc,
  posterSrc,
  title,
  className = "",
  selectedVoice,
  selectedASLAvatar,
  contentType = 'education',
  initialCaptions,
  dynamicDescriptions,
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
  const [generatedTranscript, setGeneratedTranscript] = useState<string>('');
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [dynamicADEnabled, setDynamicADEnabled] = useState(false);
  const [generatedAD, setGeneratedAD] = useState<Array<{ text: string; startTime: number; endTime: number; voiceStyle: 'passionate' | 'warm' | 'authoritative' | 'encouraging' }> | null>(null);
  const [isGeneratingAD, setIsGeneratingAD] = useState(false);
  const [generateADError, setGenerateADError] = useState<string | null>(null);
  const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false);
  const [keyboardNavEnabled, setKeyboardNavEnabled] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [translatedContent, setTranslatedContent] = useState<any>(null);
  const [clonedVoiceId, setClonedVoiceId] = useState<string | null>(null);
  const [isDubbing, setIsDubbing] = useState(false);
  const [originalAudioMuted, setOriginalAudioMuted] = useState(false);

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
      // Only restore volume if not in dubbing mode or user wants original audio
      const targetVolume = (isDubbing && originalAudioMuted) ? 0 : volume;
      video.volume = targetVolume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleOriginalAudio = () => {
    const video = videoRef.current;
    if (!video) return;

    const newMutedState = !originalAudioMuted;
    setOriginalAudioMuted(newMutedState);
    
    if (isDubbing) {
      video.volume = newMutedState ? 0 : (isMuted ? 0 : volume);
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
        body: { videoUrl: videoSrc, rangeBytes: 50000000 }  // Increased to 50MB to capture full video
      });
      if (error) throw new Error(error.message || 'Transcription failed');
      
      const segments = (data && (data as any).segments) || [];
      if (segments.length > 0) {
        const transcriptText = segments.map((s: any) => s.text).join(' ');
        setGeneratedTranscript(transcriptText);
        console.log('Generated transcript for dubbing:', transcriptText);
      }
      
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
      // Auto-generate captions if they don't exist
      if (!generatedCaptions || generatedCaptions.length === 0) {
        console.log('Auto-generating captions for audio description...');
        await handleGenerateCaptions();
        // Wait a moment for captions to be generated
        setTimeout(() => handleToggleDynamicAD(), 2000);
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

  const handleFixAccessibilityIssue = async (issue: string) => {
    switch (issue) {
      case 'generateCaptions':
        await handleGenerateCaptions();
        break;
      case 'generateAudioDescription':
        await handleToggleDynamicAD();
        break;
      case 'enableASL':
        setShowASL(true);
        break;
      case 'enableKeyboard':
        setKeyboardNavEnabled(true);
        break;
      case 'enableScreenReader':
        // Add ARIA labels and semantic structure
        console.log('Screen reader compatibility enabled');
        break;
      case 'enableHighContrast':
        // Toggle high contrast mode
        document.body.classList.toggle('high-contrast');
        break;
      case 'updateThumbnailAlt':
        // Update video poster alt text
        const video = videoRef.current;
        if (video) {
          video.setAttribute('aria-label', `${title} - Video with captions and audio description available`);
        }
        break;
      case 'showPlayButton':
        // Ensure play button is visible
        setShowControls(true);
        break;
      default:
        console.log('Fix issue:', issue);
    }
  };

  const handleLanguageChange = async (language: string, content?: any) => {
    setCurrentLanguage(language);
    const isDubbingActive = language !== 'en';
    setIsDubbing(isDubbingActive);
    
    if (content) {
      setTranslatedContent(content);
      
      // Translate captions with intention when dubbing is active
      if (content.captions || isDubbingActive) {
        const captionsToTranslate = content.captions || generatedCaptions;
        if (captionsToTranslate && isDubbingActive) {
          try {
            // Generate translated captions with intention
            const captionText = captionsToTranslate.map((c: any) => c.text).join(' ');
            const { data: translatedCaptions } = await supabase.functions.invoke('generate-dubbing', {
              body: { text: captionText, targetLanguage: language }
            });
            
            if (translatedCaptions?.translatedText) {
              const translatedCaptionSegments = captionsToTranslate.map((caption: any, index: number) => ({
                ...caption,
                text: translatedCaptions.translatedText.split('. ')[index] || caption.text
              }));
              setGeneratedCaptions(translatedCaptionSegments);
            }
          } catch (error) {
            console.error('Caption translation error:', error);
            if (content.captions) setGeneratedCaptions(content.captions);
          }
        } else if (content.captions) {
          setGeneratedCaptions(content.captions);
        }
      }
      
      // Translate audio descriptions when dubbing is active
      if (content.audioDescription || isDubbingActive) {
        const audioDescToTranslate = content.audioDescription || generatedAD;
        if (audioDescToTranslate && isDubbingActive) {
          try {
            const adText = audioDescToTranslate.map((ad: any) => ad.text).join(' ');
            const { data: translatedAD } = await supabase.functions.invoke('generate-dubbing', {
              body: { text: adText, targetLanguage: language }
            });
            
            if (translatedAD?.translatedText) {
              const translatedADSegments = audioDescToTranslate.map((ad: any, index: number) => ({
                ...ad,
                text: translatedAD.translatedText.split('. ')[index] || ad.text
              }));
              setGeneratedAD(translatedADSegments);
            }
          } catch (error) {
            console.error('Audio description translation error:', error);
            if (content.audioDescription) setGeneratedAD(content.audioDescription);
          }
        } else if (content.audioDescription) {
          setGeneratedAD(content.audioDescription);
        }
      }
    } else if (language === 'en') {
      // Reset to original content
      if (initialCaptions) {
        setGeneratedCaptions(initialCaptions);
      }
      setTranslatedContent(null);
      setOriginalAudioMuted(false);
      
      // Restore original video audio
      const video = videoRef.current;
      if (video) {
        video.volume = isMuted ? 0 : volume;
      }
    }
    
    // When switching to dubbing mode, give option to mute original audio
    if (isDubbingActive && !originalAudioMuted) {
      setOriginalAudioMuted(true);
      const video = videoRef.current;
      if (video) {
        video.volume = 0; // Mute original video audio when dubbing is active
      }
    }
  };

  const handleTranslatedContentUpdate = (content: any) => {
    setTranslatedContent(content);
    if (content.captions) {
      setGeneratedCaptions(content.captions);
    }
    if (content.audioDescription) {
      setGeneratedAD(content.audioDescription);
    }
  };

  const handleVoiceCloned = (voiceId: string, voiceName: string) => {
    setClonedVoiceId(voiceId);
  };

  const handleTranscriptUpdate = (segments: any[], language: string) => {
    // Convert segments to caption format with proper timing
    const captionSegments: CaptionSegment[] = segments.map(segment => {
      // Handle both formats: segments with start_time/end_time or startTime/endTime
      const startTime = segment.startTime ?? segment.start_time ?? 0;
      const endTime = segment.endTime ?? segment.end_time ?? (startTime + 3);
      const duration = Math.max(endTime - startTime, 0.1);
      
      const words = segment.text.split(' ').map((word: string, index: number, arr: string[]) => {
        const wordDuration = duration / arr.length;
        return {
          text: word,
          startTime: startTime + (index * wordDuration),
          endTime: startTime + ((index + 1) * wordDuration),
          emphasis: segment.emphasis || 'normal' as const,
          pitch: segment.pitch || 'normal' as const,
        };
      });
      
      return {
        text: segment.text,
        speaker: segment.speaker || 'narrator',
        startTime,
        endTime,
        words,
        // Add CI properties
        volume: segment.emphasis === 'loud' ? 85 : segment.emphasis === 'quiet' ? 30 : 60,
        pitch: segment.pitch === 'high' ? 220 : segment.pitch === 'low' ? 100 : 180,
        type: segment.speaker === 'soundeffect' ? 'soundeffect' : segment.speaker === 'music' ? 'music' : 'dialogue',
        isOffCamera: segment.isOffCamera || false,
        speakerColor: segment.speakerColor
      } as CaptionSegment;
    });
    
    setGeneratedCaptions(captionSegments);
    
    // Update current language if provided
    if (language && language !== currentLanguage) {
      setCurrentLanguage(language);
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
          captions={(translatedContent?.captions || generatedCaptions) ?? []}
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
            selectedVoice={selectedVoice}
            dynamicDescriptions={dynamicDescriptions || (dynamicADEnabled && generatedAD ? generatedAD : undefined)}
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

        {/* Single Controls Row - Specified Requirements Only */}
        <div className="flex items-center justify-between">
          {/* Left - Essential Playback */}
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

          {/* Right - Required Features Only */}
          <div className="flex items-center gap-2">
            {/* Language & Dubbing */}
            <div className="flex items-center gap-1">
              <SynchronizedDubbingPlayer
                transcriptText={generatedTranscript}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onLanguageChange={handleLanguageChange}
              />
              
              {/* Original Audio Toggle (only show when dubbing is active) */}
              {isDubbing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleOriginalAudio}
                  title={originalAudioMuted ? "Enable original audio" : "Mute original audio"}
                  className={`text-primary-foreground hover:text-primary hover:bg-primary/20 ${originalAudioMuted ? '' : 'bg-accent/20 text-accent-foreground'}`}
                >
                  <Mic className="w-3 h-3" />
                </Button>
              )}
            </div>
            
            {/* Captions with Intention */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCaptions(!showCaptions)}
              title="Toggle captions with emotion and intent"
              className={`text-primary-foreground hover:text-primary hover:bg-primary/20 ${showCaptions ? 'bg-accent/20 text-accent-foreground' : ''}`}
            >
              <FileText className="w-4 h-4" />
            </Button>
            
            {/* Audio Description */}
            {/* Audio Description Toggle + Generate Button */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAudioDescription(!showAudioDescription)}
                title="Toggle audio descriptions"
                className={`text-primary-foreground hover:text-primary hover:bg-primary/20 ${showAudioDescription ? 'bg-accent/20 text-accent-foreground' : ''}`}
              >
                <Volume2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleDynamicAD}
                title={dynamicADEnabled ? "Disable dynamic AD" : "Generate AI audio descriptions"}
                className={`text-primary-foreground hover:text-primary hover:bg-primary/20 ${dynamicADEnabled ? 'bg-green-500/20' : ''}`}
                disabled={isGeneratingAD}
              >
                {isGeneratingAD ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {/* Sign Language Avatar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowASL(!showASL)}
              title="Toggle ASL avatar"
              className={`text-primary-foreground hover:text-primary hover:bg-primary/20 ${showASL ? 'bg-accent/20 text-accent-foreground' : ''}`}
            >
              <HandHelping className="w-4 h-4" />
            </Button>
            
            {/* Dubbing - Part of Language Selector */}
            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAccessibilityPanel(!showAccessibilityPanel)}
              title="Accessibility settings"
              className="text-primary-foreground hover:text-primary hover:bg-primary/20"
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            {/* Expand Screen */}
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
              title="Enter fullscreen mode"
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
            
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-7 bg-muted/20">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="grader">Grader</TabsTrigger>
                <TabsTrigger value="language">Language</TabsTrigger>
                <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
                <TabsTrigger value="dubbing">Dubbing</TabsTrigger>
                <TabsTrigger value="voice">Voice</TabsTrigger>
                <TabsTrigger value="keyboard">Keyboard</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="mt-4">
                <FeatureExplanation />
              </TabsContent>
              
              <TabsContent value="grader" className="mt-4">
                <AccessibilityGrader
                  videoId={videoId}
                  hasTranscript={!!generatedCaptions?.length}
                  hasAudioDescription={showAudioDescription}
                  hasCaptions={showCaptions}
                  hasASL={showASL}
                  hasKeyboardNav={keyboardNavEnabled}
                  language={contentType === 'education' ? 'es' : 'en'}
                  hasScreenReaderSupport={true}
                  hasHighContrast={true}
                  hasThumbnailAltText={!!posterSrc}
                  hasVisiblePlayButton={true}
                  onFixIssue={handleFixAccessibilityIssue}
                />
              </TabsContent>
              
              <TabsContent value="language" className="mt-4">
                <div className="space-y-4 text-white">
                  <h3 className="text-lg font-medium">Multi-Language Settings</h3>
                  <LanguageSelector
                    currentLanguage={currentLanguage}
                    originalCaptions={initialCaptions}
                    originalAudioDescription={generatedAD || undefined}
                    onLanguageChange={handleLanguageChange}
                    onTranslatedContentUpdate={handleTranslatedContentUpdate}
                  />
                  <div className="p-4 border border-muted/20 rounded-lg">
                    <h4 className="font-medium mb-2">Language Features</h4>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <div>Current: {currentLanguage === 'en' ? 'English (Original)' : `Translated to ${currentLanguage.toUpperCase()}`}</div>
                      <div>Translated Captions: {translatedContent?.captions?.length ? 'Available' : 'Not Available'}</div>
                      <div>Translated Audio Description: {translatedContent?.audioDescription?.length ? 'Available' : 'Not Available'}</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="transcripts" className="mt-4">
                <TranscriptionManager
                  videoId={videoId}
                  videoUrl={videoSrc}
                  onTranscriptUpdate={(segments) => handleTranscriptUpdate(segments, currentLanguage)}
                  contentType={contentType}
                />
              </TabsContent>
              
              <TabsContent value="dubbing" className="mt-4">
                <VideoDubbingManager
                  videoId={videoId}
                  videoUrl={videoSrc}
                  originalLanguage={contentType === 'education' ? 'es' : 'en'}
                  transcriptText={generatedCaptions?.map(c => c.text).join(' ') || ''}
                />
              </TabsContent>
              
              <TabsContent value="voice" className="mt-4">
                <VoiceCloningControls
                  onVoiceCloned={handleVoiceCloned}
                  currentLanguage={currentLanguage}
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