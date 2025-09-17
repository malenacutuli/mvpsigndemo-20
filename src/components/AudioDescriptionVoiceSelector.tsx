import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Play, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  accent?: string;
  gender: 'male' | 'female';
  category: 'chef' | 'narrator' | 'education' | 'premium';
  elevenLabsId: string;
}

interface AudioDescriptionVoiceSelectorProps {
  selectedVoiceId?: string;
  onVoiceSelect: (voiceId: string) => void;
  language?: string;
  contentType?: 'recipe' | 'education';
  className?: string;
}

// Expanded voice options with more choices
const VOICE_OPTIONS: VoiceOption[] = [
  // Chef/Recipe Voices
  { id: 'gordon-ramsay', name: 'Gordon Ramsay Style', description: 'Passionate, authoritative cooking voice', gender: 'male', category: 'chef', elevenLabsId: 'nPczCjzI2devNBz1zQrb' },
  { id: 'julia-child', name: 'Julia Child Style', description: 'Warm, encouraging culinary guide', gender: 'female', category: 'chef', elevenLabsId: '9BWtsMINqrJLrRacOk9x' },
  { id: 'anthony-bourdain', name: 'Anthony Bourdain Style', description: 'Sophisticated, worldly food narrator', gender: 'male', category: 'chef', elevenLabsId: 'JBFqnCBsd6RMkjVDRZzb' },
  { id: 'jamie-oliver', name: 'Jamie Oliver Style', description: 'Enthusiastic, approachable chef', gender: 'male', category: 'chef', elevenLabsId: 'CwhRBWXzGAHq8TQ4Fs17' },
  { id: 'ina-garten', name: 'Ina Garten Style', description: 'Calm, reassuring cooking mentor', gender: 'female', category: 'chef', elevenLabsId: 'EXAVITQu4vr4xnSDxMaL' },
  
  // Professional Narrators
  { id: 'professional-male', name: 'Professional Male', description: 'Clear, authoritative narrator', gender: 'male', category: 'narrator', elevenLabsId: 'onwK4e9ZLuTAKqWW03F9' },
  { id: 'professional-female', name: 'Professional Female', description: 'Warm, engaging narrator', gender: 'female', category: 'narrator', elevenLabsId: 'pFZP5JQG7iQjIQuC4Bku' },
  { id: 'documentary-male', name: 'Documentary Style Male', description: 'David Attenborough inspired', gender: 'male', category: 'narrator', elevenLabsId: 'IKne3meq5aSn9XLyUdCD' },
  { id: 'documentary-female', name: 'Documentary Style Female', description: 'Engaging documentary narrator', gender: 'female', category: 'narrator', elevenLabsId: 'XB0fDUnXU5powFXDhCwa' },
  
  // Education Focused
  { id: 'teacher-female', name: 'Teacher (Female)', description: 'Patient, educational tone', gender: 'female', category: 'education', elevenLabsId: 'cgSgspJ2msm6clMCkdW9' },
  { id: 'teacher-male', name: 'Teacher (Male)', description: 'Encouraging, instructional voice', gender: 'male', category: 'education', elevenLabsId: 'TX3LPaxmHKxFdv7VOQHJ' },
  { id: 'storyteller-female', name: 'Storyteller (Female)', description: 'Expressive, engaging storyteller', gender: 'female', category: 'education', elevenLabsId: 'XrExE9yKIg1WjnnlVkGX' },
  { id: 'storyteller-male', name: 'Storyteller (Male)', description: 'Captivating story narrator', gender: 'male', category: 'education', elevenLabsId: 'bIHbv24MWmeRgasZH58o' },
  
  // Spanish Voices
  { id: 'spanish-narrator-female', name: 'Spanish Narrator (Female)', description: 'Clear Spanish pronunciation', accent: 'Spanish', gender: 'female', category: 'education', elevenLabsId: 'pFZP5JQG7iQjIQuC4Bku' },
  { id: 'spanish-narrator-male', name: 'Spanish Narrator (Male)', description: 'Professional Spanish voice', accent: 'Spanish', gender: 'male', category: 'education', elevenLabsId: 'JBFqnCBsd6RMkjVDRZzb' },
  { id: 'spanish-warm-female', name: 'Spanish Warm (Female)', description: 'Warm, motherly Spanish voice', accent: 'Spanish', gender: 'female', category: 'education', elevenLabsId: 'cgSgspJ2msm6clMCkdW9' },
  { id: 'spanish-energetic', name: 'Spanish Energetic', description: 'Energetic Spanish for children', accent: 'Spanish', gender: 'female', category: 'education', elevenLabsId: 'XrExE9yKIg1WjnnlVkGX' },
  
  // Premium Voices
  { id: 'premium-aria', name: 'Aria (Premium)', description: 'Ultra-realistic female voice', gender: 'female', category: 'premium', elevenLabsId: '9BWtsMINqrJLrRacOk9x' },
  { id: 'premium-roger', name: 'Roger (Premium)', description: 'Deep, resonant male voice', gender: 'male', category: 'premium', elevenLabsId: 'CwhRBWXzGAHq8TQ4Fs17' },
  { id: 'premium-sarah', name: 'Sarah (Premium)', description: 'Sophisticated female narrator', gender: 'female', category: 'premium', elevenLabsId: 'EXAVITQu4vr4xnSDxMaL' },
  { id: 'premium-charlie', name: 'Charlie (Premium)', description: 'Versatile male voice', gender: 'male', category: 'premium', elevenLabsId: 'IKne3meq5aSn9XLyUdCD' },
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'chef': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'narrator': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'education': return 'bg-green-100 text-green-800 border-green-200';
    case 'premium': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const AudioDescriptionVoiceSelector: React.FC<AudioDescriptionVoiceSelectorProps> = ({
  selectedVoiceId = 'gordon-ramsay',
  onVoiceSelect,
  language = 'en',
  contentType = 'recipe',
  className = '',
}) => {
  const selectedVoice = VOICE_OPTIONS.find(v => v.id === selectedVoiceId) || VOICE_OPTIONS[0];

  // Filter voices based on language and content type
  const getFilteredVoices = () => {
    let voices = VOICE_OPTIONS;
    
    // Filter by language
    if (language === 'es') {
      voices = voices.filter(v => v.accent === 'Spanish' || v.category === 'premium');
    } else {
      voices = voices.filter(v => !v.accent || v.accent !== 'Spanish');
    }
    
    // Prioritize by content type
    voices.sort((a, b) => {
      if (contentType === 'recipe' && a.category === 'chef' && b.category !== 'chef') return -1;
      if (contentType === 'recipe' && b.category === 'chef' && a.category !== 'chef') return 1;
      if (contentType === 'education' && a.category === 'education' && b.category !== 'education') return -1;
      if (contentType === 'education' && b.category === 'education' && a.category !== 'education') return 1;
      return 0;
    });
    
    return voices;
  };

  const testVoice = (voice: VoiceOption) => {
    const sampleText = contentType === 'recipe' 
      ? `In this cooking demonstration, we'll be preparing the ingredients with care and precision.`
      : `This educational content provides detailed descriptions of the visual elements on screen.`;
    
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.rate = 0.9;
      utterance.pitch = voice.gender === 'female' ? 1.1 : 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const filteredVoices = getFilteredVoices();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Audio Description Voice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Voice</label>
          <Select value={selectedVoiceId} onValueChange={onVoiceSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a voice" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {filteredVoices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id} className="p-3">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{voice.name}</span>
                        <Badge variant="outline" className={getCategoryColor(voice.category)}>
                          {voice.category}
                        </Badge>
                        {voice.accent && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            {voice.accent}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{voice.description}</p>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Voice Preview */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-medium">{selectedVoice.name}</h4>
              <p className="text-sm text-muted-foreground">{selectedVoice.description}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testVoice(selectedVoice)}
              className="shrink-0 ml-2"
            >
              <Play className="w-3 h-3 mr-1" />
              Test
            </Button>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className={getCategoryColor(selectedVoice.category)}>
              {selectedVoice.category}
            </Badge>
            <Badge variant="outline">
              {selectedVoice.gender}
            </Badge>
            {selectedVoice.accent && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                {selectedVoice.accent}
              </Badge>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>💡 Tip: Voice selection affects audio descriptions generated for your video. Premium voices offer higher quality synthesis.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioDescriptionVoiceSelector;