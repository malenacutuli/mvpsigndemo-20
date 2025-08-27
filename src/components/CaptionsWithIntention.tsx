import React, { useState, useEffect, useRef } from 'react';

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
  emphasis?: 'loud' | 'quiet' | 'normal';
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
 * Calculate font size based on volume level (3% to 12% of screen height)
 */
const getVolumeBasedFontSize = (volume: number, screenHeight: number): number => {
  // Volume range: 0-100 dB, Font size range: 3%-12% of screen height
  const minSize = screenHeight * 0.03; // 3% - whisper
  const maxSize = screenHeight * 0.12; // 12% - yelling
  const normalSize = screenHeight * 0.05; // 5% - baseline (normal speaking)
  
  // Map volume to font size
  if (volume <= 30) {
    // Quiet range (0-30 dB) → 3%-5%
    return minSize + ((volume / 30) * (normalSize - minSize));
  } else if (volume >= 85) {
    // Loud range (85+ dB) → 12%
    return maxSize;
  } else {
    // Normal range (30-85 dB) → 5%-12%
    return normalSize + (((volume - 30) / 55) * (maxSize - normalSize));
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

  // Load custom character colors from localStorage
  useEffect(() => {
    const savedColors = localStorage.getItem('character-colors');
    if (savedColors) {
      setCustomSpeakerColors(JSON.parse(savedColors));
    }
  }, []);

  if (!isVisible || captions.length === 0) return null;

  // Find active caption based on current time
  const activeCaption = captions.find(caption => 
    currentTime >= caption.startTime && currentTime <= caption.endTime
  );

  if (!activeCaption) return null;

  // Find currently speaking word
  const activeWord = activeCaption.words?.find(word => 
    currentTime >= word.startTime && currentTime <= word.endTime
  );

  const speakerColor = getSpeakerColor(activeCaption.speaker, customSpeakerColors);
  const volume = (activeCaption as any)?.volume || 50;
  const fontSize = getVolumeBasedFontSize(volume, screenHeight);
  const pitchStyle = getPitchBasedStyle(activeWord?.pitch || activeCaption.pitch);
  
  const isLoudBurst = volume >= 85;
  const isSoundEffect = (activeCaption as any)?.type === 'soundeffect';
  const isMusic = (activeCaption as any)?.type === 'music';

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 h-1/5 flex items-end justify-center p-4 pointer-events-none"
      style={{ fontFamily: 'Roboto Flex, system-ui, sans-serif' }}
    >
      {/* Captions Container Box */}
      <div 
        className={`
          relative max-w-4xl w-full
          ${isLoudBurst ? '' : 'bg-black/90'} 
          ${isLoudBurst ? '' : 'rounded-lg'} 
          ${isLoudBurst ? '' : 'px-6 py-4'}
          ${isLoudBurst ? '' : 'mx-4'}
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
        {/* Single caption display with proper color synchronization */}
        <div
          className="relative text-center leading-relaxed"
          style={{
            fontSize: `${fontSize}px`,
            ...pitchStyle,
          }}
        >
          {/* Sound effects and music formatting */}
          {isSoundEffect ? (
            <span className="text-white animate-pulse">
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
                  const isCurrentWord = activeWord && word.startTime === activeWord.startTime;
                  const hasBeenSpoken = currentTime >= word.endTime;
                  const wordPitchStyle = getPitchBasedStyle(word.pitch);
                  
                  return (
                    <span
                      key={index}
                      className={`
                        inline-block transition-all duration-150 ease-out mr-1
                        ${isCurrentWord ? 'animate-pulse' : ''}
                      `}
                      style={{
                        // Read-ahead: show all words in white at 90% opacity
                        // Color sync: change to speaker color as words are spoken
                        color: hasBeenSpoken || isCurrentWord ? speakerColor : CI_COLORS.readahead,
                        transform: isCurrentWord ? 'scale(1.15)' : 'scale(1)', // 15% pop effect
                        transformOrigin: 'center',
                        ...wordPitchStyle,
                        // Syllable emphasis for multi-syllable words
                        ...(word.syllables && isCurrentWord && {
                          animation: 'syllable-emphasis 0.3s ease-in-out',
                        })
                      }}
                    >
                      {word.text}
                    </span>
                  );
                })
              ) : (
                // Fallback: show full text if no word-level timing
                <span style={{ color: speakerColor }}>
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