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
 * Get speaker color with proper fallback to segment's assigned color
 */
const getSpeakerColor = (speaker: string, customColors?: Record<string, string>, segmentColor?: string): string => {
  // Priority 1: Use segment's assigned color from character management (most important)
  if (segmentColor) {
    console.log('🎨 Using segment assigned color for', speaker, ':', segmentColor);
    return segmentColor;
  }
  
  // Priority 2: Use custom assigned color from character manager
  if (customColors && customColors[speaker]) {
    console.log('🎨 Using custom character color for', speaker, ':', customColors[speaker]);
    return customColors[speaker];
  }
  
  // Priority 3: Default color assignments for common speakers
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
  
  const defaultColor = defaultColors[speaker.toLowerCase()] || CI_COLORS.main.blue;
  console.log('🎨 Using default color for', speaker, ':', defaultColor);
  return defaultColor;
};

/**
 * Calculate font size based on vocal intensity, volume, or emphasis - REDUCED SIZES
 */
const getIntonationBasedFontSize = (
  screenHeight: number, 
  vocalIntensity?: 'whisper' | 'normal' | 'yell' | 'shout',
  volume?: number,
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling'
): number => {
  const baseSize = Math.max(20, screenHeight * 0.0286); // Increased by 30% (0.022 * 1.3)
  const minSize = Math.max(12, screenHeight * 0.015);   // Keep whisper size unchanged
  const maxSize = Math.max(31, screenHeight * 0.0455);  // Increased by 30% (0.035 * 1.3)
  
  // Priority 1: Use vocal intensity analysis if available
  if (vocalIntensity) {
    switch (vocalIntensity) {
      case 'whisper':
        return minSize;
      case 'yell':
        return baseSize * 1.2; // Reduced from 1.4x
      case 'shout':
        return baseSize * 1.4; // Reduced from maxSize
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
        return baseSize * 1.2; // Reduced from 1.3x
      case 'yelling':
        return baseSize * 1.4; // Reduced from maxSize
      case 'normal':
      default:
        return baseSize;
    }
  }
  
  // Fallback: Use volume level
  if (volume !== undefined) {
    if (volume <= 30) return minSize + ((volume / 30) * (baseSize - minSize));
    if (volume >= 85) return baseSize * 1.4; // Reduced from maxSize
    return baseSize + (((volume - 30) / 55) * (baseSize * 1.4 - baseSize));
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

  // Load custom character colors from localStorage as fallback only
  useEffect(() => {
    const savedColors = localStorage.getItem('character-colors');
    if (savedColors) {
      const parsedColors = JSON.parse(savedColors);
      setCustomSpeakerColors(parsedColors);
      console.log('🎨 Loaded character colors from localStorage:', parsedColors);
    }
  }, []);

  // Use small tolerance to avoid missing captions at segment edges and add read-ahead fallback
  const SEGMENT_TOLERANCE = 0.05; // 50ms
  const READAHEAD_WINDOW = 3.0; // always show upcoming caption up to 3s early (CI read-ahead)
  const foundActive = captions.find(caption => 
    currentTime >= (caption.startTime - SEGMENT_TOLERANCE) && currentTime <= (caption.endTime + SEGMENT_TOLERANCE)
  );
  const upcoming = !foundActive
    ? captions.find(caption => caption.startTime >= currentTime && (caption.startTime - currentTime) <= READAHEAD_WINDOW)
    : undefined;
  const activeCaption = foundActive || upcoming || captions[0];

  // Debug caption rendering and character colors
  useEffect(() => {
    if (captions && captions.length > 0) {
      console.log('⏰ CaptionsWithIntention - Current time:', currentTime, 'Active caption found:', !!activeCaption);
      console.log('📊 Available captions count:', captions.length);
      console.log('🔍 Caption time ranges:', captions.slice(0, 3).map(c => ({ 
        start: c.startTime, 
        end: c.endTime, 
        text: c.text.substring(0, 20) + '...',
        speaker: c.speaker,
        speakerColor: c.speakerColor
      })));
      
      if (activeCaption) {
        console.log('🎯 Active caption details:', {
          startTime: activeCaption.startTime,
          endTime: activeCaption.endTime,
          text: activeCaption.text.substring(0, 30) + '...',
          speaker: activeCaption.speaker,
          speakerColor: activeCaption.speakerColor,
          hasColor: !!activeCaption.speakerColor
        });
      }
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

  // Enhanced word timing and highlighting logic with better early-video sync
  const TIMING_TOLERANCE = 0.06; // 60ms tolerance for reliable sync across browsers
  
  // Truncate text for mobile portrait to prevent excessive screen coverage
  const isMobilePortrait = window.innerWidth < 640 && window.innerHeight > window.innerWidth;
  let captionText = activeCaption.text;
  if (isMobilePortrait && captionText.length > 50) {
    // Find a good break point (space or punctuation) within the limit
    const truncateAt = captionText.lastIndexOf(' ', 50) || captionText.lastIndexOf(',', 50) || 50;
    captionText = captionText.substring(0, truncateAt) + '...';
  }
  
  // Synthesize word-level timing if missing with improved accuracy
  let workingCaption = { ...activeCaption, text: captionText };
  if (!workingCaption.words || workingCaption.words.length === 0) {
    console.log('🧩 CAPTIONS: Synthesizing words for segment without word data');
    const words = captionText.trim().split(/\s+/).filter(Boolean);
    const duration = workingCaption.endTime - workingCaption.startTime;
    
    // More natural word timing based on word length and common speech patterns
    const baseWPM = 150; // Average words per minute for clear speech
    const wordsPerSecond = baseWPM / 60;
    const naturalDuration = words.length / wordsPerSecond;
    
    // Use actual segment duration but respect natural speech timing
    const effectiveDuration = Math.max(duration, naturalDuration * 0.8);
    const avgWordDuration = effectiveDuration / words.length;
    
    workingCaption.words = words.map((word, index) => {
      // Vary word duration slightly based on word length for realism
      const lengthFactor = Math.max(0.7, Math.min(1.5, word.length / 5));
      const wordDuration = Math.max(0.12, avgWordDuration * lengthFactor); // Min 120ms per word
      
      const startTime = workingCaption.startTime + (index * avgWordDuration);
      const endTime = Math.min(
        workingCaption.endTime, 
        startTime + wordDuration
      );
      
      return {
        text: word,
        startTime: startTime,
        endTime: endTime,
        emphasis: 'normal' as const,
        pitch: 'normal' as const
      };
    });
    
    console.log('✅ CAPTIONS: Synthesized', words.length, 'words with natural timing for segment', workingCaption.startTime.toFixed(2) + 's');
  }
  
  let activeWordIndex = workingCaption.words?.findIndex(word => 
    currentTime >= (word.startTime - TIMING_TOLERANCE) && 
    currentTime <= (word.endTime + TIMING_TOLERANCE)
  ) ?? -1;
  
  // Fallback: if within segment but no word matches, pick by proportional progress
  if (activeWordIndex < 0 && currentTime >= workingCaption.startTime - TIMING_TOLERANCE && currentTime <= workingCaption.endTime + TIMING_TOLERANCE) {
    const progress = (currentTime - workingCaption.startTime) / Math.max(0.001, (workingCaption.endTime - workingCaption.startTime));
    activeWordIndex = Math.min(workingCaption.words.length - 1, Math.max(0, Math.floor(progress * workingCaption.words.length)));
  }
  const activeWord = activeWordIndex >= 0 ? workingCaption.words?.[activeWordIndex] : undefined;

  // Debug word timing for development
  if (workingCaption.words && workingCaption.words.length > 0) {
    console.log('⏰ Word timing debug:', {
      currentTime: currentTime.toFixed(3),
      activeWordIndex,
      totalWords: workingCaption.words.length,
      activeWord: activeWord ? {
        text: activeWord.text,
        start: activeWord.startTime?.toFixed(3),
        end: activeWord.endTime?.toFixed(3)
      } : null,
      segment: {
        text: workingCaption.text.substring(0, 30) + '...',
        start: workingCaption.startTime.toFixed(3),
        end: workingCaption.endTime.toFixed(3),
        hasWords: !!workingCaption.words,
        wordCount: workingCaption.words?.length || 0
      }
    });
  }

  const speakerColor = getSpeakerColor(activeCaption.speaker, customSpeakerColors, activeCaption.speakerColor);
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
      className="relative flex items-end justify-center pointer-events-none w-full"
      style={{ fontFamily: 'Roboto Flex, system-ui, sans-serif' }}
    >
      {/* Captions Container Box - Expanded for Better Text Display */}
      <div 
        className={`
          relative inline-block max-w-[96vw] sm:max-w-4xl lg:max-w-5xl text-center
          ${isLoudBurst ? '' : 'bg-black/90'} 
          ${isLoudBurst ? '' : 'rounded-md sm:rounded-lg'} 
          ${isLoudBurst ? '' : 'px-3 py-2 sm:px-6 sm:py-4'}
          ${isLoudBurst ? '' : 'mx-2 sm:mx-4'}
        `}
        style={{
          // For loud bursts, captions break out of the box
          ...(isLoudBurst && {
            background: 'none',
            padding: 0,
            margin: 0,
          }),
          // Enhanced layout containment for smooth animations
          contain: 'layout style paint',
          willChange: 'contents'
        }}
      >
        {/* Speaker name label - only show for dialogue, not sound effects or music */}
        {!isSoundEffect && !isMusic && activeCaption.speaker && (
          <div 
            className="text-xs font-medium mb-1 text-center"
            style={{ 
              color: activeCaption.speakerColor || speakerColor,
              fontSize: `${Math.max(10, baseFontSize * (window.innerWidth < 640 ? 0.45 : 0.35))}px` // Better mobile readability
            }}
          >
            {activeCaption.speaker}
          </div>
        )}
        
        {/* Single caption display with proper color synchronization */}
        <div
          className="relative text-center leading-tight break-words px-1"
          style={{
            fontSize: `${Math.min(baseFontSize * (window.innerWidth < 640 ? 0.9 : 1), screenHeight * 0.0455)}px`, // Optimized mobile font size
            ...pitchStyle,
            ...intensityStyles, // Apply vocal intensity styling
            ...(isEnthusiastic ? { fontWeight: 500, letterSpacing: '0.02em' } : {}),
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto',
            maxWidth: '100%',
            contain: 'layout paint',
            lineHeight: window.innerWidth < 640 ? '1.25' : '1.3' // Tighter line height for mobile
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
              style={{ 
                fontStyle: (activeCaption as any)?.isOffCamera ? 'italic' : 'normal',
                // Fallback color to ensure tint from t=0 even if per-word style is overridden
                color: activeCaption.speakerColor || speakerColor
              }}
            >
              {workingCaption.words && workingCaption.words.length > 0 ? (
                 workingCaption.words.map((word, index) => {
                   const wordPitchStyle = getPitchBasedStyle(word.pitch);
                   const wordFontSize = getIntonationBasedFontSize(
                     screenHeight, 
                     activeCaption.vocal_intensity, 
                     volume, 
                     word.emphasis
                   );
                   
                    // Ultra-precise word timing with robust tolerance for reliable activation
                    const WORD_PRECISION = 0.06; // 60ms precision window
                    const isActiveByTime = (currentTime >= (word.startTime - WORD_PRECISION) && 
                                           currentTime <= (word.endTime + WORD_PRECISION));
                    const isActiveByIndex = index === activeWordIndex;
                    const isWordActive = isActiveByTime || isActiveByIndex;
                    const wordHasBeenSpoken = currentTime >= (word.endTime - WORD_PRECISION);
                    const isUpcoming = currentTime < (word.startTime - WORD_PRECISION);
                    
                    // Debug timing for first few seconds to ensure 0:00-0:03 works perfectly
                    if (currentTime <= 3.0 && index < 5) {
                      console.log(`⏱️ Word ${index} "${word.text}" timing: current=${currentTime.toFixed(3)}s, word=${word.startTime?.toFixed(3)}-${word.endTime?.toFixed(3)}s, active=${isWordActive}`);
                    }
                   
                   // Progressive word state system (inspired by axs.so approach)
                   let wordState: 'upcoming' | 'active' | 'spoken' = 'upcoming';
                   if (wordHasBeenSpoken) wordState = 'spoken';
                   else if (isWordActive) wordState = 'active';
                   
                    // Color system based on word state — always tint by speaker color so it "follows" every word
                    const getWordColorByState = () => {
                      const base = activeCaption.speakerColor || speakerColor;
                      switch (wordState) {
                        case 'active':
                          return base; // full color
                        case 'spoken':
                          return base; // keep same hue; dim via opacity below
                        case 'upcoming':
                          return base; // preview uses same hue; dim via opacity below
                        default:
                          return base;
                      }
                    };
                   
                    // Enhanced vocal intensity styling with word-level precision and emotional expressions
                    const getWordIntensityStyle = (): React.CSSProperties => {
                      const baseStyle: React.CSSProperties = {
                        transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth but quick transitions
                        willChange: 'transform, opacity, color, font-size',
                        transformOrigin: 'center bottom' // Jump from bottom like axs.so
                      };
                      
                      // Check for emotional expressions in the segment
                      const emotionalType = (activeCaption as any)?.intensity_metadata?.emotionalType;
                      
                      // Apply vocal intensity effects with emotional context
                      if (activeCaption.vocal_intensity) {
                        switch (activeCaption.vocal_intensity) {
                          case 'whisper':
                            return {
                              ...baseStyle,
                              fontSize: `${wordFontSize * 0.8}px`,
                              fontWeight: 300,
                              opacity: wordState === 'active' ? 0.9 : 0.75,
                              fontStyle: 'italic',
                              letterSpacing: '-0.02em',
                              transform: wordState === 'active' ? 'scale(1.03) translateY(-1px)' : 'scale(1)',
                              filter: wordState === 'active' ? 'brightness(1.1)' : 'none'
                            };
                          case 'yell':
                            const isEmotional = emotionalType && ['surprise', 'laughter'].includes(emotionalType);
                            return {
                              ...baseStyle,
                              fontSize: `${wordFontSize * (isEmotional ? 1.4 : 1.25)}px`,
                              fontWeight: isEmotional ? 800 : 700,
                              letterSpacing: isEmotional ? '0.08em' : '0.04em',
                              textShadow: wordState === 'active' ? 
                                `0 0 15px ${getWordColorByState()}50, 0 2px 4px rgba(0,0,0,0.3)` : 
                                '0 1px 2px rgba(0,0,0,0.2)',
                              transform: wordState === 'active' ? 
                                `scale(${isEmotional ? 1.12 : 1.06}) translateY(-3px)` : 'scale(1)',
                              // Add emotional visual cues
                              ...(emotionalType === 'laughter' && {
                                animation: wordState === 'active' ? 'bounce 0.6s ease-out' : undefined
                              }),
                              ...(emotionalType === 'surprise' && {
                                filter: wordState === 'active' ? 'brightness(1.3) contrast(1.1)' : 'none'
                              })
                            };
                          case 'shout':
                            const isCrying = emotionalType === 'crying';
                            return {
                              ...baseStyle,
                              fontSize: `${wordFontSize * (isCrying ? 1.1 : 1.35)}px`,
                              fontWeight: 800,
                              letterSpacing: isCrying ? '0.02em' : '0.06em',
                              textShadow: wordState === 'active' ? 
                                `0 0 20px ${getWordColorByState()}70, 0 0 10px ${getWordColorByState()}50, 0 3px 6px rgba(0,0,0,0.4)` : 
                                '0 2px 4px rgba(0,0,0,0.3)',
                              transform: wordState === 'active' ? 
                                `scale(${isCrying ? 1.05 : 1.15}) translateY(-4px)` : 'scale(1)',
                              animation: wordState === 'active' ? 
                                (isCrying ? 'pulse 1.2s ease-in-out' : 'pulse 0.8s ease-out') : undefined,
                              // Emotional context styling
                              ...(isCrying && {
                                filter: wordState === 'active' ? 'blur(0.5px) brightness(0.9)' : 'none',
                                opacity: 0.9
                              })
                            };
                          default:
                            return {
                              ...baseStyle,
                              transform: wordState === 'active' ? 'scale(1.02) translateY(-2px)' : 'scale(1)'
                            };
                        }
                      }
                      
                      // Fallback to manual emphasis with jump effects and emotional context
                      if (word.emphasis) {
                        const emotionalType = (activeCaption as any)?.intensity_metadata?.emotionalType;
                        switch (word.emphasis) {
                          case 'quiet':
                            return { 
                              ...baseStyle, 
                              fontSize: `${wordFontSize * 0.85}px`, 
                              fontWeight: 300, 
                              fontStyle: 'italic',
                              opacity: 0.8,
                              transform: wordState === 'active' ? 'scale(1.03) translateY(-1px)' : 'scale(1)'
                            };
                          case 'loud':
                            return { 
                              ...baseStyle, 
                              fontSize: `${wordFontSize * 1.3}px`, 
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              transform: wordState === 'active' ? 'scale(1.08) translateY(-3px)' : 'scale(1)',
                              ...(emotionalType && {
                                textShadow: wordState === 'active' ? `0 0 8px ${getWordColorByState()}40` : 'none'
                              })
                            };
                          case 'yelling':
                            return { 
                              ...baseStyle, 
                              fontSize: `${wordFontSize * 1.35}px`, // Increased from 1.25x
                              fontWeight: 800, 
                              letterSpacing: '0.05em',
                              textShadow: wordState === 'active' ? `0 0 10px ${getWordColorByState()}50` : 'none',
                              transform: wordState === 'active' ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
                              // Keep original case - no uppercase transformation
                              animation: wordState === 'active' && emotionalType ? 'pulse 0.8s ease-out' : undefined
                            };
                          default:
                            return {
                              ...baseStyle,
                              transform: wordState === 'active' ? 'scale(1.02) translateY(-2px)' : 'scale(1)'
                            };
                        }
                      }
                      
                      // Default state with subtle jump
                      return {
                        ...baseStyle,
                        transform: wordState === 'active' ? 'scale(1.02) translateY(-2px)' : 'scale(1)'
                      };
                    };
                   
                     return (
                       <span
                         key={`${workingCaption.startTime}-${index}`}
                         className={`inline-block caption-word word-${wordState} ${
                           activeCaption.vocal_intensity ? `intensity-${activeCaption.vocal_intensity}` : ''
                         }`}
                        data-wid={index}
                        data-start={word.startTime}
                        data-end={word.endTime}
                        style={{
                         color: getWordColorByState(),
                         marginRight: '0.3em',
                         fontSize: `${wordFontSize}px`,
                         cursor: 'default',
                         ...wordPitchStyle,
                         ...getWordIntensityStyle(),
                         // Active word gets enhanced glow and jump
                         ...(wordState === 'active' && {
                           textShadow: `0 0 10px ${getWordColorByState()}40, 0 2px 4px rgba(0,0,0,0.2)`,
                           zIndex: 10,
                           position: 'relative'
                         }),
                         // Spoken words get subtle persistence
                         ...(wordState === 'spoken' && {
                           opacity: 0.85
                         }),
                         // Upcoming words are dimmed but visible
                         ...(wordState === 'upcoming' && {
                           opacity: 0.6
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