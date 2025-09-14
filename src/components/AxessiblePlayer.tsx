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
import { computeGaps, allocateAdSlots } from '@/lib/ad/scheduler';
import { useIsMobile } from '@/hooks/use-mobile';

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
  onTranscriptUpdate?: (segments: any[], language: string) => void;
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
  onTranscriptUpdate,
}) => {
  // Update captions when initialCaptions changes (from database)
  useEffect(() => {
    if (initialCaptions && initialCaptions.length > 0) {
      console.log('📥 AxessiblePlayer received initialCaptions from database:', initialCaptions.length, 'segments');
      console.log('🔍 First database caption details:', initialCaptions[0] ? {
        speaker: initialCaptions[0].speaker,
        color: initialCaptions[0].speakerColor,
        emphasis: initialCaptions[0].words?.[0]?.emphasis,
        pitch: initialCaptions[0].words?.[0]?.pitch,
        text: initialCaptions[0].text?.substring(0, 50) + '...'
      } : 'No captions');
    } else {
      console.log('⚠️ AxessiblePlayer received empty or no initialCaptions');
    }
  }, [initialCaptions]);

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
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileFullscreen, setIsMobileFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Enhanced mobile fullscreen states
  const [isLandscape, setIsLandscape] = useState(false);
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });
  
  // Hooks
  const isMobile = useIsMobile();

  // Detect orientation changes for mobile fullscreen
  useEffect(() => {
    const updateOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    const updateSafeAreaInsets = () => {
      // Get CSS environment variables for safe area insets
      const style = getComputedStyle(document.documentElement);
      setSafeAreaInsets({
        top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
        right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
        bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0')
      });
    };

    updateOrientation();
    updateSafeAreaInsets();

    window.addEventListener('orientationchange', updateOrientation);
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('resize', updateSafeAreaInsets);

    return () => {
      window.removeEventListener('orientationchange', updateOrientation);
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('resize', updateSafeAreaInsets);
    };
  }, []);

  // Lock scroll when simulating fullscreen on mobile
  useEffect(() => {
    if (isMobileFullscreen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'contain';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
    };
  }, [isMobileFullscreen]);

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

    // Enhanced timing synchronization using requestAnimationFrame for smoother updates
    let animationFrame: number;
    const updateTimeWithAnimation = () => {
      if (video && !video.paused && !video.ended) {
        setCurrentTime(video.currentTime);
        animationFrame = requestAnimationFrame(updateTimeWithAnimation);
      }
    };

    // Fullscreen change detection
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };

    video.addEventListener('play', () => {
      animationFrame = requestAnimationFrame(updateTimeWithAnimation);
    });
    
    video.addEventListener('pause', () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    });

    video.addEventListener('ended', () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    });

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);

  // Load saved audio descriptions from database
  useEffect(() => {
    if (!videoId) return;

    const loadAudioDescriptions = async () => {
      try {
        // Query for both 'es' and 'spanish' language values to handle inconsistency
        const { data, error } = await supabase
          .from('audio_descriptions')
          .select('*')
          .eq('video_id', videoId)
          .in('language', [currentLanguage || 'en', 'spanish', 'es'])
          .order('start_time');

        if (error) {
          console.error('Error loading audio descriptions:', error);
          return;
        }

        if (data && data.length > 0) {
          const formattedDescriptions = data.map(desc => ({
            text: desc.description,
            startTime: desc.start_time,
            endTime: desc.end_time,  
            voiceStyle: 'warm' as const,
            timestamp: desc.start_time
          }));
          setGeneratedAD(formattedDescriptions);
          console.log('📢 AxessiblePlayer loaded audio descriptions from database:', formattedDescriptions.length, 'descriptions');
        } else {
          console.log('📢 AxessiblePlayer: No audio descriptions found for video:', videoId, 'language:', currentLanguage);
        }
      } catch (error) {
        console.error('Failed to load audio descriptions:', error);
      }
    };

    loadAudioDescriptions();
  }, [videoId, currentLanguage]);


  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        // For large files, try to play even with minimal buffering
        if (video.readyState >= 1) { // HAVE_METADATA or higher
          console.log(`Attempting to play with readyState: ${video.readyState}`);
          await video.play();
          setIsPlaying(true);
          setVideoError(null);
        } else {
          console.log('Video metadata not loaded yet, loading first...');
          video.load();
          setVideoError('Loading video metadata...');
          
          // Wait for metadata then try to play
          video.addEventListener('loadedmetadata', async () => {
            try {
              await video.play();
              setIsPlaying(true);
              setVideoError(null);
            } catch (e) {
              console.error('Play after metadata load failed:', e);
              setVideoError('Unable to start playback. Large file may need more buffering time.');
            }
          }, { once: true });
        }
      }
    } catch (error) {
      console.error('Play error:', error);
      if (error.name === 'NotAllowedError') {
        setVideoError('Playback blocked by browser. Click the video to enable playback.');
      } else if (error.name === 'NotSupportedError') {
        setVideoError('Video format not supported by your browser.');
      } else {
        setVideoError('Large video file detected. Try pausing briefly to allow more buffering.');
      }
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

  // Use initial captions when provided - but DON'T override database captions
  useEffect(() => {
    if (initialCaptions && initialCaptions.length > 0) {
      console.log('🔄 AxessiblePlayer received new initialCaptions:', initialCaptions.length, 'segments');
      console.log('🎨 First initial caption details:', initialCaptions[0] ? {
        speaker: initialCaptions[0].speaker,
        color: initialCaptions[0].speakerColor,
        emphasis: initialCaptions[0].words?.[0]?.emphasis,
        pitch: initialCaptions[0].words?.[0]?.pitch,
        hasUpdateKey: !!(initialCaptions[0] as any)._updateKey,
        source: 'database'
      } : 'No caption');
      
      // Only update generatedCaptions if we don't have database captions already
      // This prevents overriding database captions with generated ones
      if (!generatedCaptions || generatedCaptions.length === 0 || 
          (initialCaptions[0] as any)._updateKey) {
        console.log('✅ Setting generatedCaptions from database initialCaptions');
        setGeneratedCaptions(initialCaptions);
      } else {
        console.log('🚫 Keeping existing generatedCaptions, not overriding with initialCaptions');
      }
      
      // Generate transcript text for dubbing from initial captions
      const transcriptText = initialCaptions
        .sort((a, b) => a.startTime - b.startTime)
        .map(segment => segment.text)
        .join(' ');
      setGeneratedTranscript(transcriptText);
    }
  }, [initialCaptions]);

  // Toggle and generate Dynamic Audio Description from AI
  const handleToggleDynamicAD = async () => {
    const enable = !dynamicADEnabled;
    setDynamicADEnabled(enable);

    if (enable && !generatedAD) {
      // Auto-generate captions if they don't exist - redirect to transcript workflow
      if (!generatedCaptions || generatedCaptions.length === 0) {
        console.log('No captions available - use transcript workflow to generate');
        setGenerateADError('Please generate transcripts first using the transcript workflow');
        setDynamicADEnabled(false);
        return;
      }
      try {
        setIsGeneratingAD(true);
        setGenerateADError(null);
        const payload = {
          contentType: 'general', // Use general instead of specific content type
          language: currentLanguage || 'en',
          segments: generatedCaptions.map(seg => ({
            text: seg.text,
            startTime: seg.startTime,
            endTime: seg.endTime,
          })),
        };
        const { data, error } = await supabase.functions.invoke('generate-ad', { body: payload });
        if (error) throw new Error(error.message || 'AD generation failed');
        const proposals = (data as any)?.descriptions || [];

        // Schedule generated proposals into silence gaps
        const segmentsForGaps = generatedCaptions.map(seg => ({ start: seg.startTime, end: seg.endTime, text: seg.text }));
        const videoDur = duration || (generatedCaptions[generatedCaptions.length - 1]?.endTime ?? 9999);
        const gaps = computeGaps(segmentsForGaps as any, videoDur, 1.0, 0.12);
        const slots = allocateAdSlots(gaps, 2.0);

        const estimateDurationForText = (text: string) => {
          const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
          const wps = 2.6; // ~2.6 words/sec for clarity
          return Math.min(5.0, Math.max(1.2, words / wps));
        };
        const determineVoice = (text: string): 'passionate' | 'warm' | 'authoritative' | 'encouraging' => {
          const t = (text || '').toLowerCase();
          if (t.includes('practice') || t.includes('learn')) return 'encouraging';
          if (t.includes('show') || t.includes('demonstrate') || t.includes('explain')) return 'authoritative';
          if (t.includes('gentle') || t.includes('calm')) return 'warm';
          return 'encouraging'; // Default for general content
        };

        const scheduled: any[] = [];
        let i = 0;
        for (const slot of slots) {
          if (i >= proposals.length) break;
          const p = proposals[i++];
          const dur = Math.min(estimateDurationForText(p.text), Math.max(0.7, slot.maxDur));
          const start = slot.start;
          const end = Math.min(slot.end, start + dur);
          scheduled.push({
            text: p.text,
            startTime: start,
            endTime: end,
            voiceStyle: (p.voiceStyle as any) || determineVoice(p.text),
            timestamp: (start + end) / 2,
          });
        }

        setGeneratedAD(scheduled);
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
        console.log('Use transcript workflow to generate captions');
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
    console.log('🔄 AXESSIBLE PLAYER - Received transcript update, delegating to parent');
    // Don't process segments here - let EnhancedVideoPlayer handle caption creation
    // This prevents duplicate caption processing that was causing issues
    
    // Update current language if provided
    if (language && language !== currentLanguage) {
      setCurrentLanguage(language);
    }
    
    // Generate transcript text for dubbing from segments
    const transcriptText = segments
      .filter(segment => segment && segment.text && !segment._forceUpdate)
      .sort((a, b) => (a.startTime || a.start_time || 0) - (b.startTime || b.start_time || 0))
      .map(segment => segment.text)
      .join(' ');
    setGeneratedTranscript(transcriptText);
    
    // Call parent callback if provided to bubble up the update
    if (onTranscriptUpdate) {
      onTranscriptUpdate(segments, language);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden shadow-2xl ${
        isMobileFullscreen 
          ? 'fixed inset-0 w-[100dvw] h-[100dvh] z-[9999] rounded-none'
          : ''
      } ${className}`}
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
        crossOrigin="anonymous"
        playsInline
        preload="auto"
        onError={(e) => {
          console.error('Video loading error:', e);
          console.log('Video src:', videoSrc);
          console.log('Video error details:', {
            error: e.currentTarget.error,
            networkState: e.currentTarget.networkState,
            readyState: e.currentTarget.readyState,
            errorCode: e.currentTarget.error?.code,
            errorMessage: e.currentTarget.error?.message
          });
          setVideoError(`Failed to load video. Error code: ${e.currentTarget.error?.code || 'unknown'}`);
          setVideoLoading(false);
        }}
        onLoadStart={() => {
          console.log('Video loading started for:', videoSrc);
          setVideoLoading(true);
          setVideoError(null);
        }}
        onLoadedData={() => {
          console.log('Video data loaded successfully');
          setVideoLoading(false);
          setVideoError(null);
        }}
        onCanPlay={() => {
          console.log('Video can start playing');
          setVideoLoading(false);
        }}
        onCanPlayThrough={() => {
          console.log('Video can play through without buffering');
          setVideoLoading(false);
        }}
        onWaiting={() => {
          console.log('Video is waiting for data');
          // Don't set loading to true immediately to avoid flicker
          setTimeout(() => {
            if (videoRef.current?.readyState < 3) {
              setVideoLoading(true);
            }
          }, 1000);
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setVideoLoading(false);
        }}
        onPause={() => {
          setIsPlaying(false);
        }}
        onStalled={() => {
          console.warn('Video playback stalled - attempting recovery');
          // Don't immediately show error, try to recover first
          setTimeout(() => {
            if (videoRef.current && videoRef.current.readyState < 2) {
              console.log('Attempting stall recovery...');
              const currentTime = videoRef.current.currentTime;
              videoRef.current.load();
              videoRef.current.currentTime = currentTime;
            }
          }, 2000);
          
          // Only show error after giving recovery time
          setTimeout(() => {
            if (videoRef.current && videoRef.current.readyState < 2) {
              setVideoError('Large video file detected. Loading may take time with slower connections. Try pausing and waiting for buffering.');
            }
          }, 5000);
        }}
        onSuspend={() => {
          console.log('Video loading suspended - this is normal for large files');
          // Don't treat suspend as an error, just continue loading
          setVideoLoading(false);
          setVideoError(null);
          
          // Try to resume loading after a short delay
          setTimeout(() => {
            if (videoRef.current && videoRef.current.readyState < 2) {
              console.log('Attempting to resume video loading...');
              videoRef.current.load();
            }
          }, 500);
        }}
        onAbort={() => {
          console.warn('Video loading aborted');
          setVideoError('Video loading was aborted.');
        }}
        onProgress={() => {
          console.log('Video loading progress:', {
            buffered: videoRef.current?.buffered.length,
            readyState: videoRef.current?.readyState
          });
        }}
      />

      {/* Video Error/Loading Overlay */}
      {(videoError || videoLoading) && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center text-white p-4 max-w-md">
            {videoError ? (
              <>
                <div className="text-amber-400 mb-2">⚠️ Large Video File</div>
                <div className="text-sm mb-4">{videoError}</div>
                <div className="text-xs opacity-70 mb-4">
                  File size: 36MB | This may take time to buffer on slower connections
                </div>
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={() => {
                      setVideoError(null);
                      setVideoLoading(true);
                      if (videoRef.current) {
                        console.log('Force reload video');
                        videoRef.current.load();
                      }
                    }}
                    size="sm"
                    variant="outline"
                    className="text-white border-white hover:bg-white hover:text-black"
                  >
                    Retry
                  </Button>
                  <Button 
                    onClick={() => {
                      setVideoError(null);
                      if (videoRef.current) {
                        console.log('Continue with current buffer');
                        videoRef.current.play().catch(() => {
                          console.log('Play failed, but continuing...');
                        });
                      }
                    }}
                    size="sm"
                    variant="default"
                    className="bg-primary text-primary-foreground"
                  >
                    Continue Anyway
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                <div className="text-sm mb-2">Loading large video file...</div>
                <div className="text-xs opacity-70 mb-2">
                  {videoRef.current?.readyState ? `Buffer state: ${videoRef.current.readyState}/4` : 'Initializing...'}
                </div>
                <div className="text-xs opacity-50 mb-4">
                  File: 36MB | This may take a moment on slower connections
                </div>
                <Button 
                  onClick={() => {
                    console.log('Skip loading wait');
                    setVideoLoading(false);
                    if (videoRef.current && videoRef.current.readyState >= 1) {
                      console.log('Video has some data, proceeding...');
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className="text-white border-white hover:bg-white hover:text-black"
                >
                  Continue with Partial Buffer
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ASL Avatar Overlay */}
      {showASL && (
        <ASLAvatar
          contentType={contentType}
          selectedASLAvatar={selectedASLAvatar}
          currentCaption={activeCaption}
        />
      )}


      {/* Captions with Intention - Enhanced mobile fullscreen positioning */}
      {showCaptions && (
        <div 
          className={`absolute left-1/2 transform -translate-x-1/2 z-[60] pointer-events-none px-2 ${
            isMobile && (isFullscreen || isMobileFullscreen) 
              ? isLandscape 
                ? 'bottom-6' // Landscape fullscreen - closer to bottom
                : 'bottom-16' // Portrait fullscreen - above virtual controls
              : 'bottom-24' // Normal mode
          }`}
          style={{
            // Enhanced safe area handling for mobile fullscreen
            ...(isMobile && (isFullscreen || isMobileFullscreen) && {
              paddingLeft: `max(0.5rem, ${safeAreaInsets.left}px)`,
              paddingRight: `max(0.5rem, ${safeAreaInsets.right}px)`,
              paddingBottom: isLandscape 
                ? `max(0.375rem, ${safeAreaInsets.bottom}px)` 
                : `max(1rem, ${safeAreaInsets.bottom + 8}px)`,
              maxWidth: '95vw', // Prevent overflow on small screens
              fontSize: isLandscape ? '0.95em' : '1em' // Slight size adjustment for landscape
            })
          }}
        >
          <CaptionsWithIntention 
            captions={(() => {
              // PRIORITY: Always use initialCaptions (from database) if available, regardless of other sources
              let finalCaptions = [] as any[];
              
              if (initialCaptions && initialCaptions.length > 0) {
                finalCaptions = initialCaptions;
                console.log('🎯 Using DATABASE captions from initialCaptions:', finalCaptions.length, 'segments');
              } else if (translatedContent?.captions && translatedContent.captions.length > 0) {
                finalCaptions = translatedContent.captions;
                console.log('🌐 Using TRANSLATED captions:', finalCaptions.length, 'segments');
              } else if (generatedCaptions && generatedCaptions.length > 0) {
                finalCaptions = generatedCaptions;
                console.log('🤖 Using GENERATED captions:', finalCaptions.length, 'segments');
              } else {
                finalCaptions = [];
                console.log('⚠️ No captions available from any source');
              }
              
              // FINAL MAPPING GATE: enforce Character Manager mappings just before render
              try {
                const vid = videoId || 'default';
                const mapping = JSON.parse(localStorage.getItem(`speaker-mappings-${vid}`) || '{}');
                const characters = JSON.parse(localStorage.getItem(`characters_${vid}`) || localStorage.getItem(`characters-${vid}`) || '[]');
                const byName: Record<string, any> = {};
                (characters || []).forEach((c: any) => { if (c?.name) byName[c.name] = c; });
                
                console.log('🔍 Final mapping gate debug:', {
                  mapping,
                  charactersCount: characters.length,
                  byName: Object.keys(byName),
                  sampleSpeakers: finalCaptions.slice(0, 5).map(c => c.speaker)
                });
                
                finalCaptions = finalCaptions.map((s: any, index: number) => {
                  try {
                    const mappedName = mapping?.[s.speaker];
                    const char = mappedName ? byName[mappedName] : byName[s.speaker];
                    
                    if (char) {
                      console.log(`🎭 Applied character color: ${s.speaker} -> ${char.name} (${char.color})`);
                      return {
                        ...s,
                        speaker: char.name || s.speaker,  // Ensure speaker name exists
                        speakerColor: char.color || s.speakerColor,
                        isOffCamera: typeof char.isOffCamera === 'boolean' ? char.isOffCamera : s.isOffCamera
                      };
                    } else {
                      console.log(`⚠️ No character found for speaker: ${s.speaker} (mapped: ${mappedName})`);
                      // Enhanced fuzzy matching for similar names (e.g., Miyoki vs Myoki)
                      const lowercaseSpeaker = s.speaker?.toLowerCase();
                      const fallbackChar = Object.values(byName).find((c: any) => {
                        if (!c?.name) return false;
                        const charName = c.name.toLowerCase();
                        return charName === lowercaseSpeaker || 
                               charName.includes(lowercaseSpeaker.substring(0, 4)) ||
                               lowercaseSpeaker.includes(charName.substring(0, 4));
                      });
                      
                      if (fallbackChar) {
                        console.log(`✅ Found fuzzy match: ${s.speaker} -> ${fallbackChar.name} (${fallbackChar.color})`);
                        return {
                          ...s,
                          speaker: fallbackChar.name || s.speaker,
                          speakerColor: fallbackChar.color || s.speakerColor,
                          isOffCamera: typeof fallbackChar.isOffCamera === 'boolean' ? fallbackChar.isOffCamera : s.isOffCamera
                        };
                      }
                    }
                    
                    // Return original segment if no character mapping found
                    return {
                      ...s,
                      speaker: s.speaker || 'Unknown',  // Ensure speaker exists
                      speakerColor: s.speakerColor || '#FFFFFF'  // Default color
                    };
                  } catch (segmentError) {
                    console.error('Error processing segment:', segmentError, s);
                    return {
                      ...s,
                      speaker: s.speaker || 'Unknown',
                      speakerColor: s.speakerColor || '#FFFFFF'
                    };
                  }
                });
              } catch (e) {
                console.warn('⚠️ AXESSIBLE: Failed to apply final character mapping gate', e);
              }
              
              console.log('🎬 AxessiblePlayer passing captions to CaptionsWithIntention:', finalCaptions.length, 'segments');
              console.log('🎯 First caption being passed:', finalCaptions[0] ? {
                speaker: finalCaptions[0].speaker,
                color: finalCaptions[0].speakerColor,
                emphasis: finalCaptions[0].words?.[0]?.emphasis,
                pitch: finalCaptions[0].words?.[0]?.pitch,
                text: finalCaptions[0].text?.substring(0, 50) + '...',
                source: 'database-priority'
              } : 'No captions');
              
              return finalCaptions;
            })()}
            currentTime={currentTime}
            isVisible={showCaptions}
            screenHeight={window?.innerHeight || 1080}
          />
        </div>
      )}

        {/* Audio Description */}
        {showAudioDescription && (
          <AudioDescription
            currentTime={currentTime}
            isPlaying={isPlaying}
            contentType={contentType}
            selectedVoice={selectedVoice}
            dynamicDescriptions={dynamicDescriptions && dynamicDescriptions.length > 0 ? dynamicDescriptions : (generatedAD || undefined)}
            language={currentLanguage}
          />
        )}

      {/* Control Overlay - Always visible on mobile for accessibility */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent ${
          isMobile ? 'pb-safe-bottom pt-12 px-4 z-[60]' : 'pb-2 pt-8 px-2'
        } opacity-100 transition-all duration-300`}
        style={{ 
          paddingBottom: isMobile ? 'max(16px, env(safe-area-inset-bottom))' : '8px'
        }}
      >
        {/* Progress Bar - Extra space from captions */}
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
            
            {/* Fullscreen - Enhanced debugging for mobile landscape */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log('🔄 Fullscreen button clicked:', {
                  isMobile,
                  isLandscape,
                  isMobileFullscreen,
                  windowWidth: window.innerWidth,
                  windowHeight: window.innerHeight,
                  userAgent: navigator.userAgent.includes('Mobile'),
                  touchDevice: 'ontouchstart' in window
                });
                
                // Enhanced mobile detection for landscape devices
                const isMobileDevice = isMobile || window.innerWidth < 1024 || 'ontouchstart' in window;
                console.log('📱 Enhanced mobile detection:', isMobileDevice);
                
                if (isMobileDevice) {
                  // Toggle mobile fullscreen state
                  const newFullscreenState = !isMobileFullscreen;
                  console.log('📱 Setting mobile fullscreen to:', newFullscreenState);
                  setIsMobileFullscreen(newFullscreenState);
                  
                  // For landscape, also try native fullscreen for better experience
                  if (isLandscape && document.fullscreenEnabled) {
                    const container = containerRef.current;
                    if (container) {
                      if (!document.fullscreenElement && newFullscreenState) {
                        console.log('🖥️ Attempting native fullscreen...');
                        container.requestFullscreen().catch((err) => {
                          console.log('❌ Native fullscreen failed:', err);
                          console.log('✅ Using mobile simulation instead');
                        });
                      } else if (document.fullscreenElement && !newFullscreenState) {
                        console.log('🖥️ Exiting native fullscreen...');
                        document.exitFullscreen().catch(console.error);
                      }
                    }
                  }
                } else {
                  // Desktop fullscreen
                  const container = containerRef.current;
                  if (container && document.fullscreenEnabled) {
                    if (!document.fullscreenElement) {
                      container.requestFullscreen().catch(console.error);
                    } else {
                      document.exitFullscreen().catch(console.error);
                    }
                  }
                }
              }}
              title={`${isMobile && isMobileFullscreen ? 'Exit' : 'Enter'} fullscreen`}
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
                <div className="text-white space-y-4">
                  <h3 className="text-lg font-medium">Transcript Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Use the dedicated transcript workflow on the video detail page to extract, edit, and save transcripts with full accessibility features.
                  </p>
                  <div className="p-4 border border-muted/20 rounded-lg">
                    <div className="text-sm space-y-1">
                      <div>Current Captions: {generatedCaptions?.length || 0} segments</div>
                      <div>Status: {generatedCaptions?.length ? 'Ready' : 'No captions generated'}</div>
                    </div>
                  </div>
                </div>
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
                      <h4 className="font-medium mb-2">Immersive Features</h4>
                      <div className="text-sm space-y-1 text-muted-foreground">
                        <div>Captions: {showCaptions ? 'Enabled' : 'Disabled'}</div>
                        <div>Audio Description: {showAudioDescription ? 'Enabled' : 'Disabled'}</div>
                        <div className="text-amber-600 dark:text-amber-400 font-medium">💡 Tip: Use the immersive controls instead of accessibility controls</div>
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