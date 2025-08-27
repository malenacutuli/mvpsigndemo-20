import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Volume2, VolumeX, Languages } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DubbedAudio {
  language: string;
  audioUrl: string;
  translatedText: string;
}

interface SynchronizedDubbingControlsProps {
  transcriptText?: string;
  currentTime: number;
  isPlaying: boolean;
  onLanguageChange?: (language: string) => void;
}

export const SynchronizedDubbingControls: React.FC<SynchronizedDubbingControlsProps> = ({
  transcriptText,
  currentTime,
  isPlaying,
  onLanguageChange
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('original');
  const [dubbedAudios, setDubbedAudios] = useState<DubbedAudio[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const languages = [
    { code: 'original', name: 'Original', flag: '🎬' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  ];

  const generateDubbing = async (targetLanguage: string) => {
    if (!transcriptText) {
      toast.error('No transcript available for dubbing');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-dubbing', {
        body: {
          text: transcriptText,
          targetLanguage,
          voiceId: getVoiceForLanguage(targetLanguage)
        }
      });

      if (error) throw error;

      // Create audio URL from base64
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      const newDubbedAudio: DubbedAudio = {
        language: targetLanguage,
        audioUrl,
        translatedText: data.translatedText
      };

      setDubbedAudios(prev => [...prev.filter(a => a.language !== targetLanguage), newDubbedAudio]);
      toast.success(`Dubbing generated for ${getLanguageDisplay(targetLanguage)}!`);
    } catch (error: any) {
      console.error('Dubbing error:', error);
      toast.error(error.message || 'Failed to generate dubbing');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLanguageChange = async (language: string) => {
    setSelectedLanguage(language);
    onLanguageChange?.(language);

    // Stop current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    if (language === 'original') {
      setCurrentAudio(null);
      return;
    }

    // Check if we have dubbing for this language
    const existingDubbing = dubbedAudios.find(a => a.language === language);
    
    if (!existingDubbing) {
      // Generate dubbing if it doesn't exist
      await generateDubbing(language);
      return;
    }

    // Load and sync audio
    const audio = new Audio(existingDubbing.audioUrl);
    audio.currentTime = currentTime;
    audio.muted = audioMuted;
    
    if (isPlaying) {
      audio.play();
    }
    
    setCurrentAudio(audio);
    audioRef.current = audio;
  };

  // Sync audio with video playback
  useEffect(() => {
    if (currentAudio && selectedLanguage !== 'original') {
      currentAudio.currentTime = currentTime;
      
      if (isPlaying && currentAudio.paused) {
        currentAudio.play();
      } else if (!isPlaying && !currentAudio.paused) {
        currentAudio.pause();
      }
    }
  }, [currentTime, isPlaying, currentAudio, selectedLanguage]);

  const toggleAudioMute = () => {
    const newMuted = !audioMuted;
    setAudioMuted(newMuted);
    if (currentAudio) {
      currentAudio.muted = newMuted;
    }
  };

  const getVoiceForLanguage = (lang: string) => {
    const voices: Record<string, string> = {
      'es': 'EXAVITQu4vr4xnSDxMaL', // Sarah
      'fr': 'FGY2WhTYpPnrIDTdsKH5', // Laura  
      'de': 'CwhRBWXzGAHq8TQ4Fs17', // Roger
      'it': 'bIHbv24MWmeRgasZH58o', // Will
      'pt': 'pFZP5JQG7iQjIQuC4Bku', // Lily
    };
    return voices[lang] || 'EXAVITQu4vr4xnSDxMaL';
  };

  const getLanguageDisplay = (lang: string) => {
    const language = languages.find(l => l.code === lang);
    return language ? language.name : lang;
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-40 bg-black/50 border-white/20 text-white">
          <SelectValue placeholder="Language">
            {selectedLanguage !== 'original' && (
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3" />
                {languages.find(l => l.code === selectedLanguage)?.flag} 
                {getLanguageDisplay(selectedLanguage)}
              </div>
            )}
            {selectedLanguage === 'original' && (
              <div className="flex items-center gap-2">
                🎬 Original
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <div className="flex items-center gap-2">
                {lang.flag} {lang.name}
                {isGenerating && selectedLanguage === lang.code && (
                  <span className="text-xs text-muted-foreground ml-2">Generating...</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedLanguage !== 'original' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleAudioMute}
          className="text-white hover:bg-white/20"
          aria-label={audioMuted ? 'Unmute dubbing' : 'Mute dubbing'}
        >
          {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
      )}

      {selectedLanguage !== 'original' && !dubbedAudios.find(a => a.language === selectedLanguage) && !isGenerating && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => generateDubbing(selectedLanguage)}
          className="text-white hover:bg-white/20 text-xs"
        >
          <Languages className="w-3 h-3 mr-1" />
          Generate
        </Button>
      )}
    </div>
  );
};