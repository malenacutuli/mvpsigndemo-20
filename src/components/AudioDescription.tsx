import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Using ElevenLabs via Supabase Edge Function proxy for secure TTS

interface AudioDescriptionProps {
  currentTime: number;
  isPlaying: boolean;
  contentType?: 'recipe' | 'education';
  selectedVoice?: {
    id: string;
    name: string;
    description: string;
  };
  // Optional: dynamically generated descriptions (e.g., from transcript)
  dynamicDescriptions?: AudioDescription[];
  // Language for TTS optimization
  language?: string;
  // Control whether to render the on-screen overlay (audio still plays if false)
  showOverlay?: boolean;
  // Extended Audio Description enabled
  eadEnabled?: boolean;
  // Video ID for database queries
  videoId?: string;
}

interface AudioDescription {
  text: string;
  startTime: number;
  endTime: number;
  voiceStyle: 'passionate' | 'warm' | 'authoritative' | 'encouraging';
  timestamp?: number; // Optional timestamp for sync reference
  audioUrl?: string; // Cached audio URL from database
  audioGenerationStatus?: string; // Status of audio generation
  id?: string; // Database ID
}

// Native Spanish voices optimized for accessibility content
const elevenVoices: Record<string, string> = {
  // Recipe voices - Professional cooking narrators
  'gordon-ramsay': 'nPczCjzI2devNBz1zQrb', // Brian
  'julia-child': '9BWtsMINqrJLrRacOk9x',   // Aria
  'anthony-bourdain': 'JBFqnCBsd6RMkjVDRZzb', // George
  // Native Spanish voices for education content - optimized for children and accessibility
  'spanish-narrator-female': 'pFZP5JQG7iQjIQuC4Bku',  // Lily - clear Spanish pronunciation
  'spanish-narrator-warm': 'cgSgspJ2msm6clMCkdW9',    // Jessica - warm, motherly Spanish
  'spanish-narrator-energetic': 'XrExE9yKIg1WjnnlVkGX', // Matilda - energetic Spanish for kids
  'spanish-narrator-male': 'JBFqnCBsd6RMkjVDRZzb',     // George - male Spanish narrator
};

const defaultVoiceByContent: Record<'recipe' | 'education', string> = {
  recipe: 'nPczCjzI2devNBz1zQrb', // Brian - English cooking
  education: 'pFZP5JQG7iQjIQuC4Bku', // Lily - optimized Spanish for education
};

