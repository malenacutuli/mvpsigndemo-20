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
}

interface AudioDescription {
  text: string;
  startTime: number;
  endTime: number;
  voiceStyle: 'passionate' | 'warm' | 'authoritative' | 'encouraging';
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
}) => {
  const [currentDescription, setCurrentDescription] = useState<AudioDescription | null>(null);
  const [isDescriptionPlaying, setIsDescriptionPlaying] = useState(false);
  const [descriptionAudio, setDescriptionAudio] = useState<HTMLAudioElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Helper to resolve ElevenLabs voice id based on content and language
  const resolveVoiceId = () => {
    // Prioritize Spanish voices for Spanish content
    if (language === 'es' || language === 'spanish') {
      if (selectedVoice?.id && elevenVoices[selectedVoice.id]) return elevenVoices[selectedVoice.id];
      return elevenVoices['spanish-narrator-female']; // Default Spanish voice
    }
    
    // English content
    if (selectedVoice?.id && elevenVoices[selectedVoice.id]) return elevenVoices[selectedVoice.id];
    return defaultVoiceByContent[contentType];
  };

// Enhanced synchronization: Track which segment is active with improved gap detection
useEffect(() => {
  const descriptions = dynamicDescriptions || [];
  
  console.log('🎬 AudioDescription sync check:', {
    currentTime,
    language,
    contentType,
    totalDescriptions: descriptions.length,
    isPlaying
  });
  
  // Find description that matches current time with better precision
  const potentialDescription = descriptions.find(desc => {
    const matches = currentTime >= desc.startTime && currentTime <= desc.endTime;
    if (matches) {
      console.log('🎯 Found matching description:', {
        text: desc.text.substring(0, 50) + '...',
        startTime: desc.startTime,
        endTime: desc.endTime,
        currentTime,
        language
      });
    }
    return matches;
  });
  
  setCurrentDescription(potentialDescription || null);
}, [currentTime, contentType, dynamicDescriptions, isPlaying, language]);

  // Enhanced TTS generation with language-optimized voices
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
        const voiceId = resolveVoiceId();
        
        console.log('🎤 Generating TTS:', {
          text: currentDescription.text.substring(0, 50) + '...',
          language,
          voiceId,
          contentType
        });
        
        const res = await fetch('https://faeyekynudyzeotbjfsj.supabase.co/functions/v1/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZXlla3ludWR5emVvdGJqZnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDMyMzUsImV4cCI6MjA3MTc3OTIzNX0.ifRh6Lx1AsWMjSchaNqa5ELHnImOLWUMGtYZLGWD1Qw',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZXlla3ludWR5emVvdGJqZnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDMyMzUsImV4cCI6MjA3MTc3OTIzNX0.ifRh6Lx1AsWMjSchaNqa5ELHnImOLWUMGtYZLGWD1Qw'
          },
          body: JSON.stringify({ 
            text: currentDescription.text, 
            voiceId, 
            modelId: language === 'es' ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5',
            language: language
          })
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(`TTS failed: ${res.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const blob = await res.blob();
        if (cancelled) return;
        
        const url = URL.createObjectURL(blob);
        if (descriptionAudio) {
          try {
            descriptionAudio.pause();
            descriptionAudio.currentTime = 0;
          } catch {}
        }
        
        const audio = new Audio(url);
        audio.onended = () => {
          setIsDescriptionPlaying(false);
          URL.revokeObjectURL(url);
        };
        audio.volume = 0.85; // Slightly reduced for better balance
        setDescriptionAudio(audio);
        setIsDescriptionPlaying(true);
        
        await audio.play().catch((error) => {
          console.error('Audio playback failed:', error);
          setGenError(`Audio playback failed: ${error.message}`);
        });
        
        console.log('✅ TTS playback started successfully');
      } catch (e: any) {
        console.error('TTS generation failed:', e);
        setGenError(e.message || 'Failed to generate audio');
        setIsDescriptionPlaying(false);
      } finally {
        setIsGenerating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentDescription, isPlaying, selectedVoice, contentType, language]);

  if (!currentDescription) return null;

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
              {currentDescription.startTime.toFixed(1)}s - {currentDescription.endTime.toFixed(1)}s
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