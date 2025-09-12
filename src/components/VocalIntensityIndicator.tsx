import React from 'react';
import { Badge } from './ui/badge';
import { VolumeX, Volume1, Volume2, VolumeOff } from 'lucide-react';

interface VocalIntensityIndicatorProps {
  level?: 'whisper' | 'normal' | 'yell' | 'shout';
  confidence?: number;
  showIcon?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const VocalIntensityIndicator: React.FC<VocalIntensityIndicatorProps> = ({
  level = 'normal',
  confidence = 0.7,
  showIcon = true,
  showText = true,
  size = 'md'
}) => {
  const getIntensityConfig = (level: string) => {
    switch (level) {
      case 'whisper':
        return {
          icon: VolumeOff,
          color: 'hsl(var(--muted-foreground))',
          bgColor: 'hsl(var(--muted) / 0.5)',
          label: 'Whisper',
          description: 'Very quiet speech'
        };
      case 'yell':
        return {
          icon: Volume2,
          color: 'hsl(var(--primary))',
          bgColor: 'hsl(var(--primary) / 0.1)',
          label: 'Yelling',
          description: 'Raised voice'
        };
      case 'shout':
        return {
          icon: Volume2,
          color: 'hsl(var(--destructive))',
          bgColor: 'hsl(var(--destructive) / 0.1)',
          label: 'Shouting',
          description: 'Very loud speech'
        };
      default:
        return {
          icon: Volume1,
          color: 'hsl(var(--foreground))',
          bgColor: 'hsl(var(--background))',
          label: 'Normal',
          description: 'Regular speech volume'
        };
    }
  };

  const config = getIntensityConfig(level);
  const Icon = config.icon;
  
  const sizeStyles = {
    sm: { iconSize: 'w-3 h-3', textSize: 'text-xs', padding: 'px-2 py-1' },
    md: { iconSize: 'w-4 h-4', textSize: 'text-sm', padding: 'px-3 py-1.5' },
    lg: { iconSize: 'w-5 h-5', textSize: 'text-base', padding: 'px-4 py-2' }
  }[size];

  const confidenceOpacity = Math.max(0.5, confidence);

  return (
    <Badge
      variant="outline"
      className={`${sizeStyles.padding} border-0 ${sizeStyles.textSize}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        opacity: confidenceOpacity,
        transition: 'all 0.3s ease'
      }}
      title={`${config.description} (${Math.round(confidence * 100)}% confidence)`}
    >
      {showIcon && (
        <Icon 
          className={`${sizeStyles.iconSize} ${showText ? 'mr-1.5' : ''}`} 
          style={{ color: config.color }}
        />
      )}
      {showText && (
        <span className="font-medium">
          {config.label}
        </span>
      )}
    </Badge>
  );
};