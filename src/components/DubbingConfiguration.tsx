import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DubbingLanguage {
  code: string;
  name: string;
}

interface ElevenLabsVoice {
  id: string;
  name: string;
  gender: string;
  accent: string;
  language: string;
}

interface DubbingConfigurationProps {
  videoId: string;
  originalLanguage: string;
  onConfigurationChange: (config: { targetLanguage: string; voiceId: string }) => void;
}

const SUPPORTED_LANGUAGES: DubbingLanguage[] = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' }
];

const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'Female', accent: 'American', language: 'en' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'Female', accent: 'British', language: 'es' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'Male', accent: 'American', language: 'fr' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'Female', accent: 'British', language: 'de' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'Male', accent: 'American', language: 'it' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'Female', accent: 'American', language: 'pt' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'Male', accent: 'American', language: 'ru' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'Male', accent: 'American', language: 'ja' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'Male', accent: 'American', language: 'ko' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', gender: 'Male', accent: 'American', language: 'zh' }
];

export const DubbingConfiguration: React.FC<DubbingConfigurationProps> = ({
  videoId,
  originalLanguage,
  onConfigurationChange
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const { toast } = useToast();

  // Filter out the original language from dubbing options
  const availableLanguages = SUPPORTED_LANGUAGES.filter(
    lang => lang.code !== originalLanguage
  );

  // Get voices for selected language
  const availableVoices = ELEVENLABS_VOICES.filter(
    voice => voice.language === selectedLanguage || 
             (selectedLanguage && voice.id === 'EXAVITQu4vr4xnSDxMaL') // Sarah works for all languages
  );

  useEffect(() => {
    if (selectedLanguage && selectedVoiceId) {
      onConfigurationChange({
        targetLanguage: selectedLanguage,
        voiceId: selectedVoiceId
      });
    }
  }, [selectedLanguage, selectedVoiceId, onConfigurationChange]);

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setSelectedVoiceId(''); // Reset voice selection when language changes
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
  };

  const testVoice = async () => {
    if (!selectedVoiceId) return;

    setIsTestingVoice(true);
    try {
      const selectedVoice = availableVoices.find(v => v.id === selectedVoiceId);
      const testText = `Hello, this is ${selectedVoice?.name}. This is how the dubbing will sound.`;
      
      // Use browser's speech synthesis for quick testing
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(testText);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        window.speechSynthesis.speak(utterance);
      }
      
      toast({
        title: "Voice Test",
        description: `Testing ${selectedVoice?.name} voice`,
      });
    } catch (error) {
      toast({
        title: "Error testing voice",
        description: "Unable to test voice at this time",
        variant: "destructive"
      });
    } finally {
      setIsTestingVoice(false);
    }
  };

  const getLanguageName = (code: string) => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code)?.name || code;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          AI Dubbing Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Target Language</Label>
          <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select language for dubbing" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border shadow-lg z-50">
              {availableLanguages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {originalLanguage && (
            <p className="text-xs text-muted-foreground">
              Original: {getLanguageName(originalLanguage)}
            </p>
          )}
        </div>

        {selectedLanguage && (
          <div className="space-y-2">
            <Label>Voice Selection</Label>
            <Select value={selectedVoiceId} onValueChange={handleVoiceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select voice for dubbing" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border shadow-lg z-50">
                {availableVoices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div className="flex items-center gap-2">
                      <span>{voice.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {voice.gender}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {voice.accent}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedVoiceId && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testVoice}
                  disabled={isTestingVoice}
                >
                  <Play className="w-3 h-3 mr-1" />
                  {isTestingVoice ? 'Testing...' : 'Test Voice'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Preview how the voice will sound
                </p>
              </div>
            )}
          </div>
        )}

        {selectedLanguage && selectedVoiceId && (
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Configuration:</strong> Your video will be dubbed from {getLanguageName(originalLanguage)} 
              to {getLanguageName(selectedLanguage)} using the {availableVoices.find(v => v.id === selectedVoiceId)?.name} voice.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};