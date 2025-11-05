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
const WORD_TOLERANCE    = 0.08;   // 80ms - smoother sync for word highlighting
const SYLLABLE_TOLERANCE = 0.02;  // 20ms - for pop animation timing
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

  // Process captions: normalize words, precompute syllable charStart/charEnd
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

      // Phase 1: Precompute charStart/charEnd for syllables
      working.words = (working.words || []).map((w: any) => {
        if (!Array.isArray(w.syllables) || w.syllables.length === 0) return w;
        
        const wordText = (w.text || '').toLowerCase();
        const wordLen = wordText.length;
        
        // Check if charEnd is already set
        const hasCharEnd = w.syllables.some((s: any) => typeof s.charEnd === 'number');
        
        if (!hasCharEnd) {
          // Try to map syllable text to character indices
          let cursor = 0;
          w.syllables = w.syllables.map((syl: any, idx: number) => {
            const sylText = (syl.text || '').toLowerCase().trim();
            
            if (sylText) {
              // Find syllable text in word starting from cursor
              const matchIdx = wordText.indexOf(sylText, cursor);
              if (matchIdx >= 0) {
                cursor = matchIdx + sylText.length;
                return {
                  ...syl,
                  charStart: matchIdx,
                  charEnd: cursor
                };
              }
            }
            
            // Fallback: proportional distribution
            const charStart = Math.round((idx / w.syllables.length) * wordLen);
            const charEnd = Math.min(wordLen, Math.round(((idx + 1) / w.syllables.length) * wordLen));
            return {
              ...syl,
              charStart,
              charEnd
            };
          });
        } else {
          // charEnd exists, compute charStart from previous charEnd
          let prevEnd = 0;
          w.syllables = w.syllables.map((syl: any) => {
            const charStart = prevEnd;
            const charEnd = typeof syl.charEnd === 'number' ? syl.charEnd : wordLen;
            prevEnd = charEnd;
            return {
              ...syl,
              charStart,
              charEnd
            };
          });
        }
        
        return w;
      });

      return working;
    });
  }, [captions]);

  // Debounced listener for character color updates
  const colorUpdateTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevColorsRef = React.useRef<string>('');

  useEffect(() => {
    const loadColors = () => {
      const s = localStorage.getItem('character-colors') || '';
      if (s && s !== prevColorsRef.current) {
        try {
          setCustomSpeakerColors(JSON.parse(s));
          prevColorsRef.current = s;
        } catch {}
      }
    };

    loadColors(); // initial

    const handler = () => {
      if (colorUpdateTimerRef.current) clearTimeout(colorUpdateTimerRef.current);
      colorUpdateTimerRef.current = setTimeout(loadColors, 300);
    };

    window.addEventListener('character-colors-updated', handler);
    return () => {
      if (colorUpdateTimerRef.current) clearTimeout(colorUpdateTimerRef.current);
      window.removeEventListener('character-colors-updated', handler);
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

  // Phase 5: Stability - debounce speaker flicker using segment key
  const [displayUntil, setDisplayUntil] = React.useState<number | null>(null);
  const lastSetAtRef = React.useRef<number>(0);
  const activeSegmentKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const now = Date.now();

    if (activeCandidate) {
      const segmentKey = `${activeCandidate.startTime.toFixed(2)}-${activeCandidate.endTime.toFixed(2)}`;
      
      // Only update if segment timing changed (not just speaker name/color)
      if (activeSegmentKeyRef.current !== segmentKey) {
        setDisplayedCaption(activeCandidate);
        activeSegmentKeyRef.current = segmentKey;
        
        // enforce short minimum on-screen time for ultra-short segments
        const minEnd = activeCandidate.startTime + (MIN_DISPLAY_MS / 1000);
        const visualEnd = Math.max(activeCandidate.endTime, minEnd);
        setDisplayUntil(visualEnd);
        lastSetAtRef.current = now;
        
        console.log('🎯 CWI: Segment activated', { segmentKey, speaker: activeCandidate.speaker });
      } else if (displayedCaption) {
        // Same segment timing but potentially updated speaker/color - only update if changed
        const shouldUpdate =
          displayedCaption.speaker !== activeCandidate.speaker ||
          displayedCaption.speakerColor !== activeCandidate.speakerColor;

        if (shouldUpdate) {
          setDisplayedCaption((prev: any) => ({
            ...prev,
            speaker: activeCandidate.speaker,
            speakerColor: activeCandidate.speakerColor
          }));
        }
      }
    } else if (displayedCaption && displayUntil !== null) {
      const timeSinceSet = now - lastSetAtRef.current;
      const shouldClear = (currentTime > displayUntil + SEGMENT_TOLERANCE) &&
                          (timeSinceSet >= MIN_DISPLAY_MS);
      if (shouldClear) {
        setDisplayedCaption(null);
        setDisplayUntil(null);
        activeSegmentKeyRef.current = null;
      }
    }
  }, [activeCandidate, currentTime, displayedCaption, displayUntil]);

  if (!displayedCaption) return null;
  const cap = displayedCaption;

  // Neutral color until a character is assigned
  const tint = cap.speakerColor || customSpeakerColors[cap.speaker] || DEFAULT_NEUTRAL;
  const words = (cap.words || []) as any[];
  
  // Phase 4: Compute base font size for segment
  const baseFontSize = getIntonationBasedFontSize(
    screenHeight,
    cap.vocal_intensity,
    cap.volume,
    words[0]?.emphasis
  );

  // Read-ahead color: white at 90% opacity
  const READ_AHEAD_COLOR = 'rgba(255, 255, 255, 0.9)';

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

        {/* Captions with Intention: Word-level color + 15% scale pop */}
        <div
          className="leading-tight px-1 flex flex-wrap justify-center gap-x-[0.35em]"
          style={{
            fontFamily: 'Roboto Flex, system-ui, sans-serif',
            lineHeight: window.innerWidth < 640 ? '1.25' : '1.3',
          }}
        >
          {words.map((word, i) => {
            // Word-level active state (instant color change)
            const isWordActive =
              currentTime >= word.startTime! - WORD_TOLERANCE &&
              currentTime <= word.endTime! + WORD_TOLERANCE;

        // Find active syllable for 15% scale pop timing
        let activeSyllableIdx = -1;
        let shouldApplyPop = false;

        if (isWordActive) {
          // Tier 1: If word has syllables, use syllable-level timing
          if (Array.isArray(word.syllables) && word.syllables.length > 0) {
            for (let idx = 0; idx < word.syllables.length; idx++) {
              const syl = word.syllables[idx];
              if (
                currentTime >= syl.startTime - SYLLABLE_TOLERANCE &&
                currentTime <= syl.endTime + SYLLABLE_TOLERANCE
              ) {
                activeSyllableIdx = idx;
                shouldApplyPop = true;
                break;
              }
            }
          } else {
            // Tier 2: If word has NO syllables, apply pop for entire word duration
            shouldApplyPop = true;
          }
        }

        // Apply 15% scale pop when word is active
        const scale = shouldApplyPop ? 1.15 : 1.0;

            // Word color: character color when active, white at 90% when not
            const wordColor = isWordActive ? tint : READ_AHEAD_COLOR;

            // Apply per-word intonation (size + variable font)
            const wordFontSize = getWordFontSize(baseFontSize, word.emphasis);
            const pitchStyles = getPitchBasedStyle(word.pitch);

            const wordText = word.text || '';

            // Render entire word as single span with instant color change + pop
            return (
              <span
                key={`${i}-${Math.round(word.startTime! * 1000)}`}
                style={{
                  display: 'inline-block',
                  marginRight: '0.3em',
                  color: wordColor,
                  fontSize: `${wordFontSize}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: 'center bottom',
                  ...pitchStyles,
                  transition: 'color 0.05s ease-out, transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)', // Bounce easing for pop
                }}
              >
                {wordText}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};