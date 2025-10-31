import React, { useState, useEffect } from 'react';
import { useVocalIntensityAnalysis } from '@/hooks/useVocalIntensityAnalysis';
import { resolveSpeakerColor } from '@/lib/cwiPalette';
import { syllabify, injectSyllables } from '@/lib/syllables';

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
  syllables?: Array<{ text: string; startTime: number; endTime: number }>;
  confidence?: number;
}

// Helper to detect real provider timings (they ALWAYS include confidence scores)
const hasProviderWordTimings = (words?: WordSegment[]): boolean => {
  if (!words || words.length === 0) return false;
  
  const firstWord = words[0];
  // Provider timings (AssemblyAI/Deepgram) ALWAYS have confidence scores
  return (
    typeof firstWord.startTime === 'number' &&
    typeof firstWord.endTime === 'number' &&
    firstWord.confidence !== undefined &&
    firstWord.confidence !== null
  );
};

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

// Syllabify utility moved to src/lib/syllables.ts for reuse

/**
 * Calculate font size based on vocal intensity, volume, or emphasis - REDUCED SIZES
 */
const getIntonationBasedFontSize = (
  screenHeight: number, 
  vocalIntensity?: 'whisper' | 'normal' | 'yell' | 'shout',
  volume?: number,
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling'
): number => {
  // Design Guide: Type size = % of screen height (3-12%)
  const BASELINE_PERCENT = 0.045;  // 4.5% baseline
  const MIN_PERCENT = 0.03;        // 3% whisper
  const MAX_PERCENT = 0.12;        // 12% shout
  
  const baseSize = screenHeight * BASELINE_PERCENT;
  const minSize = screenHeight * MIN_PERCENT;
  const maxSize = screenHeight * MAX_PERCENT;
  
  // Priority 1: Use vocal intensity analysis if available
  if (vocalIntensity) {
    switch (vocalIntensity) {
      case 'whisper':
        return minSize;
      case 'yell':
        return Math.min(maxSize, baseSize * 1.3);
      case 'shout':
        return Math.min(maxSize, baseSize * 1.5);
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
        return Math.min(maxSize, baseSize * 1.3);
      case 'yelling':
        return Math.min(maxSize, baseSize * 1.5);
      case 'normal':
      default:
        return baseSize;
    }
  }
  
  // Fallback: Use volume level
  if (volume !== undefined) {
    if (volume <= 30) return minSize + ((volume / 30) * (baseSize - minSize));
    if (volume >= 85) return Math.min(maxSize, baseSize * 1.5);
    return baseSize + (((volume - 30) / 55) * (Math.min(maxSize, baseSize * 1.5) - baseSize));
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
  
  // Baseline: 160-200 Hz uses Regular 400 weight, 100% width
  if (pitchHz >= 160 && pitchHz <= 200) {
    return {
      fontVariationSettings: "'wght' 400, 'wdth' 100, 'opsz' 24"
    };
  }
  
  // Lower pitch (80-160 Hz): heavier weight, wider width
  if (pitchHz < 160) {
    const normalized = Math.max(0, Math.min(1, (160 - pitchHz) / 80));
    const weight = Math.round(400 + (normalized * 300)); // 400-700
    const width = Math.round(100 + (normalized * 25));   // 100-125
    
    return {
      fontVariationSettings: `'wght' ${weight}, 'wdth' ${width}, 'opsz' 24`
    };
  }
  
  // Higher pitch (200+ Hz): lighter weight, narrower width
  const normalized = Math.max(0, Math.min(1, (pitchHz - 200) / 50));
  const weight = Math.round(400 - (normalized * 200)); // 200-400
  const width = Math.round(100 - (normalized * 25));   // 75-100
  
  return {
    fontVariationSettings: `'wght' ${weight}, 'wdth' ${width}, 'opsz' 24`
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

  // Listen for character color updates from Character Manager
  useEffect(() => {
    const loadCharacterColors = () => {
      const characterColorString = localStorage.getItem('character-colors');
      if (characterColorString) {
        try {
          const parsedColors = JSON.parse(characterColorString);
          setCustomSpeakerColors(parsedColors);
          console.log('🔄 CAPTION COLORS: Loaded character colors from localStorage:', parsedColors);
        } catch (e) {
          console.warn('⚠️ Failed to parse character colors from localStorage');
        }
      }
    };
    
    // Load on mount
    loadCharacterColors();
    
    // Listen for character color updates
    const handleCharacterColorsUpdate = (event: CustomEvent) => {
      console.log('🔄 CAPTION COLORS: Received character colors update event');
      loadCharacterColors();
    };
    
    window.addEventListener('character-colors-updated', handleCharacterColorsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('character-colors-updated', handleCharacterColorsUpdate as EventListener);
    };
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
  const activeCaption = foundActive || upcoming || null;

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

  // Enhanced word timing with provider-aware precision
  const hasProviderTimings = activeCaption.words && activeCaption.words.length > 0 && 
    activeCaption.words.some((w: any) => w.startTime !== undefined);
  
  // Tighter tolerance for provider data (AssemblyAI/Deepgram), looser for synthesized
  const TIMING_TOLERANCE = hasProviderTimings ? 0.03 : 0.06; // 30ms vs 60ms
  const READAHEAD_BUFFER = 0.025; // Start highlighting 25ms early for better perceived sync
  
  // Truncate text for mobile portrait to prevent excessive screen coverage
  const isMobilePortrait = window.innerWidth < 640 && window.innerHeight > window.innerWidth;
  let captionText = activeCaption.text;
  if (isMobilePortrait && captionText.length > 50) {
    // Find a good break point (space or punctuation) within the limit
    const truncateAt = captionText.lastIndexOf(' ', 50) || captionText.lastIndexOf(',', 50) || 50;
    captionText = captionText.substring(0, truncateAt) + '...';
  }
  
  // Track if we synthesized data (for persistence flag)
  let synthesizedWords = false;
  
  // Synthesize word-level timing if missing with IMPROVED accuracy
  let workingCaption = { ...activeCaption, text: captionText };
  if (!hasProviderWordTimings(workingCaption.words)) {
    synthesizedWords = true;
    console.log('🧩 CAPTIONS: Synthesizing words for segment without word data');
    const words = captionText.trim().split(/\s+/).filter(Boolean);
    const duration = workingCaption.endTime - workingCaption.startTime;
    
    // Adaptive speech rate based on actual segment duration
    const measuredWPM = (words.length / duration) * 60;
    const baseWPM = Math.max(120, Math.min(180, measuredWPM)); // Clamp to realistic range
    
    // Account for punctuation pauses
    let currentTime = workingCaption.startTime;
    const pauseAfterPeriod = 0.15; // 150ms after period
    const pauseAfterComma = 0.08; // 80ms after comma
    
    workingCaption.words = words.map((word, index) => {
      // Word complexity scoring: longer/harder words get more time
      const lengthFactor = Math.max(0.7, Math.min(1.5, word.length / 5));
      const hasCapital = /[A-Z]/.test(word);
      const complexityBonus = hasCapital ? 1.1 : 1.0;
      
      // Calculate word duration with natural variation
      const baseWordDuration = (60 / baseWPM) * lengthFactor * complexityBonus;
      const wordDuration = Math.max(0.15, baseWordDuration); // Min 150ms
      
      const startTime = currentTime;
      const endTime = Math.min(workingCaption.endTime, startTime + wordDuration);
      
      // Advance time
      currentTime = endTime;
      
      // Add natural pauses after punctuation
      if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
        currentTime += pauseAfterPeriod;
      } else if (word.endsWith(',')) {
        currentTime += pauseAfterComma;
      }
      
      // Syllabify long words
      const syllables = syllabify(word);
      const syllableData = syllables.length > 1 ? syllables.map((syl, sylIdx) => {
        const sylDuration = wordDuration / syllables.length;
        return {
          text: syl,
          startTime: startTime + (sylIdx * sylDuration),
          endTime: startTime + ((sylIdx + 1) * sylDuration)
        };
      }) : undefined;
      
      return {
        text: word,
        startTime: startTime,
        endTime: endTime,
        emphasis: 'normal' as const,
        pitch: 'normal' as const,
        syllables: syllableData
      };
    });
    
    console.log('⚠️ CWI: Synthesized', words.length, 'words with adaptive timing (', baseWPM.toFixed(0), 'WPM) - no provider timings found');
  } else {
    // Provider timings detected - use them directly and only inject syllables
    console.log(`✅ CWI: Using PROVIDER timings for ${workingCaption.words!.length} words with confidence scores`);
    
    // Only inject syllables for long words, don't modify timings
    const beforeCount = workingCaption.words!.filter(w => w.syllables && w.syllables.length > 0).length;
    const injectedWords = injectSyllables(workingCaption.words!);
    
    // Ensure proper typing after injection
    workingCaption.words = injectedWords.map(w => ({
      ...w,
      emphasis: (w.emphasis as 'loud' | 'quiet' | 'normal' | 'yelling') || 'normal',
      pitch: (w.pitch as 'high' | 'low' | 'normal') || 'normal'
    }));
    
    const afterCount = workingCaption.words!.filter(w => w.syllables && w.syllables.length > 0).length;
    if (afterCount > beforeCount) {
      console.log(`✅ CWI: Injected syllables into ${afterCount - beforeCount} words`);
    }
  }
  
  // Apply read-ahead buffer to account for audio processing latency
  const adjustedTime = currentTime + READAHEAD_BUFFER;
  
  let activeWordIndex = workingCaption.words?.findIndex(word => 
    adjustedTime >= (word.startTime - TIMING_TOLERANCE) && 
    adjustedTime <= (word.endTime + TIMING_TOLERANCE)
  ) ?? -1;
  
  // Fallback: if within segment but no word matches, pick by proportional progress
  if (activeWordIndex < 0 && adjustedTime >= workingCaption.startTime - TIMING_TOLERANCE && adjustedTime <= workingCaption.endTime + TIMING_TOLERANCE) {
    const progress = (adjustedTime - workingCaption.startTime) / Math.max(0.001, (workingCaption.endTime - workingCaption.startTime));
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

  const speakerColor = resolveSpeakerColor({
    characterColor: customSpeakerColors?.[activeCaption.speaker] || activeCaption.speakerColor,
    speakerName: activeCaption.speaker,
  });
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
    <div className="relative w-full">
      {/* READ-AHEAD LAYER: Show upcoming caption in white (Design Guide) */}
      {upcoming && !foundActive && (
        <div 
          className="absolute bottom-32 left-1/2 transform -translate-x-1/2 
                     text-white/90 text-base font-light text-center pointer-events-none"
          style={{
            maxWidth: '92vw',
            fontFamily: 'Roboto Flex, system-ui, sans-serif',
            zIndex: 5
          }}
        >
          {upcoming.text}
        </div>
      )}

      {/* ACTIVE CAPTION: Colored word-by-word rendering */}
      <div 
        className={`
          relative flex items-end justify-center pointer-events-none w-full
          ${foundActive ? 'animate-caption-enter' : upcoming ? 'animate-caption-enter opacity-70' : 'animate-caption-exit'}
        `}
        style={{ fontFamily: 'Roboto Flex, system-ui, sans-serif' }}
        key={`caption-${activeCaption.startTime}-${activeCaption.endTime}`}
      >
      {/* Captions Container Box - Mobile Responsive with enhanced animations */}
      <div 
        className={`
          relative inline-block max-w-[92vw] sm:max-w-2xl text-center
          ${isLoudBurst ? '' : 'bg-black/90'} 
          ${isLoudBurst ? '' : 'rounded-md sm:rounded-lg'} 
          ${isLoudBurst ? '' : 'px-2 py-1.5 sm:px-4 sm:py-3'}
          ${isLoudBurst ? '' : 'mx-2 sm:mx-4'}
          ${isLoudBurst ? 'animate-emphasis-bounce' : 'animate-box-resize'}
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
          willChange: 'contents, transform'
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
                   
                    // Increased tolerance + lead-in offset for better sync with speech
                    const WORD_PRECISION = 0.12; // 120ms precision window for browser timing variance
                    const LEAD_IN_OFFSET = -0.1; // 100ms early activation to match audio
                    const isActiveByTime = (currentTime >= (word.startTime + LEAD_IN_OFFSET - WORD_PRECISION) && 
                                           currentTime <= (word.endTime + LEAD_IN_OFFSET + WORD_PRECISION));
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
                         transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)', // Bounce easing for 15% pop
                         willChange: 'transform, opacity, color, font-size',
                         transformOrigin: 'center bottom',
                         // 15% pop animation on active word (Design Guide)
                         ...(wordState === 'active' && {
                           transform: 'scale(1.15) translateY(-2px)',
                           zIndex: 10
                         })
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
                   
                      // Render syllables if present (for long words)
                      if (word.syllables && word.syllables.length > 1) {
                        return (
                          <span
                            key={`${workingCaption.startTime}-${index}`}
                            className="inline-block caption-word"
                            style={{ marginRight: '0.3em' }}
                          >
                            {word.syllables.map((syl, sylIdx) => {
                              const sylState = currentTime >= syl.startTime && currentTime <= syl.endTime ? 'active' 
                                : currentTime > syl.endTime ? 'spoken' 
                                : 'upcoming';
                              
                              return (
                                <span
                                  key={`${index}-syl-${sylIdx}`}
                                  className={`
                                    inline-block syllable-${sylState}
                                    transition-all duration-150 ease-out
                                  `}
                                  style={{
                                    color: sylState === 'active' ? getWordColorByState() : (sylState === 'spoken' ? speakerColor : 'rgba(255,255,255,0.7)'),
                                    fontSize: `${wordFontSize}px`,
                                    ...wordPitchStyle,
                                    ...(sylState === 'active' && {
                                      transform: 'scale(1.15) translateY(-2px)',
                                      textShadow: `0 0 10px ${getWordColorByState()}40`,
                                      zIndex: 10,
                                      position: 'relative'
                                    })
                                  }}
                                >
                                  {syl.text}
                                </span>
                              );
                            })}
                          </span>
                        );
                      }
                      
                      // Regular word rendering (no syllables)
                      return (
                        <span
                          key={`${workingCaption.startTime}-${index}`}
                          className={`
                            inline-block caption-word word-${wordState} 
                            ${activeCaption.vocal_intensity ? `intensity-${activeCaption.vocal_intensity}` : ''}
                            ${wordState === 'active' ? 'animate-word-highlight' : ''}
                            ${word.emphasis === 'yelling' || activeCaption.vocal_intensity === 'shout' ? 'animate-emphasis-bounce' : ''}
                            transition-all duration-200 ease-out
                          `}
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
                         // Active word gets 15% pop and enhanced glow
                         ...(wordState === 'active' && {
                           transform: 'scale(1.15) translateY(-2px)',
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
    </div>
  );
};