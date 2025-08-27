import React, { useState, useEffect, useMemo } from 'react';
import { spanishElmoCaptions } from '../data/spanishElmoCaptions';

export interface CaptionSegment {
  text: string;
  speaker: 'chef' | 'narrator' | 'child' | 'teacher' | 'hero' | 'villain' | 'supporting1' | 'supporting2' | 'supporting3' | 'minor1' | 'minor2' | 'offcamera' | 'soundeffect' | 'music' | 'Elmo' | 'Smarty';
  startTime: number;
  endTime: number;
  words: Array<{
    text: string;
    startTime: number;
    endTime: number;
    emphasis?: 'loud' | 'quiet' | 'normal';
    pitch?: 'high' | 'low' | 'normal';
    syllables?: Array<{
      text: string;
      startTime: number;
      endTime: number;
    }>;
  }>;
  type?: 'dialogue' | 'soundeffect' | 'music';
  volume?: number; // 0-100, determines font size scaling
  isOffCamera?: boolean;
}

interface CaptionsWithIntentionProps {
  currentTime: number;
  isPlaying: boolean;
  contentType?: 'recipe' | 'education';
  captionsOverride?: CaptionSegment[];
}

// Captions with Intention color system
const CI_COLORS = {
  // Main Character Colors (6 primary colors)
  main: {
    hero: '#E5E517',      // CI Main Yellow
    villain: '#E517E5',    // CI Main Pink (opposite of hero)
    character2: '#17E5E5', // CI Main Blue
    character3: '#E51717', // CI Main Red
    character4: '#E58017', // CI Main Orange
    character5: '#17E517', // CI Main Green
  },
  // Supporting Character Colors (positioned between main colors)
  supporting: {
    supporting1: '#E85C2E', // CI Support Orange
    supporting2: '#47C2EB', // CI Support Blue I
    supporting3: '#EBC247', // CI Support Yellow
    supporting4: '#5E82ED', // CI Support Blue II
    supporting5: '#C2EB47', // CI Support Green I
    supporting6: '#8C6BED', // CI Support Purple I
    supporting7: '#82ED5E', // CI Support Green II
    supporting8: '#CC6BED', // CI Support Purple II
    supporting9: '#47EB70', // CI Support Green III
    supporting10: '#EB47C2', // CI Support Pink I
    supporting11: '#5EEDC9', // CI Support Cyan
    supporting12: '#ED5E82', // CI Support Pink II
  },
  // Minor Character Colors (pastel tones, 30% saturation, 90% brightness)
  minor: {
    minor1: 'hsl(0, 30%, 90%)',     // Soft red
    minor2: 'hsl(240, 30%, 90%)',   // Soft blue
    minor3: 'hsl(120, 30%, 90%)',   // Soft green
    minor4: 'hsl(60, 30%, 90%)',    // Soft yellow
    minor5: 'hsl(300, 30%, 90%)',   // Soft magenta
    minor6: 'hsl(180, 30%, 90%)',   // Soft cyan
  },
  // System colors
  soundeffect: '#FFFFFF',  // White for sound effects
  music: '#FFFFFF',        // White for music descriptions
  readahead: 'rgba(255, 255, 255, 0.9)', // 90% opacity white for read-ahead
};

// Map speaker types to colors
const getSpeakerColor = (speaker: CaptionSegment['speaker']): string => {
  if (speaker in CI_COLORS.main) return CI_COLORS.main[speaker as keyof typeof CI_COLORS.main];
  if (speaker in CI_COLORS.supporting) return CI_COLORS.supporting[speaker as keyof typeof CI_COLORS.supporting];
  if (speaker in CI_COLORS.minor) return CI_COLORS.minor[speaker as keyof typeof CI_COLORS.minor];
  
  // Default assignments
  switch (speaker) {
    case 'chef': return CI_COLORS.main.hero;
    case 'narrator': return CI_COLORS.main.character2;
    case 'child': return CI_COLORS.supporting.supporting1;
    case 'teacher': return CI_COLORS.main.character3;
    case 'Elmo': return CI_COLORS.main.character4;
    case 'Smarty': return CI_COLORS.supporting.supporting2;
    case 'soundeffect': return CI_COLORS.soundeffect;
    case 'music': return CI_COLORS.music;
    default: return CI_COLORS.minor.minor1;
  }
};