export const AudioDescription: React.FC<AudioDescriptionProps> = ({
  currentTime,
  isPlaying,
  contentType = 'recipe',
  selectedVoice,
  dynamicDescriptions,
  language = 'en',
  showOverlay = true,
  eadEnabled = false,
  videoId,
}) => {
  const [currentDescription, setCurrentDescription] = useState<AudioDescription | null>(null);
  const [isDescriptionPlaying, setIsDescriptionPlaying] = useState(false);
  const [descriptionAudio, setDescriptionAudio] = useState<HTMLAudioElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Helper to resolve ElevenLabs voice id based on content and language
  const resolveVoiceId = () => {
    // If a specific voice ID is provided (e.g., ElevenLabs voice id), prefer it
    if (selectedVoice?.id) {
      // Use mapped friendly key if present, otherwise assume it's a direct ElevenLabs voice ID
      return elevenVoices[selectedVoice.id] || selectedVoice.id;
    }

    // Prioritize Spanish default for Spanish content when no explicit voice selected
    if (language === 'es' || language === 'spanish') {
      return elevenVoices['spanish-narrator-female'];
    }

    // Fallback to content defaults
    return defaultVoiceByContent[contentType];
  };

// Enhanced synchronization: Track which segment is active with overlap prevention
useEffect(() => {
  const descriptions = dynamicDescriptions || [];
  
  console.log('🎬 AudioDescription sync check:', {
    currentTime,
    language,
    contentType,
    totalDescriptions: descriptions.length,
    isPlaying
  });
  
  // Find description that matches current time with improved logic
  const potentialDescription = descriptions.find(desc => {
    // Use half-open interval to avoid boundary double-hits
    const isInTimeRange = currentTime >= desc.startTime && currentTime < desc.endTime;
    
    if (isInTimeRange) {
      console.log('🎯 Found matching description:', {
        text: desc.text.substring(0, 50) + '...',
        startTime: desc.startTime,
        endTime: desc.endTime,
        currentTime,
        language,
        timestamp: desc.timestamp || 'not specified'
      });
    }
    
    return isInTimeRange;
  });
  
  // If multiple matches (shouldn't happen with half-open interval), pick earliest/shortest
  const matchingDescriptions = descriptions.filter(d =>
    currentTime >= d.startTime && currentTime < d.endTime
  );
  
  const chosen = matchingDescriptions.length > 1
    ? matchingDescriptions.sort((a, b) => {
        const startDiff = a.startTime - b.startTime;
        if (startDiff !== 0) return startDiff;
        return (a.endTime - a.startTime) - (b.endTime - b.startTime);
      })[0]
    : potentialDescription;
  
  setCurrentDescription(chosen || null);
}, [currentTime, contentType, dynamicDescriptions, isPlaying, language]);

  // Enhanced TTS generation with cache-first approach - plays audio regardless of showOverlay
  useEffect(() => {
    if (!isPlaying) {
      if (descriptionAudio && !descriptionAudio.paused) descriptionAudio.pause();
      setIsDescriptionPlaying(false);
      return;
    }
    if (!currentDescription) return;

    let cancelled = false;

    (async () => {
      try {
        setIsGenerating(true);
        setGenError(null);
        
        // STEP 1: Check if cached audio exists in database
        const descriptionWithAudio = (dynamicDescriptions || []).find(desc => 
          Math.abs(desc.startTime - currentDescription.startTime) < 0.5 &&
          Math.abs(desc.endTime - currentDescription.endTime) < 0.5
        );
        
        if (descriptionWithAudio?.audioUrl && descriptionWithAudio?.audioGenerationStatus === 'completed') {
          // CACHED: Use existing audio
          console.log('🎵 Using cached audio:', descriptionWithAudio.audioUrl);
          
          if (cancelled) return;
          
          const audio = new Audio(descriptionWithAudio.audioUrl);
          audio.onended = () => {
            setIsDescriptionPlaying(false);
          };
          audio.volume = 0.85;
          setDescriptionAudio(audio);
          setIsDescriptionPlaying(true);
          
          await audio.play().catch((error) => {
            console.error('Cached audio playback failed:', error);
            setGenError(`Audio playback failed: ${error.message}`);
          });
          
          console.log('✅ Cached audio playback started');
        } else {
          // NO FALLBACK GENERATION - Audio must be pre-generated in editor
          // This prevents uncontrolled concurrent TTS requests during playback
          console.warn('⚠️ No cached audio available for description:', {
            text: currentDescription.text.substring(0, 50) + '...',
            startTime: currentDescription.startTime,
            endTime: currentDescription.endTime,
            language
          });
          
          setGenError('Audio not available. Please generate audio in the editor first.');
          setIsDescriptionPlaying(false);
        }
      } catch (e: any) {
        console.error('Audio Description playback failed:', e);
        setGenError(e.message || 'Failed to generate audio');
        setIsDescriptionPlaying(false);
      } finally {
        setIsGenerating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentDescription, isPlaying, selectedVoice, contentType, language, dynamicDescriptions]);

  // Helper functions for rendering
  const getVoiceStyleColor = (style: string) => {
    switch (style) {
      case 'passionate':
        return 'text-cwi-main-orange';
      case 'authoritative':
        return 'text-cwi-main-red';
      case 'warm':
        return 'text-cwi-main-yellow';
      case 'encouraging':
        return 'text-cwi-main-green';
      default:
        return 'text-muted-foreground';
    }
  };

  // Safely format times that may be null/undefined
  const formatTime = (t: unknown) => {
    const n = Number(t);
    return Number.isFinite(n) ? n.toFixed(1) : '—';
  };

  // Hide visual overlay if disabled, but audio still plays
  if (!showOverlay) return null;
  
  // No description to show
  if (!currentDescription) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-md p-4 bg-black/90 border border-white/20 rounded-lg shadow-xl backdrop-blur-sm z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {isGenerating ? (
            <Volume2 className="w-5 h-5 animate-pulse text-cwi-main-blue" />
          ) : isDescriptionPlaying ? (
            <Volume2 className="w-5 h-5 text-cwi-main-green animate-pulse" />
          ) : (
            <Volume2 className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${getVoiceStyleColor(currentDescription.voiceStyle)}`}
            >
              {currentDescription.voiceStyle}
            </Badge>
            {language === 'es' && (
              <Badge variant="secondary" className="text-xs">
                Español
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-white leading-relaxed">
            {currentDescription.text}
          </p>
          
          {genError && (
            <p className="text-xs text-red-400 mt-2">
              {genError}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-2 text-xs text-white/60">
            <span>
              {formatTime(currentDescription.startTime)}s - {formatTime(currentDescription.endTime)}s
            </span>
            <span>
              {isGenerating ? 'Generating...' : isDescriptionPlaying ? 'Playing' : 'Ready'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};