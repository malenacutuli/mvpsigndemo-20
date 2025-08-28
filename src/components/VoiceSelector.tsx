import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Volume2, User, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// ElevenLabs voices with IDs
const ELEVENLABS_VOICES = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', gender: 'Female', accent: 'American' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'Male', accent: 'American' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'Female', accent: 'American' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'Female', accent: 'American' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'Male', accent: 'British' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'Male', accent: 'British' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'Male', accent: 'American' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', gender: 'Neutral', accent: 'American' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'Male', accent: 'American' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'Female', accent: 'British' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'Female', accent: 'British' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'Female', accent: 'American' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'Male', accent: 'American' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'Female', accent: 'American' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', gender: 'Male', accent: 'American' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'Male', accent: 'American' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'Male', accent: 'American' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'Male', accent: 'British' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'Female', accent: 'British' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', gender: 'Male', accent: 'American' }
];

// Native browser voices (available in most browsers)
const NATIVE_VOICES = [
  { id: 'native-us-male', name: 'US Male', gender: 'Male', accent: 'American' },
  { id: 'native-us-female', name: 'US Female', gender: 'Female', accent: 'American' },
  { id: 'native-uk-male', name: 'UK Male', gender: 'Male', accent: 'British' },
  { id: 'native-uk-female', name: 'UK Female', gender: 'Female', accent: 'British' },
  { id: 'native-au-male', name: 'Australian Male', gender: 'Male', accent: 'Australian' },
  { id: 'native-au-female', name: 'Australian Female', gender: 'Female', accent: 'Australian' },
  { id: 'native-ca-male', name: 'Canadian Male', gender: 'Male', accent: 'Canadian' },
  { id: 'native-ca-female', name: 'Canadian Female', gender: 'Female', accent: 'Canadian' }
];

interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
}

interface VoiceSelectorProps {
  selectedVoiceId?: string;
  onVoiceSelect?: (voiceId: string, voiceName: string, voiceType: 'elevenlabs' | 'native') => void;
  className?: string;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoiceId,
  onVoiceSelect,
  className = ""
}) => {
  const [selectedType, setSelectedType] = useState<'elevenlabs' | 'native'>('native');
  const [selectedVoice, setSelectedVoice] = useState<string>(selectedVoiceId || '');
  const { toast } = useToast();

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
    const voice = getCurrentVoices().find(v => v.id === voiceId);
    if (voice) {
      onVoiceSelect?.(voiceId, voice.name, selectedType);
      toast({
        title: "Voice Selected",
        description: `${voice.name} (${voice.accent} ${voice.gender}) assigned`
      });
    }
  };

  const getCurrentVoices = (): Voice[] => {
    return selectedType === 'elevenlabs' ? ELEVENLABS_VOICES : NATIVE_VOICES;
  };

  const testVoice = (voiceId: string) => {
    const voice = getCurrentVoices().find(v => v.id === voiceId);
    if (!voice) return;

    if (selectedType === 'native') {
      // Use browser's speech synthesis
      const utterance = new SpeechSynthesisUtterance(
        `Hello, this is ${voice.name}. Testing voice for character.`
      );
      
      // Try to match voice by name
      const voices = speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => 
        v.name.toLowerCase().includes(voice.accent.toLowerCase()) && 
        (voice.gender === 'Male' ? v.name.toLowerCase().includes('male') : v.name.toLowerCase().includes('female'))
      );
      
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      
      speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "ElevenLabs Preview",
        description: "ElevenLabs voice testing requires API key setup. Voice will be used for dubbing when configured."
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          Voice Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Type Selection */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={selectedType === 'native' ? 'default' : 'outline'}
            onClick={() => setSelectedType('native')}
          >
            Native Voices (Free)
          </Button>
          <Button
            size="sm"
            variant={selectedType === 'elevenlabs' ? 'default' : 'outline'}
            onClick={() => setSelectedType('elevenlabs')}
          >
            ElevenLabs (Premium)
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <Select value={selectedVoice} onValueChange={handleVoiceSelect}>
            <SelectTrigger>
              <SelectValue placeholder={`Select a ${selectedType === 'elevenlabs' ? 'premium' : 'native'} voice`} />
            </SelectTrigger>
            <SelectContent>
              {getCurrentVoices().map(voice => (
                <SelectItem key={voice.id} value={voice.id}>
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    <span>{voice.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {voice.accent} {voice.gender}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedVoice && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => testVoice(selectedVoice)}
              className="w-full"
            >
              <Volume2 className="w-3 h-3 mr-2" />
              Test Voice
            </Button>
          )}
        </div>

        {selectedType === 'elevenlabs' && (
          <div className="text-xs text-muted-foreground bg-accent/10 p-2 rounded">
            <strong>Note:</strong> ElevenLabs voices require API key setup and may incur costs. 
            Native voices are free and work immediately.
          </div>
        )}
      </CardContent>
    </Card>
  );
};