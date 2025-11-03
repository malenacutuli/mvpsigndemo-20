import React, { useState, useEffect } from 'react';
import { useVocalIntensityAnalysis } from '@/hooks/useVocalIntensityAnalysis';
// getSpeakerColor removed – we keep a single neutral color unless character assigned
// NOTE: syllable injection happens upstream; we only render syllables here
import { paginateTwoLinesByWidth, type FontOpts } from '@/utils/captionsFit';

// Single neutral color until character is assigned
const DEFAULT_NEUTRAL = '#22E3D0';

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

// Caption splitting constants – max 2 lines of ~40 chars
const MAX_CHARS_PER_LINE = 40;
const MAX_LINES = 2;
const MAX_CHARS = MAX_CHARS_PER_LINE * MAX_LINES; // 80 total
const READAHEAD_SECONDS = 3;

// Disable read-ahead (prevents double overlay)
const SHOW_READAHEAD_PREVIEW = false;

export interface WordSegment {
  text: string;
  startTime: number;
  endTime: number;
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling' | 'whisper';
  pitch?: 'high' | 'low' | 'normal';
  syllables?: Array<{ text: string; startTime: number; endTime: number }>;
  confidence?: number;
}

type TimedWord = {
  text: string;
  startTime?: number;
  endTime?: number;
  emphasis?: 'normal' | 'loud' | 'quiet' | 'yelling' | 'whisper';
  pitch?: 'low' | 'normal' | 'high';
  syllables?: Array<{ text: string; startTime: number; endTime: number }>;
  confidence?: number;
};

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


// --- CWI: syllable support -----------------------------------------------
const VOWEL_RE = /[aeiouyáéíóúàèìòùäëïöü]/i;
function naiveSyllabify(text: string): string[] {
  // If API provided syllables like "a-gain", prefer those (split by hyphen)
  if (text.includes("-")) {
    const parts = text.split("-").map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }
  // Fallback: split by vowel groups while keeping at least 1 char per part
  const raw = text.match(/[bcdfghjklmnpqrstvwxyz]*[aeiouy]+[bcdfghjklmnpqrstvwxyz]*/gi);
  if (raw && raw.join("") === text.replace(/[^a-záéíóúàèìòùäëïöü]/gi, "")) return raw;
  // Last resort: single "syllable"
  return [text];
}

type Word = { text: string; startTime?: number; endTime?: number; emphasis?: string; pitch?: string; syllables?: Array<{ text: string; startTime: number; endTime: number }> };

function expandWordsToSyllables(words: Word[], segStart: number, segEnd: number) {
  // Ensure words have timings (keep existing; otherwise distribute evenly)
  const duration = Math.max(0.05, segEnd - segStart);
  const baseStep = duration / Math.max(1, words.length);

  let cursor = segStart;
  const expanded: Array<Word & { _syllableText: string }> = [];

  words.forEach((w, idx) => {
    const wStart = typeof w.startTime === "number" ? w.startTime : (segStart + idx * baseStep);
    const wEnd   = typeof w.endTime   === "number" ? w.endTime   : Math.min(segEnd, segStart + (idx + 1) * baseStep);

    const parts = (w.syllables && w.syllables.length > 0) ? w.syllables : naiveSyllabify(w.text);
    const span = Math.max(0.04, wEnd - wStart);
    const step = span / Math.max(1, parts.length);

    parts.forEach((p, i) => {
      const sStart = wStart + i * step;
      const sEnd   = (i === parts.length - 1) ? wEnd : (wStart + (i + 1) * step);
      expanded.push({
        ...w,
        _syllableText: p,
        startTime: sStart,
        endTime: sEnd
      });
    });

    cursor = wEnd;
  });

  return expanded;
}

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

// Accept any words that have text; synthesize timings if missing while preserving emphasis/pitch
function normalizeWords(
  words: WordSegment[] | undefined,
  segStart: number,
  segEnd: number
): WordSegment[] | undefined {
  if (!words || !words.length) return undefined;
  
  // Check if words need timing backfill
  const hasAnyTiming = words.some(w => 
    typeof w.startTime === 'number' && typeof w.endTime === 'number'
  );
  
  // If all words already have timing, return as-is (preserves manual edits)
  if (hasAnyTiming && words.every(w => typeof w.startTime === 'number' && typeof w.endTime === 'number')) {
    return words;
  }
  
  // Backfill missing timings while preserving emphasis and pitch
  const duration = Math.max(0.01, segEnd - segStart);
  const step = duration / words.length;
  
  return words.map((w, i) => ({
    ...w,
    startTime: typeof w.startTime === 'number' ? w.startTime : segStart + i * step,
    endTime: typeof w.endTime === 'number' ? w.endTime : segStart + (i + 1) * step,
    // ✅ CRITICAL: Preserve manual emphasis/pitch edits
    emphasis: w.emphasis || 'normal',
    pitch: w.pitch || 'normal'
  }));
}

// CWI Protocol timing
const SEGMENT_TOLERANCE = 0.05;   // 50ms
const WORD_TOLERANCE    = 0.06;   // 60ms
const READAHEAD_WINDOW  = 3.0;    // 3 seconds
const MIN_DISPLAY_MS    = 800;    // min display for short blips

/**
 * Compute font options for segment (reuses getIntonationBasedFontSize logic)
 */
function computeFontForSegment(seg: any, screenH: number, volume: number): FontOpts {
  const basePx = getIntonationBasedFontSize(
    screenH, 
    seg.vocal_intensity, 
    volume, 
    seg.words?.[0]?.emphasis
  );
  
  // Optional: apply word-count scaling (keeps huge lines smaller but readable)
  const wc = seg.words?.length ?? (seg.text?.split(/\s+/).length || 0);
  const scale = wc > 20 ? 0.8 : wc > 15 ? 0.9 : 1;
  
  return {
    fontFamily: 'Roboto Flex, system-ui, sans-serif',
    fontSizePx: Math.max(14, Math.round(basePx * scale * 0.81)),
    fontWeight: 600,
    letterSpacingPx: 0
  };
}

export const CaptionsWithIntention: React.FC<CaptionsWithIntentionProps> = ({
  captions,
  currentTime,
  isVisible = true,
  screenHeight = 1080
}) => {
  const [customSpeakerColors, setCustomSpeakerColors] = useState<Record<string, string>>({});
  const { getIntensityStyles } = useVocalIntensityAnalysis();

  // Process captions without pagination - clamp with CSS instead to preserve exact DB timings
  const processed = React.useMemo(() => {
    return captions.map((seg: any) => {
      const working = { ...seg };

      // Ensure words & timing exist
      const haveWords = Array.isArray(working.words) && working.words.length > 0;
      const wordsHaveTiming =
        haveWords && working.words.some((w: any) =>
          typeof w.startTime === 'number' && typeof w.endTime === 'number'
        );

      if (!haveWords) {
        const tokens = (working.text || '').split(/\s+/).filter(Boolean);
        const dur = Math.max(0.001, working.endTime - working.startTime);
        const step = dur / Math.max(1, tokens.length);
        working.words = tokens.map((text: string, i: number) => ({
          text,
          startTime: working.startTime + i * step,
          endTime:   working.startTime + (i + 1) * step,
          emphasis: 'normal' as const,
          pitch: 'normal' as const
        }));
      } else if (!wordsHaveTiming) {
        const dur = Math.max(0.001, working.endTime - working.startTime);
        const step = dur / Math.max(1, working.words.length);
        working.words = working.words.map((w: any, i: number) => ({
          ...w,
          startTime: w.startTime ?? (working.startTime + i * step),
          endTime:   w.endTime   ?? (working.startTime + (i + 1) * step),
        }));
      }

      // Ensure syllables have charEnd once (proportional if missing)
      working.words = (working.words || []).map((w: any) => {
        if (Array.isArray(w.syllables) && w.syllables.length > 1) {
          const len = Math.max(1, (w.text || '').length);
          let hasCharEnd = w.syllables.some((s: any) => typeof s.charEnd === 'number');
          if (!hasCharEnd) {
            w.syllables = w.syllables.map((s: any, i: number) => ({
              ...s,
              charEnd: Math.min(len, Math.round(((i + 1) / w.syllables.length) * len))
            }));
          }
        }
        return w;
      });

      return working;
    });
  }, [captions]);

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

  // What we actually render - sticky display state
  const [displayedCaption, setDisplayedCaption] = React.useState<any>(null);

  // Refs (do not cause re-renders)
  const showUntilSecRef   = React.useRef<number | null>(null); // seconds
  const lastSetMsRef      = React.useRef<number>(0);           // ms (Date.now)

  // Active caption - only show truly active segments (no read-ahead promotion)
  const activeCandidate = React.useMemo(() => {
    if (!processed?.length) return null;

    // Only return segments that are actually active right now
    const active = processed.find(c =>
      currentTime >= (c.startTime - SEGMENT_TOLERANCE) &&
      currentTime <= (c.endTime   + SEGMENT_TOLERANCE)
    );
    return active || null;
  }, [processed, currentTime]);

  // Optional: upcoming segment for preview (only if SHOW_READAHEAD_PREVIEW is true)
  const upcomingCandidate = React.useMemo(() => {
    if (!processed?.length || !SHOW_READAHEAD_PREVIEW) return null;
    return processed.find(c =>
      c.startTime >= currentTime && (c.startTime - currentTime) <= READAHEAD_WINDOW
    ) || null;
  }, [processed, currentTime]);

  // Sticky display effect (no blink, but no 1.2s linger)
  const [displayUntil, setDisplayUntil] = React.useState<number | null>(null);
  const lastSetAtRef = React.useRef<number>(0);

  React.useEffect(() => {
    const now = Date.now();

    if (activeCandidate) {
      setDisplayedCaption(activeCandidate);
      // enforce short minimum on-screen time for ultra-short segments
      const minEnd = activeCandidate.startTime + (MIN_DISPLAY_MS / 1000);
      const visualEnd = Math.max(activeCandidate.endTime, minEnd);
      setDisplayUntil(visualEnd);
      lastSetAtRef.current = now;
    } else if (displayedCaption && displayUntil !== null) {
      const timeSinceSet = now - lastSetAtRef.current;
      const shouldClear = (currentTime > displayUntil + SEGMENT_TOLERANCE) &&
                          (timeSinceSet >= MIN_DISPLAY_MS);
      if (shouldClear) {
        setDisplayedCaption(null);
        setDisplayUntil(null);
      }
    }
  }, [activeCandidate, currentTime, displayedCaption, displayUntil]);

  if (!displayedCaption) return null;
  const cap = displayedCaption;

  // Neutral color until a character is assigned
  const tint = cap.speakerColor || customSpeakerColors[cap.speaker] || DEFAULT_NEUTRAL;
  const words = (cap.words || []) as any[];
  
  // Validation logging
  console.log('🎨 CWI: Rendering caption', {
    speaker: cap.speaker,
    tint,
    hasCustomColor: !!customSpeakerColors[cap.speaker],
    hasSpeakerColor: !!cap.speakerColor,
    text: cap.text?.substring(0, 30) + '...'
  });

  return (
    <div className="relative w-full">
      <div
        className="
          relative inline-block max-w-[95vw] sm:max-w-2xl text-center
          bg-black/90 rounded-md sm:rounded-lg px-2 py-1.5 sm:px-4 sm:py-3 mx-2 sm:mx-4
          transition-opacity duration-150
        "
      >
        {/* Speaker label */}
        {cap.speaker && (
          <div
            className="text-xs font-medium mb-1 text-center"
            style={{ color: tint }}
          >
            {cap.speaker}
          </div>
        )}

        {/* Word-by-word karaoke with smooth fill */}
        <div
          className="leading-tight px-1 flex flex-wrap justify-center gap-x-[0.35em]"
          style={{
            fontFamily: 'Roboto Flex, system-ui, sans-serif',
            lineHeight: window.innerWidth < 640 ? '1.25' : '1.3',
          }}
        >
          {words.map((word, i) => {
            const withinWord =
              currentTime >= (word.startTime! - WORD_TOLERANCE) &&
              currentTime <= (word.endTime!   + WORD_TOLERANCE);

            // Character-specific tint with rgba alpha support
            const hexToRgba = (hex: string, alpha: number) => {
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };
            const baseTint = tint.startsWith('#') ? hexToRgba(tint, 0.3) : `${tint}4D`;
            const fullTint = tint;

            // CRITICAL FIX: Syllable-by-syllable character fill (CWI design)
            if (Array.isArray(word.syllables) && word.syllables.length > 1 && withinWord) {
              // Find active syllable index
              const activeSylIdx = word.syllables.findIndex((syl: any) =>
                currentTime >= (syl.startTime - WORD_TOLERANCE) &&
                currentTime <= (syl.endTime + WORD_TOLERANCE)
              );

              // Calculate character fill position using charEnd
              const wordLen = word.text.length;
              let filledUpTo = 0;
              
              if (activeSylIdx >= 0) {
                // Active syllable found - fill up to its charEnd
                filledUpTo = (word.syllables[activeSylIdx] as any)?.charEnd || wordLen;
              } else if (currentTime < word.syllables[0].startTime) {
                // Before first syllable - no fill
                filledUpTo = 0;
              } else {
                // After all syllables - full fill
                filledUpTo = wordLen;
              }

              // Render filled + unfilled character spans
              return (
                <span key={`${i}-${word.startTime}`} style={{ display: 'inline-block', marginRight: '0.3em' }}>
                  <span style={{ color: fullTint }}>
                    {word.text.substring(0, filledUpTo)}
                  </span>
                  <span style={{ color: baseTint }}>
                    {word.text.substring(filledUpTo)}
                  </span>
                </span>
              );
            }

            // Fallback: Gradient-based fill for words without syllables
            let progressPct = 0;
            if (withinWord) {
              const ratio = (currentTime - (word.startTime ?? 0)) / Math.max(0.001, (word.endTime! - word.startTime!));
              progressPct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
            }

            return (
              <span
                key={`${i}-${word.startTime}`}
                className="caption-word"
                style={{
                  display: 'inline-block',
                  marginRight: '0.3em',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                  // Layer 1: full-word base tint (always visible)
                  // Layer 2: karaoke fill that grows with progress
                  backgroundImage: `linear-gradient(${baseTint}, ${baseTint}), linear-gradient(${fullTint}, ${fullTint})`,
                  backgroundRepeat: 'no-repeat, no-repeat',
                  backgroundSize: `100% 100%, ${progressPct}% 100%`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  transition: 'background-size 80ms linear'
                }}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};