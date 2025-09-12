import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Volume2, User, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// ElevenLabs voices with language support
const ELEVENLABS_VOICES = [
  // English Voices
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', gender: 'Female', accent: 'American', language: 'en' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'Male', accent: 'American', language: 'en' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'Female', accent: 'American', language: 'en' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'Female', accent: 'American', language: 'en' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'Male', accent: 'British', language: 'en' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'Male', accent: 'British', language: 'en' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'Male', accent: 'American', language: 'en' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', gender: 'Neutral', accent: 'American', language: 'en' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'Male', accent: 'American', language: 'en' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'Female', accent: 'British', language: 'en' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'Female', accent: 'British', language: 'en' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'Female', accent: 'American', language: 'en' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'Male', accent: 'American', language: 'en' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'Female', accent: 'American', language: 'en' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', gender: 'Male', accent: 'American', language: 'en' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'Male', accent: 'American', language: 'en' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'Male', accent: 'American', language: 'en' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'Male', accent: 'British', language: 'en' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'Female', accent: 'British', language: 'en' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', gender: 'Male', accent: 'American', language: 'en' },
  
  // Spanish Native Voices - Optimized for accessibility and education content
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Esperanza', gender: 'Female', accent: 'Castilian', language: 'es' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Sofía', gender: 'Female', accent: 'Mexican', language: 'es' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Carmen', gender: 'Female', accent: 'Argentinian', language: 'es' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'Diego', gender: 'Male', accent: 'Mexican', language: 'es' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Alejandro', gender: 'Male', accent: 'Colombian', language: 'es' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Ricardo', gender: 'Male', accent: 'Castilian', language: 'es' },
  
  // French Native Voices
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Amélie', gender: 'Female', accent: 'Parisian', language: 'fr' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Céline', gender: 'Female', accent: 'French', language: 'fr' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Pierre', gender: 'Male', accent: 'French', language: 'fr' },
  
  // German Native Voices
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'Greta', gender: 'Female', accent: 'German', language: 'de' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Klaus', gender: 'Male', accent: 'German', language: 'de' },
  
  // Italian Native Voices  
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Isabella', gender: 'Female', accent: 'Italian', language: 'it' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Marco', gender: 'Male', accent: 'Italian', language: 'it' }
];

// Native browser voices with language support
const NATIVE_VOICES = [
  // English
  { id: 'native-us-male', name: 'US Male', gender: 'Male', accent: 'American', language: 'en' },
  { id: 'native-us-female', name: 'US Female', gender: 'Female', accent: 'American', language: 'en' },
  { id: 'native-uk-male', name: 'UK Male', gender: 'Male', accent: 'British', language: 'en' },
  { id: 'native-uk-female', name: 'UK Female', gender: 'Female', accent: 'British', language: 'en' },
  { id: 'native-au-male', name: 'Australian Male', gender: 'Male', accent: 'Australian', language: 'en' },
  { id: 'native-au-female', name: 'Australian Female', gender: 'Female', accent: 'Australian', language: 'en' },
  { id: 'native-ca-male', name: 'Canadian Male', gender: 'Male', accent: 'Canadian', language: 'en' },
  { id: 'native-ca-female', name: 'Canadian Female', gender: 'Female', accent: 'Canadian', language: 'en' },
  
  // Spanish
  { id: 'native-es-mx-female', name: 'Mexican Spanish Female', gender: 'Female', accent: 'Mexican', language: 'es' },
  { id: 'native-es-mx-male', name: 'Mexican Spanish Male', gender: 'Male', accent: 'Mexican', language: 'es' },
  { id: 'native-es-es-female', name: 'Castilian Spanish Female', gender: 'Female', accent: 'Castilian', language: 'es' },
  { id: 'native-es-es-male', name: 'Castilian Spanish Male', gender: 'Male', accent: 'Castilian', language: 'es' },
  { id: 'native-es-ar-female', name: 'Argentinian Spanish Female', gender: 'Female', accent: 'Argentinian', language: 'es' },
  
  // French
  { id: 'native-fr-fr-female', name: 'French Female', gender: 'Female', accent: 'French', language: 'fr' },
  { id: 'native-fr-fr-male', name: 'French Male', gender: 'Male', accent: 'French', language: 'fr' },
  { id: 'native-fr-ca-female', name: 'Canadian French Female', gender: 'Female', accent: 'Quebec', language: 'fr' },
  
  // German
  { id: 'native-de-de-female', name: 'German Female', gender: 'Female', accent: 'German', language: 'de' },
  { id: 'native-de-de-male', name: 'German Male', gender: 'Male', accent: 'German', language: 'de' },
  
  // Italian
  { id: 'native-it-it-female', name: 'Italian Female', gender: 'Female', accent: 'Italian', language: 'it' },
  { id: 'native-it-it-male', name: 'Italian Male', gender: 'Male', accent: 'Italian', language: 'it' }
];

interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
  language: string;
}

