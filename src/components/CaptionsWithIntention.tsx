import React, { useState, useEffect, useRef } from 'react';
import { useVocalIntensityAnalysis } from '@/hooks/useVocalIntensityAnalysis';

// Captions with Intention color palette following the official protocol
const CI_COLORS = {
  // Read-ahead text color (white at 90% opacity)
  readahead: 'rgba(255, 255, 255, 0.9)',
  
  // Main Characters (6 primary colors)
  main: {
    yellow: '#E5E517',    // CI Main Yellow
    blue: '#17E5E5',      // CI Main Blue
    red: '#E51717',       // CI Main Red
    orange: '#E58017',    // CI Main Orange
    green: '#17E517',     // CI Main Green
    pink: '#E517E5'       // CI Main Pink
  },
  
  // Supporting Characters (colors between main characters)
  supporting: {
    orange1: '#E85C2E',   // CI Support Orange
    blue1: '#47C2EB',     // CI Support Blue I
    yellow1: '#EBC247',   // CI Support Yellow
    blue2: '#5E82ED',     // CI Support Blue II
    green1: '#C2EB47',    // CI Support Green I
    purple1: '#8C6BED',   // CI Support Purple I
    green2: '#82ED5E',    // CI Support Green II
    purple2: '#CC6BED',   // CI Support Purple II
    green3: '#47EB70',    // CI Support Green III
    pink1: '#EB47C2',     // CI Support Pink I
    cyan: '#5EEDC9',      // CI Support Cyan
    pink2: '#ED5E82'      // CI Support Pink II
  },
  
  // Minor Characters (pastel tones from center of color wheel)
  minor: [
    'hsl(0, 30%, 90%)',   'hsl(342, 30%, 90%)', 'hsl(327, 30%, 90%)', 'hsl(313, 30%, 90%)',
    'hsl(298, 30%, 90%)', 'hsl(282, 30%, 90%)', 'hsl(267, 30%, 90%)', 'hsl(251, 30%, 90%)',
    'hsl(240, 30%, 90%)', 'hsl(222, 30%, 90%)', 'hsl(207, 30%, 90%)', 'hsl(193, 30%, 90%)',
    'hsl(178, 30%, 90%)', 'hsl(162, 30%, 90%)', 'hsl(149, 30%, 90%)', 'hsl(133, 30%, 90%)',
    'hsl(120, 30%, 90%)', 'hsl(102, 30%, 90%)', 'hsl(87, 30%, 90%)',  'hsl(73, 30%, 90%)',
    'hsl(58, 30%, 90%)',  'hsl(40, 30%, 90%)',  'hsl(24, 30%, 90%)',  'hsl(7, 30%, 90%)'
  ]
};

export interface WordSegment {
  text: string;
  startTime: number;
  endTime: number;
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling';
  pitch?: 'high' | 'low' | 'normal';
  syllables?: string[];
}

export interface CaptionSegment {
  text: string;
  speaker: string | 'narrator' | 'soundeffect' | 'music';
  startTime: number;
  endTime: number;
  words: WordSegment[];
  // Extended properties for Captions with Intention
  volume?: number;          // dB level for volume-based sizing
  pitch?: number;           // Hz for pitch-based styling
  type?: 'dialogue' | 'soundeffect' | 'music';
  isOffCamera?: boolean;    // For italic styling
  speakerColor?: string;    // Character-specific color
  // Vocal intensity analysis properties
  vocal_intensity?: 'whisper' | 'normal' | 'yell' | 'shout';
  intensity_confidence?: number;
  auto_styling?: any;       // Computed styling from vocal intensity
}

interface CaptionsWithIntentionProps {
  captions: CaptionSegment[];
  currentTime: number;
  isVisible?: boolean;
  screenHeight?: number;
}

/**
 * Get speaker color based on character assignment or fallback to default colors
 */
const getSpeakerColor = (speaker: string, customColors?: Record<string, string>): string => {
  // Use custom assigned color if available
  if (customColors && customColors[speaker]) {
    return customColors[speaker];
  }
  
  // Default color assignments for common speakers
  const defaultColors: Record<string, string> = {
    narrator: CI_COLORS.main.blue,
    chef: CI_COLORS.main.orange,
    host: CI_COLORS.main.green,
    guest: CI_COLORS.supporting.yellow1,
    child: CI_COLORS.supporting.pink1,
    teacher: CI_COLORS.main.yellow,
    student: CI_COLORS.supporting.blue1,
    soundeffect: '#FFFFFF',
    music: '#FFFFFF'
  };
  
  return defaultColors[speaker.toLowerCase()] || CI_COLORS.main.blue;
};

/**
 * Calculate font size based on vocal intensity, volume, or emphasis
 */
