import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Volume2, User, Heart, Zap, Crown } from 'lucide-react';

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  elevenLabsId: string;
}

interface VoiceSelectorProps {
  options: VoiceOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  contentType: 'recipe' | 'education';
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  options,
  selectedValue,
  onValueChange,
  contentType
}) => {
  const getVoiceIcon = (voiceId: string, name: string) => {
    if (name.toLowerCase().includes('sarah')) {
      return <Heart className="w-4 h-4" />;
    }
    if (name.toLowerCase().includes('brian')) {
      return <Zap className="w-4 h-4" />;
    }
    if (name.toLowerCase().includes('aria')) {
      return <Crown className="w-4 h-4" />;
    }
    return <User className="w-4 h-4" />;
  };

  const getVoiceColor = (name: string) => {
    if (name.toLowerCase().includes('sarah')) {
      return 'bg-pink-500';
    }
    if (name.toLowerCase().includes('brian')) {
      return 'bg-blue-500';
    }
    if (name.toLowerCase().includes('aria')) {
      return 'bg-purple-500';
    }
    return 'bg-green-500';
  };

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">
        <Volume2 className="w-4 h-4 inline mr-1" />
        Audio Description Voice
      </label>
      <Select value={selectedValue} onValueChange={onValueChange}>
        <SelectTrigger className="bg-background border border-border hover:bg-accent/50 transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background border border-border shadow-lg backdrop-blur-sm z-50">
          {options.map((voice) => (
            <SelectItem key={voice.id} value={voice.id} className="cursor-pointer hover:bg-accent focus:bg-accent">
              <div className="flex items-center gap-3 py-1">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={`${getVoiceColor(voice.name)} text-white text-xs`}>
                    {getVoiceIcon(voice.id, voice.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{voice.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{voice.description}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};