interface VoiceSelectorProps {
  selectedVoiceId?: string;
  onVoiceSelect?: (voiceId: string, voiceName: string, voiceType: 'elevenlabs' | 'native') => void;
  className?: string;
  language?: string; // Filter voices by language
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoiceId,
  onVoiceSelect,
  className = "",
  language = "en" // Default to English
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
    const allVoices = selectedType === 'elevenlabs' ? ELEVENLABS_VOICES : NATIVE_VOICES;
    // Filter by language if specified
    const filteredVoices = allVoices.filter(voice => voice.language === language);
    console.log(`🔍 Filtering voices for language "${language}":`, filteredVoices.length, 'voices found');
    return filteredVoices.length > 0 ? filteredVoices : allVoices.filter(voice => voice.language === 'en');
  };

  const testVoice = (voiceId: string) => {
    const voice = getCurrentVoices().find(v => v.id === voiceId);
    if (!voice) return;

    if (selectedType === 'native') {
      // Use browser's speech synthesis with enhanced language and accent matching
      const testText = {
        'en': `Hello, this is ${voice.name}. Testing voice for character assignment.`,
        'es': `Hola, soy ${voice.name}. Probando la voz para asignación de personaje.`,
        'fr': `Bonjour, je suis ${voice.name}. Test de voix pour l'attribution de personnage.`,
        'de': `Hallo, ich bin ${voice.name}. Stimmentest für Charakterzuweisung.`,
        'it': `Ciao, sono ${voice.name}. Test della voce per l'assegnazione del personaggio.`
      };
      
      const utterance = new SpeechSynthesisUtterance(
        testText[language as keyof typeof testText] || testText.en
      );
      
      // Enhanced voice matching with language priority
      const voices = speechSynthesis.getVoices();
      console.log(`🗣️ Testing ${voice.name} in ${language}:`, voice);
      
      let matchedVoice = null;
      
      // Language-specific voice matching
      const langMap: Record<string, string[]> = {
        'en': ['en-US', 'en_US', 'en-GB', 'en_GB', 'en-AU', 'en_AU', 'en-CA', 'en_CA'],
        'es': ['es-ES', 'es_ES', 'es-MX', 'es_MX', 'es-AR', 'es_AR', 'es-CO', 'es_CO'],
        'fr': ['fr-FR', 'fr_FR', 'fr-CA', 'fr_CA'],
        'de': ['de-DE', 'de_DE', 'de-AT', 'de_AT'],
        'it': ['it-IT', 'it_IT']
      };
      
      const langCodes = langMap[language] || langMap.en;
      
      // Try to find voice matching both language and gender/accent preference
      for (const langCode of langCodes) {
        matchedVoice = voices.find(v => 
          v.lang.includes(langCode) &&
          (voice.gender === 'Male' ? 
            v.name.toLowerCase().includes('male') || 
            v.name.toLowerCase().includes('diego') || 
            v.name.toLowerCase().includes('alejandro') || 
            v.name.toLowerCase().includes('david') || 
            v.name.toLowerCase().includes('alex') || 
            v.name.toLowerCase().includes('pierre') || 
            v.name.toLowerCase().includes('klaus') || 
            v.name.toLowerCase().includes('marco') : 
            v.name.toLowerCase().includes('female') || 
            v.name.toLowerCase().includes('esperanza') || 
            v.name.toLowerCase().includes('sofia') || 
            v.name.toLowerCase().includes('samantha') || 
            v.name.toLowerCase().includes('amelie') || 
            v.name.toLowerCase().includes('greta') || 
            v.name.toLowerCase().includes('isabella'))
        );
        if (matchedVoice) break;
      }
      
      // Fallback to any voice in the target language
      if (!matchedVoice) {
        for (const langCode of langCodes) {
          matchedVoice = voices.find(v => v.lang.includes(langCode));
          if (matchedVoice) break;
        }
      }
      
      if (matchedVoice) {
        utterance.voice = matchedVoice;
        console.log(`✅ Using voice for ${language}:`, matchedVoice.name, matchedVoice.lang);
      } else {
        console.log(`⚠️ No ${language} voice found, using default`);
      }
      
      // Language-appropriate speech settings
      utterance.rate = language === 'es' ? 0.85 : 0.9; // Slightly slower for Spanish
      utterance.pitch = voice.gender === 'Male' ? 0.8 : 1.1;
      
      speechSynthesis.speak(utterance);
      
      toast({
        title: `${language.toUpperCase()} Voice Test`,
        description: `Testing ${voice.name} (${voice.accent} ${voice.gender})`
      });
    } else {
      toast({
        title: "Premium Voice Preview",
        description: `Premium ${language.toUpperCase()} voice testing requires API key setup. Voice will be used for dubbing when configured.`
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          Voice Selection {language !== 'en' && `(${language.toUpperCase()})`}
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
            Premium Voices
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
                      {voice.language !== 'en' && (
                        <Badge variant="secondary" className="text-xs">
                          {voice.language.toUpperCase()}
                        </Badge>
                      )}
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
            <strong>Note:</strong> Premium voices require API key setup and may incur costs. 
            Native voices are free and work immediately.
          </div>
        )}
      </CardContent>
    </Card>
  );
};