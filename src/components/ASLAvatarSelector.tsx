import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HandHelping, Users, GraduationCap, ChefHat } from 'lucide-react';

interface ASLOption {
  id: string;
  name: string;
  description: string;
}

interface ASLAvatarSelectorProps {
  options: Array<{ id: string; name: string; description: string }>;
  selectedValue: string;
  onValueChange: (value: string) => void;
  contentType: string;
}

export const ASLAvatarSelector: React.FC<ASLAvatarSelectorProps> = ({
  options,
  selectedValue,
  onValueChange,
  contentType
}) => {
  const getAvatarIcon = (avatarId: string) => {
    if (avatarId.includes('chef') || avatarId.includes('cook')) {
      return <ChefHat className="w-4 h-4" />;
    }
    if (avatarId.includes('superhero') || avatarId.includes('captain')) {
      return <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />;
    }
    if (avatarId.includes('teacher')) {
      return <GraduationCap className="w-4 h-4" />;
    }
    if (avatarId.includes('student') || avatarId.includes('kid')) {
      return <Users className="w-4 h-4" />;
    }
    return <HandHelping className="w-4 h-4" />;
  };

  const getAvatarColor = (avatarId: string) => {
    if (avatarId.includes('chef') || avatarId.includes('cook')) {
      return 'bg-orange-500';
    }
    if (avatarId.includes('superhero') || avatarId.includes('captain')) {
      return 'bg-gradient-to-r from-blue-500 to-purple-500';
    }
    if (avatarId.includes('teacher')) {
      return 'bg-green-500';
    }
    if (avatarId.includes('student') || avatarId.includes('kid')) {
      return 'bg-yellow-500';
    }
    return 'bg-primary';
  };

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">
        <HandHelping className="w-4 h-4 inline mr-1" />
        ASL Avatar Character
      </label>
      <Select value={selectedValue} onValueChange={onValueChange}>
        <SelectTrigger className="bg-background border border-border hover:bg-accent/50 transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background border border-border shadow-lg backdrop-blur-sm z-50">
          {options.map((asl) => (
            <SelectItem key={asl.id} value={asl.id} className="cursor-pointer hover:bg-accent focus:bg-accent">
              <div className="flex items-center gap-3 py-1">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={`${getAvatarColor(asl.id)} text-white text-xs`}>
                    {getAvatarIcon(asl.id)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{asl.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{asl.description}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};