import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { VolumeX, Volume2, Globe, Loader2, Play, Pause } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import type { CaptionSegment } from './CaptionsWithIntention';

interface DubbedSegment {
  segmentIndex: number;
  language: string;
  audioUrl: string;
  translatedText: string;
  startTime: number;
  endTime: number;
  speaker: string;
}

interface SegmentBasedDubbingPlayerProps {
  segments?: CaptionSegment[];
  currentTime: number;
  isPlaying: boolean;
  onLanguageChange?: (language: string) => void;
  className?: string;
  playbackSpeed?: number;
  onSpeedChange?: (speed: number) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'tr', name: 'Turkish' }
];

const VOICE_MAP: { [key: string]: string } = {
  'en': 'EXAVITQu4vr4xnSDxMaL', // Sarah
  'es': 'XrExE9yKIg1WjnnlVkGX', // Matilda
  'fr': 'cgSgspJ2msm6clMCkdW9', // Jessica
  'de': 'onwK4e9ZLuTAKqWW03F9', // Daniel
  'it': 'pFZP5JQG7iQjIQuC4Bku', // Lily
  'pt': 'TX3LPaxmHKxFdv7VOQHJ', // Liam
  'zh': 'N2lVS1w4EtoT3dr4eOWO', // Callum
  'ja': 'SAz9YHcvj6GT2YYXdXww', // River
  'ko': 'JBFqnCBsd6RMkjVDRZzb', // George
  'ar': 'CwhRBWXzGAHq8TQ4Fs17'  // Roger
};

