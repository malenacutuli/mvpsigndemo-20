import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Play, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VoiceOption, getFilteredVoices, getCategoryColor, findVoiceById } from "@/types/voice";

interface AudioDescriptionVoiceSelectorProps {
  selectedVoiceId?: string;
  onVoiceSelect: (voiceId: string) => void;
  language?: string;
  contentType?: 'recipe' | 'education';
  className?: string;
}


export const AudioDescriptionVoiceSelector: React.FC<AudioDescriptionVoiceSelectorProps> = ({
  selectedVoiceId = 'gordon-ramsay',
  onVoiceSelect,
  language = 'en',
  contentType = 'recipe',
  className = '',
}) => {
  const selectedVoice = findVoiceById(selectedVoiceId) || getFilteredVoices(language, contentType)[0];
  const filteredVoices = getFilteredVoices(language, contentType);

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