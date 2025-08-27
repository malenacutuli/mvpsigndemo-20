import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { VolumeX, Volume2, Globe, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface DubbedAudio {
  language: string;
  audioUrl: string;
  translatedText: string;
}

interface SynchronizedDubbingPlayerProps {
  transcriptText?: string;
  currentTime: number;
  isPlaying: boolean;
  onLanguageChange?: (language: string) => void;
  className?: string;
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
  { code: 'ar', name: 'Arabic' }
];

export const SynchronizedDubbingPlayer: React.FC<SynchronizedDubbingPlayerProps> = ({
  transcriptText = '',
  currentTime,
  isPlaying,
  onLanguageChange,
  className = ''
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [dubbedAudios, setDubbedAudios] = useState<DubbedAudio[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronize audio with video playback
  useEffect(() => {
    if (currentAudio && isEnabled) {
      const timeDiff = Math.abs(currentAudio.currentTime - currentTime);
      
      // Sync if there's a significant difference (>0.5 seconds)
      if (timeDiff > 0.5) {
        currentAudio.currentTime = currentTime;
      }
      
      if (isPlaying && currentAudio.paused) {
        currentAudio.play().catch(console.error);
      } else if (!isPlaying && !currentAudio.paused) {
        currentAudio.pause();
      }
    }
  }, [currentTime, isPlaying, currentAudio, isEnabled]);

  const getVoiceForLanguage = (lang: string): string => {
    const voiceMap: { [key: string]: string } = {
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
    return voiceMap[lang] || voiceMap['en'];
  };

  const generateDubbing = async (language: string) => {
    if (!transcriptText.trim()) return;
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-dubbing', {
        body: {
          text: transcriptText,
          targetLanguage: language,
          voiceId: getVoiceForLanguage(language)
        }
      });

      if (error) throw error;

      const audioBlob = new Blob([new Uint8Array(atob(data.audioBase64).split('').map(c => c.charCodeAt(0)))], {
        type: 'audio/mpeg'
      });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const newDubbedAudio: DubbedAudio = {
        language,
        audioUrl,
        translatedText: data.translatedText || transcriptText
      };

      setDubbedAudios(prev => {
        const filtered = prev.filter(audio => audio.language !== language);
        return [...filtered, newDubbedAudio];
      });

    } catch (error) {
      console.error('Error generating dubbing:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLanguageChange = async (language: string) => {
    setSelectedLanguage(language);
    onLanguageChange?.(language);
    
    if (language === 'en' || language === '') {
      // Original language or no selection
      setCurrentAudio(null);
      setIsEnabled(false);
      return;
    }

    // Check if we have dubbed audio for this language
    const existingAudio = dubbedAudios.find(audio => audio.language === language);
    
    if (existingAudio) {
      // Load existing dubbed audio
      const audio = new Audio(existingAudio.audioUrl);
      audio.currentTime = currentTime;
      audio.muted = isMuted;
      setCurrentAudio(audio);
      setIsEnabled(true);
      audioRef.current = audio;
    } else {
      // Generate new dubbing
      await generateDubbing(language);
    }
  };

  // Load generated audio after creation
  useEffect(() => {
    if (selectedLanguage && selectedLanguage !== 'en') {
      const newAudio = dubbedAudios.find(audio => audio.language === selectedLanguage);
      if (newAudio && !currentAudio) {
        const audio = new Audio(newAudio.audioUrl);
        audio.currentTime = currentTime;
        audio.muted = isMuted;
        setCurrentAudio(audio);
        setIsEnabled(true);
        audioRef.current = audio;
      }
    }
  }, [dubbedAudios, selectedLanguage]);

  const toggleAudioMute = () => {
    if (currentAudio) {
      currentAudio.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const getLanguageDisplay = (code: string) => {
    return LANGUAGES.find(lang => lang.code === code)?.name || code.toUpperCase();
  };

  if (!transcriptText.trim()) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Globe className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Generate transcript first for dubbing</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="w-4 h-4 text-primary-foreground" />
      
      <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-24 h-8 text-xs bg-black/50 border-white/20 text-primary-foreground">
          <SelectValue placeholder="Lang" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Original</SelectItem>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isGenerating && (
        <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
      )}

      {selectedLanguage && selectedLanguage !== 'en' && (
        <div className="flex items-center gap-1">
          {isEnabled && (
            <Badge variant="secondary" className="text-xs px-2 py-0">
              Dubbed
            </Badge>
          )}
          
          {currentAudio && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAudioMute}
              className="w-6 h-6 p-0 text-primary-foreground hover:text-primary hover:bg-primary/20"
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </Button>
          )}
        </div>
      )}

      {selectedLanguage && selectedLanguage !== 'en' && !dubbedAudios.find(a => a.language === selectedLanguage) && !isGenerating && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => generateDubbing(selectedLanguage)}
          className="text-xs h-6 px-2 text-primary-foreground hover:text-primary hover:bg-primary/20"
        >
          Generate
        </Button>
      )}
    </div>
  );
};