const getIntonationBasedFontSize = (
  screenHeight: number, 
  vocalIntensity?: 'whisper' | 'normal' | 'yell' | 'shout',
  volume?: number,
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling'
): number => {
  const baseSize = screenHeight * 0.04; // 4% baseline
  const minSize = screenHeight * 0.025; // 2.5% for whispers
  const maxSize = screenHeight * 0.07;  // 7% for yelling/shouting
  
  // Priority 1: Use vocal intensity analysis if available
  if (vocalIntensity) {
    switch (vocalIntensity) {
      case 'whisper':
        return minSize;
      case 'yell':
        return baseSize * 1.4;
      case 'shout':
        return maxSize;
      case 'normal':
      default:
        return baseSize;
    }
  }
  
  // Priority 2: Use manual emphasis from transcript editing
  if (emphasis) {
    switch (emphasis) {
      case 'quiet':
        return minSize;
      case 'loud':
        return baseSize * 1.3;
      case 'yelling':
        return maxSize;
      case 'normal':
      default:
        return baseSize;
    }
  }
  
  // Fallback: Use volume level
  if (volume !== undefined) {
    if (volume <= 30) return minSize + ((volume / 30) * (baseSize - minSize));
    if (volume >= 85) return maxSize;
    return baseSize + (((volume - 30) / 55) * (maxSize - baseSize));
  }
  
  return baseSize;
};

/**
 * Get word-specific font size based on emphasis
 */
const getWordFontSize = (baseSize: number, emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling'): number => {
  if (!emphasis || emphasis === 'normal') return baseSize;
  
  switch (emphasis) {
    case 'loud':
      return baseSize * 1.4; // 40% larger for shouting
    case 'yelling':
      return baseSize * 1.6; // 60% larger for yelling
    case 'quiet':
      return baseSize * 0.7; // 30% smaller for whispering
    default:
      return baseSize;
  }
};

/**
 * Get typography style based on pitch and harmonics
 */
const getPitchBasedStyle = (pitch?: number | 'high' | 'low' | 'normal'): React.CSSProperties => {
  let pitchHz: number;
  
  if (typeof pitch === 'string') {
    // Convert string to approximate Hz
    switch (pitch) {
      case 'high': pitchHz = 220; break;
      case 'low': pitchHz = 100; break;
      case 'normal': 
      default: pitchHz = 180; break;
    }
  } else {
    pitchHz = pitch || 180; // Default to normal range
  }
  
  // Baseline: 160-200 Hz uses Regular 400 weight
  if (pitchHz >= 160 && pitchHz <= 200) {
    return {
      fontWeight: 400,
      fontStretch: 'normal'
    };
  }
  
  // Lower pitch (80-160 Hz): heavier weight, expanded width
  if (pitchHz < 160) {
    const weight = Math.max(500, 700 - ((pitchHz - 80) / 80) * 200); // 500-700 weight
    const stretch = 100 + ((160 - pitchHz) / 80) * 25; // 100-125% width
    
    return {
      fontWeight: weight,
      fontStretch: `${stretch}%`
    };
  }
  
  // Higher pitch (200+ Hz): lighter weight, condensed width
  const weight = Math.max(200, 400 - ((pitchHz - 200) / 50) * 200); // 200-400 weight
  const stretch = Math.max(75, 100 - ((pitchHz - 200) / 50) * 25); // 75-100% width
  
  return {
    fontWeight: weight,
    fontStretch: `${stretch}%`
  };
};

