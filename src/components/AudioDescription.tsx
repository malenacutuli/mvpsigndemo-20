import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AudioDescriptionProps {
  currentTime: number;
  isPlaying: boolean;
  contentType?: 'recipe' | 'education';
  selectedVoice?: {
    id: string;
    name: string;
    description: string;
  };
}

interface AudioDescription {
  text: string;
  startTime: number;
  endTime: number;
  voiceStyle: 'passionate' | 'warm' | 'authoritative' | 'encouraging';
}

// Realistic audio descriptions for pasta cooking masterclass
const recipeDescriptions: AudioDescription[] = [
  {
    text: "Chef Gordon stands before a gleaming stainless steel stove, his intense gaze focused on a large pot of water beginning to bubble. The kitchen is immaculate, every tool in its place.",
    startTime: 0.5,
    endTime: 5,
    voiceStyle: 'passionate'
  },
  {
    text: "Violent bubbles break the surface as the water reaches a rolling boil. Steam rises dramatically, catching the overhead lights like culinary theater.",
    startTime: 6,
    endTime: 11,
    voiceStyle: 'authoritative'
  },
  {
    text: "Gordon reaches for coarse sea salt, his movements precise and confident. He adds generous handfuls, the salt dissolving instantly in the churning water.",
    startTime: 12,
    endTime: 17,
    voiceStyle: 'passionate'
  },
  {
    text: "Long strands of bronze-cut spaghetti cascade into the pot like golden ribbons. The pasta immediately begins its dance in the boiling water.",
    startTime: 18,
    endTime: 23,
    voiceStyle: 'passionate'
  },
  {
    text: "On a wooden cutting board, eight cloves of garlic await transformation. Gordon's knife moves with surgical precision, creating paper-thin slices that glisten with oils.",
    startTime: 29,
    endTime: 35,
    voiceStyle: 'authoritative'
  },
  {
    text: "Extra virgin olive oil shimmers in a large pan, heated to the perfect temperature. The garlic slices hit the oil with an immediate, satisfying sizzle.",
    startTime: 36,
    endTime: 42,
    voiceStyle: 'passionate'
  },
  {
    text: "The garlic transforms from pale white to golden perfection, releasing an intoxicating aroma that fills the entire kitchen. This is the moment every Italian chef lives for.",
    startTime: 43,
    endTime: 49,
    voiceStyle: 'passionate'
  }
];

// Audio descriptions for educational content
const educationDescriptions: AudioDescription[] = [
  {
    text: "Our classroom transforms into a magical science laboratory, filled with wonder and discovery.",
    startTime: 0.5,
    endTime: 4,
    voiceStyle: 'warm'
  },
  {
    text: "Captain Wonder appears with a friendly smile, his cape gently flowing as he prepares to teach us about gravity.",
    startTime: 6,
    endTime: 11,
    voiceStyle: 'encouraging'
  },
  {
    text: "The children's eyes light up with understanding as they see gravity in action through Captain Wonder's demonstration.",
    startTime: 18,
    endTime: 24,
    voiceStyle: 'warm'
  }
];

export const AudioDescription: React.FC<AudioDescriptionProps> = ({
  currentTime,
  isPlaying,
  contentType = 'recipe',
  selectedVoice
}) => {
  const [currentDescription, setCurrentDescription] = useState<AudioDescription | null>(null);
  const [isDescriptionPlaying, setIsDescriptionPlaying] = useState(false);
  const [descriptionAudio, setDescriptionAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isPlaying) return;

    // Select appropriate descriptions
    const descriptions = contentType === 'recipe' ? recipeDescriptions : educationDescriptions;
    
    // Find current description
    const description = descriptions.find(
      desc => currentTime >= desc.startTime && currentTime <= desc.endTime
    );

    if (description && description !== currentDescription) {
      setCurrentDescription(description);
      setIsDescriptionPlaying(true);
      
      // Simulate audio description playback
      setTimeout(() => {
        setIsDescriptionPlaying(false);
      }, (description.endTime - description.startTime) * 1000);
    } else if (!description) {
      setCurrentDescription(null);
      setIsDescriptionPlaying(false);
    }
  }, [currentTime, isPlaying, contentType, currentDescription]);

  if (!currentDescription) return null;

  const getVoiceStyleColor = (style: string) => {
    switch (style) {
      case 'passionate':
        return 'text-cwi-main-orange';
      case 'authoritative':
        return 'text-cwi-main-red';
      case 'warm':
        return 'text-cwi-main-yellow';
      case 'encouraging':
        return 'text-cwi-main-green';
      default:
        return 'text-white';
    }
  };

  return (
    <div className="absolute top-4 left-4 max-w-md">
      <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-primary/30">
        {/* Audio Description Header */}
        <div className="flex items-center gap-2 mb-3">
          <Volume2 className="w-4 h-4 text-primary" />
          <Badge variant="secondary" className="text-xs">
            Audio Description
          </Badge>
          {isDescriptionPlaying && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-red-400">LIVE</span>
            </div>
          )}
        </div>

        {/* Voice Profile */}
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">
            {selectedVoice ? selectedVoice.name : contentType === 'recipe' ? 'Gordon Ramsay Style' : 'Selena Gomez Style'}
          </div>
          <div className="text-xs text-primary/80">
            {currentDescription.voiceStyle} tone
          </div>
        </div>

        {/* Description Text */}
        <div className={`text-sm leading-relaxed ${getVoiceStyleColor(currentDescription.voiceStyle)} ${
          isDescriptionPlaying ? 'animate-pulse' : ''
        }`}>
          "{currentDescription.text}"
        </div>

        {/* Timing Info */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            {currentDescription.startTime}s - {currentDescription.endTime}s
          </span>
          {contentType === 'recipe' && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-cwi-main-orange">🔥</span>
              <span className="text-xs text-muted-foreground">Gordon Style</span>
            </div>
          )}
          {contentType === 'education' && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-cwi-main-yellow">⭐</span>
              <span className="text-xs text-muted-foreground">Warm & Safe</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};