import React, { useState, useEffect } from 'react';
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

// ✅ Updated interfaces for millisecond precision and 7-level intensity
export interface CaptionWord {
  text: string;
  start_ms?: number;    // ✅ Milliseconds
  end_ms?: number;
  startTime: number;    // Keep for compatibility (seconds)
  endTime: number;
  confidence?: number;
  syllables?: Array<{ text: string; startTime: number; endTime: number }>;
  
  // ✅ 7-level intensity spectrum
  intensity?: 'whisper' | 'quiet' | 'normal' | 'loud' | 'yelling' | 'screaming';
  overall_intensity?: string;  // Alternative field name
  
  // Legacy emphasis field (keep for compatibility)
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling' | 'whisper';
  pitch?: 'high' | 'low' | 'normal';
  
  // ✅ Emotion data
  sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  sentimentConfidence?: number;
  emotionMetadata?: any;
  
  // ✅ Calculated
  duration_ms?: number;
}

export interface WordSegment extends CaptionWord {}

export interface Caption {
  id?: string;
  start_ms?: number;
  end_ms?: number;
  startTime: number;
  endTime: number;
  text: string;
  speaker: string;
  speakerColor?: string;  // ✅ Character color
  speakerAsrLabel?: string;
  isOffCamera?: boolean;
  words?: CaptionWord[];
  overall_intensity?: string;
  sentiment?: string;
  sentimentConfidence?: number;
  emotionMetadata?: any;
  vocal_intensity?: string;
  volume?: number;
  type?: 'dialogue' | 'soundeffect' | 'music';
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

// ✅ FIX: Check for valid timings without requiring confidence scores
// (edited/synthesized words may not have confidence, but still have valid timing)
const hasProviderWordTimings = (words?: WordSegment[]): boolean => {
  if (!words || words.length === 0) return false;
  
  // Real provider timings have ALL words with valid startTime and endTime
  return words.every(w => 
    typeof w.startTime === 'number' &&
    typeof w.endTime === 'number' &&
    w.startTime >= 0 &&
    w.endTime > w.startTime
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

// ✅ Import ExpressiveSettings type
export interface ExpressiveSettings {
  enabled: boolean;
  useStyles: boolean;
  lengthenWords: boolean;
  showSoundLabels: boolean;
  showEnvironmentalSounds: boolean;
  dynamicSizing: boolean;
  showSentimentBadge: boolean;
  highlightPitch: boolean;
  whisperThreshold: number;
  yellThreshold: number;
  reduceMotion: boolean;
  highContrast: boolean;
  minFontSize: number;
}

interface CaptionsWithIntentionProps {
  captions: CaptionSegment[];
  currentTime: number;
  isVisible?: boolean;
  screenHeight?: number;
  expressiveSettings?: ExpressiveSettings;
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

// ✅ FIX: Use real syllable timings when available (from ASR)
function expandWordsToSyllables(words: Word[], segStart: number, segEnd: number) {
  const duration = Math.max(0.05, segEnd - segStart);
  const baseStep = duration / Math.max(1, words.length);

  let cursor = segStart;
  const expanded: Array<Word & { _syllableText: string }> = [];

  words.forEach((w, idx) => {
    const wStart = typeof w.startTime === "number" ? w.startTime : (segStart + idx * baseStep);
    const wEnd   = typeof w.endTime   === "number" ? w.endTime   : Math.min(segEnd, segStart + (idx + 1) * baseStep);

    const parts = (w.syllables && w.syllables.length > 0) ? w.syllables : naiveSyllabify(w.text);
    const span = Math.max(0.04, wEnd - wStart);

    // ✅ FIX: Check if syllables have real timing data
    const hasRealSyllableTiming = Array.isArray(w.syllables) && 
      w.syllables.length > 0 &&
      w.syllables.some(s => typeof s.startTime === 'number' && typeof s.endTime === 'number');

    if (hasRealSyllableTiming) {
      // Use real syllable timings from ASR (convert relative to absolute if needed)
      parts.forEach((p: any, i) => {
        let sStart = p.startTime;
        let sEnd = p.endTime;
        
        // If timings look relative (0-1 range within word duration), convert to absolute
        if (typeof sStart === 'number' && typeof sEnd === 'number' && 
            sStart >= 0 && sEnd <= span && sEnd > sStart) {
          sStart = wStart + sStart;
          sEnd = wStart + sEnd;
        }
        
        expanded.push({
          ...w,
          _syllableText: typeof p === 'string' ? p : p.text,
          startTime: sStart || (wStart + (i / parts.length) * span),
          endTime: sEnd || (wStart + ((i + 1) / parts.length) * span)
        });
      });
    } else {
      // Fallback: distribute evenly (naive)
      const step = span / Math.max(1, parts.length);
      parts.forEach((p: any, i) => {
        const sStart = wStart + i * step;
        const sEnd   = (i === parts.length - 1) ? wEnd : (wStart + (i + 1) * step);
        expanded.push({
          ...w,
          _syllableText: typeof p === 'string' ? p : p.text,
          startTime: sStart,
          endTime: sEnd
        });
      });
    }

    cursor = wEnd;
  });

  return expanded;
}

// ✅ NEW: Calculate intensity from emotion AI data
function calculateIntensity(word: CaptionWord): string {
  // Priority 1: Explicit intensity field (7-level)
  if (word.intensity) return word.intensity;
  if (word.overall_intensity) return word.overall_intensity;
  
  // Priority 2: High-confidence sentiment (AssemblyAI)
  if (word.sentimentConfidence && word.sentimentConfidence > 0.95) {
    if (word.sentiment === 'POSITIVE' || word.sentiment === 'NEGATIVE') {
      return 'screaming';
    }
  }
  
  if (word.sentimentConfidence && word.sentimentConfidence > 0.85) {
    if (word.sentiment === 'POSITIVE' || word.sentiment === 'NEGATIVE') {
      return 'yelling';
    }
  }
  
  if (word.sentimentConfidence && word.sentimentConfidence > 0.75) {
    if (word.sentiment === 'POSITIVE' || word.sentiment === 'NEGATIVE') {
      return 'loud';
    }
  }
  
  // Priority 3: Prosody from Hume AI (if available)
  if (word.emotionMetadata?.prosody) {
    const loudness = word.emotionMetadata.prosody.loudness_mean;
    if (loudness > -5) return 'yelling';
    if (loudness > -10) return 'loud';
    if (loudness < -25) return 'whisper';
    if (loudness < -20) return 'quiet';
  }
  
  // Priority 4: Duration-based intensity
  const duration_ms = word.duration_ms || 
    (word.end_ms && word.start_ms ? word.end_ms - word.start_ms : 
     (word.endTime - word.startTime) * 1000);
  
  if (duration_ms > 800) return 'loud';
  if (duration_ms < 200) return 'whisper';
  
  // Priority 5: Legacy emphasis field
  if (word.emphasis) {
    switch (word.emphasis) {
      case 'yelling': return 'yelling';
      case 'loud': return 'loud';
      case 'quiet': return 'quiet';
      case 'whisper': return 'whisper';
    }
  }
  
  return 'normal';
}

// ✅ NEW: Get font size multiplier for 7-level intensity
function getFontSizeMultiplier(intensity: string): number {
  switch (intensity) {
    case 'whisper':   return 0.85;  // 15% smaller
    case 'quiet':     return 0.90;  // 10% smaller
    case 'normal':    return 1.00;  // Baseline
    case 'loud':      return 1.05;  // 5% larger
    case 'yelling':   return 1.10;  // 10% larger
    case 'screaming': return 1.15;  // 15% larger
    default:          return 1.00;
  }
}

// ✅ NEW: Get font weight for intensity
function getFontWeight(intensity: string): number {
  switch (intensity) {
    case 'whisper':   return 300;  // Light
    case 'quiet':     return 400;  // Normal
    case 'normal':    return 500;  // Medium
    case 'loud':      return 600;  // Semi-bold
    case 'yelling':   return 700;  // Bold
    case 'screaming': return 700;  // Bold
    default:          return 500;
  }
}

// ✅ NEW: Check if should use ALL CAPS
function shouldUseAllCaps(intensity: string): boolean {
  return intensity === 'yelling' || intensity === 'screaming';
}

// ✅ NEW: Elongate vowels for EC protocol
function elongateWord(text: string, intensity: number): string {
  const vowels = /[aeiou]/gi;
  let count = 0;
  return text.replace(vowels, (match) => {
    count++;
    // Only elongate first vowel
    return count === 1 ? match.repeat(Math.min(intensity, 4)) : match;
  });
}

// ✅ NEW: Render expressive word with EC transformations
function renderExpressiveWord(
  word: CaptionWord,
  enableLengthening: boolean,
  enableStyles: boolean
): string {
  let text = word.text || '';
  
  // 1. Elongation (if enabled and word is long duration)
  const duration_ms = word.duration_ms || 
    (word.end_ms && word.start_ms ? word.end_ms - word.start_ms : 
     (word.endTime - word.startTime) * 1000);
  
  if (enableLengthening && duration_ms > 400) {
    const elongateIntensity = duration_ms < 600 ? 2 : duration_ms < 800 ? 3 : 4;
    text = elongateWord(text, elongateIntensity);
  }
  
  // 2. ALL CAPS (if yelling/screaming)
  const intensity = calculateIntensity(word);
  if (enableStyles && shouldUseAllCaps(intensity)) {
    text = text.toUpperCase();
  }
  
  return text;
}

/**
 * Calculate font size based on vocal intensity, volume, or emphasis - REDUCED SIZES
 * ✅ Updated to support 7-level intensity
 */
const getIntonationBasedFontSize = (
  screenHeight: number, 
  vocalIntensity?: 'whisper' | 'normal' | 'yell' | 'shout' | 'quiet' | 'loud' | 'yelling' | 'screaming',
  volume?: number,
  emphasis?: 'whisper' | 'quiet' | 'normal' | 'loud' | 'yelling' | 'screaming'
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
      case 'quiet':
        return minSize * 1.15;
      case 'normal':
        return baseSize;
      case 'loud':
        return Math.min(maxSize, baseSize * 1.15);
      case 'yell':
      case 'yelling':
        return Math.min(maxSize, baseSize * 1.3);
      case 'shout':
      case 'screaming':
        return Math.min(maxSize, baseSize * 1.5);
      default:
        return baseSize;
    }
  }
  
  // Priority 2: Use manual emphasis from transcript editing
  if (emphasis) {
    switch (emphasis) {
      case 'whisper':
        return minSize;
      case 'quiet':
        return minSize * 1.15;
      case 'normal':
        return baseSize;
      case 'loud':
        return Math.min(maxSize, baseSize * 1.15);
      case 'yelling':
        return Math.min(maxSize, baseSize * 1.3);
      case 'screaming':
        return Math.min(maxSize, baseSize * 1.5);
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
 * Get word-specific font size based on emphasis (LEGACY - kept for compatibility)
 * ✅ Updated to support 7-level intensity
 */
const getWordFontSize = (baseSize: number, emphasis?: 'whisper' | 'quiet' | 'normal' | 'loud' | 'yelling' | 'screaming'): number => {
  if (!emphasis || emphasis === 'normal') return baseSize;
  
  switch (emphasis) {
    case 'whisper':
      return baseSize * 0.7;  // 30% smaller for whispering
    case 'quiet':
      return baseSize * 0.85; // 15% smaller for quiet
    case 'loud':
      return baseSize * 1.15; // 15% larger for loud
    case 'yelling':
      return baseSize * 1.30; // 30% larger for yelling
    case 'screaming':
      return baseSize * 1.45; // 45% larger for screaming
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

// ✅ FIX: Only normalize if ALL words are missing timing (trust upstream timings)
function normalizeWords(
  words: WordSegment[] | undefined,
  segStart: number,
  segEnd: number
): WordSegment[] | undefined {
  if (!words || !words.length) return undefined;
  
  // ✅ TRUST upstream timings: Only synthesize if ALL words missing timing
  const allMissingTiming = words.every(w => 
    typeof w.startTime !== 'number' || typeof w.endTime !== 'number'
  );
  
  // If any words have timing, trust them (prevents double normalization)
  if (!allMissingTiming) {
    return words.map(w => ({
      ...w,
      emphasis: w.emphasis || 'normal',
      pitch: w.pitch || 'normal'
    }));
  }
  
  // Only synthesize if ALL words truly missing timing (defensive fallback)
  const duration = Math.max(0.01, segEnd - segStart);
  const step = duration / words.length;
  
  return words.map((w, i) => ({
    ...w,
    startTime: segStart + i * step,
    endTime: segStart + (i + 1) * step,
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
  screenHeight = 1080,
  expressiveSettings: externalExpressiveSettings
}) => {
  const [customSpeakerColors, setCustomSpeakerColors] = useState<Record<string, string>>({});
  
  // ✅ Use passed expressiveSettings or fallback to defaults
  const expressiveSettings = externalExpressiveSettings || {
    enabled: true,
    lengthenWords: true,
    useStyles: true,
    dynamicSizing: true,
    showSoundLabels: true,
    showEnvironmentalSounds: true,
    showSentimentBadge: false,
    highlightPitch: false,
    whisperThreshold: -25,
    yellThreshold: -10,
    reduceMotion: false,
    highContrast: false,
    minFontSize: 18
  };

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
  const lastColorsJSONRef = React.useRef<string>('');
  const colorUpdateTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const applyColors = () => {
      const j = localStorage.getItem('character-colors') || '';
      if (j && j !== lastColorsJSONRef.current) {
        try {
          setCustomSpeakerColors(JSON.parse(j));
          lastColorsJSONRef.current = j;
        } catch {}
      }
    };

    applyColors(); // initial

    const onUpdate = () => {
      if (colorUpdateTimerRef.current) clearTimeout(colorUpdateTimerRef.current);
      colorUpdateTimerRef.current = setTimeout(applyColors, 400);
    };

    window.addEventListener('character-colors-updated', onUpdate as any);
    return () => {
      if (colorUpdateTimerRef.current) clearTimeout(colorUpdateTimerRef.current);
      window.removeEventListener('character-colors-updated', onUpdate as any);
    };
  }, []);

  // What we actually render - sticky display state
  const [displayedCaption, setDisplayedCaption] = React.useState<any>(null);

  // Refs (do not cause re-renders)
  const showUntilSecRef   = React.useRef<number | null>(null); // seconds
  const lastSetMsRef      = React.useRef<number>(0);           // ms (Date.now)

  // Memoize active caption by coarse time bucket (100ms) to reduce paint thrashing
  const timeBucket = Math.floor(currentTime * 10); // 100ms buckets
  
  // Active caption - only show truly active segments (no read-ahead promotion)
  const activeCandidate = React.useMemo(() => {
    if (!processed?.length) return null;

    // ✅ Validate word timings before processing
    const validateWordTimings = (segment: any): boolean => {
      if (!segment.words || segment.words.length === 0) {
        return true; // No words to validate
      }
      
      // Check that word timings are within segment bounds
      const hasValidTimings = segment.words.every((word: any) => 
        word.startTime >= segment.startTime && 
        word.endTime <= segment.endTime &&
        word.startTime < word.endTime
      );
      
      if (!hasValidTimings) {
        console.error('❌ Invalid word timings detected in segment:', {
          text: segment.text?.substring(0, 30),
          segmentStart: segment.startTime,
          segmentEnd: segment.endTime,
          firstWord: segment.words[0],
          lastWord: segment.words[segment.words.length - 1]
        });
      }
      
      return hasValidTimings;
    };

    // Only return segments that are actually active right now AND have valid timings
    const active = processed.find(c => {
      const isActive = currentTime >= (c.startTime - SEGMENT_TOLERANCE) &&
                      currentTime <= (c.endTime   + SEGMENT_TOLERANCE);
      return isActive && validateWordTimings(c);
    });
    return active || null;
  }, [processed, timeBucket]);

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

  // ✅ Process words with emotion AI and EC transformations - MUST be before early return
  const cap = displayedCaption;
  const characterColor = cap?.speakerColor || customSpeakerColors[cap?.speaker] || DEFAULT_NEUTRAL;
  const words = (cap?.words || []) as CaptionWord[];
  
  const baseFontSize = getIntonationBasedFontSize(
    screenHeight,
    cap?.vocal_intensity,
    cap?.volume,
    words[0]?.emphasis
  );

  const READ_AHEAD_COLOR = 'rgba(255, 255, 255, 0.9)';
  
  const processedWords = React.useMemo(() => {
    if (!cap || !words.length) return [];
    
    return words.map((word) => {
      const intensity = calculateIntensity(word);
      const displayText = renderExpressiveWord(word, expressiveSettings.lengthenWords, expressiveSettings.useStyles);
      const sizeMultiplier = getFontSizeMultiplier(intensity);
      const fontWeight = getFontWeight(intensity);
      
      return {
        ...word,
        displayText,
        intensity,
        sizeMultiplier,
        fontWeight,
        color: characterColor
      };
    });
  }, [cap, words, characterColor, expressiveSettings]);

  // ✅ Early return AFTER all hooks
  if (!displayedCaption) return null;

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
            style={{ color: characterColor }}
          >
            {cap.speaker}
          </div>
        )}

        {/* ✅ Captions with Intention: 7-level intensity + EC protocol */}
        <div
          className="leading-tight px-1 flex flex-wrap justify-center gap-x-[0.35em]"
          style={{
            fontFamily: 'Roboto Flex, system-ui, sans-serif',
            lineHeight: window.innerWidth < 640 ? '1.25' : '1.3',
            fontStyle: cap.isOffCamera ? 'italic' : 'normal', // ✅ Off-camera italics
          }}
        >
          {processedWords.map((word, i) => {
            // Word-level active state (instant color change)
            const isWordActive =
              currentTime >= word.startTime - WORD_TOLERANCE &&
              currentTime <= word.endTime + WORD_TOLERANCE;

            // Find active syllable for 15% scale pop timing
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
            const wordColor = isWordActive ? word.color : READ_AHEAD_COLOR;

            // ✅ Apply 7-level intensity sizing
            const finalFontSize = baseFontSize * word.sizeMultiplier;
            const pitchStyles = getPitchBasedStyle(word.pitch);

            // ✅ Use transformed text (EC protocol: ALL CAPS + elongation)
            const displayText = word.displayText;

            // Render entire word as single span with instant color change + pop
            return (
              <span
                key={`${i}-${word.start_ms || Math.round(word.startTime * 1000)}`}
                style={{
                  display: 'inline-block',
                  marginRight: '0.3em',
                  color: wordColor,
                  fontSize: `${finalFontSize}px`,
                  fontWeight: word.fontWeight,  // ✅ Dynamic weight
                  transform: `scale(${scale})`,
                  transformOrigin: 'center bottom',
                  ...pitchStyles,
                  textShadow: isWordActive 
                    ? `0 0 10px ${word.color}80, 0 2px 4px rgba(0,0,0,0.8)`
                    : '0 2px 4px rgba(0,0,0,0.8)',
                  transition: 'color 0.05s ease-out, transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1), text-shadow 0.1s ease-out',
                }}
                data-intensity={word.intensity}
                data-sentiment={word.sentiment}
              >
                {displayText}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};