export const SegmentBasedDubbingPlayer: React.FC<SegmentBasedDubbingPlayerProps> = ({
  segments = [],
  currentTime,
  isPlaying,
  onLanguageChange,
  className = '',
  playbackSpeed = 1.0,
  onSpeedChange
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('original');
  const [dubbedSegments, setDubbedSegments] = useState<DubbedSegment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudioRef, setCurrentAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);

  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Find current segment based on time
  const getCurrentSegment = () => {
    return segments.findIndex(segment => 
      currentTime >= segment.startTime && currentTime <= segment.endTime
    );
  };

  // Generate dubbing for individual segment
  const generateSegmentDubbing = async (segment: CaptionSegment, segmentIndex: number, language: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-dubbing', {
        body: {
          text: segment.text,
          targetLanguage: language,
          voiceId: VOICE_MAP[language]
        }
      });

      if (error) throw error;

      const audioBlob = new Blob([new Uint8Array(atob(data.audioBase64).split('').map(c => c.charCodeAt(0)))], {
        type: 'audio/mpeg'
      });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return {
        segmentIndex,
        language,
        audioUrl,
        translatedText: data.translatedText || segment.text,
        startTime: segment.startTime,
        endTime: segment.endTime,
        speaker: segment.speaker
      };
    } catch (error) {
      console.error(`Error generating dubbing for segment ${segmentIndex}:`, error);
      return null;
    }
  };

  // Generate dubbing for all segments
  const generateAllSegmentsDubbing = async (language: string) => {
    setIsGenerating(true);
    try {
      const dubbingPromises = segments
        .filter(segment => segment.type !== 'soundeffect' && segment.type !== 'music')
        .map((segment, index) => generateSegmentDubbing(segment, index, language));

      const results = await Promise.all(dubbingPromises);
      const successfulSegments = results.filter(result => result !== null) as DubbedSegment[];

      setDubbedSegments(prev => {
        const filtered = prev.filter(seg => seg.language !== language);
        return [...filtered, ...successfulSegments];
      });

      // Preload audio elements
      successfulSegments.forEach(segment => {
        const audio = new Audio(segment.audioUrl);
        audio.playbackRate = playbackSpeed;
        audio.muted = isMuted;
        audioRefs.current.set(`${language}-${segment.segmentIndex}`, audio);
      });

    } catch (error) {
      console.error('Error generating segment dubbing:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle language change
  const handleLanguageChange = async (language: string) => {
    setSelectedLanguage(language);
    onLanguageChange?.(language);
    
    // Stop current audio
    if (currentAudioRef) {
      currentAudioRef.pause();
      setCurrentAudioRef(null);
    }
    
    if (language === 'en' || language === 'original') {
      setCurrentSegmentIndex(-1);
      return;
    }

    // Check if we have dubbed segments for this language
    const existingSegments = dubbedSegments.filter(seg => seg.language === language);
    
    if (existingSegments.length === 0) {
      await generateAllSegmentsDubbing(language);
    }
  };

  // Handle playback synchronization
  useEffect(() => {
    if (selectedLanguage === 'en' || selectedLanguage === 'original') return;

    const newSegmentIndex = getCurrentSegment();
    
    // If we're in a different segment or no segment
    if (newSegmentIndex !== currentSegmentIndex) {
      // Stop current audio
      if (currentAudioRef) {
        currentAudioRef.pause();
        setCurrentAudioRef(null);
      }
      
      setCurrentSegmentIndex(newSegmentIndex);
      
      // Start new segment audio if available
      if (newSegmentIndex >= 0) {
        const audioKey = `${selectedLanguage}-${newSegmentIndex}`;
        const audio = audioRefs.current.get(audioKey);
        
        if (audio && isPlaying) {
          const segment = segments[newSegmentIndex];
          const relativeTime = currentTime - segment.startTime;
          
          audio.currentTime = Math.max(0, relativeTime);
          audio.playbackRate = playbackSpeed;
          audio.muted = isMuted;
          audio.play().catch(console.error);
          setCurrentAudioRef(audio);
        }
      }
    } else if (currentAudioRef) {
      // Sync existing audio
      const segment = segments[currentSegmentIndex];
      const relativeTime = currentTime - segment.startTime;
      const timeDiff = Math.abs(currentAudioRef.currentTime - relativeTime);
      
      if (timeDiff > 0.1) {
        currentAudioRef.currentTime = Math.max(0, relativeTime);
      }
      
      if (isPlaying && currentAudioRef.paused) {
        currentAudioRef.play().catch(console.error);
      } else if (!isPlaying && !currentAudioRef.paused) {
        currentAudioRef.pause();
      }
    }
  }, [currentTime, isPlaying, selectedLanguage, currentSegmentIndex, playbackSpeed]);

  // Update playback speed
  useEffect(() => {
    audioRefs.current.forEach(audio => {
      audio.playbackRate = playbackSpeed;
    });
    if (currentAudioRef) {
      currentAudioRef.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, currentAudioRef]);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRefs.current.forEach(audio => {
      audio.muted = newMuted;
    });
    if (currentAudioRef) {
      currentAudioRef.muted = newMuted;
    }
  };

  const handleSpeedChange = (speed: number[]) => {
    const newSpeed = speed[0];
    onSpeedChange?.(newSpeed);
  };

  if (!segments.length) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Globe className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">No segments available for dubbing</span>
      </div>
    );
  }

  const dubbedCount = dubbedSegments.filter(seg => seg.language === selectedLanguage).length;
  const totalSegments = segments.filter(seg => seg.type !== 'soundeffect' && seg.type !== 'music').length;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="w-4 h-4 text-primary-foreground" />
      
      <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-24 h-8 text-xs bg-black/50 border-white/20 text-primary-foreground">
          <SelectValue placeholder="Lang" />
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50">
          <SelectItem value="original">Original</SelectItem>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Speed Control */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-primary-foreground opacity-75">Speed:</span>
        <div className="w-12">
          <Slider
            value={[playbackSpeed]}
            onValueChange={handleSpeedChange}
            min={0.5}
            max={2.0}
            step={0.1}
            className="w-full"
          />
        </div>
        <span className="text-xs text-primary-foreground opacity-75 w-8">
          {playbackSpeed.toFixed(1)}x
        </span>
      </div>

      {isGenerating && (
        <div className="flex items-center gap-1">
          <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
          <span className="text-xs text-primary-foreground opacity-75">Dubbing...</span>
        </div>
      )}

      {selectedLanguage && selectedLanguage !== 'en' && selectedLanguage !== 'original' && (
        <div className="flex items-center gap-1">
          {dubbedCount > 0 && (
            <Badge variant="secondary" className="text-xs px-2 py-0">
              {dubbedCount}/{totalSegments}
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="w-6 h-6 p-0 text-primary-foreground hover:text-primary hover:bg-primary/20"
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </Button>
        </div>
      )}

      {selectedLanguage && selectedLanguage !== 'en' && selectedLanguage !== 'original' && dubbedCount === 0 && !isGenerating && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => generateAllSegmentsDubbing(selectedLanguage)}
          className="text-xs h-6 px-2 text-primary-foreground hover:text-primary hover:bg-primary/20"
        >
          Generate
        </Button>
      )}
    </div>
  );
};