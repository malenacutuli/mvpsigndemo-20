import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SignLanguageOption {
  id: string;
  name: string;
  description: string;
}

interface SignLanguageAvatarSelectorProps {
  options: Array<{ id: string; name: string; description: string }>;
  selectedValue: string;
  onValueChange: (value: string) => void;
  contentType: string;
}

export const SignLanguageAvatarSelector: React.FC<SignLanguageAvatarSelectorProps> = ({
  options,
  selectedValue,
  onValueChange,
  contentType
}) => {

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">
        ASL Avatar Character
      </label>
      <Select value={selectedValue} onValueChange={onValueChange}>
        <SelectTrigger className="bg-background border border-border hover:bg-accent/50 transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background border border-border shadow-lg backdrop-blur-sm z-50">
          {options.map((signLanguageOption) => (
            <SelectItem key={signLanguageOption.id} value={signLanguageOption.id} className="cursor-pointer hover:bg-accent focus:bg-accent">
              <div className="flex flex-col gap-1 py-1">
                <div className="font-medium text-foreground">{signLanguageOption.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{signLanguageOption.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};