// Calculate font size based on volume (3% to 12% of screen height)
const getVolumeBasedFontSize = (volume: number = 50, screenHeight: number): number => {
  const minSize = screenHeight * 0.03; // 3% for whispers
  const maxSize = screenHeight * 0.12; // 12% for shouting
  const baseSize = screenHeight * 0.05; // 5% for normal volume
  
  if (volume <= 30) return minSize;
  if (volume >= 80) return maxSize;
  
  // Linear interpolation between min and max
  const normalizedVolume = (volume - 30) / 50; // Normalize to 0-1
  return baseSize + (normalizedVolume * (maxSize - baseSize) * 0.5);
};

// Calculate font weight and width based on pitch
const getPitchBasedStyle = (pitch: 'high' | 'low' | 'normal' = 'normal') => {
  switch (pitch) {
    case 'low':
      return {
        fontWeight: '700', // Heavier weight for low pitch
        fontStretch: 'expanded', // Wider for fuller sound
      };
    case 'high':
      return {
        fontWeight: '300', // Lighter weight for high pitch
        fontStretch: 'condensed', // Narrower for thinner sound
      };
    default:
      return {
        fontWeight: '400', // Regular weight for normal pitch
        fontStretch: 'normal',
      };
  }
};

// Demo captions for realistic pasta recipe content with Gordon Ramsay-style passion
const recipeCaptions: CaptionSegment[] = [
  {
    text: "It can be easily undercooked or overcooked.",
    speaker: "chef",
    startTime: 0.08,
    endTime: 2.36,
    volume: 50,
    words: [
      {
        text: "It",
        startTime: 0.08,
        endTime: 0.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "can",
        startTime: 0.2,
        endTime: 0.36,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "be",
        startTime: 0.36,
        endTime: 0.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "easily",
        startTime: 0.48,
        endTime: 0.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "undercooked",
        startTime: 0.8,
        endTime: 1.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "or",
        startTime: 1.48,
        endTime: 1.64,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "overcooked.",
        startTime: 1.64,
        endTime: 2.36,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Here's how to do it properly.",
    speaker: "chef",
    startTime: 2.36,
    endTime: 3.68,
    volume: 50,
    words: [
      {
        text: "Here's",
        startTime: 2.36,
        endTime: 2.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "how",
        startTime: 2.72,
        endTime: 2.84,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "to",
        startTime: 2.84,
        endTime: 2.96,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "do",
        startTime: 2.96,
        endTime: 3.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 3.04,
        endTime: 3.16,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "properly.",
        startTime: 3.16,
        endTime: 3.68,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "First, water all in nice large pan",
    speaker: "chef",
    startTime: 3.92,
    endTime: 6.36,
    volume: 50,
    words: [
      {
        text: "First,",
        startTime: 3.92,
        endTime: 4.32,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "water",
        startTime: 4.32,
        endTime: 4.68,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "all",
        startTime: 4.68,
        endTime: 4.92,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "in",
        startTime: 4.92,
        endTime: 5.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "nice",
        startTime: 5.44,
        endTime: 5.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "large",
        startTime: 5.8,
        endTime: 6.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pan",
        startTime: 6.04,
        endTime: 6.36,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "to make sure the pasta's got sufficient room",
    speaker: "chef",
    startTime: 6.36,
    endTime: 8.32,
    volume: 50,
    words: [
      {
        text: "to",
        startTime: 6.36,
        endTime: 6.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "make",
        startTime: 6.6,
        endTime: 6.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "sure",
        startTime: 6.8,
        endTime: 7.0,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 7.0,
        endTime: 7.16,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta's",
        startTime: 7.16,
        endTime: 7.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "got",
        startTime: 7.6,
        endTime: 7.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "sufficient",
        startTime: 7.72,
        endTime: 8.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "room",
        startTime: 8.04,
        endTime: 8.32,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "to cook evenly.",
    speaker: "chef",
    startTime: 8.32,
    endTime: 9.36,
    volume: 50,
    words: [
      {
        text: "to",
        startTime: 8.32,
        endTime: 8.52,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "cook",
        startTime: 8.52,
        endTime: 8.76,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "evenly.",
        startTime: 8.76,
        endTime: 9.36,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Nicely seasoned. Absolutely crucial.",
    speaker: "chef",
    startTime: 9.6,
    endTime: 11.84,
    volume: 80,
    words: [
      {
        text: "Nicely",
        startTime: 9.6,
        endTime: 10.12,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "seasoned.",
        startTime: 10.12,
        endTime: 10.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "Absolutely",
        startTime: 10.72,
        endTime: 11.36,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "crucial.",
        startTime: 11.36,
        endTime: 11.84,
        emphasis: "loud",
        pitch: "high"
      }
    ]
  },
  {
    text: "Olive oil in that stops the pasta",
    speaker: "chef",
    startTime: 12.16,
    endTime: 14.8,
    volume: 50,
    words: [
      {
        text: "Olive",
        startTime: 12.16,
        endTime: 12.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "oil",
        startTime: 12.6,
        endTime: 12.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "in",
        startTime: 12.8,
        endTime: 13.12,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "that",
        startTime: 13.52,
        endTime: 13.84,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "stops",
        startTime: 13.84,
        endTime: 14.16,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 14.16,
        endTime: 14.28,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta",
        startTime: 14.28,
        endTime: 14.8,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "from sticking together.",
    speaker: "chef",
    startTime: 14.8,
    endTime: 15.68,
    volume: 50,
    words: [
      {
        text: "from",
        startTime: 14.8,
        endTime: 15.0,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "sticking",
        startTime: 15.0,
        endTime: 15.36,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "together.",
        startTime: 15.36,
        endTime: 15.68,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Bring it up to the boil.",
    speaker: "chef",
    startTime: 16.079,
    endTime: 17.12,
    volume: 50,
    words: [
      {
        text: "Bring",
        startTime: 16.079,
        endTime: 16.36,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 16.36,
        endTime: 16.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "up",
        startTime: 16.48,
        endTime: 16.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "to",
        startTime: 16.6,
        endTime: 16.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 16.72,
        endTime: 16.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "boil.",
        startTime: 16.8,
        endTime: 17.12,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "That's the rolling boil.",
    speaker: "chef",
    startTime: 18.32,
    endTime: 19.44,
    volume: 80,
    words: [
      {
        text: "That's",
        startTime: 18.32,
        endTime: 18.64,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 18.64,
        endTime: 18.76,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "rolling",
        startTime: 18.76,
        endTime: 19.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "boil.",
        startTime: 19.04,
        endTime: 19.44,
        emphasis: "loud",
        pitch: "high"
      }
    ]
  },
  {
    text: "The secret there.",
    speaker: "chef",
    startTime: 19.44,
    endTime: 20.4,
    volume: 50,
    words: [
      {
        text: "The",
        startTime: 19.44,
        endTime: 19.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "secret",
        startTime: 19.72,
        endTime: 20.0,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "there.",
        startTime: 20.0,
        endTime: 20.4,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "It stops the pasta from sticking together.",
    speaker: "chef",
    startTime: 20.72,
    endTime: 22.36,
    volume: 50,
    words: [
      {
        text: "It",
        startTime: 20.72,
        endTime: 21.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "stops",
        startTime: 21.04,
        endTime: 21.28,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 21.28,
        endTime: 21.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta",
        startTime: 21.4,
        endTime: 21.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "from",
        startTime: 21.8,
        endTime: 21.92,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "sticking",
        startTime: 21.92,
        endTime: 22.16,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "together.",
        startTime: 22.16,
        endTime: 22.36,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "And it gently rolls it around.",
    speaker: "chef",
    startTime: 22.36,
    endTime: 23.68,
    volume: 40,
    words: [
      {
        text: "And",
        startTime: 22.36,
        endTime: 22.56,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 22.56,
        endTime: 22.68,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "gently",
        startTime: 22.68,
        endTime: 23.0,
        emphasis: "quiet",
        pitch: "low"
      },
      {
        text: "rolls",
        startTime: 23.0,
        endTime: 23.28,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 23.28,
        endTime: 23.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "around.",
        startTime: 23.4,
        endTime: 23.68,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Now, this is angel pasta.",
    speaker: "chef",
    startTime: 24.08,
    endTime: 25.76,
    volume: 50,
    words: [
      {
        text: "Now,",
        startTime: 24.08,
        endTime: 24.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "this",
        startTime: 24.4,
        endTime: 24.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "is",
        startTime: 24.6,
        endTime: 24.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "angel",
        startTime: 24.8,
        endTime: 25.28,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta.",
        startTime: 25.28,
        endTime: 25.76,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Nice, thin pasta.",
    speaker: "chef",
    startTime: 25.76,
    endTime: 27.56,
    volume: 50,
    words: [
      {
        text: "Nice,",
        startTime: 25.76,
        endTime: 26.08,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "thin",
        startTime: 26.08,
        endTime: 26.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta.",
        startTime: 27.04,
        endTime: 27.56,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Takes three and a half",
    speaker: "chef",
    startTime: 27.56,
    endTime: 28.2,
    volume: 50,
    words: [
      {
        text: "Takes",
        startTime: 27.56,
        endTime: 27.76,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "three",
        startTime: 27.76,
        endTime: 27.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "and",
        startTime: 27.88,
        endTime: 28.0,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 28.0,
        endTime: 28.08,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "half",
        startTime: 28.08,
        endTime: 28.2,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "to four minutes.",
    speaker: "chef",
    startTime: 28.2,
    endTime: 28.88,
    volume: 50,
    words: [
      {
        text: "to",
        startTime: 28.2,
        endTime: 28.32,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "four",
        startTime: 28.32,
        endTime: 28.44,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "minutes.",
        startTime: 28.44,
        endTime: 28.88,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "So into the pan as it hits the.",
    speaker: "chef",
    startTime: 29.2,
    endTime: 31.52,
    volume: 50,
    words: [
      {
        text: "So",
        startTime: 29.2,
        endTime: 29.52,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "into",
        startTime: 29.52,
        endTime: 29.76,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 29.76,
        endTime: 29.96,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pan",
        startTime: 29.96,
        endTime: 30.24,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "as",
        startTime: 30.56,
        endTime: 30.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 30.88,
        endTime: 31.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "hits",
        startTime: 31.04,
        endTime: 31.24,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the.",
        startTime: 31.24,
        endTime: 31.52,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "It melts. And then you turn it round.",
    speaker: "chef",
    startTime: 32.06,
    endTime: 34.06,
    volume: 50,
    words: [
      {
        text: "It",
        startTime: 32.06,
        endTime: 32.18,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "melts.",
        startTime: 32.18,
        endTime: 32.58,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "And",
        startTime: 32.58,
        endTime: 32.9,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "then",
        startTime: 32.9,
        endTime: 33.18,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "you",
        startTime: 33.18,
        endTime: 33.38,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "turn",
        startTime: 33.38,
        endTime: 33.54,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 33.54,
        endTime: 33.74,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "round.",
        startTime: 33.74,
        endTime: 34.06,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Tongs. As that starts to melt,",
    speaker: "chef",
    startTime: 34.38,
    endTime: 36.46,
    volume: 50,
    words: [
      {
        text: "Tongs.",
        startTime: 34.38,
        endTime: 35.02,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "As",
        startTime: 35.26,
        endTime: 35.54,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "that",
        startTime: 35.54,
        endTime: 35.7,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "starts",
        startTime: 35.7,
        endTime: 35.98,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "to",
        startTime: 35.98,
        endTime: 36.1,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "melt,",
        startTime: 36.1,
        endTime: 36.46,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "gently twist that into the pan.",
    speaker: "chef",
    startTime: 36.62,
    endTime: 39.02,
    volume: 40,
    words: [
      {
        text: "gently",
        startTime: 36.62,
        endTime: 37.26,
        emphasis: "quiet",
        pitch: "low"
      },
      {
        text: "twist",
        startTime: 37.5,
        endTime: 37.9,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "that",
        startTime: 37.9,
        endTime: 38.22,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "into",
        startTime: 38.3,
        endTime: 38.62,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 38.62,
        endTime: 38.78,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pan.",
        startTime: 38.78,
        endTime: 39.02,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Bring it back up to the boil.",
    speaker: "chef",
    startTime: 39.18,
    endTime: 40.62,
    volume: 50,
    words: [
      {
        text: "Bring",
        startTime: 39.18,
        endTime: 39.46,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 39.46,
        endTime: 39.66,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "back",
        startTime: 39.66,
        endTime: 39.9,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "up",
        startTime: 39.9,
        endTime: 40.1,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "to",
        startTime: 40.1,
        endTime: 40.22,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 40.22,
        endTime: 40.3,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "boil.",
        startTime: 40.3,
        endTime: 40.62,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "If you're bad at timing,",
    speaker: "chef",
    startTime: 40.86,
    endTime: 42.18,
    volume: 50,
    words: [
      {
        text: "If",
        startTime: 40.86,
        endTime: 41.14,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "you're",
        startTime: 41.14,
        endTime: 41.34,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "bad",
        startTime: 41.34,
        endTime: 41.5,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "at",
        startTime: 41.5,
        endTime: 41.7,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "timing,",
        startTime: 41.7,
        endTime: 42.18,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "then set a timer.",
    speaker: "chef",
    startTime: 42.18,
    endTime: 43.5,
    volume: 50,
    words: [
      {
        text: "then",
        startTime: 42.18,
        endTime: 42.46,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "set",
        startTime: 42.46,
        endTime: 42.7,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 42.7,
        endTime: 42.94,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "timer.",
        startTime: 42.94,
        endTime: 43.5,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Beautiful. To test it.",
    speaker: "chef",
    startTime: 44.38,
    endTime: 46.3,
    volume: 80,
    words: [
      {
        text: "Beautiful.",
        startTime: 44.38,
        endTime: 45.02,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "To",
        startTime: 45.42,
        endTime: 45.74,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "test",
        startTime: 45.74,
        endTime: 45.98,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it.",
        startTime: 45.98,
        endTime: 46.3,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Lift a little strand.",
    speaker: "chef",
    startTime: 46.7,
    endTime: 47.74,
    volume: 40,
    words: [
      {
        text: "Lift",
        startTime: 46.7,
        endTime: 47.06,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 47.06,
        endTime: 47.18,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "little",
        startTime: 47.18,
        endTime: 47.34,
        emphasis: "quiet",
        pitch: "low"
      },
      {
        text: "strand.",
        startTime: 47.34,
        endTime: 47.74,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "You can actually feel it with your fingers.",
    speaker: "chef",
    startTime: 48.46,
    endTime: 49.78,
    volume: 50,
    words: [
      {
        text: "You",
        startTime: 48.46,
        endTime: 48.7,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "can",
        startTime: 48.7,
        endTime: 48.82,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "actually",
        startTime: 48.82,
        endTime: 48.98,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "feel",
        startTime: 48.98,
        endTime: 49.14,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 49.14,
        endTime: 49.26,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "with",
        startTime: 49.26,
        endTime: 49.38,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "your",
        startTime: 49.38,
        endTime: 49.5,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "fingers.",
        startTime: 49.5,
        endTime: 49.78,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "It's still nice and firm,",
    speaker: "chef",
    startTime: 49.78,
    endTime: 50.78,
    volume: 50,
    words: [
      {
        text: "It's",
        startTime: 49.78,
        endTime: 49.98,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "still",
        startTime: 49.98,
        endTime: 50.1,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "nice",
        startTime: 50.1,
        endTime: 50.3,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "and",
        startTime: 50.3,
        endTime: 50.42,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "firm,",
        startTime: 50.42,
        endTime: 50.78,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "al dente. Not a bite,",
    speaker: "chef",
    startTime: 52.54,
    endTime: 54.14,
    volume: 80,
    words: [
      {
        text: "al",
        startTime: 52.54,
        endTime: 52.82,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "dente.",
        startTime: 52.82,
        endTime: 53.26,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "Not",
        startTime: 53.26,
        endTime: 53.54,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 53.54,
        endTime: 53.7,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "bite,",
        startTime: 53.7,
        endTime: 54.14,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "not a strong bite,",
    speaker: "chef",
    startTime: 54.14,
    endTime: 55.02,
    volume: 50,
    words: [
      {
        text: "not",
        startTime: 54.14,
        endTime: 54.42,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 54.42,
        endTime: 54.54,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "strong",
        startTime: 54.54,
        endTime: 54.7,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "bite,",
        startTime: 54.7,
        endTime: 55.02,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "but just really nice and firm inside.",
    speaker: "chef",
    startTime: 55.02,
    endTime: 56.86,
    volume: 50,
    words: [
      {
        text: "but",
        startTime: 55.02,
        endTime: 55.22,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "just",
        startTime: 55.22,
        endTime: 55.42,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "really",
        startTime: 55.42,
        endTime: 55.62,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "nice",
        startTime: 55.62,
        endTime: 55.9,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "and",
        startTime: 55.9,
        endTime: 56.1,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "firm",
        startTime: 56.1,
        endTime: 56.38,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "inside.",
        startTime: 56.38,
        endTime: 56.86,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Definitely not crunchy.",
    speaker: "chef",
    startTime: 57.18,
    endTime: 58.3,
    volume: 80,
    words: [
      {
        text: "Definitely",
        startTime: 57.18,
        endTime: 57.62,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "not",
        startTime: 57.62,
        endTime: 57.78,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "crunchy.",
        startTime: 57.78,
        endTime: 58.3,
        emphasis: "loud",
        pitch: "high"
      }
    ]
  },
  {
    text: "And then into a colander,",
    speaker: "chef",
    startTime: 58.54,
    endTime: 60.62,
    volume: 50,
    words: [
      {
        text: "And",
        startTime: 58.54,
        endTime: 58.86,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "then",
        startTime: 58.86,
        endTime: 59.18,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "into",
        startTime: 59.58,
        endTime: 59.9,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 59.9,
        endTime: 60.06,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "colander,",
        startTime: 60.06,
        endTime: 60.62,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "drain the pasta in a",
    speaker: "chef",
    startTime: 60.78,
    endTime: 64.48,
    volume: 50,
    words: [
      {
        text: "drain",
        startTime: 60.78,
        endTime: 61.26,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 61.26,
        endTime: 61.46,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta",
        startTime: 61.46,
        endTime: 62.06,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "in",
        startTime: 62.94,
        endTime: 63.34,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 64.36,
        endTime: 64.48,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "light seasoning. Salt and pepper,",
    speaker: "chef",
    startTime: 64.48,
    endTime: 67.64,
    volume: 40,
    words: [
      {
        text: "light",
        startTime: 64.48,
        endTime: 64.72,
        emphasis: "quiet",
        pitch: "low"
      },
      {
        text: "seasoning.",
        startTime: 64.72,
        endTime: 65.32,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "Salt",
        startTime: 65.72,
        endTime: 66.36,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "and",
        startTime: 66.92,
        endTime: 67.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pepper,",
        startTime: 67.2,
        endTime: 67.64,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "a tablespoon of olive oil.",
    speaker: "chef",
    startTime: 68.76,
    endTime: 71.48,
    volume: 50,
    words: [
      {
        text: "a",
        startTime: 68.76,
        endTime: 69.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "tablespoon",
        startTime: 69.04,
        endTime: 69.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "of",
        startTime: 70.6,
        endTime: 70.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "olive",
        startTime: 70.88,
        endTime: 71.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "oil.",
        startTime: 71.2,
        endTime: 71.48,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Mix that through.",
    speaker: "chef",
    startTime: 72.28,
    endTime: 73.16,
    volume: 50,
    words: [
      {
        text: "Mix",
        startTime: 72.28,
        endTime: 72.68,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "that",
        startTime: 72.68,
        endTime: 72.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "through.",
        startTime: 72.88,
        endTime: 73.16,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "That stops it from sticking together.",
    speaker: "chef",
    startTime: 74.12,
    endTime: 75.48,
    volume: 50,
    words: [
      {
        text: "That",
        startTime: 74.12,
        endTime: 74.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "stops",
        startTime: 74.4,
        endTime: 74.68,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 74.68,
        endTime: 74.76,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "from",
        startTime: 74.76,
        endTime: 74.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "sticking",
        startTime: 74.88,
        endTime: 75.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "together.",
        startTime: 75.2,
        endTime: 75.48,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "And look. There you go.",
    speaker: "chef",
    startTime: 76.04,
    endTime: 77.72,
    volume: 50,
    words: [
      {
        text: "And",
        startTime: 76.04,
        endTime: 76.32,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "look.",
        startTime: 76.32,
        endTime: 76.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "There",
        startTime: 77.08,
        endTime: 77.36,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "you",
        startTime: 77.36,
        endTime: 77.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "go.",
        startTime: 77.48,
        endTime: 77.72,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Beautiful. Pasta al dente.",
    speaker: "chef",
    startTime: 77.72,
    endTime: 79.32,
    volume: 80,
    words: [
      {
        text: "Beautiful.",
        startTime: 77.72,
        endTime: 78.2,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "Pasta",
        startTime: 78.2,
        endTime: 78.68,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "al",
        startTime: 78.68,
        endTime: 78.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "dente.",
        startTime: 78.88,
        endTime: 79.32,
        emphasis: "loud",
        pitch: "high"
      }
    ]
  },
  {
    text: "Cooked perfectly. Just as those carrots start going nice",
    speaker: "chef",
    startTime: 80.68,
    endTime: 83.56,
    volume: 50,
    words: [
      {
        text: "Cooked",
        startTime: 80.68,
        endTime: 81.12,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "perfectly.",
        startTime: 81.12,
        endTime: 81.64,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "Just",
        startTime: 81.88,
        endTime: 82.24,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "as",
        startTime: 82.24,
        endTime: 82.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "those",
        startTime: 82.48,
        endTime: 82.64,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "carrots",
        startTime: 82.64,
        endTime: 82.96,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "start",
        startTime: 82.96,
        endTime: 83.12,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "going",
        startTime: 83.12,
        endTime: 83.32,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "nice",
        startTime: 83.32,
        endTime: 83.56,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "and soft, don't overcook them.",
    speaker: "chef",
    startTime: 83.56,
    endTime: 84.76,
    volume: 80,
    words: [
      {
        text: "and",
        startTime: 83.56,
        endTime: 83.68,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "soft,",
        startTime: 83.68,
        endTime: 83.96,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "don't",
        startTime: 83.96,
        endTime: 84.24,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "overcook",
        startTime: 84.24,
        endTime: 84.6,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "them.",
        startTime: 84.6,
        endTime: 84.76,
        emphasis: "loud",
        pitch: "high"
      }
    ]
  },
  {
    text: "You want that nice texture in there.",
    speaker: "chef",
    startTime: 84.76,
    endTime: 86.12,
    volume: 50,
    words: [
      {
        text: "You",
        startTime: 84.76,
        endTime: 84.96,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "want",
        startTime: 84.96,
        endTime: 85.08,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "that",
        startTime: 85.08,
        endTime: 85.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "nice",
        startTime: 85.2,
        endTime: 85.44,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "texture",
        startTime: 85.44,
        endTime: 85.76,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "in",
        startTime: 85.76,
        endTime: 85.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "there.",
        startTime: 85.88,
        endTime: 86.12,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "And just rinse the rice.",
    speaker: "chef",
    startTime: 86.92,
    endTime: 88.84,
    volume: 50,
    words: [
      {
        text: "And",
        startTime: 86.92,
        endTime: 87.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "just",
        startTime: 87.2,
        endTime: 87.36,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "rinse",
        startTime: 87.36,
        endTime: 87.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 88.12,
        endTime: 88.44,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "rice.",
        startTime: 88.44,
        endTime: 88.84,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "That stops the rice from becoming clumpy in the pan.",
    speaker: "chef",
    startTime: 89.56,
    endTime: 91.72,
    volume: 50,
    words: [
      {
        text: "That",
        startTime: 89.56,
        endTime: 89.84,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "stops",
        startTime: 89.84,
        endTime: 90.12,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 90.12,
        endTime: 90.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "rice",
        startTime: 90.2,
        endTime: 90.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "from",
        startTime: 90.4,
        endTime: 90.56,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "becoming",
        startTime: 90.56,
        endTime: 90.84,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "clumpy",
        startTime: 90.84,
        endTime: 91.32,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "in",
        startTime: 91.32,
        endTime: 91.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 91.4,
        endTime: 91.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pan.",
        startTime: 91.48,
        endTime: 91.72,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  }
];

// Demo captions for educational content with warm, engaging narration (Spanish Elmo content)
const educationCaptions: CaptionSegment[] = spanishElmoCaptions;

export const CaptionsWithIntention: React.FC<CaptionsWithIntentionProps> = ({
  currentTime,
  isPlaying,
  contentType = 'education',
  captionsOverride
}) => {
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);
  
  useEffect(() => {
    const handleResize = () => setScreenHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get current active caption
  const activeCaption = useMemo(() => {
    const captions = captionsOverride || (contentType === 'education' ? spanishElmoCaptions : recipeCaptions);
    return captions.find(caption => 
      currentTime >= caption.startTime && currentTime <= caption.endTime
    );
  }, [currentTime, captionsOverride, contentType]);

  // Get current active word within the caption
  const activeWord = useMemo(() => {
    if (!activeCaption) return null;
    return activeCaption.words.find(word => 
      currentTime >= word.startTime && currentTime <= word.endTime
    );
  }, [currentTime, activeCaption]);

  if (!activeCaption) return null;

  const speakerColor = getSpeakerColor(activeCaption.speaker);
  const fontSize = getVolumeBasedFontSize(activeCaption.volume || 50, screenHeight);
  const pitchStyle = getPitchBasedStyle(activeWord?.pitch);
  
  const isLoudBurst = (activeCaption.volume || 50) >= 85;
  const isSoundEffect = activeCaption.type === 'soundeffect';
  const isMusic = activeCaption.type === 'music';

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
        {/* Read-ahead text (full sentence in white at 90% opacity) */}
        <div
          className="relative text-center leading-relaxed mb-2"
          style={{
            fontSize: `${fontSize}px`,
            color: CI_COLORS.readahead,
            ...pitchStyle,
          }}
        >
          {/* Sound effects and music formatting */}
          {isSoundEffect ? (
            <span className="text-white">
              [{activeCaption.text}]
            </span>
          ) : isMusic ? (
            <span className="text-white">
              ♪ {activeCaption.text} ♪
            </span>
          ) : (
            // Off-camera character (italic)
            <span 
              className={activeCaption.isOffCamera ? 'italic' : ''}
              style={{ fontStyle: activeCaption.isOffCamera ? 'italic' : 'normal' }}
            >
              {activeCaption.text}
            </span>
          )}
        </div>

        {/* Color-synced text (word by word with character colors and motion) */}
        <div
          className="absolute top-0 left-0 right-0 text-center leading-relaxed"
          style={{
            fontSize: `${fontSize}px`,
            ...pitchStyle,
          }}
        >
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
              className={activeCaption.isOffCamera ? 'italic' : ''}
              style={{ fontStyle: activeCaption.isOffCamera ? 'italic' : 'normal' }}
            >
              {activeCaption.words.map((word, index) => {
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
                      color: hasBeenSpoken || isCurrentWord ? speakerColor : 'transparent',
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
              })}
            </span>
          )}
        </div>
      </div>

      {/* Custom CSS for syllable animation */}
      <style>{`
        @keyframes syllable-emphasis {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        
        @supports (font-variation-settings: normal) {
          .caption-text {
            font-family: 'Roboto Flex', system-ui, sans-serif;
            font-variation-settings: 
              'wght' var(--font-weight, 400),
              'wdth' var(--font-width, 100);
          }
        }
      `}</style>
    </div>
  );
};