export const CaptionsWithIntention: React.FC<CaptionsWithIntentionProps> = ({
  captions,
  currentTime,
  isVisible = true,
  screenHeight = 1080
}) => {
  const [customSpeakerColors, setCustomSpeakerColors] = useState<Record<string, string>>({});
  const { getIntensityStyles } = useVocalIntensityAnalysis();

  // Load custom character colors from localStorage
  useEffect(() => {
    const savedColors = localStorage.getItem('character-colors');
    if (savedColors) {
      setCustomSpeakerColors(JSON.parse(savedColors));
    }
  }, []);

  // Find active caption based on current time
  const activeCaption = captions.find(caption => 
    currentTime >= caption.startTime && currentTime <= caption.endTime
  );

  // Debug caption rendering
  useEffect(() => {
    if (captions && captions.length > 0) {
      console.log('⏰ CaptionsWithIntention - Current time:', currentTime, 'Active caption found:', !!activeCaption);
      console.log('📊 Available captions count:', captions.length);
      console.log('🔍 Caption time ranges:', captions.slice(0, 3).map(c => ({ 
        start: c.startTime, 
        end: c.endTime, 
        text: c.text.substring(0, 20) + '...' 
      })));
    }
  }, [captions, currentTime, activeCaption]);

  console.log('⏰ CaptionsWithIntention - Current time:', currentTime, 'Active caption found:', !!activeCaption);
  console.log('📊 Available captions count:', captions.length);
  console.log('🔍 Caption time ranges:', captions.slice(0, 3).map(c => ({ 
    start: c.startTime, 
    end: c.endTime, 
    text: c.text.substring(0, 20) + '...' 
  })));
  
  if (activeCaption) {
    console.log('🎯 Active caption details:', {
      startTime: activeCaption.startTime,
      endTime: activeCaption.endTime,
      text: activeCaption.text.substring(0, 30) + '...',
      speaker: activeCaption.speaker
    });
  }

  if (!activeCaption) return null;

  // Enhanced word timing and highlighting logic
  const TIMING_TOLERANCE = 0.05; // 50ms tolerance for precise sync
  const activeWordIndex = activeCaption.words?.findIndex(word => 
    currentTime >= (word.startTime - TIMING_TOLERANCE) && 
    currentTime <= (word.endTime + TIMING_TOLERANCE)
  ) ?? -1;
  const activeWord = activeWordIndex >= 0 ? activeCaption.words?.[activeWordIndex] : undefined;

  const speakerColor = getSpeakerColor(activeCaption.speaker, customSpeakerColors);
  const volume = (activeCaption as any)?.volume || 50;
  const baseFontSize = getIntonationBasedFontSize(
    screenHeight, 
    activeCaption.vocal_intensity, 
    volume, 
    activeCaption.words?.[0]?.emphasis
  );
  const pitchStyle = getPitchBasedStyle(activeWord?.pitch || activeCaption.pitch);
  
  // Derive numeric pitch and an 'enthusiastic' heuristic
  const numericPitch = (() => {
    const p = (activeWord?.pitch || activeCaption.pitch) as any;
    if (typeof p === 'number') return p;
    if (p === 'high') return 220;
    if (p === 'low') return 100;
    return 180;
  })();
  
  // Apply vocal intensity styling if available
  const intensityStyles = activeCaption.vocal_intensity ? 
    getIntensityStyles(activeCaption.vocal_intensity, activeCaption.intensity_confidence) : {};
  
  const isEnthusiastic = (!activeCaption.vocal_intensity || activeCaption.vocal_intensity === 'normal') && numericPitch >= 210 && volume < 80;
  const isLoudBurst = volume >= 85;
  const isSoundEffect = (activeCaption as any)?.type === 'soundeffect';
  const isMusic = (activeCaption as any)?.type === 'music';

  return (
    <div 
      className="absolute bottom-20 left-0 right-0 flex items-center justify-center pointer-events-none px-4 z-40"
      style={{ fontFamily: 'Roboto Flex, system-ui, sans-serif' }}
    >
      {/* Captions Container Box */}
      <div 
        className={`
          relative max-w-3xl w-full text-center
          ${isLoudBurst ? '' : 'bg-black/80'} 
          ${isLoudBurst ? '' : 'rounded-md'} 
          ${isLoudBurst ? '' : 'px-2 py-1'}
          ${isLoudBurst ? '' : 'mx-2'}
        `}
        style={{
          // For loud bursts, captions break out of the box
          ...(isLoudBurst && {
            background: 'none',
            padding: 0,
            margin: 0,
          })
        }}
      >
        {/* Speaker name label - only show for dialogue, not sound effects or music */}
        {!isSoundEffect && !isMusic && activeCaption.speaker && (
          <div 
            className="text-xs font-medium mb-1 text-center"
            style={{ 
              color: activeCaption.speakerColor || speakerColor,
              fontSize: `${Math.max(10, baseFontSize * 0.4)}px` // Smaller - 40% of main text
            }}
          >
            {activeCaption.speaker.toUpperCase()}
          </div>
        )}
        
        {/* Single caption display with proper color synchronization */}
        <div
          className="relative text-center leading-tight break-words px-1"
          style={{
            fontSize: `${Math.min(baseFontSize, screenHeight * 0.06)}px`, // Increased cap for loud words
            ...pitchStyle,
            ...intensityStyles, // Apply vocal intensity styling
            ...(isEnthusiastic ? { fontWeight: 500, letterSpacing: '0.02em' } : {}),
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto',
            maxWidth: '100%',
            contain: 'layout paint'
          }}
        >
          {/* Sound effects and music formatting */}
          {isSoundEffect ? (
            <span className="text-white opacity-90">
              [{activeCaption.text}]
            </span>
          ) : isMusic ? (
            <span className="text-white">
              ♪ {activeCaption.text} ♪
            </span>
          ) : (
            <span 
              className={(activeCaption as any)?.isOffCamera ? 'italic' : ''}
              style={{ fontStyle: (activeCaption as any)?.isOffCamera ? 'italic' : 'normal' }}
            >
              {activeCaption.words && activeCaption.words.length > 0 ? (
                 activeCaption.words.map((word, index) => {
                   const wordPitchStyle = getPitchBasedStyle(word.pitch);
                   const wordFontSize = getIntonationBasedFontSize(
                     screenHeight, 
                     activeCaption.vocal_intensity, 
                     volume, 
                     word.emphasis
                   );
                   
                   // Progressive word highlighting states
                   const WORD_TOLERANCE = 0.02; // 20ms precision for better sync
                   const isWordActive = currentTime >= (word.startTime - WORD_TOLERANCE) && 
                                       currentTime <= (word.endTime + WORD_TOLERANCE);
                   const wordHasBeenSpoken = currentTime >= (word.endTime - WORD_TOLERANCE);
                   const isUpcoming = currentTime < (word.startTime - WORD_TOLERANCE);
                   
                   // Calculate progressive highlight - words fade from gray to full color as spoken
                   let wordColor: string;
                   let wordOpacity = 1;
                   
                   if (wordHasBeenSpoken) {
                     // Fully spoken: full speaker color with slight fade
                     wordColor = activeCaption.speakerColor || speakerColor;
                     wordOpacity = 0.85;
                   } else if (isWordActive) {
                     // Currently speaking: bright full color with glow
                     wordColor = activeCaption.speakerColor || speakerColor;
                     wordOpacity = 1;
                   } else if (isUpcoming) {
                     // Not yet spoken: dim gray for read-ahead
                     wordColor = 'hsl(var(--muted-foreground))';
                     wordOpacity = 0.6;
                   } else {
                     // Default fallback
                     wordColor = CI_COLORS.readahead;
                     wordOpacity = 0.7;
                   }
                   
                   // Enhanced vocal intensity styling
                   const getIntensityWordStyle = (): React.CSSProperties => {
                     const baseStyle: React.CSSProperties = {
                       transition: 'all 0.15s ease-out',
                       willChange: 'transform, opacity, color'
                     };
                     
                     if (activeCaption.vocal_intensity) {
                       switch (activeCaption.vocal_intensity) {
                         case 'whisper':
                           return {
                             ...baseStyle,
                             fontSize: `${wordFontSize * 0.8}px`,
                             fontWeight: 300,
                             opacity: wordOpacity * 0.8,
                             fontStyle: 'italic',
                             letterSpacing: '-0.02em'
                           };
                         case 'yell':
                           return {
                             ...baseStyle,
                             fontSize: `${wordFontSize * 1.25}px`,
                             fontWeight: 600,
                             letterSpacing: '0.05em',
                             textShadow: isWordActive ? 
                               `0 0 8px ${wordColor}40, 0 2px 4px rgba(0,0,0,0.3)` : 
                               '0 1px 2px rgba(0,0,0,0.2)'
                           };
                         case 'shout':
                           return {
                             ...baseStyle,
                             fontSize: `${wordFontSize * 1.5}px`,
                             fontWeight: 700,
                             textTransform: 'uppercase' as const,
                             letterSpacing: '0.1em',
                             textShadow: isWordActive ? 
                               `0 0 12px ${wordColor}60, 0 0 6px ${wordColor}40, 0 2px 6px rgba(0,0,0,0.4)` : 
                               '0 2px 4px rgba(0,0,0,0.3)'
                           };
                         default:
                           return baseStyle;
                       }
                     }
                     
                     // Fallback to manual emphasis
                     if (word.emphasis) {
                       switch (word.emphasis) {
                         case 'quiet':
                           return { ...baseStyle, fontSize: `${wordFontSize * 0.8}px`, fontWeight: 300, fontStyle: 'italic' };
                         case 'loud':
                           return { ...baseStyle, fontSize: `${wordFontSize * 1.2}px`, fontWeight: 600 };
                         case 'yelling':
                           return { 
                             ...baseStyle, 
                             fontSize: `${wordFontSize * 1.4}px`, 
                             fontWeight: 700, 
                             textTransform: 'uppercase' as const 
                           };
                         default:
                           return baseStyle;
                       }
                     }
                     
                     return baseStyle;
                   };
                   
                    return (
                      <span
                        key={`${activeCaption.startTime}-${index}`}
                        className="inline-block"
                        style={{
                         color: wordColor,
                         opacity: wordOpacity,
                         marginRight: '0.25em',
                         fontSize: `${wordFontSize}px`,
                         ...wordPitchStyle,
                         ...getIntensityWordStyle(),
                         // Active word gets subtle highlight pulse
                         ...(isWordActive && {
                           textShadow: `0 0 8px ${wordColor}30`,
                           transform: 'scale(1.02)',
                         })
                       }}
                      >
                        {word.text}
                      </span>
                    );
                 })
              ) : (
                // Fallback: show full text if no word-level timing
                <span style={{ color: activeCaption.speakerColor || speakerColor }}>
                  {activeCaption.text}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};